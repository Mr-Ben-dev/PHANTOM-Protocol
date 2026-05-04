/**
 * PHANTOM Protocol — Keeper Bot v2
 *
 * 24/7 automation for PhantomRounds:
 *  1. Auto-creates BTC/USD, ETH/USD, SOL/USD 5m rounds when none are OPEN
 *  2. Locks OPEN rounds when lockAt passes
 *  3. Resolves LOCKED rounds using live Binance prices + oracle signature
 *  4. Handles OPEN rounds that missed the lock step (direct resolve)
 *  5. Retries failed transactions once
 */

import "dotenv/config";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  stringToHex,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";

const PRIVATE_KEY = (process.env.PRIVATE_KEY ?? "") as Hex;
const RPC_URL = process.env.RPC_URL ?? "https://sepolia-rollup.arbitrum.io/rpc";
const ROUNDS_ADDRESS = (process.env.PHANTOM_ROUNDS_ADDRESS ?? "") as Address;
const POLL_MS = Number(process.env.POLL_INTERVAL_SECONDS ?? 30) * 1000;

if (!PRIVATE_KEY.startsWith("0x")) { console.error("Set PRIVATE_KEY=0x... in .env"); process.exit(1); }
if (!ROUNDS_ADDRESS || ROUNDS_ADDRESS === "0x") { console.error("Set PHANTOM_ROUNDS_ADDRESS in .env"); process.exit(1); }

const ORACLE_KEY = ((process.env.ORACLE_SIGNER_KEY || PRIVATE_KEY) as Hex);
const account = privateKeyToAccount(PRIVATE_KEY);
const oracleAccount = privateKeyToAccount(ORACLE_KEY);

const publicClient = createPublicClient({ chain: arbitrumSepolia, transport: http(RPC_URL, { timeout: 20_000 }) });
const walletClient = createWalletClient({ account, chain: arbitrumSepolia, transport: http(RPC_URL, { timeout: 30_000 }) });

const ABI = parseAbi([
  "function getRoundCount() view returns (uint256)",
  "function getRoundCore(uint256) view returns (bytes32 asset, uint32 intervalSeconds, uint64 startPrice, uint256 lockAt, uint256 settleAt, uint256 bettorCount, address creator, uint8 status)",
  "function oracleMessageHash(uint256 roundId, uint64 endPrice, uint256 observedAt) view returns (bytes32)",
  "function lockRound(uint256 roundId)",
  "function resolveRound(uint256 roundId, uint64 endPrice, uint256 observedAt, bytes oracleSignature)",
  "function createRound(bytes32 asset, uint32 intervalSeconds, uint64 startPrice, uint256 lockAt, uint256 settleAt, bytes32 oracleRoundId) returns (uint256)",
  "function roundBots(address) view returns (bool)",
  "function oracleSigners(address) view returns (bool)",
  "function paused() view returns (bool)",
]);

const STATUS = { NONE: 0, OPEN: 1, LOCKED: 2, RESOLVED: 3, CANCELED: 4, PENDING_REVEAL: 5 };

function log(msg: string) { console.log(`[${new Date().toISOString()}] ${msg}`); }

function bytes32ToAsset(b: `0x${string}`): string {
  const hex = b.slice(2);
  let str = "";
  for (let i = 0; i < hex.length; i += 2) {
    const byte = parseInt(hex.slice(i, i + 2), 16);
    if (!byte) break;
    str += String.fromCharCode(byte);
  }
  return str || "UNKNOWN";
}

function encodeLabel(s: string): `0x${string}` { return stringToHex(s.slice(0, 31), { size: 32 }); }
function priceToUint64(p: number): bigint { return BigInt(Math.round(p * 1e8)); }

async function fetchPrice(symbol: string): Promise<number> {
  const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol.toUpperCase()}USDT`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Binance ${symbol}: HTTP ${res.status}`);
  const data = (await res.json()) as { price: string };
  const price = parseFloat(data.price);
  if (!price || isNaN(price)) throw new Error(`Binance ${symbol}: invalid price`);
  return price;
}

async function signOracle(roundId: bigint, endPrice: bigint, observedAt: bigint): Promise<Hex> {
  const msgHash = await publicClient.readContract({ address: ROUNDS_ADDRESS, abi: ABI, functionName: "oracleMessageHash", args: [roundId, endPrice, observedAt] });
  return oracleAccount.sign({ hash: msgHash });
}

async function sendTx(label: string, fn: () => Promise<Hex>): Promise<Hex | null> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const hash = await fn();
      log(`  ✅ ${label}: ${hash}`);
      return hash;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt === 1) { log(`  ⚠ ${label} attempt 1 failed: ${msg.slice(0, 120)} — retrying...`); await new Promise((r) => setTimeout(r, 3000)); }
      else log(`  ❌ ${label} failed: ${msg.slice(0, 200)}`);
    }
  }
  return null;
}

