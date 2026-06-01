/** Safely coerce viem/wagmi contract read results into plain arrays. */

export function asStringArray(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    // string[8] or nested [[...labels]]
    if (raw.length === 1 && Array.isArray(raw[0])) {
      return asStringArray(raw[0]);
    }
    return raw.map((v) => (v == null ? "" : String(v)));
  }
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.labels)) return asStringArray(obj.labels);
    const indexed = Object.keys(obj)
      .filter((k) => /^\d+$/.test(k))
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => (obj[k] == null ? "" : String(obj[k])));
    if (indexed.length > 0) return indexed;
  }
  return [];
}

export function asBigintArray(raw: unknown, length = 8): bigint[] {
  const fallback = Array(length).fill(0n) as bigint[];
  if (raw == null) return fallback;
  if (Array.isArray(raw)) return raw.map((v) => (typeof v === "bigint" ? v : 0n));
  return fallback;
}

/** Decode getRevealedPools — tuple array or named { pools, totalPool }. */
export function parseRevealedPools(raw: unknown): { pools: bigint[]; totalPool: bigint } {
  const fallback = { pools: Array(8).fill(0n) as bigint[], totalPool: 0n };
  if (raw == null) return fallback;

  if (typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    if ("pools" in obj || "totalPool" in obj) {
      return {
        pools: asBigintArray(obj.pools),
        totalPool: typeof obj.totalPool === "bigint" ? obj.totalPool : 0n,
      };
    }
  }

  if (Array.isArray(raw)) {
    if (raw.length >= 2 && Array.isArray(raw[0])) {
      return {
        pools: asBigintArray(raw[0]),
        totalPool: typeof raw[1] === "bigint" ? raw[1] : 0n,
      };
    }
    if (raw.length === 8 && typeof raw[0] === "bigint") {
      const pools = asBigintArray(raw);
      return { pools, totalPool: pools.reduce((a, b) => a + b, 0n) };
    }
  }

  return fallback;
}

export interface ParsedMultiMarketInfo {
  question: string;
  outcomeCount: number;
  deadline: bigint;
  resolutionTime: bigint;
  winningOutcome: number;
  resolved: boolean;
  poolsRevealed: boolean;
  canceled: boolean;
  creator: `0x${string}`;
  status: number;
  totalEth: bigint;
}

/** Decode getMultiMarketInfo — tuple array or named struct. */
export function parseMultiMarketInfo(raw: unknown): ParsedMultiMarketInfo | null {
  if (raw == null) return null;

  if (Array.isArray(raw)) {
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
      totalEth,
    ] = raw;
    if (question == null) return null;
    return {
      question: String(question),
      outcomeCount: Number(outcomeCount),
      deadline: deadline as bigint,
      resolutionTime: resolutionTime as bigint,
      winningOutcome: Number(winningOutcome),
      resolved: Boolean(resolved),
      poolsRevealed: Boolean(poolsRevealed),
      canceled: Boolean(canceled),
      creator: creator as `0x${string}`,
      status: Number(status),
      totalEth: totalEth as bigint,
    };
  }

  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (o.question == null) return null;
    return {
      question: String(o.question),
      outcomeCount: Number(o.outcomeCount),
      deadline: o.deadline as bigint,
      resolutionTime: o.resolutionTime as bigint,
      winningOutcome: Number(o.winningOutcome),
      resolved: Boolean(o.resolved),
      poolsRevealed: Boolean(o.poolsRevealed),
      canceled: Boolean(o.canceled),
      creator: o.creator as `0x${string}`,
      status: Number(o.status),
      totalEth: o.totalEth as bigint,
    };
  }

  return null;
}
