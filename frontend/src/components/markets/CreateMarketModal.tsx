import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePhantomBet } from "@/hooks/usePhantomBet";
import { useWalletAuth } from "@/hooks/useWalletAuth";

interface CreateMarketModalProps {
  onClose: () => void;
  onCreated?: () => void;
}

export function CreateMarketModal({ onClose, onCreated }: CreateMarketModalProps) {
  const { isConnected, ensureRightChain } = useWalletAuth();
  const { createMarket } = usePhantomBet();
  const [question, setQuestion] = useState("");
  const [deadlineDays, setDeadlineDays] = useState("7");
  // Days AFTER betting closes before resolution is expected
  const [resolutionDaysAfter, setResolutionDaysAfter] = useState("3");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deadlineN = Math.max(1, Number(deadlineDays) || 1);
  const resolutionN = Math.max(1, Number(resolutionDaysAfter) || 1);
  // resolution = deadline + resolutionDaysAfter  →  always > deadline

  async function handleCreate() {
    if (!question.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      await ensureRightChain();
      const now = BigInt(Math.floor(Date.now() / 1000));
      const deadline   = now + BigInt(deadlineN * 86400);
      const resolution = deadline + BigInt(resolutionN * 86400); // strictly > deadline
      await createMarket(question.trim(), deadline, resolution);
      onCreated?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border/40 bg-background p-6 space-y-5">
        <h2 className="text-lg font-semibold">Create Prediction Market</h2>

        <div className="space-y-2">
          <label className="text-xs text-muted-foreground uppercase tracking-wider">Question</label>
          <Input
            placeholder="Will ETH reach $10k by end of 2025?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="bg-black/20 border-border/30"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground uppercase tracking-wider">
              Betting closes (days from now)
            </label>
            <Input
              type="number"
              min="1"
              value={deadlineDays}
              onChange={(e) => setDeadlineDays(e.target.value)}
              className="bg-black/20 border-border/30"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground uppercase tracking-wider">
              Resolve within (days after close)
            </label>
            <Input
              type="number"
              min="1"
              value={resolutionDaysAfter}
              onChange={(e) => setResolutionDaysAfter(e.target.value)}
              className="bg-black/20 border-border/30"
            />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Resolution deadline: {deadlineN + resolutionN} days from now
          &nbsp;({deadlineN}d betting + {resolutionN}d to resolve)
        </p>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex gap-3 pt-1">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="hero"
            className="flex-1"
            disabled={!question.trim() || submitting || !isConnected}
            onClick={handleCreate}
          >
            {submitting ? "Creating…" : "Create Market"}
          </Button>
        </div>
      </div>
    </div>
  );
}
