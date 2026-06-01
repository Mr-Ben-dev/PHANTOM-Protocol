import type { Round } from "@/hooks/useRounds";

export const LIVE_ASSETS = ["BTC/USD", "ETH/USD", "SOL/USD"] as const;

/** One OPEN round per asset (newest id wins). Keeper auto-creates missing assets. */
export function pickLiveRounds(rounds: Round[]): Round[] {
  return LIVE_ASSETS.map((asset) => {
    const symbol = asset.replace("/USD", "");
    const matches = rounds
      .filter((r) => r.status === 1 && (r.asset === asset || r.asset.toUpperCase().includes(symbol)))
      .sort((a, b) => Number(b.id - a.id));
    return matches[0];
  }).filter((r): r is Round => r != null);
}

/** Recent resolved rounds only (avoid listing 50+ history). */
export function pickRecentResolved(rounds: Round[], limit = 12): Round[] {
  return rounds.filter((r) => r.status === 3).slice(0, limit);
}

export function pickLockedRounds(rounds: Round[]): Round[] {
  return rounds.filter((r) => r.status === 2).sort((a, b) => Number(b.id - a.id));
}

export function pickMyRounds(rounds: Round[]): Round[] {
  return rounds.filter((r) => r.hasBet).sort((a, b) => Number(b.id - a.id));
}
