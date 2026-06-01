import { useAccount, useReadContracts } from "wagmi";
import {
  PHANTOM_ROUNDS_ABI,
  PHANTOM_ROUNDS_ADDRESS,
  ZERO_ADDRESS,
} from "@/config/contracts";

export type RoundStatus = 0 | 1 | 2 | 3 | 4 | 5;

export const ROUND_STATUS_LABEL: Record<RoundStatus, string> = {
  0: "None",
  1: "Open",
  2: "Locked",
  3: "Resolved",
  4: "Canceled",
  5: "Pending Reveal",
};

export interface Round {
  id: bigint;
  asset: string;
  intervalSeconds: number;
  startPrice: bigint;
  endPrice: bigint;
  lockAt: bigint;
  settleAt: bigint;
  bettorCount: bigint;
  creator: `0x${string}`;
  status: RoundStatus;
  statusLabel: string;
  outcomeUp: boolean;
  poolsRevealed: boolean;
  revealedUpPool: bigint;
  revealedDownPool: bigint;
  revealedTotalPool: bigint;
  oracleRoundId: string;
  observedAt: bigint;
  hasBet: boolean;
  hasClaimed: boolean;
  directionRevealed: boolean;
  revealedDirectionUp: boolean;
}

type RoundCoreResult = readonly [
  `0x${string}`,
  number,
  bigint,
  bigint,
  bigint,
  bigint,
  `0x${string}`,
  number,
];

type RoundSettlementResult = readonly [
  bigint,
  number,
  boolean,
  boolean,
  bigint,
  bigint,
  bigint,
  `0x${string}`,
  bigint,
];

function bytes32ToLabel(value: `0x${string}`): string {
  const hex = value.startsWith("0x") ? value.slice(2) : value;
  const chars: string[] = [];

  for (let i = 0; i < hex.length; i += 2) {
    const byte = Number.parseInt(hex.slice(i, i + 2), 16);
    if (!byte) break;
    chars.push(String.fromCharCode(byte));
  }

  return chars.join("") || "UNKNOWN";
}

export function isRoundsConfigured() {
  return PHANTOM_ROUNDS_ADDRESS !== ZERO_ADDRESS;
}

export function useRounds() {
  const { address } = useAccount();
  const configured = isRoundsConfigured();

  const { data: countData, isLoading: countLoading, refetch: refetchCount } = useReadContracts({
    contracts: [
      {
        address: PHANTOM_ROUNDS_ADDRESS,
        abi: PHANTOM_ROUNDS_ABI,
        functionName: "getRoundCount",
      },
    ],
    query: { enabled: configured },
  });

  const count = (countData?.[0]?.result as bigint | undefined) ?? 0n;
  const countN = Number(count);

  const roundContracts = Array.from({ length: countN }, (_, i) => {
    const id = BigInt(i);
    return [
      {
        address: PHANTOM_ROUNDS_ADDRESS,
        abi: PHANTOM_ROUNDS_ABI,
        functionName: "getRoundCore" as const,
        args: [id] as const,
      },
      {
        address: PHANTOM_ROUNDS_ADDRESS,
        abi: PHANTOM_ROUNDS_ABI,
        functionName: "getRoundSettlement" as const,
        args: [id] as const,
      },
      ...(address
        ? [
            {
              address: PHANTOM_ROUNDS_ADDRESS,
              abi: PHANTOM_ROUNDS_ABI,
              functionName: "hasRoundBet" as const,
              args: [id, address] as const,
            },
            {
              address: PHANTOM_ROUNDS_ADDRESS,
              abi: PHANTOM_ROUNDS_ABI,
              functionName: "hasRoundClaimed" as const,
              args: [id, address] as const,
            },
            {
              address: PHANTOM_ROUNDS_ADDRESS,
              abi: PHANTOM_ROUNDS_ABI,
              functionName: "directionRevealed" as const,
              args: [id, address] as const,
            },
            {
              address: PHANTOM_ROUNDS_ADDRESS,
              abi: PHANTOM_ROUNDS_ABI,
              functionName: "revealedDirections" as const,
              args: [id, address] as const,
            },
          ]
        : []),
    ];
  }).flat();

  const {
    data: batchData,
    isLoading: batchLoading,
    refetch: refetchRounds,
  } = useReadContracts({
    contracts: roundContracts as never,
    query: { enabled: configured && countN > 0 },
  });

  const stride = address ? 6 : 2;
  const rounds: Round[] = [];

  for (let i = 0; i < countN; i++) {
    const core = batchData?.[i * stride]?.result as RoundCoreResult | undefined;
    const settlement = batchData?.[i * stride + 1]?.result as RoundSettlementResult | undefined;
    if (!core || !settlement) continue;

    const status = Number(settlement[1] ?? core[7]) as RoundStatus;
    rounds.push({
      id: BigInt(i),
      asset: bytes32ToLabel(core[0]),
      intervalSeconds: Number(core[1]),
      startPrice: BigInt(core[2]),
      endPrice: BigInt(settlement[0]),
      lockAt: BigInt(core[3]),
      settleAt: BigInt(core[4]),
      bettorCount: BigInt(core[5]),
      creator: core[6],
      status,
      statusLabel: ROUND_STATUS_LABEL[status] ?? "Unknown",
      outcomeUp: settlement[2],
      poolsRevealed: settlement[3],
      revealedUpPool: BigInt(settlement[4]),
      revealedDownPool: BigInt(settlement[5]),
      revealedTotalPool: BigInt(settlement[6]),
      oracleRoundId: bytes32ToLabel(settlement[7]),
      observedAt: BigInt(settlement[8]),
      hasBet: address ? Boolean(batchData?.[i * stride + 2]?.result) : false,
      hasClaimed: address ? Boolean(batchData?.[i * stride + 3]?.result) : false,
      directionRevealed: address ? Boolean(batchData?.[i * stride + 4]?.result) : false,
      revealedDirectionUp: address ? Boolean(batchData?.[i * stride + 5]?.result) : false,
    });
  }

  rounds.sort((a, b) => Number(b.id - a.id));

  return {
    rounds,
    count: countN,
    configured,
    isLoading: configured && (countLoading || batchLoading),
    refetch: () => {
      void refetchCount();
      void refetchRounds();
    },
  };
}
