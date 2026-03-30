import { useState } from "react";
import { Button } from "@/components/ui/button";
import { usePhantomBet } from "@/hooks/usePhantomBet";
import { useDecryptPools } from "@/hooks/useDecryptPools";
import { useWalletAuth } from "@/hooks/useWalletAuth";

interface ResolutionPanelProps {
  marketId: bigint;
  creator: `0x${string}`;
  resolved: boolean;
  poolsRevealed: boolean;
  onResolved?: () => void;
}

export function ResolutionPanel({
  marketId,
  creator,
  resolved,
  poolsRevealed,
  onResolved,
}: ResolutionPanelProps) {
  const { address } = useWalletAuth();
  const { resolveMarket } = usePhantomBet();
  const { reveal, revealed, isRevealing, error: revealError } = useDecryptPools(marketId);

  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const isCreator = address?.toLowerCase() === creator.toLowerCase();
  if (!isCreator) return null;

  async function handleResolve(outcome: boolean) {
    setResolving(true);
    setResolveError(null);
    try {
      await resolveMarket(marketId, outcome);
      onResolved?.();
    } catch (err) {
      setResolveError(err instanceof Error ? err.message : String(err));
    } finally {
      setResolving(false);
    }
  }

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
      <p className="text-xs font-medium uppercase tracking-wider text-amber-400/70">Resolver Panel</p>

      {!resolved && (
        <>
          <p className="text-xs text-muted-foreground">Set the market outcome to begin resolution:</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-green-500/30 text-green-400 hover:bg-green-500/10"
              disabled={resolving}
              onClick={() => handleResolve(true)}
            >
              Resolve YES
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              disabled={resolving}
              onClick={() => handleResolve(false)}
            >
              Resolve NO
            </Button>
          </div>
          {resolveError && <p className="text-xs text-destructive">{resolveError}</p>}
        </>
      )}

      {resolved && !poolsRevealed && (
        <>
          <p className="text-xs text-muted-foreground">
            Decrypt and publish pool totals on-chain:
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
            disabled={isRevealing}
            onClick={reveal}
          >
            {isRevealing ? "Revealing…" : "Reveal Pools"}
          </Button>
          {revealError && <p className="text-xs text-destructive">{revealError}</p>}
        </>
      )}

      {revealed && (
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>YES Pool</span>
            <span className="text-green-400 font-mono">{String(revealed.yesPool)}</span>
          </div>
          <div className="flex justify-between">
            <span>NO Pool</span>
            <span className="text-red-400 font-mono">{String(revealed.noPool)}</span>
          </div>
          <div className="flex justify-between border-t border-border/20 pt-1 mt-1">
            <span>Total</span>
            <span className="font-mono">{String(revealed.totalPool)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
