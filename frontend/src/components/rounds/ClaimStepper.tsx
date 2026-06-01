import { CheckCircle2, Circle, Eye, Wallet, Zap } from "lucide-react";
import type { Round } from "@/hooks/useRounds";

const steps = [
  { key: "resolved", label: "Round resolved", icon: CheckCircle2 },
  { key: "pools", label: "Pools revealed", icon: Eye },
  { key: "direction", label: "Your direction revealed", icon: Zap },
  { key: "claim", label: "Claim ETH payout", icon: Wallet },
] as const;

export function ClaimStepper({
  round,
  directionRevealed,
}: {
  round: Round;
  directionRevealed: boolean;
}) {
  const done = {
    resolved: round.status === 3,
    pools: round.poolsRevealed,
    direction: directionRevealed,
    claim: round.hasClaimed,
  };

  const isWinner =
    round.status === 3 &&
    round.poolsRevealed &&
    directionRevealed &&
    round.revealedDirectionUp === round.outcomeUp;

  return (
    <div className="rounded-xl border border-border/20 bg-white/[0.02] p-4 space-y-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-mono">
        Payout path (on-chain)
      </p>
      <div className="grid gap-2">
        {steps.map((s, i) => {
          const complete = done[s.key as keyof typeof done];
          const Icon = s.icon;
          return (
            <div key={s.key} className="flex items-center gap-3">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  complete ? "bg-emerald-500/20 text-emerald-400" : "bg-muted/30 text-muted-foreground"
                }`}
              >
                {complete ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
              </div>
              <span className={`text-xs font-mono ${complete ? "text-foreground" : "text-muted-foreground"}`}>
                {i + 1}. {s.label}
              </span>
            </div>
          );
        })}
      </div>
      {round.status === 3 && round.poolsRevealed && directionRevealed && (
        <p className={`text-xs font-mono ${isWinner ? "text-emerald-400" : "text-muted-foreground"}`}>
          {isWinner
            ? "You matched the winning side — use Claim Payout below."
            : `Market settled ${round.outcomeUp ? "UP" : "DOWN"} — your revealed side did not win.`}
        </p>
      )}
    </div>
  );
}
