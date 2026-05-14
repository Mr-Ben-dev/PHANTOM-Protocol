import { motion } from "framer-motion";
import {
  Lock, Key, Shield, Layers, ExternalLink, ArrowRight,
  Zap, ShieldCheck, Eye, GitBranch, Terminal,
  Box, ChevronRight, Network, Globe, FileCode
} from "lucide-react";
import Navbar from "@/components/shared/Navbar";
import { useHlsVideo } from "@/hooks/useHlsVideo";

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
};

const Docs = () => {
  const heroVideoRef = useHlsVideo("https://stream.mux.com/1CCfG6mPC7LbMOAs6iBOfPeNd3WaKlZuHuKHp00G62j8.m3u8");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-20 pb-20 overflow-hidden">
        <div className="absolute inset-0">
          <video ref={heroVideoRef} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-[0.08]" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
          <div className="absolute inset-0 bg-grid-pattern opacity-40" />
        </div>
        <motion.div
          variants={container}
          initial="hidden"
          animate="visible"
          className="relative z-10 max-w-4xl mx-auto px-6 pt-16"
        >
          <motion.div variants={item} className="liquid-glass rounded-full px-4 py-1.5 mb-6 inline-flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Protocol Reference</span>
            <span className="bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full">Wave 3 — Live</span>
          </motion.div>
          <motion.h1 variants={item} className="text-4xl sm:text-5xl font-semibold text-hero-heading leading-tight mb-4">
            PHANTOM Protocol Docs
          </motion.h1>
          <motion.p variants={item} className="text-lg text-hero-sub max-w-2xl leading-relaxed">
            The complete technical reference for PHANTOM’s encrypted prediction engine — from FHE fundamentals and contract architecture to Wave 1–3 specifications, PhantomRounds, and the full five-wave roadmap.
          </motion.p>
          <motion.div variants={item} className="flex flex-wrap gap-3 mt-6">
            {["Overview", "FHE Engine", "Contracts", "Wave 3 Rounds", "ACL System", "Integration", "Roadmap"].map((sec) => (
              <span key={sec} className="liquid-glass rounded-full px-3 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">{sec}</span>
            ))}
          </motion.div>
        </motion.div>
      </section>

      <main className="relative z-10 pb-24 px-6">
        <div className="max-w-4xl mx-auto space-y-24">

          {/* OVERVIEW */}
          <DocSection icon={Shield} badge="Overview" title="What is PHANTOM Protocol?" id="overview">
            <p className="text-foreground/80 leading-relaxed">
              PHANTOM is an encrypted prediction market protocol powered by Fully Homomorphic Encryption (FHE). Users bet on real-world outcomes  their bet amount, direction, and the aggregate pool totals all remain encrypted on-chain throughout the entire lifecycle of a market.
            </p>
            <p className="text-foreground/80 leading-relaxed mt-4">
              FHE is the only cryptographic scheme that lets a smart contract perform arithmetic directly on ciphertext. The contract accumulates pool totals, routes bets to outcomes, and computes payouts  all without ever decrypting user data. Resolution triggers a controlled, threshold-mediated decryption that reveals only the aggregate outcome.
            </p>
            <div className="grid sm:grid-cols-3 gap-4 mt-8">
              {[
                { label: "FHE vs ZK", desc: "Zero-Knowledge proves a statement without revealing inputs. FHE actually computes on encrypted inputs  it runs full market logic on ciphertext, not just verification." },
                { label: "FHE vs TEE", desc: "Trusted Execution Environments require hardware trust. FHE is cryptographically guaranteed  no trusted party, no hardware attestation, no off-chip secrets." },
                { label: "FHE vs Commit-Reveal", desc: "Commit-reveal only delays disclosure. With FHE, data stays permanently encrypted. Even the contract operator cannot read bets  ever." },
              ].map((c) => (
                <div key={c.label} className="liquid-glass rounded-xl p-5">
                  <div className="text-sm font-semibold text-primary mb-2">{c.label}</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
                </div>
              ))}
            </div>
            <div className="liquid-glass rounded-2xl p-6 mt-6">
              <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" /> Deployed Network
              </h4>
              <div className="grid sm:grid-cols-3 gap-4 text-sm">
                {[
                  { label: "Network", value: "Arbitrum Sepolia" },
                  { label: "Chain ID", value: "421614" },
                  { label: "FHE Coprocessor", value: "Fhenix CoFHE" },
                ].map((d) => (
                  <div key={d.label}>
                    <p className="text-muted-foreground text-xs mb-1 font-mono uppercase tracking-wider">{d.label}</p>
                    <p className="font-mono text-foreground/90 font-medium">{d.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </DocSection>

          {/* FHE ENGINE */}
          <DocSection icon={Zap} badge="FHE Engine" title="The CoFHE Architecture" id="fhe-engine">
            <p className="text-foreground/80 leading-relaxed">
              PHANTOM uses <strong className="text-foreground">Fhenix CoFHE</strong>  a coprocessor model where FHE compute happens in an off-chain threshold network while smart contract state remains on the EVM. This hybrid design delivers the cryptographic guarantees of FHE with practical EVM execution costs.
            </p>
            <div className="liquid-glass rounded-2xl p-6 mt-6">
              <h4 className="text-sm font-semibold text-foreground mb-5">End-to-End Flow</h4>
              <div className="space-y-3">
                {[
                  { step: "01", label: "Client Encryption", desc: "The browser encrypts bet amount and direction using @cofhe/sdk, producing ciphertext handles (InEuint64 / InEbool) with a security zone and EIP-712 signature." },
                  { step: "02", label: "On-Chain Submission", desc: "Encrypted inputs are passed to PhantomBet.placeBet(). The contract uses FHE.select() to route the bet to the YES or NO pool based on the encrypted direction  no plaintext ever touched." },
                  { step: "03", label: "Homomorphic Aggregation", desc: "Pool totals are accumulated via FHE.add() on euint64 ciphertexts. The contract holds only encrypted handles  all real values live in CoFHE-managed state that the contract itself cannot read." },
                  { step: "04", label: "Resolution", desc: "After the deadline, a resolver calls resolveMarket(). The contract calls FHE.allowPublic() on the winning pool handle, authorizing CoFHE nodes to threshold-decrypt it." },
                  { step: "05", label: "Threshold Decrypt", desc: "CoFHE nodes collectively decrypt the authorized ciphertext and post the plaintext result + ECDSA signature on-chain via FHE.publishDecryptResult(). No single node can decrypt alone." },
                  { step: "06", label: "Payout Claim", desc: "Winners call claimPayout(). Payouts are computed from the now-public pool totals. Individual bets remain encrypted permanently  only the aggregate matters for settlement." },
                ].map((s) => (
                  <div key={s.step} className="flex gap-4 items-start">
                    <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center font-mono text-xs text-primary font-semibold">{s.step}</div>
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-1">{s.label}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="liquid-glass rounded-2xl p-6 mt-6">
              <h4 className="text-sm font-semibold text-foreground mb-4">FHE Operations Reference</h4>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { op: "FHE.asEuint64(InEuint64)", desc: "Convert encrypted input handle to on-chain euint64 ciphertext" },
                  { op: "FHE.asEbool(InEbool)", desc: "Convert encrypted boolean input to on-chain ebool" },
                  { op: "FHE.add(a, b)", desc: "Homomorphic addition of two euint64 ciphertexts  pool accumulation" },
                  { op: "FHE.select(cond, a, b)", desc: "Encrypted conditional: route bet to YES pool if encrypted direction is true" },
                  { op: "FHE.allowThis(ct)", desc: "Grant the contract itself ACL permission to operate on a ciphertext" },
                  { op: "FHE.allow(ct, addr)", desc: "Grant a specific address ACL permission to decrypt a ciphertext" },
                  { op: "FHE.allowPublic(ct)", desc: "Mark a pool ciphertext for public decryption after resolution" },
                  { op: "FHE.publishDecryptResult(ct, val, sig)", desc: "Post threshold-decrypted plaintext + ECDSA proof on-chain" },
                ].map((r) => (
                  <div key={r.op} className="liquid-glass rounded-xl p-4">
                    <code className="text-primary font-mono text-xs block mb-1 break-all">{r.op}</code>
                    <p className="text-xs text-muted-foreground">{r.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </DocSection>

          {/* WAVE 1 CONTRACTS */}
          <DocSection icon={FileCode} badge="Waves 1–3" title="Smart Contract Architecture" id="contracts">
            <p className="text-foreground/80 leading-relaxed mb-6">
              Wave 1 ships three Solidity 0.8.25 contracts compiled with <code className="text-primary font-mono text-sm">viaIR: true</code> and <code className="text-primary font-mono text-sm">evmVersion: cancun</code>  required for the full Fhenix CoFHE interface. All modules inherit from PhantomACL.
            </p>
            <div className="liquid-glass rounded-2xl p-6 mb-6">
              <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" /> Deployed Addresses — Arbitrum Sepolia (Chain ID 421614)
              </h4>
              <div className="space-y-3">
                {[
                  { name: "PhantomBet", addr: "0x31a578f2c63a85Ae13E1e12A859a2B5f775De228", label: "Wave 1 — Binary prediction market" },
                  { name: "PhantomToken ($PHTM)", addr: "0x78AF03022b1cD35e75642Ac2A043a6d2cE472228", label: "Wave 2 — FHERC20 encrypted native token" },
                  { name: "PhantomRounds", addr: "0x76db8a0429d19e8440e3D290F79c0613834c72a1", label: "Wave 3 — Automated price-round engine" },
                ].map((c) => (
                  <div key={c.name} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                    <div className="shrink-0">
                      <p className="text-xs text-primary/70 font-mono font-semibold">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.label}</p>
                    </div>
                    <code className="font-mono text-primary/90 text-xs bg-primary/[0.06] border border-primary/15 rounded-lg px-3 py-2 break-all">{c.addr}</code>
                  </div>
                ))}
              </div>
            </div>
            <div className="liquid-glass rounded-2xl p-6 mb-4">
              <div className="flex items-center gap-3 mb-4">
                <code className="font-mono text-primary font-semibold text-sm">PhantomACL.sol</code>
                <span className="text-[10px] font-mono bg-muted/50 text-muted-foreground px-2 py-0.5 rounded-full uppercase">Abstract Base</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">Shared access control layer inherited by all contracts. Manages ciphertext permissions and role-based access across all protocol modules.</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Role Enum</p>
                  <div className="space-y-1">
                    {["NONE", "CREATOR", "BETTOR", "RESOLVER", "AUDITOR"].map((r) => (
                      <div key={r} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
                        <code className="text-xs text-primary/80 font-mono">{r}</code>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">ACL Helpers</p>
                  <div className="space-y-1">
                    {["_grantDecrypt(ct, addr)", "_retainAccess(ct)", "_makePublic(ct)"].map((fn) => (
                      <div key={fn} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
                        <code className="text-xs text-primary/80 font-mono">{fn}</code>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="liquid-glass rounded-2xl p-6 mb-4">
              <div className="flex items-center gap-3 mb-4">
                <code className="font-mono text-primary font-semibold text-sm">PhantomBet.sol</code>
                <span className="text-[10px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase">Wave 1  Core</span>
              </div>
              <p className="text-sm text-muted-foreground mb-5">Binary YES/NO prediction market with fully encrypted bet routing, homomorphic pool aggregation, and threshold-mediated payout settlement.</p>
              <div className="space-y-3">
                {[
                  { fn: "createMarket(question, deadline, resolutionTime)", role: "Anyone", desc: "Creates a new binary market. Emits MarketCreated. resolutionTime must be strictly greater than deadline to allow resolution window." },
                  { fn: "placeBet(marketId, encAmount, encDirection)", role: "Any bettor", desc: "Accepts encrypted amount (InEuint64) and direction (InEbool). Uses FHE.select() to non-interactively route to YES or NO pool. ACL grants bettor decrypt access to their own ciphertext." },
                  { fn: "resolveMarket(marketId, outcome)", role: "RESOLVER", desc: "Marks boolean outcome. Calls FHE.allowPublic() on the winning pool handle, authorizing CoFHE threshold-decryption of aggregate pool total." },
                  { fn: "revealPools(marketId, yesTotal, noTotal, sig)", role: "Anyone", desc: "Publishes threshold-decrypted pool totals via FHE.publishDecryptResult(). Posts CoFHE ECDSA signature as on-chain cryptographic proof." },
                  { fn: "claimPayout(marketId)", role: "Winners", desc: "Permissionless payout claim. Computes proportional share from revealed pool totals. Losing bets stay encrypted permanently." },
                  { fn: "getMarketInfo(marketId)", role: "Read-only", desc: "Returns all 11 market fields: question, creator, deadline, resolutionTime, resolved, outcome, betCount, yesPool (handle), noPool (handle), totalDeposited, revealComplete." },
                ].map((f) => (
                  <div key={f.fn} className="border border-border/30 rounded-xl p-4 hover:border-primary/20 transition-colors">
                    <div className="flex flex-wrap items-start gap-3 mb-2">
                      <code className="font-mono text-primary text-xs font-semibold break-all">{f.fn}</code>
                      <span className="text-[10px] font-mono bg-muted/50 text-muted-foreground px-2 py-0.5 rounded-full uppercase shrink-0">{f.role}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="liquid-glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <code className="font-mono text-primary font-semibold text-sm">PhantomToken.sol</code>
                <span className="text-[10px] font-mono bg-muted/50 text-muted-foreground px-2 py-0.5 rounded-full uppercase">FHERC20</span>
              </div>
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">$PHTM</strong>  PHANTOM''s native encrypted token. Implements the FHERC20 standard from Fhenix CoFHE. All balances are stored as <code className="text-primary font-mono text-xs">euint64</code> ciphertexts. Transfer amounts are encrypted; only the sender, recipient, and authorized contracts hold ACL permissions to view balances.
              </p>
            </div>
          </DocSection>

          {/* WAVE 3 — PHANTOMROUNDS */}
          <DocSection icon={Zap} badge="Wave 3" title="PhantomRounds — Encrypted Price-Round Engine" id="wave3">
            <p className="text-foreground/80 leading-relaxed">
              PhantomRounds is PHANTOM’s automated price-round market engine, live on Arbitrum Sepolia at <code className="text-primary font-mono text-sm">0x76db8a0429d19e8440e3D290F79c0613834c72a1</code>. Users bet whether BTC, ETH, or SOL will close higher or lower than the opening price within a fixed time window (5 or 15 minutes). All pool totals are FHE-encrypted until CoFHE threshold decryption.
            </p>
            <div className="liquid-glass rounded-2xl p-6 mt-6">
              <h4 className="text-sm font-semibold text-foreground mb-5">Round Lifecycle</h4>
              <div className="space-y-3">
                {[
                  { step: "01", label: "createRound()", desc: "Keeper bot calls createRound(asset, intervalSeconds, startPrice, lockAt, settleAt, oracleRoundId). Only 300s (5m) or 900s (15m) intervals allowed. startPrice is uint64 with 8 decimal places (e.g. $80,500.99 → 8050099000000)." },
                  { step: "02", label: "placeRoundBetSimple()", desc: "User calls placeRoundBetSimple(roundId, isUp) payable with ETH. The contract calls FHE.asEbool(isUp) to encrypt direction on-chain via trivial encryption — no client-side CoFHE SDK required. FHE.select() routes ETH into the encrypted UP or DOWN pool." },
                  { step: "03", label: "lockRound()", desc: "At lockAt timestamp, keeper calls lockRound(roundId). Status: OPEN → LOCKED. No new bets accepted." },
                  { step: "04", label: "resolveRound()", desc: "At settleAt, keeper fetches Binance price, signs the oracle hash using EIP-191 personal sign, and calls resolveRound(roundId, endPrice, observedAt, signature). Contract calls FHE.gte(encEndPrice, encStartPrice) to compute encrypted outcome. Status: LOCKED → RESOLVED." },
                  { step: "05", label: "revealRoundPools()", desc: "CoFHE threshold-decrypts UP and DOWN pool totals. Keeper calls revealRoundPools(roundId, upPlaintext, upSig, downPlaintext, downSig) with CoFHE ECDSA signatures. Pools become public." },
                  { step: "06", label: "claimRoundPayout()", desc: "Winner calls revealMyDirection(roundId, directionUp, sig) to prove their direction, then claimRoundPayout(roundId). Protocol takes 3% fee; 97% distributed proportionally to winning side." },
                ].map((s) => (
                  <div key={s.step} className="flex gap-4 items-start">
                    <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center font-mono text-xs text-primary font-semibold">{s.step}</div>
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-1 font-mono">{s.label}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="liquid-glass rounded-2xl p-6 mt-6">
              <h4 className="text-sm font-semibold text-foreground mb-4">Oracle Signature Scheme</h4>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">The keeper signs a hash of round parameters using EIP-191 personal sign. The contract verifies via ecrecover after adding the standard prefix.</p>
              <div className="bg-card/50 rounded-xl p-4 font-mono text-xs text-primary/80 leading-relaxed">
                <p>msgHash = keccak256(</p>
                <p className="pl-4">&quot;PHANTOM_ROUND_ORACLE&quot; ||</p>
                <p className="pl-4">block.chainid (421614) ||</p>
                <p className="pl-4">address(PhantomRounds) ||</p>
                <p className="pl-4">roundId || endPrice || observedAt</p>
                <p>)</p>
                <p className="mt-2 text-muted-foreground">// Keeper signs with: account.signMessage(&#123; message: &#123; raw: msgHash &#125; &#125;)</p>
                <p className="text-muted-foreground">// NOT account.sign(&#123; hash: msgHash &#125;) — that skips the EIP-191 prefix</p>
              </div>
            </div>
            <div className="liquid-glass rounded-2xl p-6 mt-6">
              <h4 className="text-sm font-semibold text-foreground mb-4">RoundStatus Enum</h4>
              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  { status: "NONE", desc: "Round does not exist" },
                  { status: "OPEN", desc: "Bets accepted" },
                  { status: "LOCKED", desc: "No new bets, awaiting settlement" },
                  { status: "RESOLVED", desc: "Outcome set, claims open" },
                  { status: "CANCELED", desc: "Refunds available" },
                  { status: "PENDING_REVEAL", desc: "FHE.gte done, awaiting CoFHE decrypt" },
                ].map((s) => (
                  <div key={s.status} className="border border-border/30 rounded-xl p-3">
                    <code className="text-primary font-mono text-xs">{s.status}</code>
                    <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="liquid-glass rounded-2xl p-6 mt-6">
              <h4 className="text-sm font-semibold text-foreground mb-4">8 Live Prediction Markets (PhantomBet)</h4>
              <div className="space-y-2">
                {[
                  "Will Bitcoin reach $150,000 by December 2026?",
                  "Will Ethereum break $5,000 in Q3 2026?",
                  "Will the US Federal Reserve cut rates before August 2026?",
                  "Will Solana flip Ethereum by market cap before end of 2026?",
                  "Will DeFi total TVL exceed $200B by end of 2026?",
                  "Will any AI token enter the crypto top 10 by market cap in Q3 2026?",
                  "Will Bitcoin spot ETF daily inflows exceed $1B in a single day in 2026?",
                  "Will Ethereum Layer 2 total TVL surpass $100B by September 2026?",
                ].map((q, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs text-muted-foreground">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary font-mono text-[10px] flex items-center justify-center font-semibold">{i}</span>
                    {q}
                  </div>
                ))}
              </div>
            </div>
          </DocSection>

          {/* ACL SYSTEM */}
          <DocSection icon={ShieldCheck} badge="Security" title="Access Control & Privacy Model" id="acl">
            <p className="text-foreground/80 leading-relaxed mb-6">
              Every ciphertext in PHANTOM is governed by an on-chain Access Control List (ACL), enforced by Fhenix CoFHE system contracts. No address can decrypt a value unless it has been explicitly granted permission  the ACL is the protocol''s cryptographic enforcement layer.
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              {[
                { icon: Shield, title: "ACL Isolation", desc: "PhantomBet holds ciphertext handles but cannot read underlying values. It calls allowThis() to operate on ciphertext, allow(addr) to grant a user read access, and allowPublic() only at resolution  for pool totals only." },
                { icon: Key, title: "EIP-712 Permits", desc: "Users signing a typed EIP-712 permit enable the @cofhe/sdk to request threshold decryption from CoFHE nodes. The plaintext is delivered exclusively to the requesting wallet." },
                { icon: Network, title: "Threshold Network", desc: "CoFHE nodes form a decentralized threshold group. No single node can decrypt; a quorum is required. The result is posted on-chain with a collective ECDSA signature  fully verifiable by anyone." },
                { icon: Eye, title: "Minimal Disclosure", desc: "Resolution reveals only aggregate YES / NO pool totals  never individual bets. Loser data stays encrypted forever. Payouts are computed purely from on-chain aggregate figures." },
              ].map((card) => (
                <div key={card.title} className="liquid-glass rounded-2xl p-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center mb-4">
                    <card.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">{card.title}</h4>
                  <p className="text-sm text-muted-foreground">{card.desc}</p>
                </div>
              ))}
            </div>
            <div className="liquid-glass rounded-2xl p-6">
              <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" /> Privacy Boundary
              </h4>
              <div className="grid sm:grid-cols-2 gap-6 text-sm">
                <div>
                  <p className="text-muted-foreground mb-3 font-mono text-[10px] uppercase tracking-wider">Always Public</p>
                  <ul className="space-y-2 text-foreground/70">
                    {["Market question & metadata", "Number of bettors (count only)", "Betting & resolution deadlines", "Resolved outcome (YES / NO)", "Pool totals (after resolution only)"].map((i) => (
                      <li key={i} className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 mt-1.5 shrink-0" />{i}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-primary mb-3 font-mono text-[10px] uppercase tracking-wider">Always Encrypted</p>
                  <ul className="space-y-2 text-primary/70">
                    {["Individual bet amounts", "Individual bet directions", "Pool totals (before resolution)", "Personal payout amounts", "Token balances ($PHTM)"].map((i) => (
                      <li key={i} className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-1.5 shrink-0" />{i}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </DocSection>

          {/* INTEGRATION */}
          <DocSection icon={Terminal} badge="Integration" title="Using PHANTOM" id="integration">
            <p className="text-foreground/80 leading-relaxed mb-6">
              PHANTOM is live on Arbitrum Sepolia. Connect any EVM wallet and place a bet in four steps.
            </p>
            <div className="space-y-4 mb-8">
              {[
                { step: "1", title: "Connect Your Wallet", desc: "Click 'Connect Wallet' in the top navigation. PHANTOM supports MetaMask and any EIP-1193 injected provider. You'll be prompted to switch to Arbitrum Sepolia (Chain ID 421614) if on another network." },
                { step: "2", title: "Initialize FHE", desc: "On connection, the app automatically initializes the CoFHE client  loading the FHE public key for Arbitrum Sepolia and setting up the in-browser encryption engine. Wait for the 'FHE Ready' indicator before placing bets." },
                { step: "3", title: "Browse Markets & Bet", desc: "Navigate to /markets, select a market, enter an amount, choose YES or NO. Your input is encrypted client-side with @cofhe/sdk before the transaction is submitted. The confirmation displays only the ciphertext hash  never plaintext." },
                { step: "4", title: "View & Decrypt Positions", desc: "Navigate to /positions to see all your bets. Click 'Decrypt' to sign an EIP-712 permit and reveal your own bet amount via CoFHE threshold decryption. The process takes ~30 seconds for CoFHE nodes to respond." },
              ].map((s) => (
                <div key={s.step} className="liquid-glass rounded-2xl p-6">
                  <div className="flex gap-4 items-start">
                    <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center font-mono text-xs text-primary font-semibold">{s.step}</div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">{s.title}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="liquid-glass rounded-2xl p-6">
              <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Box className="w-4 h-4 text-primary" /> Frontend Stack
              </h4>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { name: "React 18 + Vite 5", role: "Core framework & bundler" },
                  { name: "wagmi 3.x + viem 2.x", role: "EVM wallet & contract reads" },
                  { name: "@cofhe/sdk", role: "FHE encryption & decryption" },
                  { name: "React Router v6", role: "SPA client-side routing" },
                  { name: "framer-motion", role: "Animation system" },
                  { name: "shadcn/ui + Tailwind", role: "Component design system" },
                ].map((t) => (
                  <div key={t.name} className="border border-border/30 rounded-xl p-3">
                    <code className="text-primary font-mono text-xs">{t.name}</code>
                    <p className="text-xs text-muted-foreground mt-1">{t.role}</p>
                  </div>
                ))}
              </div>
            </div>
          </DocSection>

          {/* ROADMAP */}
          <DocSection icon={GitBranch} badge="Roadmap" title="Five Waves of Encrypted Intelligence" id="roadmap">
            <p className="text-foreground/80 leading-relaxed mb-8">
              PHANTOM is architected in five sequential waves, each introducing a new encrypted financial primitive on the same FHE + ACL foundation. Every wave is a separate protocol module with independent contracts and SDKs.
            </p>
            <div className="space-y-4">
              {[
                {
                  wave: 1, name: "PhantomBet", status: "LIVE", tagline: "Binary Encrypted Prediction Markets",
                  details: ["YES/NO markets on any real-world outcome", "FHE.select() for non-interactive encrypted bet routing", "Homomorphic pool accumulation via FHE.add() on euint64", "Threshold decryption at resolution via allowPublic()", "8 real markets live on-chain (BTC, ETH, DeFi, AI, L2 and more)"],
                },
                {
                  wave: 2, name: "PhantomToken ($PHTM)", status: "LIVE", tagline: "FHERC20 Encrypted Native Token",
                  details: ["All balances stored as euint64 ciphertexts", "Transfer amounts are encrypted — no visible amounts", "ACL-gated: only sender, recipient, and authorized contracts can read", "Standard ERC20 interface with invisible internals"],
                },
                {
                  wave: 3, name: "PhantomRounds", status: "LIVE", tagline: "Automated Price-Round Engine",
                  details: ["5m and 15m price rounds for BTC/USD, ETH/USD, SOL/USD", "Keeper bot: create → lock → resolve → repeat (30s polling)", "Oracle: EIP-191 signed Binance price, ecrecover verified on-chain", "placeRoundBetSimple(bool): trivial on-chain FHE.asEbool() encryption", "CLI tool for manual lifecycle control — bot/cli.ts", "54 tests passing — deployed at 0x76db8a0429d19e8440e3D290F79c0613834c72a1"],
                },
                {
                  wave: 4, name: "PhantomMulti", status: "LIVE", tagline: "Multi-Outcome Encrypted Markets",
                  details: ["Up to 8 outcomes per market (2–8 configurable)", "All pool amounts encrypted with CoFHE euint64 — sealed until resolution", "placeMultiBetSimple: outcome index plaintext, amount FHE-encrypted", "placeMultiBet: both outcome index (InEuint8) and amount (InEuint64) fully encrypted", "O(MAX_OUTCOMES) FHE.select() routing loop — no branching on plaintext", "Resolver calls resolveMultiMarket then revealMultiPools (on-chain CoFHE publishDecryptResult)", "3% protocol fee on winning payouts; revealMyBet required before claim", "Deployed via deployPhantomMulti.ts — Arbitrum Sepolia"],
                },
                {
                  wave: 5, name: "PhantomOracle", status: "Research", tagline: "AI-Powered Encrypted Resolution",
                  details: ["AI model inference on FHE-encrypted oracle feeds", "Resolution logic provably derived from encrypted data", "Eliminates resolver trust: oracle resolves without raw data access", "Bridges coprocessor FHE and verifiable AI for trustless settlement"],
                },
              ].map((w) => (
                <div key={w.wave} className={`liquid-glass rounded-2xl p-6 transition-all ${w.wave <= 4 ? "border border-primary/25 bg-primary/[0.02]" : "opacity-60"}`}>
                  <div className="flex items-start gap-4">
                      <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-mono text-sm font-bold border ${w.wave <= 4 ? "bg-primary/15 text-primary border-primary/25" : "bg-card text-muted-foreground border-border/20"}`}>
                      {w.wave}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h4 className="font-semibold text-foreground">{w.name}</h4>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${w.wave <= 4 ? "bg-primary/10 text-primary" : "bg-card text-muted-foreground border border-border/30"}`}>{w.status}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{w.tagline}</p>
                      <ul className="space-y-1.5">
                        {w.details.map((d) => (
                          <li key={d} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <ChevronRight className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${w.wave <= 4 ? "text-primary" : "text-muted-foreground/40"}`} />
                            {d}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </DocSection>

          {/* RESOURCES */}
          <DocSection icon={ExternalLink} badge="Links" title="Resources & References" id="resources">
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { name: "Fhenix CoFHE Documentation", desc: "FHE coprocessor reference, SDK guide, and contract API", href: "https://docs.fhenix.zone" },
                { name: "Arbitrum Sepolia Explorer", desc: "View PHANTOM deployed contracts on-chain", href: "https://sepolia.arbiscan.io" },
                { name: "GitHub  PHANTOM Protocol", desc: "Source code: contracts, tests, and frontend", href: "https://github.com/Mr-Ben-dev/PHANTOM-Protocol" },
                { name: "@cofhe/sdk Reference", desc: "Client-side FHE encryption SDK documentation", href: "https://docs.fhenix.zone/docs/devdocs/CoFHE/sdk" },
              ].map((r) => (
                <a key={r.name} href={r.href} target="_blank" rel="noopener noreferrer" className="liquid-glass rounded-xl p-5 flex items-center justify-between hover:bg-white/[0.03] transition-all group">
                  <div>
                    <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{r.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{r.desc}</div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 ml-4" />
                </a>
              ))}
            </div>
          </DocSection>

        </div>
      </main>
    </div>
  );
};

type DocSectionProps = {
  icon: React.ElementType;
  badge: string;
  title: string;
  id: string;
  children: React.ReactNode;
};

const DocSection = ({ icon: Icon, badge, title, id, children }: DocSectionProps) => (
  <motion.section
    id={id}
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }}
  >
    <div className="flex items-center gap-3 mb-6">
      <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <span className="text-[10px] font-mono text-primary uppercase tracking-wider">{badge}</span>
    </div>
    <h2 className="text-2xl font-semibold text-hero-heading mb-6">{title}</h2>
    <div>{children}</div>
  </motion.section>
);

export default Docs;
