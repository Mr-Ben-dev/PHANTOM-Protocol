import { motion } from "framer-motion";
import { Clock, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Round } from "@/hooks/useRounds";

function formatPrice(value: bigint): string {
  if (value === 0n) return "—";
  return `$${(Number(value) / 1e8).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatCountdown(settleAt: bigint): string {
  const diff = Number(settleAt) - Math.floor(Date.now() / 1000);
  if (diff <= 0) return "Settling…";
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const cardMotion = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

interface LiveRoundBoardProps {
  rounds: Round[];
  amountByRound: Record<string, string>;
  busyRound: string | null;
  onAmountChange: (roundId: string, value: string) => void;
  onBet: (round: Round, up: boolean) => void;
}

export function LiveRoundBoard({
  rounds,
  amountByRound,
  busyRound,
  onAmountChange,
  onBet,
}: LiveRoundBoardProps) {
  const slots = ["BTC/USD", "ETH/USD", "SOL/USD"] as const;

  return (
    <div className="grid md:grid-cols-3 gap-4 mb-8">
      {slots.map((asset) => {
        const round = rounds.find((r) => r.asset === asset || r.asset.includes(asset.replace("/USD", "")));
        const symbol = asset.replace("/USD", "");

        if (!round) {
          return (
            <div
              key={asset}
              className="liquid-glass rounded-2xl p-5 border border-dashed border-border/30 flex flex-col items-center justify-center min-h-[220px] text-center"
            >
              <p className="text-sm font-semibold text-muted-foreground">{symbol}</p>
              <p className="text-xs text-muted-foreground font-mono mt-2">Keeper spawning next 5m round…</p>
            </div>
          );
        }

        const key = String(round.id);
        const busy = busyRound === key;
        const canBet = round.status === 1 && !round.hasBet;

        return (
          <motion.article
            key={key}
            variants={cardMotion}
            className="liquid-glass rounded-2xl p-5 border border-primary/15 flex flex-col"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-lg font-semibold font-mono text-primary">{symbol}</span>
              <span className="text-[10px] font-mono text-amber-300 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {formatCountdown(round.settleAt)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-mono mb-1">Round #{String(round.id)} · 5m</p>
            <p className="text-2xl font-mono font-semibold mb-4">{formatPrice(round.startPrice)}</p>
            <p className="text-[10px] text-primary/80 font-mono flex items-center gap-1 mb-4">
              <ShieldCheck className="w-3 h-3" /> Direction encrypted (CoFHE)
            </p>
            {round.hasBet ? (
              <p className="text-xs text-emerald-400 font-mono mt-auto">You have a sealed bet in this round</p>
            ) : (
              <div className="mt-auto space-y-2">
                <Input
                  value={amountByRound[key] ?? ""}
                  onChange={(e) => onAmountChange(key, e.target.value)}
                  placeholder="0.01 ETH"
                  inputMode="decimal"
                  disabled={!canBet || busy}
                  className="h-9 text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="hero" size="sm" className="gap-1" disabled={!canBet || busy} onClick={() => onBet(round, true)}>
                    <TrendingUp className="w-3.5 h-3.5" /> UP
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1" disabled={!canBet || busy} onClick={() => onBet(round, false)}>
                    <TrendingDown className="w-3.5 h-3.5" /> DOWN
                  </Button>
                </div>
              </div>
            )}
          </motion.article>
        );
      })}
    </div>
  );
}
