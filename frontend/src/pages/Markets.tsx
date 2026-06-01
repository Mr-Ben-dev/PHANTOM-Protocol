import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Clock, Users, Plus, ShieldCheck, Globe, BarChart2, Filter, Flame, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/shared/Navbar";
import { CreateMarketModal } from "@/components/markets/CreateMarketModal";
import { useMarkets, type Market } from "@/hooks/useMarkets";
import { useHlsVideo } from "@/hooks/useHlsVideo";
import { getMarketMeta, CATEGORY_COLORS } from "@/config/market-metadata";

// ─── Static featured markets removed — only real on-chain markets shown ──────

const CATEGORIES = ["All", "Crypto", "Finance", "Politics", "Regulation", "Tech"];

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } },
};

function formatDeadline(ts: bigint): string {
  return new Date(Number(ts) * 1000).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

// ─── On-chain market card ─────────────────────────────────────────────────────

function ChainCard({ market, onClick }: { market: Market; onClick: () => void }) {
  const meta = getMarketMeta(market.id);
  const yes = market.poolsRevealed && market.revealedTotalPool > 0n
    ? Math.round(Number(market.revealedYesPool) * 100 / Number(market.revealedTotalPool))
    : 50;
  const categoryColor = meta ? (CATEGORY_COLORS[meta.category] ?? "") : "";

  return (
    <motion.div
      variants={item}
      onClick={onClick}
      className="group liquid-glass rounded-2xl overflow-hidden cursor-pointer transition-all border border-border/20 hover:border-primary/25 hover:bg-primary/[0.02]"
    >
      {/* Image header (shown when metadata has image) */}
      {meta?.image && (
        <div className="relative h-32 overflow-hidden">
          <img
            src={meta.image}
            alt={market.question}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
          {/* Category + status badges */}
          <div className="absolute top-2.5 left-2.5 flex gap-1.5">
            {meta.category && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${categoryColor}`}>
                {meta.tag ?? meta.category}
              </span>
            )}
            {meta.hot && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-orange-500/20 border border-orange-500/30 text-orange-400 flex items-center gap-1">
                <Flame className="w-2.5 h-2.5" /> HOT
              </span>
            )}
            {meta.isNew && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                <Zap className="w-2.5 h-2.5" /> NEW
              </span>
            )}
          </div>
          <span className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full font-mono text-[10px] uppercase ${!market.resolved ? "bg-primary/20 text-primary border border-primary/30" : "bg-blue-500/20 text-blue-400"}`}>
            {market.resolved ? "resolved" : "live"}
          </span>
        </div>
      )}

      <div className="p-4">
        {!meta?.image && (
          <div className="flex items-center justify-between mb-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-primary/10 text-primary border border-primary/20">
              On-chain · FHE
            </span>
            <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] uppercase ${!market.resolved ? "bg-primary/10 text-primary" : "bg-blue-500/10 text-blue-400"}`}>
              {market.resolved ? "resolved" : "live"}
            </span>
          </div>
        )}
        <h3 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-hero-heading transition-colors mb-3">
          {market.question}
        </h3>
        {/* YES / NO bar — real data after pool reveal only */}
        <div className="mb-3">
          {market.poolsRevealed && market.revealedTotalPool > 0n ? (
            <>
              <div className="flex justify-between text-[10px] font-mono mb-1">
                <span className="text-emerald-400 font-semibold">YES {yes}%</span>
                <span className="text-red-400 font-semibold">NO {100 - yes}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-red-400/20 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-400/60 transition-all" style={{ width: `${yes}%` }} />
              </div>
            </>
          ) : (
            <p className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
              <Lock className="w-2.5 h-2.5 text-primary" /> Pools encrypted until resolution
            </p>
          )}
        </div>
        {/* Footer */}
        <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
          <span className="flex items-center gap-1"><Users className="w-2.5 h-2.5" /> {String(market.bettorCount)}</span>
          <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {formatDeadline(market.deadline)}</span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const Markets = () => {
  const navigate = useNavigate();
  const { markets, isLoading, refetch } = useMarkets();
  const [activeTab, setActiveTab] = useState<"active" | "resolved" | "my bets">("active");
  const [category, setCategory] = useState("All");
  const [showCreate, setShowCreate] = useState(false);

  const bgVideoRef = useHlsVideo("https://stream.mux.com/Jwr2RhmsNrd6GEspBNgm02vJsRZAGlaoQIh4AucGdASw.m3u8");

  const filteredChain = useMemo(() => markets.filter((m) => {
    if (activeTab === "active" && m.resolved) return false;
    if (activeTab === "resolved" && !m.resolved) return false;
    if (activeTab === "my bets" && !m.hasBet) return false;
    if (category !== "All") {
      const meta = getMarketMeta(m.id);
      if (meta?.category !== category) return false;
    }
    return true;
  }), [markets, activeTab, category]);

  const hasOnChain = !isLoading && filteredChain.length > 0;
  const activeCount = markets.filter((m) => !m.resolved).length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <video ref={bgVideoRef} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-[0.04]" />
        <div className="absolute inset-0 bg-background/90" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-primary/[0.03] blur-[120px]" />
      </div>

      <div className="relative z-10 pt-20 min-h-screen">
        <main className="p-6 lg:p-10 max-w-6xl mx-auto">
          <motion.div variants={container} initial="hidden" animate="visible" className="max-w-6xl mx-auto">

            {/* Header */}
            <motion.div variants={item} className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-semibold text-hero-heading flex items-center gap-2">
                  <Globe className="w-6 h-6 text-primary" /> Prediction Markets
                </h1>
                <p className="text-sm text-muted-foreground mt-1">Encrypted positions on real-world outcomes — powered by FHE</p>
              </div>
              <Button variant="hero" size="sm" className="gap-2 hidden sm:inline-flex" onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4" /> Create Market
              </Button>
            </motion.div>

            {/* Stats strip */}
            <motion.div variants={item} className="grid grid-cols-3 gap-4 mb-8 lg:grid-cols-3">
              {[
                { label: "Active Markets", value: String(activeCount), icon: <BarChart2 className="w-4 h-4 text-primary" /> },
                { label: "Total Markets", value: String(markets.length), icon: <Globe className="w-4 h-4 text-blue-400" /> },
                { label: "FHE Encrypted", value: "100%", icon: <ShieldCheck className="w-4 h-4 text-emerald-400" /> },
              ].map((s) => (
                <div key={s.label} className="liquid-glass rounded-xl p-4 flex items-center gap-3">
                  {s.icon}
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-mono">{s.label}</p>
                    <p className="text-base font-semibold font-mono">{s.value}</p>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Category filter */}
            <motion.div variants={item} className="flex flex-wrap items-center gap-2 mb-6">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-mono transition-colors ${
                    category === cat
                      ? "bg-primary/15 text-primary border border-primary/25"
                      : "text-muted-foreground border border-border/25 hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </motion.div>

            {/* Markets section */}
            <motion.div variants={item}>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">On-Chain Markets (FHE)</h2>
                </div>
                <div className="flex gap-1 liquid-glass rounded-full p-1">
                  {(["active", "resolved", "my bets"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`relative px-4 py-1.5 rounded-full text-xs font-medium transition-all ${activeTab === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {activeTab === tab && (
                        <motion.div layoutId="market-tab" className="absolute inset-0 rounded-full bg-white/[0.08] border border-white/[0.06]" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                      )}
                      <span className="relative z-10 capitalize">{tab}</span>
                    </button>
                  ))}
                </div>
              </div>

              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  Loading on-chain markets…
                </div>
              ) : !hasOnChain ? (
                <div className="text-center py-12 liquid-glass rounded-2xl border border-border/20 text-muted-foreground">
                  <ShieldCheck className="w-8 h-8 text-primary/40 mx-auto mb-3" />
                  <p className="text-sm mb-2">No {activeTab} on-chain markets yet.</p>
                  {activeTab === "active" && (
                    <button className="text-primary text-sm underline" onClick={() => setShowCreate(true)}>
                      Deploy the first one
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredChain.map((market) => (
                    <ChainCard
                      key={String(market.id)}
                      market={market}
                      onClick={() => navigate(`/markets/${market.id}`)}
                    />
                  ))}
                </div>
              )}
            </motion.div>

          </motion.div>
        </main>
      </div>

      {showCreate && (
        <CreateMarketModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); refetch(); }}
        />
      )}
    </div>
  );
};

export default Markets;
