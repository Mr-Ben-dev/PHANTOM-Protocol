import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock, Clock, Plus, ShieldCheck, Globe, BarChart2, Filter,
  ChevronDown, CheckCircle2, XCircle, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/shared/Navbar";
import { useMultiMarkets, type MultiMarket } from "@/hooks/useMultiMarkets";
import { usePhantomMulti } from "@/hooks/usePhantomMulti";
import { useDecryptMultiPools } from "@/hooks/useDecryptMultiPools";
import { useDecryptMultiBet } from "@/hooks/useDecryptMultiBet";
import { useRevealMultiChoice } from "@/hooks/useRevealMultiChoice";
import { getCofheClient } from "@/lib/fhe";
import { useAccount, useReadContract } from "wagmi";
import { PHANTOM_MULTI_ABI, PHANTOM_MULTI_ADDRESS } from "@/config/contracts";
import { getMultiMarketMeta, CATEGORY_COLORS } from "@/config/multi-market-metadata";

// ─── Animation variants ────────────────────────────────────────────────────────

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDeadline(ts: bigint): string {
  return new Date(Number(ts) * 1000).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function gweiToEth(gwei: bigint): string {
  return (Number(gwei) / 1e9).toFixed(4);
}

/** Outcome percentage given revealed pools */
function outcomePercent(pool: bigint, total: bigint): number {
  if (total === 0n) return 0;
  return Math.round(Number(pool) * 100 / Number(total));
}

const STATUS_LABELS: Record<number, { label: string; cls: string }> = {
  0: { label: "unknown", cls: "bg-muted/20 text-muted-foreground" },
  1: { label: "live",     cls: "bg-primary/10 text-primary border border-primary/20" },
  2: { label: "resolved", cls: "bg-blue-500/10 text-blue-400" },
  3: { label: "canceled", cls: "bg-red-500/10 text-red-400" },
  4: { label: "pending",  cls: "bg-yellow-500/10 text-yellow-400" },
};

// ─── Create Market Modal ──────────────────────────────────────────────────────

function CreateMultiMarketModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { createMultiMarket } = usePhantomMulti();
  const [question, setQuestion] = useState("");
  const [labels, setLabels] = useState(["", "", "", ""]);
  const [deadlineDays, setDeadlineDays] = useState("7");
  const [resolutionHours, setResolutionHours] = useState("24");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeLabels = labels.filter((l) => l.trim().length > 0);

  const submit = useCallback(async () => {
    if (!question.trim() || activeLabels.length < 2) {
      setError("Need a question and at least 2 outcome labels.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const now = BigInt(Math.floor(Date.now() / 1000));
      const deadline = now + BigInt(Number(deadlineDays) * 86400);
      const resolution = deadline + BigInt(Number(resolutionHours) * 3600);
      await createMultiMarket(question.trim(), activeLabels, deadline, resolution);
      onCreated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [question, activeLabels, deadlineDays, resolutionHours, createMultiMarket, onCreated, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        className="w-full max-w-lg liquid-glass rounded-2xl border border-border/30 p-6 space-y-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">New Multi-Outcome Market</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider">Question</label>
          <Input
            placeholder="e.g. Who wins the 2025 AI coding race?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Outcome Labels <span className="text-primary">{activeLabels.length}/8</span>
          </label>
          {labels.map((l, i) => (
            <Input
              key={i}
              placeholder={`Outcome ${i + 1}`}
              value={l}
              onChange={(e) => setLabels((prev) => prev.map((x, j) => j === i ? e.target.value : x))}
            />
          ))}
          {labels.length < 8 && (
            <button
              onClick={() => setLabels((prev) => [...prev, ""])}
              className="text-xs text-primary hover:underline"
            >
              + Add outcome
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Deadline (days)</label>
            <Input type="number" min={1} value={deadlineDays} onChange={(e) => setDeadlineDays(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Resolution buffer (hrs)</label>
            <Input type="number" min={1} value={resolutionHours} onChange={(e) => setResolutionHours(e.target.value)} />
          </div>
        </div>

        {error && <p className="text-xs text-red-400 font-mono">{error}</p>}

        <div className="flex gap-3 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="hero" size="sm" onClick={submit} disabled={busy || activeLabels.length < 2}>
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Deploy Market
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Bet Interface ────────────────────────────────────────────────────────────

function MultiBetInterface({
  market,
  onSuccess,
}: {
  market: MultiMarket;
  onSuccess: () => void;
}) {
  const { placeMultiBetSimple } = usePhantomMulti();
  const [selectedOutcome, setSelectedOutcome] = useState<number | null>(null);
  const [amountEth, setAmountEth] = useState("");
  const [status, setStatus] = useState<"idle" | "encrypting" | "submitting" | "done" | "error">("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const submit = useCallback(async () => {
    if (selectedOutcome == null || !amountEth) return;
    setStatus("submitting");
    setErrMsg(null);
    try {
      await placeMultiBetSimple(market.id, selectedOutcome, amountEth);
      setStatus("done");
      onSuccess();
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  }, [selectedOutcome, amountEth, market.id, placeMultiBetSimple, onSuccess]);

  if (status === "done") {
    return (
      <div className="text-center py-4">
        <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
        <p className="text-sm font-medium">Bet placed! Your amount is FHE-encrypted on-chain.</p>
      </div>
    );
  }

  const isOpen = market.status === 1 && !market.resolved && !market.canceled;

  return (
    <div className="space-y-4">
      {/* Outcome selector */}
      <div className="space-y-2">
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Select Outcome</p>
        {market.outcomeLabels.slice(0, market.outcomeCount).map((label, i) => (
          <button
            key={i}
            onClick={() => setSelectedOutcome(i)}
            disabled={!isOpen || status !== "idle"}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left text-sm transition-all ${
              selectedOutcome === i
                ? "border-primary/40 bg-primary/[0.06] text-primary"
                : "border-border/20 hover:border-border/40 text-foreground"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${selectedOutcome === i ? "border-primary bg-primary" : "border-border"}`} />
            {label || `Outcome ${i + 1}`}
          </button>
        ))}
      </div>

      {/* Amount */}
      <div className="space-y-1">
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Amount (ETH)</p>
        <Input
          type="number"
          step="0.001"
          min="0"
          placeholder="0.01"
          value={amountEth}
          onChange={(e) => setAmountEth(e.target.value)}
          disabled={!isOpen || status !== "idle"}
        />
      </div>

      {/* FHE note */}
      <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 font-mono">
        <Lock className="w-3 h-3 text-primary" />
        Your bet amount is CoFHE-encrypted before submission — sealed from all observers.
      </p>

      {errMsg && <p className="text-xs text-red-400 font-mono">{errMsg}</p>}

      <Button
        variant="hero"
        size="sm"
        className="w-full"
        onClick={submit}
        disabled={!isOpen || selectedOutcome == null || !amountEth || status !== "idle"}
      >
        {status === "submitting" && <><Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />Submitting…</>}
        {status === "error" && <><XCircle className="w-3.5 h-3.5 mr-2 text-red-400" />Retry</>}
        {status === "idle" && "Place Bet (ETH)"}
      </Button>
    </div>
  );
}

// ─── Revealed Pools Chart ─────────────────────────────────────────────────────

function PoolsChart({ market }: { market: MultiMarket }) {
  if (!market.poolsRevealed || market.revealedTotalPool === 0n) {
    return (
      <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-mono">
        <Lock className="w-3 h-3 text-primary" />
        Pools are FHE-sealed until resolution.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Pool Distribution</p>
      {market.outcomeLabels.slice(0, market.outcomeCount).map((label, i) => {
        const pct = outcomePercent(market.revealedPools[i] ?? 0n, market.revealedTotalPool);
        const isWinner = market.resolved && market.winningOutcome === i;
        return (
          <div key={i}>
            <div className="flex justify-between text-[10px] font-mono mb-0.5">
              <span className={isWinner ? "text-emerald-400 font-semibold" : "text-muted-foreground"}>
                {label || `Outcome ${i + 1}`}{isWinner && " ✓"}
              </span>
              <span className={isWinner ? "text-emerald-400" : "text-muted-foreground"}>
                {pct}% · {gweiToEth(market.revealedPools[i] ?? 0n)} ETH
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${isWinner ? "bg-emerald-400/70" : "bg-primary/40"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
      <p className="text-[10px] font-mono text-right text-muted-foreground">
        Total: {gweiToEth(market.revealedTotalPool)} ETH
      </p>
    </div>
  );
}

// ─── Position + Claim Panel ───────────────────────────────────────────────────

function PositionPanel({ market, onClaimed }: { market: MultiMarket; onClaimed: () => void }) {
  const { address } = useAccount();
  const { claimMultiPayout } = usePhantomMulti();
  const { decrypt, result, isDecrypting, error: decryptErr } = useDecryptMultiBet(market.id);
  const { reveal: revealChoice, isRevealing, error: choiceErr } = useRevealMultiChoice(market.id);
  const [claiming, setClaiming] = useState(false);
  const [claimErr, setClaimErr] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(false);

  const { data: choiceRevealed } = useReadContract({
    address: PHANTOM_MULTI_ADDRESS,
    abi: PHANTOM_MULTI_ABI,
    functionName: "choiceRevealed",
    args: [market.id, address!],
    query: { enabled: !!address && !!market.hasBet },
  });

  const claim = useCallback(async () => {
    setClaiming(true);
    setClaimErr(null);
    try {
      await claimMultiPayout(market.id);
      setClaimed(true);
      onClaimed();
    } catch (e) {
      setClaimErr(e instanceof Error ? e.message : String(e));
    } finally {
      setClaiming(false);
    }
  }, [market.id, claimMultiPayout, onClaimed]);

  if (!market.hasBet) return null;

  return (
    <div className="liquid-glass rounded-2xl p-4 border border-border/20 space-y-3">
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono">Your Position</p>

      {result ? (
        <p className="text-sm font-mono text-primary">{gweiToEth(result.amount)} ETH placed</p>
      ) : (
        <Button variant="ghost" size="sm" onClick={decrypt} disabled={isDecrypting}>
          {isDecrypting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
          Decrypt my bet
        </Button>
      )}
      {decryptErr && <p className="text-[10px] text-red-400 font-mono">{decryptErr}</p>}

      {market.resolved && market.poolsRevealed && !choiceRevealed && !claimed && (
        <Button variant="outline" size="sm" className="w-full" onClick={revealChoice} disabled={isRevealing}>
          {isRevealing ? "Revealing choice…" : "Reveal Outcome to Claim"}
        </Button>
      )}
      {choiceErr && <p className="text-[10px] text-red-400 font-mono">{choiceErr}</p>}

      {market.resolved && market.poolsRevealed && choiceRevealed && !claimed && (
        <>
          <Button variant="hero" size="sm" className="w-full" onClick={claim} disabled={claiming}>
            {claiming ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-2" />}
            Claim Payout
          </Button>
          {claimErr && <p className="text-[10px] text-red-400 font-mono">{claimErr}</p>}
        </>
      )}
      {claimed && <p className="text-xs text-emerald-400 font-mono">Payout claimed!</p>}
    </div>
  );
}

// ─── Operator (Resolver) Panel ────────────────────────────────────────────────

function OperatorPanel({ market, onAction }: { market: MultiMarket; onAction: () => void }) {
  const { resolveMultiMarket, cancelMultiMarket } = usePhantomMulti();
  const { reveal, isRevealing, error: revealErr } = useDecryptMultiPools(market.id, market.outcomeCount);
  const { address } = useAccount();
  const [winIdx, setWinIdx] = useState<number | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolveErr, setResolveErr] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [canceling, setCanceling] = useState(false);
  const [cancelErr, setCancelErr] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(false);

  const isCreator = address?.toLowerCase() === market.creator.toLowerCase();
  if (!isCreator) return null;

  const resolve = async () => {
    if (winIdx == null) return;
    setResolving(true);
    setResolveErr(null);
    try {
      await resolveMultiMarket(market.id, winIdx);
      onAction();
    } catch (e) {
      setResolveErr(e instanceof Error ? e.message : String(e));
    } finally {
      setResolving(false);
    }
  };

  const cancel = async () => {
    if (!cancelReason.trim()) return;
    setCanceling(true);
    setCancelErr(null);
    try {
      await cancelMultiMarket(market.id, cancelReason.trim());
      onAction();
    } catch (e) {
      setCancelErr(e instanceof Error ? e.message : String(e));
    } finally {
      setCanceling(false);
    }
  };

  return (
    <div className="liquid-glass rounded-2xl p-4 border border-border/20 space-y-3">
      <button
        onClick={() => setShowPanel((v) => !v)}
        className="flex items-center justify-between w-full text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono"
      >
        <span className="flex items-center gap-1.5"><ShieldCheck className="w-3 h-3 text-primary" />Operator Panel</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showPanel ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden space-y-4"
          >
            {/* Resolve */}
            {!market.resolved && !market.canceled && (
              <div className="space-y-2">
                <p className="text-xs font-mono text-muted-foreground">Resolve Market</p>
                {market.outcomeLabels.slice(0, market.outcomeCount).map((label, i) => (
                  <button
                    key={i}
                    onClick={() => setWinIdx(i)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-left text-xs transition-all ${
                      winIdx === i
                        ? "border-primary/40 bg-primary/[0.06] text-primary"
                        : "border-border/20 hover:border-border/40 text-foreground"
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${winIdx === i ? "border-primary bg-primary" : "border-border"}`} />
                    {label || `Outcome ${i + 1}`}
                  </button>
                ))}
                {resolveErr && <p className="text-[10px] text-red-400 font-mono">{resolveErr}</p>}
                <Button variant="hero" size="sm" className="w-full" onClick={resolve} disabled={winIdx == null || resolving}>
                  {resolving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                  Resolve
                </Button>
              </div>
            )}

            {/* Reveal pools */}
            {market.resolved && !market.poolsRevealed && (
              <div className="space-y-2">
                <p className="text-xs font-mono text-muted-foreground">Reveal Encrypted Pools On-Chain</p>
                {revealErr && <p className="text-[10px] text-red-400 font-mono">{revealErr}</p>}
                <Button variant="hero" size="sm" className="w-full" onClick={reveal} disabled={isRevealing}>
                  {isRevealing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                  Decrypt & Reveal Pools
                </Button>
              </div>
            )}

            {/* Cancel */}
            {!market.resolved && !market.canceled && (
              <div className="space-y-2 border-t border-border/20 pt-3">
                <p className="text-xs font-mono text-muted-foreground">Cancel Market</p>
                <Input
                  placeholder="Cancellation reason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
                {cancelErr && <p className="text-[10px] text-red-400 font-mono">{cancelErr}</p>}
                <Button variant="destructive" size="sm" className="w-full" onClick={cancel} disabled={!cancelReason.trim() || canceling}>
                  {canceling ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                  Cancel Market
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Market Card ──────────────────────────────────────────────────────────────

function MultiCard({
  market,
  selected,
  onClick,
}: {
  market: MultiMarket;
  selected: boolean;
  onClick: () => void;
}) {
  const st = STATUS_LABELS[market.status] ?? STATUS_LABELS[0];
  const meta = getMultiMarketMeta(market.id);

  return (
    <motion.div
      variants={item}
      onClick={onClick}
      className={`group liquid-glass rounded-2xl overflow-hidden cursor-pointer transition-all border ${
        selected ? "border-primary/25 bg-primary/[0.03]" : "border-border/20 hover:border-border/35"
      }`}
    >
      {meta?.image && (
        <div className="relative h-28 overflow-hidden">
          <img src={meta.image} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
          {meta.category && (
            <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${CATEGORY_COLORS[meta.category] ?? ""}`}>
              {meta.tag ?? meta.category}
            </span>
          )}
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-primary/10 text-primary border border-primary/20">
            Multi · FHE · {market.outcomeCount} outcomes
          </span>
          <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] uppercase ${st.cls}`}>
            {st.label}
          </span>
        </div>

        <h3 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-hero-heading transition-colors mb-3">
          {market.question}
        </h3>

        {/* Outcome pills */}
        <div className="flex flex-wrap gap-1 mb-3">
          {market.outcomeLabels.slice(0, market.outcomeCount).map((label, i) => {
            const isWinner = market.resolved && market.winningOutcome === i;
            const pct = market.poolsRevealed && market.revealedTotalPool > 0n
              ? outcomePercent(market.revealedPools[i] ?? 0n, market.revealedTotalPool)
              : null;
            return (
              <span
                key={i}
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                  isWinner
                    ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                    : "bg-white/[0.04] border-border/20 text-muted-foreground"
                }`}
              >
                {label || `#${i + 1}`}{pct != null ? ` ${pct}%` : ""}
              </span>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
          <span className="flex items-center gap-1">
            <Lock className="w-2.5 h-2.5" />
            {market.poolsRevealed ? `${gweiToEth(market.revealedTotalPool)} ETH` : "sealed"}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" /> {formatDeadline(market.deadline)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const Multi = () => {
  const { markets, isLoading, refetch } = useMultiMarkets();
  const [selectedId, setSelectedId] = useState<bigint | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "resolved" | "my bets">("active");
  const [showCreate, setShowCreate] = useState(false);

  const filtered = useMemo(() => markets.filter((m) => {
    if (activeTab === "active")   return !m.resolved && !m.canceled;
    if (activeTab === "resolved") return m.resolved;
    if (activeTab === "my bets")  return !!m.hasBet;
    return true;
  }), [markets, activeTab]);

  const selected = selectedId != null ? markets.find((m) => m.id === selectedId) : null;
  const activeCount = markets.filter((m) => !m.resolved && !m.canceled).length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Background gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-background/90" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-primary/[0.03] blur-[120px]" />
      </div>

      <div className="relative z-10 pt-20 flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden lg:flex w-64 flex-col border-r border-border/20 p-6 sticky top-20 h-[calc(100vh-5rem)]">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-5 font-mono">Modules</h3>
          <div className="space-y-1">
            {[
              { name: "PhantomBet",   wave: 1, active: true, href: "/markets" },
              { name: "PhantomMulti", wave: 4, active: true, href: "/multi"   },
            ].map((m) => (
              <a
                key={m.name}
                href={m.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all bg-primary/[0.08] text-primary border border-primary/15"
              >
                <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_hsl(121_95%_76%/0.5)]" />
                <span className="font-medium">{m.name}</span>
              </a>
            ))}
            {[
              { name: "PhantomRounds",    wave: 3 },
              { name: "PhantomLiquidity", wave: 5 },
              { name: "PhantomFutures",   wave: 6 },
            ].map((m) => (
              <div
                key={m.name}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground/50 cursor-not-allowed"
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="font-medium">{m.name}</span>
                <span className="ml-auto text-[10px] font-mono opacity-60">W{m.wave}</span>
              </div>
            ))}
          </div>

          {/* Protocol status */}
          <div className="mt-auto pt-6 border-t border-border/20">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3 font-mono flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3 text-primary" /> Protocol Status
            </div>
            <div className="space-y-2 text-[11px] font-mono text-muted-foreground">
              <div className="flex justify-between"><span>Network</span><span className="text-primary">Arb Sepolia</span></div>
              <div className="flex justify-between"><span>FHE Engine</span><span className="text-primary">Active</span></div>
              <div className="flex justify-between"><span>Markets</span><span className="text-primary">{markets.length}</span></div>
              <div className="flex justify-between"><span>Max Outcomes</span><span className="text-primary">8</span></div>
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
                  <BarChart2 className="w-6 h-6 text-primary" /> Multi-Outcome Markets
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Up to 8 encrypted outcomes per market — pool amounts sealed with CoFHE
                </p>
              </div>
              <Button variant="hero" size="sm" className="gap-2 hidden sm:inline-flex" onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4" /> Create Market
              </Button>
            </motion.div>

            {/* Stats */}
            <motion.div variants={item} className="grid grid-cols-3 gap-4 mb-8">
              {[
                { label: "Active Markets", value: String(activeCount), icon: <BarChart2 className="w-4 h-4 text-primary" /> },
                { label: "Total Markets",  value: String(markets.length), icon: <Globe className="w-4 h-4 text-blue-400" /> },
                { label: "FHE Encrypted",  value: "100%", icon: <ShieldCheck className="w-4 h-4 text-emerald-400" /> },
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

            {/* Markets section */}
            <motion.div variants={item}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    On-Chain Multi Markets (CoFHE)
                  </h2>
                </div>
                <div className="flex gap-1 liquid-glass rounded-full p-1">
                  {(["active", "resolved", "my bets"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`relative px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                        activeTab === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {activeTab === tab && (
                        <motion.div
                          layoutId="multi-tab"
                          className="absolute inset-0 rounded-full bg-white/[0.08] border border-white/[0.06]"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10 capitalize">{tab}</span>
                    </button>
                  ))}
                </div>
              </div>

              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  Loading markets…
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12 liquid-glass rounded-2xl border border-border/20 text-muted-foreground">
                  <BarChart2 className="w-8 h-8 text-primary/40 mx-auto mb-3" />
                  <p className="text-sm mb-2">No {activeTab} multi-outcome markets yet.</p>
                  {activeTab === "active" && (
                    <button className="text-primary text-sm underline" onClick={() => setShowCreate(true)}>
                      Create the first one
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Card grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map((market) => (
                      <MultiCard
                        key={String(market.id)}
                        market={market}
                        selected={selected?.id === market.id}
                        onClick={() => setSelectedId((prev) => prev === market.id ? null : market.id)}
                      />
                    ))}
                  </div>

                  {/* Inline detail panel */}
                  {selected && (
                    <motion.div
                      key={String(selected.id)}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="grid lg:grid-cols-5 gap-6"
                    >
                      {/* Detail card */}
                      <div className="lg:col-span-3 liquid-glass rounded-2xl p-6 border border-border/20">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1 pr-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-primary/10 text-primary border border-primary/20 mb-2 inline-block">
                              Multi · CoFHE · Arb Sepolia · {selected.outcomeCount} outcomes
                            </span>
                            <h2 className="text-base font-semibold text-hero-heading leading-snug">
                              {selected.question}
                            </h2>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1.5">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {formatDeadline(selected.deadline)}
                              </span>
                              {selected.hasBet && (
                                <span className="text-primary font-mono text-[10px]">✓ you have a bet</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`px-3 py-1 rounded-full font-mono text-xs uppercase ${STATUS_LABELS[selected.status]?.cls}`}>
                              {STATUS_LABELS[selected.status]?.label}
                            </span>
                            <button
                              onClick={() => setSelectedId(null)}
                              className="w-7 h-7 rounded-full bg-white/[0.05] border border-border/30 flex items-center justify-center text-muted-foreground hover:text-foreground text-base leading-none"
                            >
                              ×
                            </button>
                          </div>
                        </div>

                        <PoolsChart market={selected} />

                        {!selected.resolved && !selected.canceled && (
                          <div className="mt-5">
                            <MultiBetInterface market={selected} onSuccess={refetch} />
                          </div>
                        )}

                        {selected.resolved && !selected.poolsRevealed && (
                          <div className="mt-4 text-center py-4">
                            <Lock className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">
                              Market resolved — pools pending CoFHE decryption reveal.
                            </p>
                          </div>
                        )}

                        {selected.canceled && (
                          <div className="mt-4 text-center py-4">
                            <XCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">This market has been canceled.</p>
                          </div>
                        )}
                      </div>

                      {/* Right panels */}
                      <div className="lg:col-span-2 space-y-4">
                        <PositionPanel market={selected} onClaimed={refetch} />
                        <OperatorPanel market={selected} onAction={refetch} />
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </motion.div>

          </motion.div>
        </main>
      </div>

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateMultiMarketModal onClose={() => setShowCreate(false)} onCreated={refetch} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Multi;
