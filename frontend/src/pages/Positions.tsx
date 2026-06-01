import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Activity, Award, ShieldCheck } from "lucide-react";
import Navbar from "@/components/shared/Navbar";
import { PositionPanel } from "@/components/markets/PositionPanel";
import { RoundPositionActions } from "@/components/rounds/RoundPositionActions";
import { useMarkets } from "@/hooks/useMarkets";
import { useRounds } from "@/hooks/useRounds";
import { useWalletAuth } from "@/hooks/useWalletAuth";

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

function RoundPositionCard({
  round,
  onDone,
}: {
  round: import("@/hooks/useRounds").Round;
  onDone: () => void;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <motion.div variants={item} className="liquid-glass rounded-2xl p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">{round.asset} · {round.statusLabel}</h3>
          <p className="text-xs text-muted-foreground font-mono mt-1">Round #{String(round.id)}</p>
        </div>
        <span className="shrink-0 px-3 py-1 rounded-full font-mono text-xs uppercase bg-primary/10 text-primary border border-primary/20">
          {round.statusLabel}
        </span>
      </div>
      {message && <p className="text-xs text-muted-foreground break-all">{message}</p>}
      <RoundPositionActions
        round={round}
        busy={busy}
        onBusyChange={setBusy}
        onMessage={setMessage}
        onDone={onDone}
      />
    </motion.div>
  );
}

const Positions = () => {
  const { address, isConnected, connect } = useWalletAuth();
  const { markets, isLoading, refetch } = useMarkets();
  const { rounds, isLoading: roundsLoading, refetch: refetchRounds, configured: roundsConfigured } = useRounds();

  // Only show markets where this wallet has placed a bet
  const myMarkets = markets.filter((m) => m.hasBet);
  const myRounds = rounds.filter((r) => r.hasBet);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Background accent */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-primary/[0.03] blur-[120px]" />
      </div>

      <div className="relative z-10 pt-28 pb-20 max-w-4xl mx-auto px-6">
        <motion.div variants={container} initial="hidden" animate="visible">
          {/* Header */}
          <motion.div variants={item} className="mb-10">
            <h1 className="text-3xl font-semibold text-hero-heading mb-2">My Positions</h1>
            <p className="text-muted-foreground">
              All bets are encrypted on-chain — only you can decrypt your position.
            </p>
          </motion.div>

          {/* Stats bar */}
          <motion.div variants={item} className="grid grid-cols-3 gap-4 mb-10">
            {[
              { icon: Activity,    label: "Active Bets",   value: myMarkets.filter((m) => !m.resolved).length + myRounds.filter((r) => r.status === 1 || r.status === 2).length },
              { icon: Award,       label: "Resolved",      value: myMarkets.filter((m) => m.resolved).length + myRounds.filter((r) => r.status === 3).length },
              { icon: ShieldCheck, label: "FHE Protected", value: myMarkets.length + myRounds.length },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="liquid-glass rounded-2xl p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            ))}
          </motion.div>

          {/* Content */}
          {!isConnected ? (
            <motion.div variants={item} className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Lock className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-3">Connect Your Wallet</h2>
              <p className="text-muted-foreground mb-6">
                Connect to see your encrypted positions.
              </p>
              <button
                className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
                onClick={() => connect()}
              >
                Connect Wallet
              </button>
            </motion.div>
          ) : isLoading || roundsLoading ? (
            <motion.div variants={item} className="text-center py-20 text-muted-foreground">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              Loading positions from contract…
            </motion.div>
          ) : myMarkets.length === 0 && myRounds.length === 0 ? (
            <motion.div variants={item} className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <ShieldCheck className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-3">No positions yet</h2>
              <p className="text-muted-foreground">
                Head to Markets or Rounds to place your first encrypted bet.
              </p>
            </motion.div>
          ) : (
            <div className="space-y-8">
              {myRounds.length > 0 && roundsConfigured && (
                <section className="space-y-4">
                  <h2 className="text-lg font-semibold text-hero-heading">Price Rounds</h2>
                  {myRounds.map((round) => (
                    <RoundPositionCard
                      key={String(round.id)}
                      round={round}
                      onDone={() => { refetchRounds(); refetch(); }}
                    />
                  ))}
                </section>
              )}
              {myMarkets.length > 0 && (
                <section className="space-y-4">
                  <h2 className="text-lg font-semibold text-hero-heading">Prediction Markets</h2>
                  {myMarkets.map((market) => (
                <motion.div key={String(market.id)} variants={item} className="liquid-glass rounded-2xl p-6 space-y-4">
                  {/* Market info */}
                  <div className="flex items-start justify-between">
                    <h3 className="text-base font-semibold text-foreground max-w-lg">
                      {market.question}
                    </h3>
                    <span
                      className={`shrink-0 ml-4 px-3 py-1 rounded-full font-mono text-xs uppercase ${
                        !market.resolved
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "bg-blue-500/10 text-blue-400"
                      }`}
                    >
                      {market.resolved ? "resolved" : "active"}
                    </span>
                  </div>

                  {/* Pools (if revealed) */}
                  {market.poolsRevealed && (
                    <div className="grid grid-cols-3 gap-4 text-sm font-mono">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase">YES Pool</span>
                        <p className="text-green-400">{String(market.revealedYesPool)}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase">NO Pool</span>
                        <p className="text-red-400">{String(market.revealedNoPool)}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase">Total</span>
                        <p>{String(market.revealedTotalPool)}</p>
                      </div>
                    </div>
                  )}

                  {/* My position decrypt + claim */}
                  <PositionPanel
                    marketId={market.id}
                    hasBet={true}
                    resolved={market.resolved}
                    poolsRevealed={market.poolsRevealed}
                    onClaimed={refetch}
                  />
                </motion.div>
                  ))}
                </section>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Positions;
