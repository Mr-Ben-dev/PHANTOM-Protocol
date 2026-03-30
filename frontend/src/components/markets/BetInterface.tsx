import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AsyncStepper } from "@/components/shared/AsyncStepper";
import { EncryptStep } from "@/hooks/useFHEStatus";
import { useEncryptBet } from "@/hooks/useEncryptBet";
import { usePhantomBet } from "@/hooks/usePhantomBet";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { parseUnits } from "viem";

interface BetInterfaceProps {
  marketId: bigint;
  deadline: bigint;
  resolved: boolean;
  onSuccess?: () => void;
}

export function BetInterface({ marketId, deadline, resolved, onSuccess }: BetInterfaceProps) {
  const { isConnected, ensureRightChain } = useWalletAuth();
  const { encrypt, step, errorMsg, reset } = useEncryptBet();
  const { placeBet } = usePhantomBet();
  const [amount, setAmount] = useState("");
  const [side, setSide] = useState<boolean | null>(null);

  const isExpired = BigInt(Math.floor(Date.now() / 1000)) > deadline;
  const disabled = resolved || isExpired || !isConnected || step !== EncryptStep.Idle;

  async function handleBet() {
    if (side === null || !amount) return;
    await ensureRightChain();
    reset();
    try {
      const amountWei = parseUnits(amount, 0);          // raw token units
      const encrypted = await encrypt(amountWei, side);
      if (!encrypted) return;

      // setStep to Submitting is handled after encrypt resolves
      await placeBet(marketId, encrypted.encAmount, encrypted.encSide);
      onSuccess?.();
    } catch (_) {
      // error state is set inside useEncryptBet / usePhantomBet
    }
  }

  return (
    <div className="space-y-4">
      {/* YES / NO toggle */}
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

      {/* Amount */}
      <Input
        type="number"
        min="1"
        step="1"
        placeholder="Amount (tokens)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        disabled={disabled}
        className="bg-black/20 border-border/30"
      />

      {/* FHE progress */}
      {step !== EncryptStep.Idle && (
        <AsyncStepper step={step} errorMsg={errorMsg} />
      )}

      {!isConnected ? (
        <p className="text-xs text-muted-foreground text-center">Connect wallet to place a bet</p>
      ) : resolved ? (
        <p className="text-xs text-muted-foreground text-center">Market resolved</p>
      ) : isExpired ? (
        <p className="text-xs text-muted-foreground text-center">Betting period closed</p>
      ) : (
        <Button
          variant="hero"
          className="w-full"
          disabled={side === null || !amount || step !== EncryptStep.Idle}
          onClick={handleBet}
        >
          Encrypt &amp; Place Bet
        </Button>
      )}
    </div>
  );
}
