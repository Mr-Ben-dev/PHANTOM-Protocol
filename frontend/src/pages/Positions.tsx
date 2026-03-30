import { motion } from "framer-motion";
import { Lock, Activity, Award, ShieldCheck } from "lucide-react";
import Navbar from "@/components/shared/Navbar";
import { PositionPanel } from "@/components/markets/PositionPanel";
import { useMarkets } from "@/hooks/useMarkets";
import { useWalletAuth } from "@/hooks/useWalletAuth";

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

const Positions = () => {
  const { address, isConnected, connect } = useWalletAuth();
  const { markets, isLoading, refetch } = useMarkets();

  // Only show markets where this wallet has placed a bet
  const myMarkets = markets.filter((m) => m.hasBet);

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
              { icon: Activity,    label: "Active Bets",   value: myMarkets.filter((m) => !m.resolved).length },
              { icon: Award,       label: "Resolved",      value: myMarkets.filter((m) => m.resolved).length  },
              { icon: ShieldCheck, label: "FHE Protected", value: myMarkets.length                            },
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
          ) : isLoading ? (
            <motion.div variants={item} className="text-center py-20 text-muted-foreground">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              Loading positions from contract…
            </motion.div>
          ) : myMarkets.length === 0 ? (
            <motion.div variants={item} className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <ShieldCheck className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-3">No positions yet</h2>
              <p className="text-muted-foreground">
                Head to Markets to place your first encrypted bet.
              </p>
            </motion.div>
          ) : (
            <div className="space-y-6">
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
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Positions;
