import { useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { Button } from "@/components/ui/button";
import { EncryptedValue } from "@/components/shared/EncryptedValue";
import { PHANTOM_BET_ABI, PHANTOM_BET_ADDRESS } from "@/config/contracts";
import { useDecryptPosition } from "@/hooks/useDecryptPosition";
import { useRevealBetSide } from "@/hooks/useRevealBetSide";
import { usePhantomBet } from "@/hooks/usePhantomBet";

interface PositionPanelProps {
  marketId: bigint;
  hasBet: boolean;
  resolved: boolean;
  poolsRevealed: boolean;
  sideRevealed?: boolean;
  onClaimed?: () => void;
}

export function PositionPanel({
  marketId,
  hasBet,
  resolved,
  poolsRevealed,
  sideRevealed = false,
  onClaimed,
}: PositionPanelProps) {
  const { address } = useAccount();
  const { decrypt, result, isDecrypting, error } = useDecryptPosition(marketId);
  const { reveal, isRevealing, error: revealError } = useRevealBetSide(marketId);
  const { claimPayout } = usePhantomBet();
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  const { data: onChainSideRevealed } = useReadContract({
    address: PHANTOM_BET_ADDRESS,
    abi: PHANTOM_BET_ABI,
    functionName: "sideRevealed",
    args: [marketId, address!],
    query: { enabled: !!address && hasBet },
  });

  const sideDone = sideRevealed || onChainSideRevealed === true;

  if (!hasBet) return null;

  async function handleClaim() {
    setClaiming(true);
    setClaimError(null);
    try {
      await claimPayout(marketId);
      onClaimed?.();
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : String(err));
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
      <p className="text-xs font-medium uppercase tracking-wider text-primary/70">Your Position</p>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Amount (ETH stake visible)</span>
        <EncryptedValue
          decryptedValue={result?.amount !== undefined ? String(result.amount) : undefined}
          isDecrypting={isDecrypting}
          onReveal={decrypt}
          unit="gwei"
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Side</span>
        <EncryptedValue
          decryptedValue={
            result?.isYes !== undefined ? (result.isYes ? "YES" : "NO") : undefined
          }
          isDecrypting={isDecrypting}
          onReveal={!result ? decrypt : undefined}
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {resolved && poolsRevealed && !sideDone && (
        <Button variant="outline" size="sm" className="w-full" disabled={isRevealing} onClick={reveal}>
          {isRevealing ? "Revealing side…" : "Reveal Side to Claim"}
        </Button>
      )}
      {revealError && <p className="text-xs text-destructive">{revealError}</p>}

      {resolved && poolsRevealed && sideDone && (
        <Button variant="hero" size="sm" className="w-full" disabled={claiming} onClick={handleClaim}>
          {claiming ? "Claiming ETH…" : "Claim Payout"}
        </Button>
      )}
      {claimError && <p className="text-xs text-destructive">{claimError}</p>}
    </div>
  );
}
