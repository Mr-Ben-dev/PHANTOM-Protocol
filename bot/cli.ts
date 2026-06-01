/**
 * PHANTOM Protocol — CLI Tool
 *
 * Interact with PhantomRounds directly from the command line using your private key.
 * No browser / MetaMask needed.
 *
 * Usage:
 *   npx tsx cli.ts status
 *   npx tsx cli.ts create BTC/USD
 *   npx tsx cli.ts create ETH/USD 15m
 *   npx tsx cli.ts bet 0 up 0.005
 *   npx tsx cli.ts bet 1 down 0.01
 *   npx tsx cli.ts lock 0
 *   npx tsx cli.ts resolve 0
 *   npx tsx cli.ts reveal-pools 0
 *   npx tsx cli.ts reveal-direction 0 up
 *   npx tsx cli.ts claim 0
 *   npx tsx cli.ts cancel 0
 */

import "dotenv/config";
import {
  createPublicClient,
  createWalletClient,
  parseAbi,
  parseEther,
  formatEther,
  stringToHex,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";
import { decryptPermittedBool, decryptPublicHandle, ensureCofheConnected } from "./cofhe.js";
import { arbSepoliaTransport } from "./rpc.js";

// ─── Config ──────────────────────────────────────────────────────────────────

const PRIVATE_KEY = (process.env.PRIVATE_KEY ?? "") as Hex;
const RPC_URL = process.env.RPC_URL ?? "https://sepolia-rollup.arbitrum.io/rpc";
const ROUNDS_ADDRESS = (process.env.PHANTOM_ROUNDS_ADDRESS ?? "") as Address;

if (!PRIVATE_KEY.startsWith("0x")) {
  console.error("❌  Set PRIVATE_KEY=0x... in .env");
  process.exit(1);
}
if (!ROUNDS_ADDRESS || ROUNDS_ADDRESS === "0x") {
  console.error("❌  Set PHANTOM_ROUNDS_ADDRESS in .env");
  process.exit(1);
}

const ORACLE_KEY = ((process.env.ORACLE_SIGNER_KEY || PRIVATE_KEY) as Hex);
const account = privateKeyToAccount(PRIVATE_KEY);
const oracleAccount = privateKeyToAccount(ORACLE_KEY);

const transport = arbSepoliaTransport();
const pub = createPublicClient({ chain: arbitrumSepolia, transport });
const wal = createWalletClient({ account, chain: arbitrumSepolia, transport });

// ─── ABI ─────────────────────────────────────────────────────────────────────

const ABI = parseAbi([
  "function getRoundCount() view returns (uint256)",
  "function getRoundCore(uint256) view returns (bytes32 asset, uint32 intervalSeconds, uint64 startPrice, uint256 lockAt, uint256 settleAt, uint256 bettorCount, address creator, uint8 status)",
  "function getRoundSettlement(uint256) view returns (uint64 endPrice, uint8 status, bool outcomeUp, bool poolsRevealed, uint64 upPool, uint64 downPool, uint64 totalPool, bytes32 oracleRoundId, uint256 observedAt)",
  "function oracleMessageHash(uint256 roundId, uint64 endPrice, uint256 observedAt) view returns (bytes32)",
  "function createRound(bytes32 asset, uint32 intervalSeconds, uint64 startPrice, uint256 lockAt, uint256 settleAt, bytes32 oracleRoundId) returns (uint256)",
  "function placeRoundBetSimple(uint256 roundId, bool isUp) payable",
  "function lockRound(uint256 roundId)",
  "function resolveRound(uint256 roundId, uint64 endPrice, uint256 observedAt, bytes oracleSignature)",
  "function revealRoundPools(uint256 roundId, uint64 upPlaintext, bytes upSig, uint64 downPlaintext, bytes downSig)",
  "function revealMyDirection(uint256 roundId, bool directionUp, bytes sig)",
  "function getUpPool(uint256 roundId) view returns (uint256)",
  "function getDownPool(uint256 roundId) view returns (uint256)",
  "function getRoundDirection(uint256 roundId) view returns (uint256)",
  "function getRoundEth(uint256 roundId) view returns (uint256 totalEth, uint256 userStake)",
  "function claimRoundPayout(uint256 roundId)",
  "function cancelRound(uint256 roundId, string reason)",
  "function roundBots(address) view returns (bool)",
  "function oracleSigners(address) view returns (bool)",
  "function ethStakes(uint256, address) view returns (uint256)",
  "function hasRoundClaimed(uint256, address) view returns (bool)",
  "function directionRevealed(uint256, address) view returns (bool)",
]);

const STATUS_LABELS = ["NONE", "OPEN", "LOCKED", "RESOLVED", "CANCELED", "PENDING_REVEAL"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function encodeLabel(s: string): `0x${string}` {
  return stringToHex(s.slice(0, 31), { size: 32 });
}

function priceToUint64(p: number): bigint {
  return BigInt(Math.round(p * 1e8));
}

function formatPrice(v: bigint): string {
  if (v === 0n) return "-";
  return `$${(Number(v) / 1e8).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

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

function formatTime(ts: bigint): string {
  if (ts === 0n) return "-";
  return new Date(Number(ts) * 1000).toLocaleTimeString();
}

async function fetchPrice(symbol: string): Promise<number> {
  const res = await fetch(
    `https://api.binance.com/api/v3/ticker/price?symbol=${symbol.toUpperCase()}USDT`,
    { signal: AbortSignal.timeout(8000) },
  );
  if (!res.ok) throw new Error(`Binance ${symbol}: HTTP ${res.status}`);
  const data = (await res.json()) as { price: string };
  return parseFloat(data.price);
}

async function signOracle(roundId: bigint, endPrice: bigint, observedAt: bigint): Promise<Hex> {
  const msgHash = await pub.readContract({
    address: ROUNDS_ADDRESS, abi: ABI,
    functionName: "oracleMessageHash",
    args: [roundId, endPrice, observedAt],
  });
  // Must use signMessage (adds "\x19Ethereum Signed Message:\n32" prefix) to match contract
  return oracleAccount.signMessage({ message: { raw: msgHash } });
}

// ─── Commands ─────────────────────────────────────────────────────────────────

async function cmdStatus() {
  const count = await pub.readContract({ address: ROUNDS_ADDRESS, abi: ABI, functionName: "getRoundCount" });
  const isBot = await pub.readContract({ address: ROUNDS_ADDRESS, abi: ABI, functionName: "roundBots", args: [account.address] });
  const isSigner = await pub.readContract({ address: ROUNDS_ADDRESS, abi: ABI, functionName: "oracleSigners", args: [oracleAccount.address] });
  const balance = await pub.getBalance({ address: account.address });

  console.log("\n═════════════════════════════════════════════════════");
  console.log("  PHANTOM Rounds — Status");
  console.log("═════════════════════════════════════════════════════");
  console.log(`  Wallet    : ${account.address}`);
  console.log(`  Balance   : ${formatEther(balance)} ETH`);
  console.log(`  Contract  : ${ROUNDS_ADDRESS}`);
  console.log(`  Is Bot    : ${isBot ? "✅ yes" : "❌ no — call setRoundBot(addr, true)"}`);
  console.log(`  Is Signer : ${isSigner ? "✅ yes" : "❌ no — call setOracleSigner(addr, true)"}`);
  console.log(`  Rounds    : ${count}`);
  console.log("─────────────────────────────────────────────────────");

  for (let i = 0n; i < count; i++) {
    const [asset, intervalSec, startPrice, lockAt, settleAt, bettorCount, , status] = await pub.readContract({
      address: ROUNDS_ADDRESS, abi: ABI, functionName: "getRoundCore", args: [i],
    });
    const [endPrice, , outcomeUp, poolsRevealed, upPool, downPool] = await pub.readContract({
      address: ROUNDS_ADDRESS, abi: ABI, functionName: "getRoundSettlement", args: [i],
    });
    const myStake = await pub.readContract({
      address: ROUNDS_ADDRESS, abi: ABI, functionName: "ethStakes", args: [i, account.address],
    });

    const statusLabel = STATUS_LABELS[Number(status)] ?? "?";
    const assetStr = bytes32ToAsset(asset);
    const now = BigInt(Math.floor(Date.now() / 1000));
    const countdown = Number(settleAt) > Date.now() / 1000
      ? `(${Math.max(0, Math.floor((Number(settleAt) - Date.now() / 1000) / 60))}m left)`
      : "(past)";

    console.log(
      `  #${i}  ${assetStr.padEnd(8)} [${statusLabel.padEnd(13)}]  ` +
      `start=${formatPrice(startPrice)}  end=${formatPrice(endPrice)}  ` +
      `bettors=${bettorCount}  interval=${intervalSec}s`,
    );
    console.log(
      `        lock=${formatTime(lockAt)}  settle=${formatTime(settleAt)} ${countdown}` +
      (poolsRevealed ? `  UP=${upPool}gwei DOWN=${downPool}gwei` : "  pools=ENCRYPTED") +
      (Number(status) === 3 ? `  outcome=${outcomeUp ? "UP ↑" : "DOWN ↓"}` : "") +
      (myStake > 0n ? `  myStake=${formatEther(myStake)}ETH` : ""),
    );
  }
  console.log("═════════════════════════════════════════════════════\n");
}

async function cmdCreate(asset: string, intervalMinutes = 5) {
  const symbol = asset.replace("/USD", "").replace("USD", "");
  console.log(`\nFetching ${symbol} price from Binance...`);
  const price = await fetchPrice(symbol);
  console.log(`  Live price: $${price.toLocaleString("en-US", { minimumFractionDigits: 2 })}`);

  const startPrice = priceToUint64(price);
  const now = Math.floor(Date.now() / 1000);
  const interval = intervalMinutes * 60;
  const lockAt = BigInt(now + interval);
  const settleAt = BigInt(now + interval + 60);
  const oracleRoundId = `${symbol}-${intervalMinutes}M-${now}`;

  console.log(`  Creating ${asset} round (${intervalMinutes}m interval)...`);
  const gasPrice = (await pub.getGasPrice() * 13n) / 10n;
  const hash = await wal.writeContract({
    address: ROUNDS_ADDRESS, abi: ABI,
    functionName: "createRound",
    args: [encodeLabel(asset), interval, startPrice, lockAt, settleAt, encodeLabel(oracleRoundId)],
    gasPrice,
  });
  console.log(`  ✅ Created! tx=${hash}`);
  console.log(`  🔍 https://sepolia.arbiscan.io/tx/${hash}\n`);
}

async function cmdBet(roundId: number, isUp: boolean, ethStr: string) {
  const ethAmount = parseEther(ethStr);
  const direction = isUp ? "UP ↑" : "DOWN ↓";
  console.log(`\nPlacing bet on round #${roundId}: ${direction} with ${ethStr} ETH...`);

  const [, , , lockAt, , , , status] = await pub.readContract({
    address: ROUNDS_ADDRESS, abi: ABI, functionName: "getRoundCore", args: [BigInt(roundId)],
  });
  const now = BigInt(Math.floor(Date.now() / 1000));

  if (Number(status) !== 1) {
    console.error(`  ❌ Round #${roundId} is not OPEN (status=${STATUS_LABELS[Number(status)]})`);
    process.exit(1);
  }
  if (now >= lockAt) {
    console.error(`  ❌ Round #${roundId} is past lockAt — too late to bet`);
    process.exit(1);
  }

  const gasPrice = (await pub.getGasPrice() * 13n) / 10n;
  const hash = await wal.writeContract({
    address: ROUNDS_ADDRESS, abi: ABI,
    functionName: "placeRoundBetSimple",
    args: [BigInt(roundId), isUp],
    value: ethAmount,
    gasPrice,
  });
  console.log(`  ✅ Bet placed (${direction})! tx=${hash}`);
  console.log(`  🔍 https://sepolia.arbiscan.io/tx/${hash}\n`);
}

async function cmdLock(roundId: number) {
  console.log(`\nLocking round #${roundId}...`);
  const gasPrice = (await pub.getGasPrice() * 13n) / 10n;
  const hash = await wal.writeContract({
    address: ROUNDS_ADDRESS, abi: ABI,
    functionName: "lockRound",
    args: [BigInt(roundId)],
    gasPrice,
  });
  console.log(`  ✅ Locked! tx=${hash}`);
  console.log(`  🔍 https://sepolia.arbiscan.io/tx/${hash}\n`);
}

async function cmdResolve(roundId: number) {
  const [asset, , , , , , , status] = await pub.readContract({
    address: ROUNDS_ADDRESS, abi: ABI, functionName: "getRoundCore", args: [BigInt(roundId)],
  });
  const symbol = bytes32ToAsset(asset).replace("/USD", "").replace("USD", "");

  console.log(`\nResolving round #${roundId} (${bytes32ToAsset(asset)})...`);
  console.log(`  Fetching ${symbol} price from Binance...`);
  const price = await fetchPrice(symbol);
  console.log(`  Live price: $${price.toLocaleString("en-US", { minimumFractionDigits: 2 })}`);

  const endPrice = priceToUint64(price);
  const observedAt = BigInt(Math.floor(Date.now() / 1000));
  const sig = await signOracle(BigInt(roundId), endPrice, observedAt);

  console.log(`  Signing oracle message and resolving...`);
  const gasPrice = (await pub.getGasPrice() * 13n) / 10n;
  const hash = await wal.writeContract({
    address: ROUNDS_ADDRESS, abi: ABI,
    functionName: "resolveRound",
    args: [BigInt(roundId), endPrice, observedAt, sig],
    gasPrice,
  });
  console.log(`  ✅ Resolved! tx=${hash}`);
  console.log(`  🔍 https://sepolia.arbiscan.io/tx/${hash}\n`);
}

async function cmdRevealPools(roundId: number) {
  console.log(`\nRevealing pools for round #${roundId} via CoFHE...`);
  await ensureCofheConnected(pub, wal);

  const [upCtHash, downCtHash] = await Promise.all([
    pub.readContract({ address: ROUNDS_ADDRESS, abi: ABI, functionName: "getUpPool", args: [BigInt(roundId)] }),
    pub.readContract({ address: ROUNDS_ADDRESS, abi: ABI, functionName: "getDownPool", args: [BigInt(roundId)] }),
  ]);

  const up = await decryptPublicHandle(upCtHash);
  const down = await decryptPublicHandle(downCtHash);

  const gasPrice = (await pub.getGasPrice() * 13n) / 10n;
  const hash = await wal.writeContract({
    address: ROUNDS_ADDRESS, abi: ABI,
    functionName: "revealRoundPools",
    args: [BigInt(roundId), up.value, up.signature, down.value, down.signature],
    gasPrice,
  });
  console.log(`  ✅ Pools revealed! tx=${hash}`);
  console.log(`  UP=${up.value}gwei  DOWN=${down.value}gwei`);
  console.log(`  🔍 https://sepolia.arbiscan.io/tx/${hash}\n`);
}

async function cmdRevealDirection(roundId: number, isUp: boolean) {
  console.log(`\nRevealing direction for round #${roundId}: ${isUp ? "UP" : "DOWN"}...`);
  await ensureCofheConnected(pub, wal);

  const directionCtHash = await pub.readContract({
    address: ROUNDS_ADDRESS, abi: ABI, functionName: "getRoundDirection", args: [BigInt(roundId)], account: account.address,
  });

  const decrypted = await decryptPermittedBool(directionCtHash);

  if (decrypted.directionUp !== isUp) {
    console.warn(`  ⚠ Decrypted direction is ${decrypted.directionUp ? "UP" : "DOWN"} (you passed ${isUp ? "UP" : "DOWN"})`);
  }

  const gasPrice = (await pub.getGasPrice() * 13n) / 10n;
  const hash = await wal.writeContract({
    address: ROUNDS_ADDRESS, abi: ABI,
    functionName: "revealMyDirection",
    args: [BigInt(roundId), decrypted.directionUp, decrypted.signature],
    gasPrice,
  });
  console.log(`  ✅ Direction revealed! tx=${hash}`);
  console.log(`  🔍 https://sepolia.arbiscan.io/tx/${hash}\n`);
}

async function cmdClaim(roundId: number) {
  console.log(`\nClaiming payout for round #${roundId}...`);
  console.log("  (Requires reveal-pools + reveal-direction first)");
  const gasPrice = (await pub.getGasPrice() * 13n) / 10n;
  const hash = await wal.writeContract({
    address: ROUNDS_ADDRESS, abi: ABI,
    functionName: "claimRoundPayout",
    args: [BigInt(roundId)],
    gasPrice,
  });
  console.log(`  ✅ Claimed! tx=${hash}`);
  console.log(`  🔍 https://sepolia.arbiscan.io/tx/${hash}\n`);
}

async function cmdCancel(roundId: number) {
  console.log(`\nCanceling round #${roundId}...`);
  const gasPrice = (await pub.getGasPrice() * 13n) / 10n;
  const hash = await wal.writeContract({
    address: ROUNDS_ADDRESS, abi: ABI,
    functionName: "cancelRound",
    args: [BigInt(roundId), "manual CLI cancel"],
    gasPrice,
  });
  console.log(`  ✅ Canceled! tx=${hash}`);
  console.log(`  🔍 https://sepolia.arbiscan.io/tx/${hash}\n`);
}

// ─── Router ──────────────────────────────────────────────────────────────────

const [, , cmd, ...args] = process.argv;

const HELP = `
  PHANTOM Rounds CLI
  ══════════════════
  npx tsx cli.ts status                   — show all rounds
  npx tsx cli.ts create BTC/USD           — create 5m BTC/USD round
  npx tsx cli.ts create ETH/USD 15        — create 15m ETH/USD round
  npx tsx cli.ts create SOL/USD 5         — create 5m SOL/USD round
  npx tsx cli.ts bet <roundId> up <eth>   — bet UP on round
  npx tsx cli.ts bet <roundId> down <eth> — bet DOWN on round
  npx tsx cli.ts lock <roundId>           — lock round (bot/owner only)
  npx tsx cli.ts resolve <roundId>        — resolve with live Binance price
  npx tsx cli.ts reveal-pools <roundId>   — CoFHE decrypt + reveal pool totals
  npx tsx cli.ts reveal-direction <roundId> up|down — reveal your bet direction
  npx tsx cli.ts claim <roundId>          — claim winning payout (after reveals)
  npx tsx cli.ts cancel <roundId>         — cancel round (owner only)

  Requires bot/.env with PRIVATE_KEY, PHANTOM_ROUNDS_ADDRESS, RPC_URL
`;

if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
  console.log(HELP);
  process.exit(0);
}

