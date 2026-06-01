import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Clock, Flame, Globe, Lock, ShieldCheck, Users, Zap,
} from "lucide-react";
import Navbar from "@/components/shared/Navbar";
import { BetInterface } from "@/components/markets/BetInterface";
import { MarketCharts } from "@/components/markets/MarketCharts";
import { PositionPanel } from "@/components/markets/PositionPanel";
import { ResolutionPanel } from "@/components/markets/ResolutionPanel";
import { useMarkets } from "@/hooks/useMarkets";
import { CATEGORY_COLORS, getMarketMeta } from "@/config/market-metadata";

function formatDeadline(ts: bigint): string {
  return new Date(Number(ts) * 1000).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
}

function useCountdown(deadline: bigint) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    const tick = () => {
      const now = Math.floor(Date.now() / 1000);
      const end = Number(deadline);
      const diff = end - now;
      if (diff <= 0) {
        setLabel("Deadline passed");
        return;
      }
      const d = Math.floor(diff / 86400);
      const h = Math.floor((diff % 86400) / 3600);
      const m = Math.floor((diff % 3600) / 60);
      setLabel(d > 0 ? `${d}d ${h}h ${m}m left` : `${h}h ${m}m left`);
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [deadline]);

  return label;
}

const MarketDetail = () => {
  const { id: idParam } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { markets, isLoading, refetch } = useMarkets();

  const marketId = idParam != null && /^\d+$/.test(idParam) ? BigInt(idParam) : null;
  const market = useMemo(
    () => (marketId != null ? markets.find((m) => m.id === marketId) : undefined),
    [markets, marketId],
  );
  const meta = market ? getMarketMeta(market.id) : undefined;
  const countdown = useCountdown(market?.deadline ?? 0n);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 text-center text-muted-foreground">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          Loading market…
        </div>
      </div>
    );
  }

  if (!market || marketId == null) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 text-center px-6">
          <h1 className="text-xl font-semibold mb-2">Market not found</h1>
          <p className="text-muted-foreground mb-6">This market ID does not exist on-chain.</p>
          <Link to="/markets" className="text-primary hover:underline text-sm">← Back to Markets</Link>
        </div>
      </div>
    );
  }

  const categoryColor = meta ? (CATEGORY_COLORS[meta.category] ?? "") : "";
  const yesPct = market.poolsRevealed && market.revealedTotalPool > 0n
    ? Math.round(Number(market.revealedYesPool) * 100 / Number(market.revealedTotalPool))
    : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[400px] rounded-full bg-primary/[0.04] blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[300px] rounded-full bg-blue-500/[0.03] blur-[100px]" />
      </div>

      {/* Hero */}
      <div className="relative z-10 pt-20">
        {meta?.image ? (
          <div className="relative h-52 sm:h-64 overflow-hidden">
            <img src={meta.image} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20" />
          </div>
        ) : (
          <div className="h-24 bg-gradient-to-b from-primary/[0.06] to-transparent" />
        )}

        <div className="relative z-10 max-w-6xl mx-auto px-6 -mt-16 sm:-mt-20 pb-8">
          <button
            onClick={() => navigate("/markets")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> All Markets
          </button>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex flex-wrap gap-2 mb-3">
              {meta?.category && (
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold border ${categoryColor}`}>
                  {meta.tag ?? meta.category}
                </span>
              )}
              {meta?.hot && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-orange-500/20 border border-orange-500/30 text-orange-400 flex items-center gap-1">
                  <Flame className="w-2.5 h-2.5" /> HOT
                </span>
              )}
              {meta?.isNew && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5" /> NEW
                </span>
              )}
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-primary/10 text-primary border border-primary/20">
                On-chain · FHE
              </span>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono uppercase ${
                !market.resolved ? "bg-primary/20 text-primary border border-primary/30" : "bg-blue-500/20 text-blue-400"
              }`}>
                {market.resolved ? "resolved" : "live"}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-semibold text-hero-heading leading-tight max-w-4xl">
              {market.question}
            </h1>

            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground font-mono">
              <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-primary" /> Arb Sepolia</span>
              <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {String(market.bettorCount)} bettors</span>
              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {formatDeadline(market.deadline)}</span>
              {!market.resolved && countdown && (
                <span className="text-primary">{countdown}</span>
              )}
              {yesPct != null && (
                <span className="text-emerald-400">{yesPct}% YES implied</span>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content grid */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 pb-20">
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Charts + stats */}
          <div className="lg:col-span-3 space-y-4">
            <MarketCharts market={market} />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Market ID", value: `#${String(market.id)}` },
                { label: "Total Staked", value: market.totalEth > 0n ? `${(Number(market.totalEth) / 1e18).toFixed(4)} ETH` : "—" },
                { label: "Resolution", value: formatDeadline(market.resolutionTime) },
                { label: "Encryption", value: "CoFHE euint64" },
              ].map((s) => (
                <div key={s.label} className="liquid-glass rounded-xl border border-border/20 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{s.label}</p>
                  <p className="text-sm font-semibold font-mono mt-1 truncate">{s.value}</p>
                </div>
              ))}
            </div>

            {market.resolved && (
              <div className="liquid-glass rounded-2xl border border-blue-500/20 bg-blue-500/[0.04] p-5 flex items-center gap-4">
                <ShieldCheck className="w-8 h-8 text-blue-400 shrink-0" />
                <div>
                  <p className="font-semibold text-blue-400">
                    {market.poolsRevealed
                      ? `Outcome: ${market.outcome ? "YES" : "NO"}`
                      : "Resolved — awaiting pool reveal"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Winning side determined on-chain. Pool totals revealed via CoFHE threshold decryption.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Bet + position sidebar — single card */}
          <div className="lg:col-span-2">
            <div className="liquid-glass rounded-2xl border border-border/20 sticky top-24 overflow-hidden">
              {!market.resolved && (
                <section className="p-5 border-b border-border/15">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-primary" /> Place encrypted bet
                  </h2>
                  <BetInterface
                    marketId={market.id}
                    deadline={market.deadline}
                    resolved={market.resolved}
                    onSuccess={() => void refetch()}
                  />
                </section>
              )}

              {market.resolved && (
                <section className="p-5 border-b border-border/15 text-center text-sm text-muted-foreground">
                  Betting closed — market resolved.
                </section>
              )}

              {market.hasBet && (
                <section className="p-5 border-b border-border/15">
                  <PositionPanel
                    marketId={market.id}
                    hasBet
                    resolved={market.resolved}
                    poolsRevealed={market.poolsRevealed}
                    onClaimed={() => void refetch()}
                    embedded
                  />
                </section>
              )}

              <section className="p-5">
                <ResolutionPanel
                  marketId={market.id}
                  creator={market.creator}
                  resolved={market.resolved}
                  poolsRevealed={market.poolsRevealed}
                  onResolved={() => void refetch()}
                />
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketDetail;
