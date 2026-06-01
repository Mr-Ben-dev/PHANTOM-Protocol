/**
 * PHANTOM Protocol — Multi-Outcome Market Seed Script
 *
 * Creates 5 multi-outcome prediction markets on PhantomMulti (Arbitrum Sepolia).
 * Uses PRIVATE_KEY from bot/.env (deployer wallet, already authorized).
 *
 * Run from the /bot directory:
 *   npx tsx seed-multi-markets.ts
 */

import "dotenv/config";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";

// ─── Config ──────────────────────────────────────────────────────────────────

const PRIVATE_KEY = (process.env.PRIVATE_KEY ?? "") as Hex;
const RPC_URL = process.env.RPC_URL ?? "https://sepolia-rollup.arbitrum.io/rpc";

const PHANTOM_MULTI_ADDRESS = (
  process.env.PHANTOM_MULTI_ADDRESS ?? ""
) as Address;

if (!PRIVATE_KEY.startsWith("0x")) {
  console.error("❌  PRIVATE_KEY must start with 0x — check bot/.env");
  process.exit(1);
}

if (!PHANTOM_MULTI_ADDRESS.startsWith("0x")) {
  console.error("❌  PHANTOM_MULTI_ADDRESS is not set — add it to bot/.env");
  process.exit(1);
}

const account = privateKeyToAccount(PRIVATE_KEY);
const pub = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(RPC_URL, { timeout: 20_000 }),
});
const wal = createWalletClient({
  account,
  chain: arbitrumSepolia,
  transport: http(RPC_URL, { timeout: 30_000 }),
});

const ABI = parseAbi([
  "function getMultiMarketCount() view returns (uint256)",
  "function createMultiMarket(string _question, string[] _labels, uint256 _deadline, uint256 _resolutionTime) returns (uint256 marketId)",
  "function owner() view returns (address)",
  "function roles(address) view returns (uint8)",
]);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysFromNow(days: number): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + days * 86400);
}

// ─── Market definitions ───────────────────────────────────────────────────────

const MARKETS = [
  {
    question: "What range will BTC trade in at the close of Q3 2026?",
    labels: ["Below $70K", "$70K – $90K", "$90K – $110K", "Above $110K"],
    deadline: daysFromNow(90),
    resolutionTime: daysFromNow(93),
  },
  {
    question: "Who will lead the AI coding assistant market by end of 2026?",
    labels: ["OpenAI / ChatGPT", "Anthropic / Claude", "Google / Gemini", "Meta / Llama"],
    deadline: daysFromNow(180),
    resolutionTime: daysFromNow(187),
  },
  {
    question: "What will ETH's market-cap dominance be in 90 days?",
    labels: ["Below 10%", "10% – 15%", "15% – 20%", "Above 20%"],
    deadline: daysFromNow(90),
    resolutionTime: daysFromNow(93),
  },
  {
    question: "What will the Fed decide at its next FOMC meeting?",
    labels: ["Cut 50 bps", "Cut 25 bps", "Hold", "Hike"],
    deadline: daysFromNow(60),
    resolutionTime: daysFromNow(61),
  },
  {
    question: "Where will SOL trade by end of 2026?",
    labels: ["Below $100", "$100 – $200", "$200 – $300", "Above $300"],
    deadline: daysFromNow(200),
    resolutionTime: daysFromNow(204),
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const owner = await pub.readContract({ address: PHANTOM_MULTI_ADDRESS, abi: ABI, functionName: "owner" });
  const role  = await pub.readContract({ address: PHANTOM_MULTI_ADDRESS, abi: ABI, functionName: "roles", args: [account.address] });
  console.log(`🔑  Seeder: ${account.address}`);
  console.log(`🏗   Contract owner: ${owner}`);
  console.log(`🎭  Seeder role: ${role} (1=CREATOR, 2=BETTOR, 3=RESOLVER)`);

  const before = Number(await pub.readContract({ address: PHANTOM_MULTI_ADDRESS, abi: ABI, functionName: "getMultiMarketCount" }));
  console.log(`\n📊  Existing market count: ${before}`);

  if (before >= MARKETS.length) {
    console.log(`\n✅  Already seeded (${before} markets) — skipping`);
    return;
  }

  for (let i = before; i < MARKETS.length; i++) {
    const m = MARKETS[i];
    console.log(`\n➕  Creating: "${m.question}"`);
    console.log(`    Labels: [${m.labels.join(", ")}]`);
    console.log(`    Deadline: ${new Date(Number(m.deadline) * 1000).toUTCString()}`);
    try {
      const hash = await wal.writeContract({
        address: PHANTOM_MULTI_ADDRESS,
        abi: ABI,
        functionName: "createMultiMarket",
        args: [m.question, m.labels, m.deadline, m.resolutionTime],
      });
      console.log(`    ⏳ tx: ${hash}`);
      const receipt = await pub.waitForTransactionReceipt({ hash, confirmations: 1 });
      console.log(`    ✅ confirmed in block ${receipt.blockNumber} (gas: ${receipt.gasUsed})`);
    } catch (err) {
      console.error(`    ❌ failed:`, err instanceof Error ? err.message : err);
    }
  }

  const after = await pub.readContract({ address: PHANTOM_MULTI_ADDRESS, abi: ABI, functionName: "getMultiMarketCount" });
  console.log(`\n🎉  Done! New market count: ${after}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
