/**
 * PHANTOM Protocol — Market Seed Script
 *
 * Creates 10 real prediction markets on PhantomBet (Arbitrum Sepolia).
 * Uses PRIVATE_KEY from bot/.env (deployer wallet, already authorized).
 *
 * Run from the /bot directory:
 *   npx tsx seed-markets.ts
 */

import "dotenv/config";
import {
  createPublicClient,
  createWalletClient,
  parseAbi,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";
import { arbSepoliaTransport } from "./rpc.js";

// ─── Config ──────────────────────────────────────────────────────────────────

const PRIVATE_KEY = (process.env.PRIVATE_KEY ?? "") as Hex;

// PhantomBet contract (Wave 1 prediction markets)
const PHANTOM_BET_ADDRESS = (
  process.env.PHANTOM_BET_ADDRESS ?? "0x561428264991044f47705C92CE482E37C9cD71b7"
) as Address;

if (!PRIVATE_KEY.startsWith("0x")) {
  console.error("❌  PRIVATE_KEY must start with 0x — check bot/.env");
  process.exit(1);
}

const account = privateKeyToAccount(PRIVATE_KEY);
const transport = arbSepoliaTransport();
const pub = createPublicClient({ chain: arbitrumSepolia, transport });
const wal = createWalletClient({ account, chain: arbitrumSepolia, transport });

const ABI = parseAbi([
  "function getMarketCount() view returns (uint256)",
  "function createMarket(string _question, uint256 _deadline, uint256 _resolutionTime) returns (uint256 marketId)",
  "function owner() view returns (address)",
  "function roles(address) view returns (uint8)",
]);

// ─── Market definitions ───────────────────────────────────────────────────────
// Deadlines relative to May 2026. Resolution = deadline + 7 days.

function ts(isoDate: string) {
  return BigInt(Math.floor(new Date(isoDate).getTime() / 1000));
}
function tsPlus7(isoDate: string) {
  return BigInt(Math.floor(new Date(isoDate).getTime() / 1000) + 7 * 86400);
}

const MARKETS = [
  {
    question: "Will Bitcoin reach $150,000 by December 2026?",
    deadline: ts("2026-12-01T00:00:00Z"),
    resolutionTime: tsPlus7("2026-12-01T00:00:00Z"),
  },
  {
    question: "Will Ethereum break $5,000 in Q3 2026?",
    deadline: ts("2026-09-30T00:00:00Z"),
    resolutionTime: tsPlus7("2026-09-30T00:00:00Z"),
  },
  {
    question: "Will the US Federal Reserve cut rates before August 2026?",
    deadline: ts("2026-07-31T00:00:00Z"),
    resolutionTime: tsPlus7("2026-07-31T00:00:00Z"),
  },
  {
    question: "Will Solana flip Ethereum by market cap before end of 2026?",
    deadline: ts("2026-12-31T00:00:00Z"),
    resolutionTime: tsPlus7("2026-12-31T00:00:00Z"),
  },
  {
    question: "Will DeFi total TVL exceed $200B by end of 2026?",
    deadline: ts("2026-12-31T00:00:00Z"),
    resolutionTime: tsPlus7("2026-12-31T00:00:00Z"),
  },
  {
    question: "Will any AI token enter the crypto top 10 by market cap in Q3 2026?",
    deadline: ts("2026-09-30T00:00:00Z"),
    resolutionTime: tsPlus7("2026-09-30T00:00:00Z"),
  },
  {
    question: "Will Bitcoin spot ETF daily inflows exceed $1B in a single day in 2026?",
    deadline: ts("2026-12-31T00:00:00Z"),
    resolutionTime: tsPlus7("2026-12-31T00:00:00Z"),
  },
  {
    question: "Will Ethereum Layer 2 total TVL surpass $100B by September 2026?",
    deadline: ts("2026-09-30T00:00:00Z"),
    resolutionTime: tsPlus7("2026-09-30T00:00:00Z"),
  },
  {
    question: "Will NVIDIA surpass Apple as the world's most valuable company by June 2026?",
    deadline: ts("2026-06-30T00:00:00Z"),
    resolutionTime: tsPlus7("2026-06-30T00:00:00Z"),
  },
  {
    question: "Will a spot Solana ETF be approved in the United States before December 2026?",
    deadline: ts("2026-12-31T00:00:00Z"),
    resolutionTime: tsPlus7("2026-12-31T00:00:00Z"),
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log("\n═══════════════════════════════════════════════════════");
console.log("  PHANTOM Protocol — PhantomBet Market Seeder");
console.log("═══════════════════════════════════════════════════════");
console.log(`  Wallet  : ${account.address}`);
console.log(`  Contract: ${PHANTOM_BET_ADDRESS}`);
console.log(`  Network : Arbitrum Sepolia`);
console.log("───────────────────────────────────────────────────────\n");

// Check current count so we don't duplicate
const existingCount = await pub.readContract({
  address: PHANTOM_BET_ADDRESS, abi: ABI, functionName: "getMarketCount",
});
console.log(`  Existing markets: ${existingCount}`);
if (existingCount >= BigInt(MARKETS.length)) {
  console.log("  ✅ All markets already seeded — nothing to do.");
  process.exit(0);
}

const startIdx = Number(existingCount);
const gasPrice = (await pub.getGasPrice() * 13n) / 10n;

for (let i = startIdx; i < MARKETS.length; i++) {
  const { question, deadline, resolutionTime } = MARKETS[i];
  const deadlineDate = new Date(Number(deadline) * 1000).toDateString();

  console.log(`  [${i + 1}/${MARKETS.length}] Creating market…`);
  console.log(`         Q: "${question}"`);
  console.log(`         Deadline: ${deadlineDate}`);

  try {
    const hash = await wal.writeContract({
      address: PHANTOM_BET_ADDRESS,
      abi: ABI,
      functionName: "createMarket",
      args: [question, deadline, resolutionTime],
      gasPrice,
    });

    // Wait for confirmation
    const receipt = await pub.waitForTransactionReceipt({ hash, confirmations: 1 });
    console.log(`         ✅ Market #${i} created  tx=${hash}`);
    console.log(`         🔍 https://sepolia.arbiscan.io/tx/${hash}\n`);

    // Small delay to avoid nonce collisions
    await new Promise((r) => setTimeout(r, 3000));
  } catch (err) {
    console.error(`         ❌ Failed: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}

const finalCount = await pub.readContract({
  address: PHANTOM_BET_ADDRESS, abi: ABI, functionName: "getMarketCount",
});

console.log("═══════════════════════════════════════════════════════");
console.log(`  ✅ Done! ${finalCount} markets live on PhantomBet`);
console.log("═══════════════════════════════════════════════════════\n");
