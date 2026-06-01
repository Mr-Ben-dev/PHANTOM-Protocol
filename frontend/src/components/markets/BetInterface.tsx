import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AsyncStepper } from "@/components/shared/AsyncStepper";
import { EncryptStep } from "@/hooks/useFHEStatus";
import { usePhantomBet } from "@/hooks/usePhantomBet";
import { useWalletAuth } from "@/hooks/useWalletAuth";

interface BetInterfaceProps {
  marketId: bigint;
  deadline: bigint;
  resolved: boolean;
  onSuccess?: () => void;
}

export function BetInterface({ marketId, deadline, resolved, onSuccess }: BetInterfaceProps) {
  const { isConnected, ensureRightChain } = useWalletAuth();
  const { placeBetSimple } = usePhantomBet();
  const [amount, setAmount] = useState("");
  const [side, setSide] = useState<boolean | null>(null);
  const [step, setStep] = useState<EncryptStep>(EncryptStep.Idle);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isExpired = BigInt(Math.floor(Date.now() / 1000)) > deadline;
  const disabled = resolved || isExpired || !isConnected || step !== EncryptStep.Idle;

  async function handleBet() {
    if (side === null || !amount) return;
    await ensureRightChain();
    setStep(EncryptStep.Submitting);
    setErrorMsg(null);
    try {
      await placeBetSimple(marketId, side, amount);
      setStep(EncryptStep.Idle);
      onSuccess?.();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStep(EncryptStep.Idle);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <button
          disabled={disabled}
          onClick={() => setSide(true)}
          className={`py-3 rounded-xl border text-sm font-semibold transition-all duration-200 ${
            side === true
              ? "border-green-500/60 bg-green-500/10 text-green-400"
              : "border-border/30 text-muted-foreground hover:border-green-500/30 hover:text-green-400 disabled:opacity-40"
          }`}
        >
          YES
        </button>
        <button
          disabled={disabled}
          onClick={() => setSide(false)}
          className={`py-3 rounded-xl border text-sm font-semibold transition-all duration-200 ${
            side === false
              ? "border-red-500/60 bg-red-500/10 text-red-400"
              : "border-border/30 text-muted-foreground hover:border-red-500/30 hover:text-red-400 disabled:opacity-40"
          }`}
        >
          NO
        </button>
      </div>

      <Input
        type="number"
        min="0"
        step="0.001"
        placeholder="ETH stake (e.g. 0.01)"
        value={amount}
        disabled={disabled}
        onChange={(e) => setAmount(e.target.value)}
      />

      <AsyncStepper step={step} errorMsg={errorMsg} />

      <motion.div whileTap={{ scale: 0.98 }}>
        <Button
          variant="hero"
          className="w-full"
          disabled={disabled || side === null || !amount}
          onClick={handleBet}
        >
          {step === EncryptStep.Submitting ? "Submitting…" : "Place Encrypted Bet"}
        </Button>
      </motion.div>

      <p className="text-[11px] text-muted-foreground text-center">
        ETH stake is public; side is FHE-encrypted on-chain.
      </p>
    </div>
  );
}
