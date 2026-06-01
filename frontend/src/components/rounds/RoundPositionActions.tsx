import { useState } from "react";
import { Zap, ShieldCheck, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Round } from "@/hooks/useRounds";
import { useDecryptRoundPools } from "@/hooks/useDecryptRoundPools";
import { useRevealRoundDirection } from "@/hooks/useRevealRoundDirection";
import { usePhantomRounds } from "@/hooks/usePhantomRounds";

interface RoundPositionActionsProps {
  round: Round;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onMessage: (msg: string) => void;
  onDone: () => void;
}

export function RoundPositionActions({
  round,
  busy,
  onBusyChange,
  onMessage,
  onDone,
}: RoundPositionActionsProps) {
  const { claimRoundPayout, refundCanceledRound } = usePhantomRounds();
  const { reveal: revealPools, isRevealing: poolsRevealing, error: poolsError } = useDecryptRoundPools(round.id);
  const { reveal: revealDirection, isRevealing: dirRevealing, error: dirError, result: dirResult } = useRevealRoundDirection(round.id);
  const [claiming, setClaiming] = useState(false);

  const directionRevealed = round.directionRevealed || !!dirResult;
  const revealedUp = dirResult?.directionUp ?? round.revealedDirectionUp;
  const isWinner =
    round.status === 3 &&
    round.poolsRevealed &&
    directionRevealed &&
    revealedUp === round.outcomeUp;

  async function handleClaim() {
    onBusyChange(true);
    setClaiming(true);
    onMessage("");
    try {
      const txHash = await claimRoundPayout(round.id);
      onMessage(`Payout claimed: ${txHash}`);
      onDone();
    } catch (err) {
      onMessage(err instanceof Error ? err.message : "Claim failed.");
    } finally {
      setClaiming(false);
      onBusyChange(false);
    }
  }

  async function handleRefund() {
    onBusyChange(true);
    onMessage("");
    try {
      const txHash = await refundCanceledRound(round.id);
      onMessage(`Refunded: ${txHash}`);
      onDone();
    } catch (err) {
      onMessage(err instanceof Error ? err.message : "Refund failed.");
    } finally {
      onBusyChange(false);
    }
  }

  if (!round.hasBet) return null;

  if (round.status === 4 && !round.hasClaimed) {
    return (
      <Button variant="outline" size="sm" className="gap-2" disabled={busy} onClick={handleRefund}>
        Refund
      </Button>
    );
  }

  if (round.status !== 3) {
    return (
      <span className="text-xs text-primary font-mono flex items-center gap-1">
        <ShieldCheck className="w-3 h-3" /> SEALED
      </span>
    );
  }

  if (round.hasClaimed) {
    return <span className="text-xs text-emerald-400 font-mono">CLAIMED</span>;
  }

  if (!round.poolsRevealed) {
    return (
      <div className="flex flex-col gap-1">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={busy || poolsRevealing}
          onClick={async () => {
            onBusyChange(true);
            onMessage("");
            try {
              await revealPools();
              onMessage(`Pools revealed for round #${round.id}`);
              onDone();
            } catch {
              onMessage(poolsError ?? "Pool reveal failed.");
            } finally {
              onBusyChange(false);
            }
          }}
        >
          <Eye className="w-4 h-4" /> {poolsRevealing ? "Revealing pools…" : "Reveal Pools"}
        </Button>
        <span className="text-[10px] text-muted-foreground font-mono">Keeper auto-reveals — use if stuck</span>
      </div>
    );
  }

  if (!directionRevealed) {
    return (
      <div className="flex flex-col gap-1">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={busy || dirRevealing}
          onClick={async () => {
            onBusyChange(true);
            onMessage("");
            try {
              await revealDirection();
              onMessage(`Direction revealed for round #${round.id}`);
              onDone();
            } catch {
              onMessage(dirError ?? "Direction reveal failed.");
            } finally {
              onBusyChange(false);
            }
          }}
        >
          <Eye className="w-4 h-4" /> {dirRevealing ? "Revealing…" : "Reveal Direction"}
        </Button>
      </div>
    );
  }

  if (!isWinner) {
    return <span className="text-xs text-muted-foreground font-mono">Settled — not on winning side</span>;
  }

  return (
    <Button variant="hero" size="sm" className="gap-2" disabled={busy || claiming} onClick={handleClaim}>
      <Zap className="w-4 h-4" /> {claiming ? "Claiming…" : "Claim Payout"}
    </Button>
  );
}
