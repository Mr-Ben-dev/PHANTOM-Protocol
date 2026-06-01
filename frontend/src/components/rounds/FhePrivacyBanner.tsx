import { Lock, ShieldCheck } from "lucide-react";

export function FhePrivacyBanner() {
  return (
    <div className="liquid-glass rounded-2xl border border-primary/20 bg-primary/[0.04] p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-primary" />
        </div>
        <div className="space-y-3 text-sm">
          <p className="font-semibold text-foreground">CoFHE privacy on every round</p>
          <ol className="space-y-2 text-muted-foreground text-xs font-mono list-decimal list-inside">
            <li>
              <span className="text-foreground">Bet:</span> Your ETH stake is public; your UP/DOWN choice is stored as an encrypted handle — pools update via FHE.select so nobody sees your side.
            </li>
            <li>
              <span className="text-foreground">During round:</span> UP/DOWN pool totals stay encrypted until the keeper reveals them after resolution.
            </li>
            <li>
              <span className="text-foreground">After resolve:</span> You decrypt your direction with CoFHE, submit revealMyDirection, then claimRoundPayout sends ETH from the contract pool.
            </li>
          </ol>
          <p className="flex items-center gap-1.5 text-[10px] text-primary font-mono">
            <Lock className="w-3 h-3" /> Encrypted on Arbitrum Sepolia · PhantomRounds v1
          </p>
        </div>
      </div>
    </div>
  );
}