async function processRound(roundId: bigint): Promise<void> {
  const [asset, , , lockAt, settleAt, , , status] = await publicClient.readContract({ address: ROUNDS_ADDRESS, abi: ABI, functionName: "getRoundCore", args: [roundId] });
  const assetStr = bytes32ToAsset(asset);
  const now = BigInt(Math.floor(Date.now() / 1000));
  const st = Number(status);

  if (st === STATUS.NONE || st === STATUS.RESOLVED || st === STATUS.CANCELED) return;
  if (st === STATUS.PENDING_REVEAL) { log(`  [#${roundId}] PENDING_REVEAL — awaiting CoFHE threshold decrypt`); return; }

  if (st === STATUS.OPEN && now >= lockAt && now < settleAt) {
    log(`  [#${roundId}] Locking ${assetStr}...`);
    await sendTx(`lockRound(${roundId})`, () => walletClient.writeContract({ address: ROUNDS_ADDRESS, abi: ABI, functionName: "lockRound", args: [roundId] }));
    return;
  }

  if ((st === STATUS.LOCKED || st === STATUS.OPEN) && now >= settleAt) {
    const symbol = assetStr.replace("/USD", "").replace("USD", "");
    let price: number;
    try { price = await fetchPrice(symbol); } catch (err) { log(`  [#${roundId}] Price fetch failed: ${err instanceof Error ? err.message : err}`); return; }

    const endPrice = priceToUint64(price);
    const observedAt = now;
    log(`  [#${roundId}] Resolving ${assetStr} @ $${price.toLocaleString("en-US", { minimumFractionDigits: 2 })}...`);

    let sig: Hex;
    try { sig = await signOracle(roundId, endPrice, observedAt); } catch (err) { log(`  [#${roundId}] Sign failed: ${err instanceof Error ? err.message : err}`); return; }

    await sendTx(`resolveRound(${roundId})`, () => walletClient.writeContract({ address: ROUNDS_ADDRESS, abi: ABI, functionName: "resolveRound", args: [roundId, endPrice, observedAt, sig] }));
  }
}

const ROUND_CONFIGS = [
  { label: "BTC/USD", symbol: "BTC", interval: 300 },
  { label: "ETH/USD", symbol: "ETH", interval: 300 },
  { label: "SOL/USD", symbol: "SOL", interval: 300 },
] as const;

async function autoCreateRounds(): Promise<void> {
  const count = await publicClient.readContract({ address: ROUNDS_ADDRESS, abi: ABI, functionName: "getRoundCount" });
  const openAssets = new Set<string>();
  for (let i = 0n; i < count; i++) {
    const [asset, , , , , , , status] = await publicClient.readContract({ address: ROUNDS_ADDRESS, abi: ABI, functionName: "getRoundCore", args: [i] });
    if (Number(status) === STATUS.OPEN) openAssets.add(bytes32ToAsset(asset));
  }

  for (const { label, symbol, interval } of ROUND_CONFIGS) {
    if ([...openAssets].some((a) => a.toUpperCase().includes(symbol))) continue;
    let price: number;
    try { price = await fetchPrice(symbol); } catch (err) { log(`  Auto-create ${label}: price fetch failed`); continue; }

    const now = Math.floor(Date.now() / 1000);
    log(`  Auto-creating ${label} @ $${price.toLocaleString("en-US", { minimumFractionDigits: 2 })}...`);
    await sendTx(`createRound(${label})`, () =>
      walletClient.writeContract({
        address: ROUNDS_ADDRESS, abi: ABI,
        functionName: "createRound",
        args: [
          encodeLabel(label), interval, priceToUint64(price),
          BigInt(now + interval), BigInt(now + interval + 60),
          encodeLabel(`${symbol}-5M-${now}`),
        ],
      })
    );
  }
}

async function tick(): Promise<void> {
  log("─── tick ─────────────────────────────────────────────────────");
  try {
    const [isBot, isSigner, isPaused] = await Promise.all([
      publicClient.readContract({ address: ROUNDS_ADDRESS, abi: ABI, functionName: "roundBots", args: [account.address] }),
      publicClient.readContract({ address: ROUNDS_ADDRESS, abi: ABI, functionName: "oracleSigners", args: [oracleAccount.address] }),
      publicClient.readContract({ address: ROUNDS_ADDRESS, abi: ABI, functionName: "paused" }),
    ]);
    if (!isBot) log(`⚠ NOT a roundBot — setRoundBot(${account.address}, true) needed`);
    if (!isSigner) log(`⚠ NOT an oracleSigner — setOracleSigner(${oracleAccount.address}, true) needed`);
    if (isPaused) { log("⚠ Contract PAUSED — skipping"); return; }

    await autoCreateRounds();
    const count = await publicClient.readContract({ address: ROUNDS_ADDRESS, abi: ABI, functionName: "getRoundCount" });
    log(`  Rounds on-chain: ${count}`);
    for (let i = 0n; i < count; i++) await processRound(i);
  } catch (err) {
    log(`Tick error: ${err instanceof Error ? err.message : err}`);
  }
}

console.log("═".repeat(60));
console.log("  PHANTOM Keeper Bot v2 — 24/7 round automation");
console.log(`  Keeper  : ${account.address}`);
console.log(`  Contract: ${ROUNDS_ADDRESS}`);
console.log(`  Poll    : ${POLL_MS / 1000}s`);
console.log("═".repeat(60));

await tick();
setInterval(() => { void tick(); }, POLL_MS);
