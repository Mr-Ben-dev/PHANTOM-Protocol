import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Lock, Clock, Users, Plus, ShieldCheck, TrendingUp, TrendingDown, Flame, Star, Zap, Globe, BarChart2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/shared/Navbar";
import { BetInterface } from "@/components/markets/BetInterface";
import { CreateMarketModal } from "@/components/markets/CreateMarketModal";
import { PositionPanel } from "@/components/markets/PositionPanel";
import { ResolutionPanel } from "@/components/markets/ResolutionPanel";
import { useMarkets, type Market } from "@/hooks/useMarkets";
import { useHlsVideo } from "@/hooks/useHlsVideo";

// ─── Static featured markets (Polymarket-style preview data) ──────────────────

interface FeaturedMarket {
  id: string;
  category: string;
  question: string;
  image: string;
  yesPercent: number;
  volume: string;
  deadline: string;
  hot?: boolean;
  new?: boolean;
}

const FEATURED: FeaturedMarket[] = [
  {
    id: "f1",
    category: "Crypto",
    question: "Will Bitcoin reach $150,000 by end of 2025?",
    image: "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=640&q=80",
    yesPercent: 61,
    volume: "$4.2M",
    deadline: "Dec 31, 2025",
    hot: true,
  },
  {
    id: "f2",
    category: "Crypto",
    question: "Will Ethereum break $5,000 in Q3 2025?",
    image: "https://images.unsplash.com/photo-1622630998477-20aa696ecb05?w=640&q=80",
    yesPercent: 44,
    volume: "$2.8M",
    deadline: "Sep 30, 2025",
    hot: true,
  },
  {
    id: "f3",
    category: "Finance",
    question: "Will the Fed cut rates before September 2025?",
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=640&q=80",
    yesPercent: 38,
    volume: "$1.9M",
    deadline: "Sep 1, 2025",
  },
  {
    id: "f4",
    category: "Politics",
    question: "Will the US establish a Strategic Bitcoin Reserve in 2025?",
    image: "https://images.unsplash.com/photo-1541336032412-2048a678540d?w=640&q=80",
    yesPercent: 52,
    volume: "$3.1M",
    deadline: "Dec 31, 2025",
    new: true,
  },
  {
    id: "f5",
    category: "Crypto",
    question: "Will Solana flip Ethereum by market cap in 2025?",
    image: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=640&q=80",
    yesPercent: 18,
    volume: "$890K",
    deadline: "Dec 31, 2025",
  },
  {
    id: "f6",
    category: "Regulation",
    question: "Will any G20 country ban crypto trading in 2025?",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=640&q=80",
    yesPercent: 12,
    volume: "$640K",
    deadline: "Dec 31, 2025",
  },
  {
    id: "f7",
    category: "Crypto",
    question: "Will a Bitcoin spot ETF see $10B+ inflows in Q2 2025?",
    image: "https://images.unsplash.com/photo-1591696205602-2f950c417cb9?w=640&q=80",
    yesPercent: 71,
    volume: "$5.4M",
    deadline: "Jun 30, 2025",
    hot: true,
  },
  {
    id: "f8",
    category: "Tech",
    question: "Will OpenAI release GPT-5 before August 2025?",
    image: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=640&q=80",
    yesPercent: 55,
    volume: "$1.2M",
    deadline: "Aug 1, 2025",
    new: true,
  },
];

const CATEGORIES = ["All", "Crypto", "Finance", "Politics", "Regulation", "Tech"];
const CATEGORY_COLORS: Record<string, string> = {
  Crypto:     "text-amber-400 bg-amber-400/10 border-amber-400/20",
  Finance:    "text-blue-400 bg-blue-400/10 border-blue-400/20",
  Politics:   "text-purple-400 bg-purple-400/10 border-purple-400/20",
  Regulation: "text-red-400 bg-red-400/10 border-red-400/20",
  Tech:       "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
};

const sidebarModules = [
  { name: "PhantomBet",       wave: 1, active: true  },
  { name: "PhantomMulti",     wave: 2, active: false },
  { name: "PhantomLiquidity", wave: 3, active: false },
  { name: "PhantomFutures",   wave: 4, active: false },
  { name: "PhantomOracle",    wave: 5, active: false },
];

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

