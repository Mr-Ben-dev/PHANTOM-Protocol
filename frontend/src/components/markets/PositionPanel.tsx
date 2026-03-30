import { EncryptedValue } from "@/components/shared/EncryptedValue";
import { useDecryptPosition } from "@/hooks/useDecryptPosition";
import { usePhantomBet } from "@/hooks/usePhantomBet";
import { Button } from "@/components/ui/button";

interface PositionPanelProps {
  marketId: bigint;
  hasBet: boolean;
  resolved: boolean;
  poolsRevealed: boolean;
  onClaimed?: () => void;
}

export function PositionPanel({
  marketId,
  hasBet,
  resolved,
  poolsRevealed,
  onClaimed,
}: PositionPanelProps) {
  const { decrypt, result, isDecrypting, error } = useDecryptPosition(marketId);
  const { claimPayout } = usePhantomBet();
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

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
        <span className="text-sm text-muted-foreground">Amount</span>
        <EncryptedValue
          decryptedValue={result?.amount !== undefined ? String(result.amount) : undefined}
          isDecrypting={isDecrypting}
          onReveal={decrypt}
          unit="tokens"
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

      {resolved && poolsRevealed && (
        <Button variant="hero" size="sm" className="w-full" disabled={claiming} onClick={handleClaim}>
          {claiming ? "Claiming…" : "Claim Payout"}
        </Button>
      )}
      {claimError && <p className="text-xs text-destructive">{claimError}</p>}
    </div>
  );
}

// useState needs to be imported since this file uses it
import { useState } from "react";