try {
  if (cmd === "status") {
    await cmdStatus();
  } else if (cmd === "create") {
    await cmdCreate(args[0] ?? "BTC/USD", args[1] ? parseInt(args[1]) : 5);
  } else if (cmd === "bet") {
    const roundId = parseInt(args[0]);
    const isUp = args[1]?.toLowerCase() === "up";
    const eth = args[2] ?? "0.005";
    if (isNaN(roundId)) { console.error("Usage: bet <roundId> up|down <ethAmount>"); process.exit(1); }
    await cmdBet(roundId, isUp, eth);
  } else if (cmd === "lock") {
    await cmdLock(parseInt(args[0]));
  } else if (cmd === "resolve") {
    await cmdResolve(parseInt(args[0]));
  } else if (cmd === "reveal-pools") {
    await cmdRevealPools(parseInt(args[0]));
  } else if (cmd === "reveal-direction") {
    const roundId = parseInt(args[0]);
    const isUp = args[1]?.toLowerCase() === "up";
    if (isNaN(roundId) || !args[1]) {
      console.error("Usage: reveal-direction <roundId> up|down");
      process.exit(1);
    }
    await cmdRevealDirection(roundId, isUp);
  } else if (cmd === "claim") {
    await cmdClaim(parseInt(args[0]));
  } else if (cmd === "cancel") {
    await cmdCancel(parseInt(args[0]));
  } else {
    console.error(`Unknown command: ${cmd}`);
    console.log(HELP);
    process.exit(1);
  }
} catch (err) {
  console.error("\n❌ Error:", err instanceof Error ? err.message : err);
  process.exit(1);
}
