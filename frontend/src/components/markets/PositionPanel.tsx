import { useState } from "react";
import { formatEther } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { Button } from "@/components/ui/button";
import { PHANTOM_BET_ABI, PHANTOM_BET_ADDRESS } from "@/config/contracts";
import { useDecryptPosition } from "@/hooks/useDecryptPosition";
import { useRevealBetSide } from "@/hooks/useRevealBetSide";
import { usePhantomBet } from "@/hooks/usePhantomBet";
import { ShieldCheck } from "lucide-react";

interface PositionPanelProps {
  marketId: bigint;
  hasBet: boolean;
  resolved: boolean;
  poolsRevealed: boolean;
  sideRevealed?: boolean;
  onClaimed?: () => void;
  /** Inside market detail sidebar (no extra card chrome) */
  embedded?: boolean;
}

export function PositionPanel({
  marketId,
  hasBet,
  resolved,
  poolsRevealed,
  sideRevealed = false,
  onClaimed,
  embedded = false,
}: PositionPanelProps) {
  const { address } = useAccount();
  const { decrypt, hide, result, isDecrypting, error } = useDecryptPosition(marketId);
  const { reveal, isRevealing, error: revealError } = useRevealBetSide(marketId);
  const { claimPayout } = usePhantomBet();
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  const { data: stakeWei, refetch: refetchStake } = useReadContract({
    address: PHANTOM_BET_ADDRESS,
    abi: PHANTOM_BET_ABI,
    functionName: "ethStakes",
    args: [marketId, address!],
    query: { enabled: !!address && hasBet },
  });

  const { data: onChainSideRevealed } = useReadContract({
    address: PHANTOM_BET_ADDRESS,
    abi: PHANTOM_BET_ABI,
    functionName: "sideRevealed",
    args: [marketId, address!],
    query: { enabled: !!address && hasBet },
  });

  const { data: onChainRevealedYes } = useReadContract({
    address: PHANTOM_BET_ADDRESS,
    abi: PHANTOM_BET_ABI,
    functionName: "revealedSides",
    args: [marketId, address!],
    query: { enabled: !!address && hasBet && onChainSideRevealed === true },
  });

  const { data: hasClaimed } = useReadContract({
    address: PHANTOM_BET_ADDRESS,
    abi: PHANTOM_BET_ABI,
    functionName: "hasClaimed",
    args: [marketId, address!],
    query: { enabled: !!address && hasBet },
  });

  const sideDone = sideRevealed || onChainSideRevealed === true;
  const sideVisible = result?.isYes !== undefined;
  const sideLabel = sideVisible
    ? result!.isYes
      ? "YES"
      : "NO"
    : sideDone && onChainRevealedYes !== undefined
      ? onChainRevealedYes
        ? "YES"
        : "NO"
      : null;

  if (!hasBet) return null;

  async function handleClaim() {
    setClaiming(true);
    setClaimError(null);
    try {
      await claimPayout(marketId);
      onClaimed?.();
      void refetchStake();
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : String(err));
    } finally {
      setClaiming(false);
    }
  }

  const shell = embedded
    ? "space-y-4"
    : "rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3";

  return (
    <div className={shell}>
      <p className="text-xs font-medium uppercase tracking-wider text-primary/70 flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5" /> Your position
      </p>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">ETH stake (public)</span>
          <span className="font-mono text-foreground">
            {stakeWei != null ? `${formatEther(stakeWei)} ETH` : "…"}
          </span>
        </div>
        <div className="flex justify-between gap-4 items-center">
          <span className="text-muted-foreground">Side (FHE)</span>
          <span className="font-mono text-primary">
            {sideLabel ?? (sideDone ? "revealed on-chain" : "sealed")}
          </span>
        </div>
      </div>

      {!sideLabel && !sideDone && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          disabled={isDecrypting}
          onClick={() => decrypt()}
        >
          {isDecrypting ? "Signing permit & decrypting…" : "View my side (CoFHE permit)"}
        </Button>
      )}
      {sideVisible && (
        <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={hide}>
          Hide side
        </Button>
      )}
      {error && <p className="text-xs text-destructive break-words">{error}</p>}

      {!resolved && (
        <p className="text-[11px] text-muted-foreground font-mono">
          Claim unlocks after the market resolves, pools are revealed, and you reveal your side on-chain.
        </p>
      )}

      {resolved && !poolsRevealed && (
        <p className="text-[11px] text-amber-300/90 font-mono">
          Resolved — waiting for encrypted pool reveal (operator or Reveal Pools).
        </p>
      )}

      {resolved && poolsRevealed && !sideDone && (
        <Button variant="hero" size="sm" className="w-full" disabled={isRevealing} onClick={() => reveal()}>
          {isRevealing ? "Revealing on-chain…" : "Reveal side to claim"}
        </Button>
      )}
      {revealError && <p className="text-xs text-destructive break-words">{revealError}</p>}

      {resolved && poolsRevealed && sideDone && !hasClaimed && (
        <Button variant="hero" size="sm" className="w-full" disabled={claiming} onClick={handleClaim}>
          {claiming ? "Claiming ETH…" : "Claim payout"}
        </Button>
      )}
      {hasClaimed && (
        <p className="text-xs text-emerald-400 font-mono">Payout claimed</p>
      )}
      {claimError && <p className="text-xs text-destructive break-words">{claimError}</p>}
    </div>
  );
}
