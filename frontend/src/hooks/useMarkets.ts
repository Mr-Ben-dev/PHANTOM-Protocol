import { useReadContracts } from "wagmi";
import { PHANTOM_BET_ADDRESS, PHANTOM_BET_ABI } from "@/config/contracts";
import { useAccount } from "wagmi";

export interface Market {
  id: bigint;
  question: string;
  deadline: bigint;
  resolutionTime: bigint;
  bettorCount: bigint;
  resolved: boolean;
  outcome: boolean;
  creator: `0x${string}`;
  poolsRevealed: boolean;
  revealedYesPool: bigint;
  revealedNoPool: bigint;
  revealedTotalPool: bigint;
  /** Whether the connected wallet has placed a bet */
  hasBet?: boolean;
}

/**
 * Reads all markets from the contract.
 *
 * Strategy:
 *  1. Read marketCount (single call).
 *  2. Build one getMarketInfo + one hasBet call per market.
 *  3. Return typed Market[].
 */
export function useMarkets() {
  const { address } = useAccount();

  // Step 1 — get count
  const { data: countData, isLoading: countLoading } = useReadContracts({
    contracts: [
      {
        address: PHANTOM_BET_ADDRESS,
        abi: PHANTOM_BET_ABI,
        functionName: "getMarketCount",
      },
    ],
  });

  const count = countData?.[0]?.result ?? 0n;
  const countN = Number(count);

  // Step 2 — batch getMarketInfo + hasBet for each id
  const marketContracts = Array.from({ length: countN }, (_, i) => {
    const id = BigInt(i);
    return [
      {
        address: PHANTOM_BET_ADDRESS,
        abi: PHANTOM_BET_ABI,
        functionName: "getMarketInfo" as const,
        args: [id] as const,
      },
      ...(address
        ? [
            {
              address: PHANTOM_BET_ADDRESS,
              abi: PHANTOM_BET_ABI,
              functionName: "hasBet" as const,
              args: [id, address] as const,
            },
          ]
        : []),
    ];
  }).flat();

  const { data: batchData, isLoading: batchLoading, refetch } = useReadContracts({
    contracts: marketContracts as never,
    query: { enabled: countN > 0 },
  });

  const stride = address ? 2 : 1;
  const markets: Market[] = [];

  for (let i = 0; i < countN; i++) {
    const infoResult = batchData?.[i * stride]?.result as
      | [string, bigint, bigint, bigint, boolean, boolean, `0x${string}`, boolean, bigint, bigint, bigint]
      | undefined;

    if (!infoResult) continue;

    const [
      question,
      deadline,
      resolutionTime,
      bettorCount,
      resolved,
      outcome,
      creator,
      poolsRevealed,
      revealedYesPool,
      revealedNoPool,
      revealedTotalPool,
    ] = infoResult;

    const hasBetResult = address
      ? (batchData?.[i * stride + 1]?.result as boolean | undefined)
      : undefined;

    markets.push({
      id: BigInt(i),
      question,
      deadline,
      resolutionTime,
      bettorCount,
      resolved,
      outcome,
      creator,
      poolsRevealed,
      revealedYesPool,
      revealedNoPool,
      revealedTotalPool,
      hasBet: hasBetResult ?? false,
    });
  }

  return {
    markets,
    count: countN,
    isLoading: countLoading || batchLoading,
    refetch,
  };
}
