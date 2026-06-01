import { useState, type ReactNode } from "react";
import { Zap, ShieldCheck, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Round } from "@/hooks/useRounds";
import { useDecryptRoundPools } from "@/hooks/useDecryptRoundPools";
import { useRevealRoundDirection } from "@/hooks/useRevealRoundDirection";
import { usePhantomRounds } from "@/hooks/usePhantomRounds";
import { ClaimStepper } from "@/components/rounds/ClaimStepper";

interface RoundPositionActionsProps {
  round: Round;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onMessage: (msg: string) => void;
  onDone: () => void;
  /** Full-width layout for Positions / resolved cards */
  stacked?: boolean;
}

export function RoundPositionActions({
  round,
  busy,
  onBusyChange,
  onMessage,
  onDone,
  stacked = false,
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

  const wrap = (content: ReactNode) =>
    stacked ? (
      <div className="space-y-4 w-full">
        <ClaimStepper round={round} directionRevealed={directionRevealed} />
        {content}
      </div>
    ) : (
      content
    );

  if (!round.poolsRevealed) {
    return wrap(
      <div className="flex flex-col gap-1 w-full">
        <Button
          variant="outline"
          size={stacked ? "default" : "sm"}
          className={`gap-2 ${stacked ? "w-full" : ""}`}
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
        <span className="text-[10px] text-muted-foreground font-mono">Keeper auto-reveals after resolve — use if stuck</span>
      </div>,
    );
  }

  if (!directionRevealed) {
    return wrap(
      <Button
        variant={stacked ? "hero" : "outline"}
        size={stacked ? "default" : "sm"}
        className={`gap-2 ${stacked ? "w-full" : ""}`}
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
        <Eye className="w-4 h-4" /> {dirRevealing ? "CoFHE sign + on-chain reveal…" : "Reveal direction on-chain (claim)"}
      </Button>,
    );
  }

  if (!isWinner) {
    return wrap(
      <span className="text-xs text-muted-foreground font-mono block">
        Settled {round.outcomeUp ? "UP ↑" : "DOWN ↓"} — your revealed side did not win
      </span>,
    );
  }

  return wrap(
    <Button
      variant="hero"
      size={stacked ? "default" : "sm"}
      className={`gap-2 ${stacked ? "w-full" : ""}`}
      disabled={busy || claiming}
      onClick={handleClaim}
    >
      <Zap className="w-4 h-4" /> {claiming ? "Claiming ETH…" : "Claim Payout"}
    </Button>,
  );
}
