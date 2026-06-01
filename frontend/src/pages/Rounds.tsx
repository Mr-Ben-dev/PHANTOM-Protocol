import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { parseEther } from "viem";
import {
  Activity,
  CheckCircle2,
  Clock,
  Lock,
  Plus,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Navbar from "@/components/shared/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { usePhantomRounds } from "@/hooks/usePhantomRounds";
import { type Round, useRounds } from "@/hooks/useRounds";
import { useLivePrice } from "@/hooks/useLivePrice";
import { RoundPositionActions } from "@/components/rounds/RoundPositionActions";

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

function formatTime(ts: bigint): string {
  if (ts === 0n) return "-";
  return new Date(Number(ts) * 1000).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Contract stores prices as uint64 with 8 decimal precision (like Chainlink) */
function formatPrice(value: bigint): string {
  if (value === 0n) return "-";
  const dollars = Number(value) / 1e8;
  return `$${dollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatCountdown(settleAt: bigint): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = Number(settleAt) - now;
  if (diff <= 0) return "Settling...";
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function statusClass(round: Round) {
  if (round.status === 1) return "bg-primary/10 text-primary border-primary/20";
  if (round.status === 2) return "bg-amber-400/10 text-amber-300 border-amber-300/20";
  if (round.status === 3) return "bg-sky-400/10 text-sky-300 border-sky-300/20";
  return "bg-muted/20 text-muted-foreground border-border/30";
}

function intervalLabel(seconds: number) {
  return seconds === 900 ? "15m" : "5m";
}

const Rounds = () => {
  const { address, isConnected, connect } = useWalletAuth();
  const { rounds, isLoading, configured, refetch } = useRounds();
  const { createRound, placeRoundBetSimple } = usePhantomRounds();
  const { prices, connected: wsConnected } = useLivePrice();

  const [activeTab, setActiveTab] = useState<"open" | "locked" | "resolved" | "mine">("open");
  const [amountByRound, setAmountByRound] = useState<Record<string, string>>({});
  const [busyRound, setBusyRound] = useState<string | null>(null);
  const [operatorBusy, setOperatorBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [operatorForm, setOperatorForm] = useState({
    asset: "BTC/USD",
    interval: "300",
    startPrice: "",
    lockDelay: "300",
    settleDelay: "360",
    oracleRoundId: "BTC-5M-1",
  });

  // Auto-populate startPrice from live BTC price when operator console is opened
  const liveStartPrice = useMemo(() => {
    const btcPrice = prices.BTC?.price;
    if (!btcPrice) return "";
    return String(Math.round(btcPrice * 1e8));
  }, [prices.BTC?.price]);

  const filtered = useMemo(() => {
    if (activeTab === "open") return rounds.filter((round) => round.status === 1);
    if (activeTab === "locked") return rounds.filter((round) => round.status === 2);
    if (activeTab === "resolved") return rounds.filter((round) => round.status === 3);
    return rounds.filter((round) => round.hasBet);
  }, [activeTab, rounds]);

  const stats = useMemo(() => {
    return {
      open: rounds.filter((round) => round.status === 1).length,
      locked: rounds.filter((round) => round.status === 2).length,
      resolved: rounds.filter((round) => round.status === 3).length,
      mine: rounds.filter((round) => round.hasBet).length,
    };
  }, [rounds]);

  const handleBet = async (round: Round, directionUp: boolean) => {
    if (!isConnected) {
      connect();
      return;
    }

    const rawAmount = amountByRound[String(round.id)] || "";
    if (!rawAmount || Number(rawAmount) <= 0) {
      setMessage("Enter an ETH amount before placing a bet (e.g. 0.01).");
      return;
    }

    let ethAmount: bigint;
    try {
      ethAmount = parseEther(rawAmount);
    } catch {
      setMessage("Invalid ETH amount.");
      return;
    }

    setBusyRound(String(round.id));
    setMessage(null);
    try {
      // placeRoundBetSimple — sends plaintext direction, trivially encrypted on-chain
      // No CoFHE client-side encryption needed; works directly with MetaMask
      const txHash = await placeRoundBetSimple(round.id, directionUp, ethAmount);
      setMessage(`✅ Bet placed ${directionUp ? "UP ↑" : "DOWN ↓"}: ${txHash}`);
      setAmountByRound((prev) => ({ ...prev, [String(round.id)]: "" }));
      refetch();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Bet failed.");
    } finally {
      setBusyRound(null);
    }
  };

  const handleCreateRound = async () => {
    if (!isConnected) {
      connect();
      return;
    }

    setOperatorBusy(true);
    setMessage(null);
    try {
      const now = Math.floor(Date.now() / 1000);
      const lockAt = BigInt(now + Number(operatorForm.lockDelay));
      const settleAt = BigInt(now + Number(operatorForm.settleDelay));
      const txHash = await createRound(
        operatorForm.asset,
        Number(operatorForm.interval),
        BigInt(operatorForm.startPrice || liveStartPrice || "0"),
        lockAt,
        settleAt,
        operatorForm.oracleRoundId || `${operatorForm.asset.replace("/USD","")}-5M-${Math.floor(Date.now()/1000)}`,
      );
      setMessage(`Round created: ${txHash}`);
      refetch();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Round creation failed.");
    } finally {
      setOperatorBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Live price ticker bar */}
      <div className="border-b border-border/30 bg-background/60 backdrop-blur-md sticky top-16 z-30">
        <div className="max-w-6xl mx-auto px-6 py-2 flex items-center gap-6 overflow-x-auto">
          {(["BTC", "ETH", "SOL"] as const).map((asset) => {
            const p = prices[asset];
            const isPositive = p.change24h >= 0;
            return (
              <div key={asset} className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-mono text-muted-foreground">{asset}/USD</span>
                <span className="text-sm font-semibold font-mono">{p.priceStr === "—" ? "..." : `$${p.priceStr}`}</span>
                <span className={`text-[10px] font-mono ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                  {p.changeStr === "—" ? "" : p.changeStr}
                </span>
              </div>
            );
          })}
          <div className="ml-auto flex items-center gap-1.5 shrink-0">
            <div className={`w-1.5 h-1.5 rounded-full ${wsConnected ? "bg-emerald-400" : "bg-amber-400"} animate-pulse`} />
            <span className="text-[10px] text-muted-foreground font-mono">{wsConnected ? "LIVE" : "REST"}</span>
          </div>
        </div>
      </div>

      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,hsl(121_95%_76%/0.055),transparent_32%),radial-gradient(circle_at_90%_10%,hsl(204_90%_66%/0.045),transparent_30%)]" />
        <div className="absolute inset-0 bg-background/88" />
      </div>

      <div className="relative z-10 pt-8 pb-20 max-w-6xl mx-auto px-6">
        <motion.div variants={container} initial="hidden" animate="visible">
          <motion.div variants={item} className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between mb-10">
            <div>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-primary font-mono mb-3">
                <Activity className="w-3.5 h-3.5" /> Wave 3
              </div>
              <h1 className="text-3xl font-semibold text-hero-heading mb-2">Rounds</h1>
              <p className="text-muted-foreground max-w-2xl">
                Five and fifteen minute encrypted UP/DOWN markets settled by signed oracle observations.
              </p>
            </div>
            <Button variant="outline" size="sm" className="gap-2 w-fit" onClick={refetch}>
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>
          </motion.div>

          <motion.div variants={item} className="grid sm:grid-cols-4 gap-4 mb-8">
            {[
              { icon: TrendingUp, label: "Open", value: stats.open },
              { icon: Lock, label: "Locked", value: stats.locked },
              { icon: CheckCircle2, label: "Resolved", value: stats.resolved },
              { icon: ShieldCheck, label: "Mine", value: stats.mine },
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

          {message && (
            <motion.div variants={item} className="mb-6 liquid-glass rounded-2xl p-4 text-sm text-muted-foreground break-words">
              {message}
            </motion.div>
          )}

          <motion.div variants={item} className="grid lg:grid-cols-3 gap-8">
            <section className="lg:col-span-2">
              <div className="flex gap-1 mb-6 liquid-glass rounded-full p-1 w-fit max-w-full overflow-x-auto">
                {(["open", "locked", "resolved", "mine"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`relative px-5 py-2 rounded-full text-sm font-medium capitalize transition-colors ${
                      activeTab === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {activeTab === tab && (
                      <motion.div
                        layoutId="round-tab"
                        className="absolute inset-0 rounded-full bg-white/[0.08] border border-white/[0.06]"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{tab}</span>
                  </button>
                ))}
              </div>

              {!configured ? (
                <div className="text-center py-20 liquid-glass rounded-2xl">
                  <ShieldCheck className="w-10 h-10 text-primary mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">PhantomRounds not deployed</h2>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Deploy the Wave 3 contract to populate the rounds feed from Arbitrum Sepolia.
                  </p>
                </div>
              ) : isLoading ? (
                <div className="text-center py-20 text-muted-foreground">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  Loading rounds from contract...
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-20 liquid-glass rounded-2xl">
                  <Clock className="w-10 h-10 text-primary mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">No rounds found</h2>
                  <p className="text-sm text-muted-foreground">
                    The selected contract view has no rounds yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filtered.map((round) => {
                    const roundKey = String(round.id);
                    const canBet = round.status === 1 && !round.hasBet;
                    const busy = busyRound === roundKey;

                    return (
                      <motion.article key={roundKey} variants={item} className="liquid-glass rounded-2xl p-6 hover:border-border/40 transition-colors border border-border/20">
                        {/* Header row */}
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-5">
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className="px-2.5 py-1 rounded-full bg-primary/10 text-xs font-mono text-primary font-semibold">
                                {round.asset}
                              </span>
                              <span className={`px-2.5 py-1 rounded-full border text-xs font-mono font-medium ${statusClass(round)}`}>
                                {round.statusLabel}
                              </span>
                              <span className="px-2.5 py-1 rounded-full bg-white/[0.04] text-xs font-mono text-muted-foreground">
                                {intervalLabel(round.intervalSeconds)}
                              </span>
                              {round.status === 1 && (
                                <span className="px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-xs font-mono text-amber-300 flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" /> {formatCountdown(round.settleAt)}
                                </span>
                              )}
                            </div>
                            <h3 className="text-base font-semibold text-foreground">
                              {round.asset} closes {round.status === 3 ? (round.outcomeUp ? "⬆ UP" : "⬇ DOWN") : "UP or DOWN?"}
                            </h3>
                          </div>
                          <div className="font-mono text-[10px] text-muted-foreground sm:text-right shrink-0">
                            <p className="text-xs">#{String(round.id)}</p>
                            <p className="truncate max-w-[140px]">{round.oracleRoundId}</p>
                          </div>
                        </div>

                        {/* Price grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 p-4 rounded-xl bg-white/[0.025] border border-border/15">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-1">Start Price</p>
                            <p className="font-mono text-sm font-semibold text-foreground">{formatPrice(round.startPrice)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-1">End Price</p>
                            <p className={`font-mono text-sm font-semibold ${round.endPrice > 0n ? (round.outcomeUp ? "text-emerald-400" : "text-red-400") : "text-muted-foreground"}`}>
                              {formatPrice(round.endPrice)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-1">Lock</p>
                            <p className="font-mono text-sm">{formatTime(round.lockAt)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-1">Settle</p>
                            <p className="font-mono text-sm">{formatTime(round.settleAt)}</p>
                          </div>
                        </div>

                        {/* Pool bar */}
                        {round.poolsRevealed ? (
                          <div className="mb-5">
                            <div className="flex justify-between text-xs font-mono mb-1.5">
                              <span className="text-emerald-400">↑ UP {round.revealedTotalPool > 0n ? Math.round(Number(round.revealedUpPool) * 100 / Number(round.revealedTotalPool)) : 50}%</span>
                              <span className="text-red-400">DOWN ↓ {round.revealedTotalPool > 0n ? Math.round(Number(round.revealedDownPool) * 100 / Number(round.revealedTotalPool)) : 50}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-red-400/20 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-emerald-400/70"
                                style={{ width: `${round.revealedTotalPool > 0n ? Math.round(Number(round.revealedUpPool) * 100 / Number(round.revealedTotalPool)) : 50}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[10px] text-muted-foreground font-mono mt-1">
                              <span>{String(round.revealedUpPool)} gwei</span>
                              <span>{String(round.revealedDownPool)} gwei</span>
                            </div>
                          </div>
                        ) : (
                          <div className="mb-5 flex items-center gap-2 text-xs font-mono text-primary/70">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            UP and DOWN pools encrypted — direction hidden until reveal
                          </div>
                        )}

                        {/* Bettors + total ETH */}
                        <div className="flex items-center gap-4 mb-5 text-xs text-muted-foreground font-mono">
                          <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> {String(round.bettorCount)} bettors</span>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <Input
                            value={amountByRound[roundKey] ?? ""}
                            onChange={(event) => setAmountByRound((prev) => ({ ...prev, [roundKey]: event.target.value }))}
                            placeholder="ETH (e.g. 0.01)"
                            inputMode="decimal"
                            disabled={!canBet || busy}
                            className="sm:max-w-40"
                          />
                          <Button
                            variant="hero"
                            size="sm"
                            className="gap-2"
                            disabled={!canBet || busy}
                            onClick={() => handleBet(round, true)}
                          >
                            <TrendingUp className="w-4 h-4" /> UP
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            disabled={!canBet || busy}
                            onClick={() => handleBet(round, false)}
                          >
                            <TrendingDown className="w-4 h-4" /> DOWN
                          </Button>
                          {round.hasBet && (
                            <RoundPositionActions
                              round={round}
                              busy={busy}
                              onBusyChange={(v) => setBusyRound(v ? roundKey : null)}
                              onMessage={setMessage}
                              onDone={refetch}
                            />
                          )}
                        </div>
                      </motion.article>
                    );
                  })}
                </div>
              )}
            </section>

            <aside className="space-y-6">
              <div className="liquid-glass rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Plus className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold">Operator Console</h2>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5 font-mono">Asset</p>
                    <div className="grid grid-cols-3 gap-2">
                      {["BTC/USD", "ETH/USD", "SOL/USD"].map((asset) => (
                        <button
                          key={asset}
                          className={`rounded-xl border px-2 py-2 text-xs font-mono font-medium transition-colors ${
                            operatorForm.asset === asset
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : "border-border/30 text-muted-foreground hover:text-foreground"
                          }`}
                          onClick={() => {
                            const symbol = asset.replace("/USD", "") as "BTC" | "ETH" | "SOL";
                            const p = prices[symbol]?.price;
                            setOperatorForm((prev) => ({
                              ...prev,
                              asset,
                              startPrice: p ? String(Math.round(p * 1e8)) : prev.startPrice,
                              oracleRoundId: `${symbol}-5M-${Math.floor(Date.now() / 1000)}`,
                            }));
                          }}
                        >
                          {asset.replace("/USD", "")}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                        operatorForm.interval === "300"
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border/30 text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => setOperatorForm((prev) => ({ ...prev, interval: "300", lockDelay: "300", settleDelay: "360" }))}
                    >
                      5m
                    </button>
                    <button
                      className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                        operatorForm.interval === "900"
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border/30 text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => setOperatorForm((prev) => ({ ...prev, interval: "900", lockDelay: "900", settleDelay: "960" }))}
                    >
                      15m
                    </button>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5 font-mono">Start Price (auto from live)</p>
                    <div className="relative">
                      <Input
                        value={operatorForm.startPrice || liveStartPrice}
                        onChange={(event) => setOperatorForm((prev) => ({ ...prev, startPrice: event.target.value.replace(/\D/g, "") }))}
                        placeholder={liveStartPrice || "Price × 1e8"}
                        inputMode="numeric"
                        className="pr-20"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground">
                        {operatorForm.startPrice || liveStartPrice
                          ? `$${(Number(operatorForm.startPrice || liveStartPrice) / 1e8).toLocaleString()}`
                          : ""}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="hero"
                    size="sm"
                    className="w-full gap-2 mt-2"
                    disabled={!configured || operatorBusy}
                    onClick={handleCreateRound}
                  >
                    {isConnected ? <Plus className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
                    {isConnected ? "+ Create Round" : "Connect Wallet"}
                  </Button>
                </div>
              </div>

              <div className="liquid-glass rounded-2xl p-6 text-sm text-muted-foreground">
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4 font-mono flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-primary" /> Protocol Status
                </div>
                <div className="space-y-2 font-mono text-xs">
                  <div className="flex justify-between gap-4">
                    <span>Network</span>
                    <span className="text-primary">Arb Sepolia</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Contract</span>
                    <span className={configured ? "text-primary" : "text-amber-300"}>{configured ? "Configured" : "Missing"}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Price Feed</span>
                    <span className={wsConnected ? "text-emerald-400" : "text-amber-300"}>{wsConnected ? "Live (WS)" : "REST"}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Wallet</span>
                    <span className={address ? "text-primary" : "text-muted-foreground"}>{address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Disconnected"}</span>
                  </div>
                  <div className="border-t border-border/20 pt-2 mt-2 space-y-1.5">
                    {(["BTC", "ETH", "SOL"] as const).map((a) => (
                      <div key={a} className="flex justify-between gap-4">
                        <span className="text-muted-foreground">{a}</span>
                        <span className={prices[a].change24h >= 0 ? "text-emerald-400" : "text-red-400"}>
                          {prices[a].priceStr !== "—" ? `$${prices[a].priceStr}` : "..."}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Rounds;
