import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Clock, Users, Plus, ShieldCheck, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/shared/Navbar";
import { BetInterface } from "@/components/markets/BetInterface";
import { CreateMarketModal } from "@/components/markets/CreateMarketModal";
import { PositionPanel } from "@/components/markets/PositionPanel";
import { ResolutionPanel } from "@/components/markets/ResolutionPanel";
import { useMarkets, type Market } from "@/hooks/useMarkets";
import { useHlsVideo } from "@/hooks/useHlsVideo";

const sidebarModules = [
  { name: "PhantomBet",       wave: 1, active: true  },
  { name: "PhantomMulti",     wave: 2, active: false },
  { name: "PhantomLiquidity", wave: 3, active: false },
  { name: "PhantomFutures",   wave: 4, active: false },
  { name: "PhantomOracle",    wave: 5, active: false },
];

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

function formatDeadline(ts: bigint): string {
  return new Date(Number(ts) * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const Markets = () => {
  const { markets, isLoading, refetch } = useMarkets();
  const [selectedId, setSelectedId] = useState<bigint | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "resolved" | "my bets">("active");
  const [showCreate, setShowCreate] = useState(false);

  const bgVideoRef = useHlsVideo(
    "https://stream.mux.com/Jwr2RhmsNrd6GEspBNgm02vJsRZAGlaoQIh4AucGdASw.m3u8",
  );

  const filtered = markets.filter((m) => {
    if (activeTab === "active")   return !m.resolved;
    if (activeTab === "resolved") return m.resolved;
    if (activeTab === "my bets")  return !!m.hasBet;
    return true;
  });

  const selected: Market | undefined =
    markets.find((m) => m.id === selectedId) ?? filtered[0];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <video
          ref={bgVideoRef}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-[0.04]"
        />
        <div className="absolute inset-0 bg-background/90" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-primary/[0.03] blur-[120px]" />
      </div>

      <div className="relative z-10 pt-20 flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden lg:flex w-64 flex-col border-r border-border/20 p-6 sticky top-20 h-[calc(100vh-5rem)]">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-5 font-mono">
            Modules
          </h3>
          <div className="space-y-1">
            {sidebarModules.map((m) => (
              <div
                key={m.name}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  m.active
                    ? "bg-primary/[0.08] text-primary border border-primary/15 cursor-default"
                    : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-white/[0.02] cursor-not-allowed"
                }`}
              >
                {m.active ? (
                  <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_hsl(121_95%_76%/0.5)]" />
                ) : (
                  <Lock className="w-3.5 h-3.5" />
                )}
                <span className="font-medium">{m.name}</span>
                {!m.active && (
                  <span className="ml-auto text-[10px] font-mono opacity-60">W{m.wave}</span>
                )}
              </div>
            ))}
          </div>

          {/* Protocol Status */}
          <div className="mt-auto pt-6 border-t border-border/20">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3 font-mono flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3 text-primary" /> Protocol Status
            </div>
            <div className="space-y-2 text-[11px] font-mono text-muted-foreground">
              <div className="flex justify-between">
                <span>Network</span>
                <span className="text-primary">Arb Sepolia</span>
              </div>
              <div className="flex justify-between">
                <span>FHE Engine</span>
                <span className="text-primary">Active</span>
              </div>
              <div className="flex justify-between">
                <span>Markets</span>
                <span className="text-primary">{markets.length}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 p-6 lg:p-10">
          <motion.div
            variants={container}
            initial="hidden"
            animate="visible"
            className="max-w-6xl mx-auto"
          >
            {/* Header */}
            <motion.div variants={item} className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-semibold text-hero-heading">Prediction Markets</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Encrypted positions on real-world outcomes
                </p>
              </div>
              <Button
                variant="hero"
                size="sm"
                className="gap-2 hidden sm:inline-flex"
                onClick={() => setShowCreate(true)}
              >
                <Plus className="w-4 h-4" /> Create Market
              </Button>
            </motion.div>

            {/* Tabs */}
            <motion.div
              variants={item}
              className="flex gap-1 mb-8 liquid-glass rounded-full p-1 w-fit"
            >
              {(["active", "resolved", "my bets"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    activeTab === tab
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {activeTab === tab && (
                    <motion.div
                      layoutId="market-tab"
                      className="absolute inset-0 rounded-full bg-white/[0.08] border border-white/[0.06]"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 capitalize">{tab}</span>
                </button>
              ))}
            </motion.div>

            {isLoading ? (
              <motion.div variants={item} className="text-center py-20 text-muted-foreground">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                Loading markets from contract…
              </motion.div>
            ) : filtered.length === 0 ? (
              <motion.div variants={item} className="text-center py-20 text-muted-foreground">
                No markets found.{" "}
                {activeTab === "active" && (
                  <button
                    className="text-primary underline"
                    onClick={() => setShowCreate(true)}
                  >
                    Create one
                  </button>
                )}
              </motion.div>
            ) : (
              <div className="grid lg:grid-cols-5 gap-8">
                {/* Market list */}
                <div className="lg:col-span-2 space-y-3">
                  {filtered.map((market) => (
                    <motion.div
                      key={String(market.id)}
                      variants={item}
                      onClick={() => setSelectedId(market.id)}
                      className={`group liquid-glass rounded-2xl p-5 cursor-pointer transition-all duration-200 ${
                        selected?.id === market.id
                          ? "border border-primary/20 bg-primary/[0.03]"
                          : "hover:bg-white/[0.02]"
                      }`}
                    >
                      <h3 className="text-sm font-semibold text-foreground mb-3 group-hover:text-hero-heading transition-colors">
                        {market.question}
                      </h3>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" /> {String(market.bettorCount)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatDeadline(market.deadline)}
                        </span>
                        <span
                          className={`ml-auto px-2 py-0.5 rounded-full font-mono text-[10px] uppercase ${
                            !market.resolved
                              ? "bg-primary/10 text-primary"
                              : "bg-blue-500/10 text-blue-400"
                          }`}
                        >
                          {market.resolved ? "resolved" : "active"}
                        </span>
                      </div>
                      {market.poolsRevealed ? (
                        <div className="mt-3 pt-3 border-t border-border/20 grid grid-cols-2 gap-3 text-xs font-mono">
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase">YES</span>
                            <p className="text-green-400">{String(market.revealedYesPool)}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase">NO</span>
                            <p className="text-red-400">{String(market.revealedNoPool)}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 pt-3 border-t border-border/20 grid grid-cols-2 gap-3">
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase">YES Pool</span>
                            <p className="font-mono text-xs text-primary/60 mt-0.5">ENCRYPTED</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase">NO Pool</span>
                            <p className="font-mono text-xs text-primary/60 mt-0.5">ENCRYPTED</p>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Market detail */}
                {selected && (
                  <motion.div variants={item} className="lg:col-span-3 space-y-4">
                    <div className="liquid-glass rounded-2xl p-8">
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <h2 className="text-xl font-semibold text-hero-heading mb-2">
                            {selected.question}
                          </h2>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" /> {String(selected.bettorCount)} bettors
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> {formatDeadline(selected.deadline)}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full font-mono text-xs uppercase ${
                            !selected.resolved
                              ? "bg-primary/10 text-primary border border-primary/20"
                              : "bg-blue-500/10 text-blue-400"
                          }`}
                        >
                          {selected.resolved ? "resolved" : "active"}
                        </span>
                      </div>

                      {!selected.resolved ? (
                        <>
                          <p className="text-xs text-muted-foreground mb-4 flex items-center gap-2">
                            <Lock className="w-3 h-3 text-primary shrink-0" />
                            Your bet amount and side will be encrypted before submission.
                          </p>
                          <BetInterface
                            marketId={selected.id}
                            deadline={selected.deadline}
                            resolved={selected.resolved}
                            onSuccess={refetch}
                          />
                        </>
                      ) : (
                        <div className="text-center py-8">
                          <ShieldCheck className="w-10 h-10 text-blue-400 mx-auto mb-3" />
                          <div className="text-xl font-semibold mb-1">
                            {selected.poolsRevealed
                              ? `Resolved: ${selected.outcome ? "YES" : "NO"}`
                              : "Awaiting pool reveal"}
                          </div>
                          {selected.poolsRevealed && (
                            <div className="flex justify-center gap-8 mt-4 text-sm font-mono">
                              <div>
                                <span className="text-muted-foreground">YES </span>
                                <span className="text-green-400">{String(selected.revealedYesPool)}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">NO </span>
                                <span className="text-red-400">{String(selected.revealedNoPool)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <PositionPanel
                      marketId={selected.id}
                      hasBet={!!selected.hasBet}
                      resolved={selected.resolved}
                      poolsRevealed={selected.poolsRevealed}
                      onClaimed={refetch}
                    />

                    <ResolutionPanel
                      marketId={selected.id}
                      creator={selected.creator}
                      resolved={selected.resolved}
                      poolsRevealed={selected.poolsRevealed}
                      onResolved={refetch}
                    />

                    {/* What's Encrypted */}
                    <div className="liquid-glass rounded-2xl p-6">
                      <h3 className="text-xs font-semibold text-foreground mb-4 flex items-center gap-2 uppercase tracking-wider">
                        <Eye className="w-3.5 h-3.5 text-primary" /> What's Encrypted
                      </h3>
                      <div className="font-mono text-[11px] text-muted-foreground space-y-2 bg-card/50 rounded-xl p-4 border border-border/20">
                        <p>┌─ Market #{String(selected.id)}</p>
                        <p>│</p>
                        <p>
                          ├─ YES Pool:{" "}
                          <span className="text-primary">
                            {selected.poolsRevealed ? String(selected.revealedYesPool) : "[ENCRYPTED]"}
                          </span>
                        </p>
                        <p>│&nbsp;&nbsp;└─ ACL: Contract ✓ | Public {selected.poolsRevealed ? "✓" : "✗"}</p>
                        <p>│</p>
                        <p>
                          ├─ NO Pool:{" "}
                          <span className="text-primary">
                            {selected.poolsRevealed ? String(selected.revealedNoPool) : "[ENCRYPTED]"}
                          </span>
                        </p>
                        <p>│&nbsp;&nbsp;└─ ACL: Contract ✓ | Public {selected.poolsRevealed ? "✓" : "✗"}</p>
                        <p>│</p>
                        <p>├─ Your Bet: <span className="text-primary">[ENCRYPTED]</span></p>
                        <p>│&nbsp;&nbsp;└─ ACL: You ✓ | Others ✗</p>
                        <p>│</p>
                        <p>└─ Bettors: {String(selected.bettorCount)} [PUBLIC]</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        </main>
      </div>

      {showCreate && (
        <CreateMarketModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            refetch();
          }}
        />
      )}
    </div>
  );
};

export default Markets;
