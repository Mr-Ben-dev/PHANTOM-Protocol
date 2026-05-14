import { useReadContracts } from "wagmi";
import { useAccount } from "wagmi";
import { PHANTOM_MULTI_ADDRESS, PHANTOM_MULTI_ABI } from "@/config/contracts";

export interface MultiMarket {
  id: bigint;
  question: string;
  outcomeCount: number;
  deadline: bigint;
  resolutionTime: bigint;
  winningOutcome: number;
  resolved: boolean;
  poolsRevealed: boolean;
  canceled: boolean;
  creator: `0x${string}`;
  /** 0=NONE 1=OPEN 2=RESOLVED 3=CANCELED 4=PENDING_REVEAL */
  status: number;
  /** Outcome labels (8-length, unused slots are empty string) */
  outcomeLabels: string[];
  /** Revealed pool amounts per outcome (after poolsRevealed) */
  revealedPools: bigint[];
  revealedTotalPool: bigint;
  /** Whether the connected wallet has placed a bet */
  hasBet?: boolean;
}

/**
 * Reads all PhantomMulti markets in a two-round batch:
 *  1. Read marketCount.
 *  2. Batch getMultiMarketInfo + getOutcomeLabels + getRevealedPools + hasBet per market.
 */
export function useMultiMarkets() {
  const { address } = useAccount();

  // ── Step 1: marketCount ─────────────────────────────────────────────────
  const { data: countData, isLoading: countLoading } = useReadContracts({
    contracts: [
      {
        address: PHANTOM_MULTI_ADDRESS,
        abi: PHANTOM_MULTI_ABI,
        functionName: "getMultiMarketCount",
      },
    ],
  });

  const count = countData?.[0]?.result ?? 0n;
  const countN = Number(count);

  // ── Step 2: batch reads per market ─────────────────────────────────────
  const SLOTS_PER_MARKET = address ? 4 : 3; // info + labels + pools [+ hasBet]

  const contracts = Array.from({ length: countN }, (_, i) => {
    const id = BigInt(i);
    const base = [
      {
        address: PHANTOM_MULTI_ADDRESS,
        abi: PHANTOM_MULTI_ABI,
        functionName: "getMultiMarketInfo" as const,
        args: [id] as const,
      },
      {
        address: PHANTOM_MULTI_ADDRESS,
        abi: PHANTOM_MULTI_ABI,
        functionName: "getOutcomeLabels" as const,
        args: [id] as const,
      },
      {
        address: PHANTOM_MULTI_ADDRESS,
        abi: PHANTOM_MULTI_ABI,
        functionName: "getRevealedPools" as const,
        args: [id] as const,
      },
    ];

    if (address) {
      base.push({
        address: PHANTOM_MULTI_ADDRESS,
        abi: PHANTOM_MULTI_ABI,
        functionName: "hasBet" as const,
        args: [id, address] as const,
      } as never);
    }

    return base;
  }).flat();

  const { data: batchData, isLoading: batchLoading, refetch } = useReadContracts({
    contracts: contracts as never,
    query: { enabled: countN > 0 },
  });

  const markets: MultiMarket[] = [];

  for (let i = 0; i < countN; i++) {
    const offset = i * SLOTS_PER_MARKET;

    const infoResult = batchData?.[offset]?.result as
      | [string, number, bigint, bigint, number, boolean, boolean, boolean, `0x${string}`, number]
      | undefined;

    if (!infoResult) continue;

    const labelsResult = batchData?.[offset + 1]?.result as string[] | undefined;
    const poolsResult = batchData?.[offset + 2]?.result as
      | { pools: readonly bigint[]; totalPool: bigint }
      | undefined;
    const hasBetResult = address
      ? (batchData?.[offset + 3]?.result as boolean | undefined)
      : undefined;

    const [
      question,
      outcomeCount,
      deadline,
      resolutionTime,
      winningOutcome,
      resolved,
      poolsRevealed,
      canceled,
      creator,
      status,
    ] = infoResult;

    markets.push({
      id: BigInt(i),
      question,
      outcomeCount,
      deadline,
      resolutionTime,
      winningOutcome,
      resolved,
      poolsRevealed,
      canceled,
      creator,
      status,
      outcomeLabels: labelsResult ? Array.from(labelsResult) : [],
      revealedPools: poolsResult ? Array.from(poolsResult.pools) : Array(8).fill(0n),
      revealedTotalPool: poolsResult?.totalPool ?? 0n,
      hasBet: hasBetResult,
    });
  }

  return {
    markets,
    isLoading: countLoading || batchLoading,
    refetch,
  };
}