// ─── Polymarket-style market card ─────────────────────────────────────────────

function FeaturedCard({ market, onClick }: { market: FeaturedMarket; onClick: () => void }) {
  const categoryColor = CATEGORY_COLORS[market.category] ?? "text-foreground/60 bg-white/[0.06]";
  const no = 100 - market.yesPercent;
  return (
    <motion.div
      variants={item}
      onClick={onClick}
      className="group liquid-glass rounded-2xl overflow-hidden cursor-pointer hover:border-border/40 border border-border/20 transition-colors"
    >
      {/* Image header */}
      <div className="relative h-36 overflow-hidden">
        <img
          src={market.image}
          alt={market.question}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />
        {/* Category chip */}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${categoryColor}`}>
            {market.category}
          </span>
          {market.hot && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-orange-500/20 border border-orange-500/30 text-orange-400 flex items-center gap-1">
              <Flame className="w-2.5 h-2.5" /> HOT
            </span>
          )}
          {market.new && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
              <Zap className="w-2.5 h-2.5" /> NEW
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 line-clamp-2 group-hover:text-hero-heading transition-colors">
          {market.question}
        </h3>

        {/* YES/NO bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs font-mono mb-1">
            <span className="text-emerald-400 font-semibold">YES {market.yesPercent}%</span>
            <span className="text-red-400 font-semibold">NO {no}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-red-400/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-400/70 transition-all"
              style={{ width: `${market.yesPercent}%` }}
            />
          </div>
        </div>

        {/* Footer: vol + deadline */}
        <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
          <span className="flex items-center gap-1">
            <BarChart2 className="w-2.5 h-2.5" /> {market.volume} vol
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" /> {market.deadline}
          </span>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button
            onClick={(e) => { e.stopPropagation(); }}
            className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.07] text-emerald-400 text-xs font-semibold py-1.5 hover:bg-emerald-500/[0.14] transition-colors"
          >
            YES
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); }}
            className="rounded-xl border border-red-500/30 bg-red-500/[0.07] text-red-400 text-xs font-semibold py-1.5 hover:bg-red-500/[0.14] transition-colors"
          >
            NO
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── On-chain market card (small) ─────────────────────────────────────────────

function ChainCard({ market, selected, onClick }: { market: Market; selected: boolean; onClick: () => void }) {
  const yes = market.poolsRevealed && market.revealedTotalPool > 0n
    ? Math.round(Number(market.revealedYesPool) * 100 / Number(market.revealedTotalPool))
    : 50;
  return (
    <motion.div
      variants={item}
      onClick={onClick}
      className={`group liquid-glass rounded-2xl p-5 cursor-pointer transition-all border ${selected ? "border-primary/25 bg-primary/[0.03]" : "border-border/20 hover:border-border/35"}`}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-1">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-primary/10 text-primary border border-primary/20 mb-2 inline-block">
            On-chain · FHE
          </span>
          <h3 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-hero-heading transition-colors">
            {market.question}
          </h3>
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded-full font-mono text-[10px] uppercase ${!market.resolved ? "bg-primary/10 text-primary" : "bg-blue-500/10 text-blue-400"}`}>
          {market.resolved ? "resolved" : "live"}
        </span>
      </div>
      {/* Percentage bar */}
      <div className="mb-2">
        <div className="flex justify-between text-[10px] font-mono mb-1">
          <span className="text-emerald-400">YES {yes}%</span>
          <span className="text-red-400">NO {100 - yes}%</span>
        </div>
        <div className="h-1 rounded-full bg-red-400/20 overflow-hidden">
          <div className="h-full rounded-full bg-emerald-400/60" style={{ width: `${yes}%` }} />
        </div>
      </div>
      <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
        <span className="flex items-center gap-1"><Users className="w-2.5 h-2.5" /> {String(market.bettorCount)}</span>
        <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {formatDeadline(market.deadline)}</span>
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const Markets = () => {
  const { markets, isLoading, refetch } = useMarkets();
  const [selectedId, setSelectedId] = useState<bigint | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "resolved" | "my bets">("active");
  const [category, setCategory] = useState("All");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedFeatured, setSelectedFeatured] = useState<FeaturedMarket | null>(null);

  const bgVideoRef = useHlsVideo("https://stream.mux.com/Jwr2RhmsNrd6GEspBNgm02vJsRZAGlaoQIh4AucGdASw.m3u8");

  const filteredFeatured = useMemo(() =>
    category === "All" ? FEATURED : FEATURED.filter((m) => m.category === category),
  [category]);

  const filteredChain = useMemo(() => markets.filter((m) => {
    if (activeTab === "active") return !m.resolved;
    if (activeTab === "resolved") return m.resolved;
    if (activeTab === "my bets") return !!m.hasBet;
    return true;
  }), [markets, activeTab]);

  const selected = markets.find((m) => m.id === selectedId) ?? filteredChain[0];
  const hasOnChain = !isLoading && filteredChain.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <video ref={bgVideoRef} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-[0.04]" />
        <div className="absolute inset-0 bg-background/90" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-primary/[0.03] blur-[120px]" />
      </div>

      <div className="relative z-10 pt-20 flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden lg:flex w-64 flex-col border-r border-border/20 p-6 sticky top-20 h-[calc(100vh-5rem)]">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-5 font-mono">Modules</h3>
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
                {m.active ? <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_hsl(121_95%_76%/0.5)]" /> : <Lock className="w-3.5 h-3.5" />}
                <span className="font-medium">{m.name}</span>
                {!m.active && <span className="ml-auto text-[10px] font-mono opacity-60">W{m.wave}</span>}
              </div>
            ))}
          </div>

          {/* Category filter */}
          <div className="mt-8">
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3 font-mono flex items-center gap-1"><Filter className="w-3 h-3" /> Categories</h3>
            <div className="space-y-0.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${
                    category === cat
                      ? "bg-primary/[0.08] text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto pt-6 border-t border-border/20">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3 font-mono flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3 text-primary" /> Protocol Status
            </div>
            <div className="space-y-2 text-[11px] font-mono text-muted-foreground">
              <div className="flex justify-between"><span>Network</span><span className="text-primary">Arb Sepolia</span></div>
              <div className="flex justify-between"><span>FHE Engine</span><span className="text-primary">Active</span></div>
              <div className="flex justify-between"><span>Markets</span><span className="text-primary">{markets.length}</span></div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 p-6 lg:p-10">
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
                { label: "Total Volume", value: "$18.4M", icon: <BarChart2 className="w-4 h-4 text-primary" /> },
                { label: "Active Markets", value: String(FEATURED.length + markets.filter((m) => !m.resolved).length), icon: <Flame className="w-4 h-4 text-orange-400" /> },
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

            {/* Featured grid — Polymarket style */}
            <motion.div variants={item} className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Featured Markets</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredFeatured.map((market) => (
                  <FeaturedCard
                    key={market.id}
                    market={market}
                    onClick={() => { setSelectedFeatured(market); setSelectedId(null); }}
                  />
                ))}
              </div>
            </motion.div>

            {/* On-chain section */}
            <motion.div variants={item}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">On-Chain Markets (FHE)</h2>
                </div>
                {/* Tabs */}
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
                <div className="grid lg:grid-cols-5 gap-6">
                  {/* Chain market list */}
                  <div className="lg:col-span-2 space-y-3">
                    {filteredChain.map((market) => (
                      <ChainCard
                        key={String(market.id)}
                        market={market}
                        selected={selected?.id === market.id}
                        onClick={() => { setSelectedId(market.id); setSelectedFeatured(null); }}
                      />
                    ))}
                  </div>

                  {/* Detail panel */}
                  {selected && (
                    <motion.div variants={item} className="lg:col-span-3 space-y-4">
                      <div className="liquid-glass rounded-2xl p-6">
                        <div className="flex items-start justify-between mb-5">
                          <div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-primary/10 text-primary border border-primary/20 mb-2 inline-block">
                              On-chain · FHE · Arb Sepolia
                            </span>
                            <h2 className="text-lg font-semibold text-hero-heading">{selected.question}</h2>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {String(selected.bettorCount)} bettors</span>
                              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {formatDeadline(selected.deadline)}</span>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full font-mono text-xs uppercase ${!selected.resolved ? "bg-primary/10 text-primary border border-primary/20" : "bg-blue-500/10 text-blue-400"}`}>
                            {selected.resolved ? "resolved" : "live"}
                          </span>
                        </div>

                        {!selected.resolved ? (
                          <>
                            <p className="text-xs text-muted-foreground mb-4 flex items-center gap-2">
                              <Lock className="w-3 h-3 text-primary shrink-0" />
                              Bet amount and side encrypted before submission via CoFHE.
                            </p>
                            <BetInterface marketId={selected.id} deadline={selected.deadline} resolved={selected.resolved} onSuccess={refetch} />
                          </>
                        ) : (
                          <div className="text-center py-6">
                            <ShieldCheck className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                            <p className="text-lg font-semibold">{selected.poolsRevealed ? `Resolved: ${selected.outcome ? "YES" : "NO"}` : "Awaiting pool reveal"}</p>
                          </div>
                        )}
                      </div>

                      <PositionPanel marketId={selected.id} hasBet={!!selected.hasBet} resolved={selected.resolved} poolsRevealed={selected.poolsRevealed} onClaimed={refetch} />
                      <ResolutionPanel marketId={selected.id} creator={selected.creator} resolved={selected.resolved} poolsRevealed={selected.poolsRevealed} onResolved={refetch} />
                    </motion.div>
                  )}
                </div>
              )}
            </motion.div>

          </motion.div>
        </main>
      </div>

      {/* Featured market detail modal */}
      {selectedFeatured && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm" onClick={() => setSelectedFeatured(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="liquid-glass rounded-2xl overflow-hidden max-w-lg w-full border border-border/30 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-48 overflow-hidden">
              <img src={selectedFeatured.image} alt={selectedFeatured.question} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/30 to-transparent" />
              <div className="absolute top-3 left-3 flex gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${CATEGORY_COLORS[selectedFeatured.category] ?? ""}`}>
                  {selectedFeatured.category}
                </span>
                {selectedFeatured.hot && <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-orange-500/20 border border-orange-500/30 text-orange-400 flex items-center gap-1"><Flame className="w-2.5 h-2.5" /> HOT</span>}
              </div>
              <button
                className="absolute top-3 right-3 w-7 h-7 rounded-full bg-background/60 border border-border/30 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setSelectedFeatured(null)}
              >×</button>
            </div>
            <div className="p-6">
              <h2 className="text-base font-semibold mb-4">{selectedFeatured.question}</h2>
              <div className="mb-4">
                <div className="flex justify-between text-sm font-mono mb-1.5">
                  <span className="text-emerald-400 font-semibold">YES {selectedFeatured.yesPercent}%</span>
                  <span className="text-red-400 font-semibold">NO {100 - selectedFeatured.yesPercent}%</span>
                </div>
                <div className="h-2 rounded-full bg-red-400/20 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-400/70" style={{ width: `${selectedFeatured.yesPercent}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground mb-5">
                <span className="flex items-center gap-1"><BarChart2 className="w-3 h-3" /> {selectedFeatured.volume} volume</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Closes {selectedFeatured.deadline}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-400 text-sm font-semibold py-3 hover:bg-emerald-500/[0.18] transition-colors flex items-center justify-center gap-2">
                  <TrendingUp className="w-4 h-4" /> YES
                </button>
                <button className="rounded-xl border border-red-500/30 bg-red-500/[0.08] text-red-400 text-sm font-semibold py-3 hover:bg-red-500/[0.18] transition-colors flex items-center justify-center gap-2">
                  <TrendingDown className="w-4 h-4" /> NO
                </button>
              </div>
              <p className="text-[10px] font-mono text-muted-foreground/60 text-center mt-3">
                This is a preview market — on-chain deployment via PhantomBet coming Wave 2
              </p>
            </div>
          </motion.div>
        </div>
      )}

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
