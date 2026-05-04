import { motion } from "framer-motion";
import { Lock, Unlock } from "lucide-react";

const waves = [
  { wave: 1, name: "PhantomBet", desc: "Binary YES/NO prediction markets. Encrypted bets, encrypted pools, 8 real markets live on-chain.", status: "LIVE", live: true },
  { wave: 2, name: "PhantomToken ($PHTM)", desc: "FHERC20 encrypted native token. All balances are euint64 ciphertexts — invisible on-chain.", status: "LIVE", live: true },
  { wave: 3, name: "PhantomRounds", desc: "Automated price-round engine. 5m/15m BTC/ETH/SOL rounds with keeper bot, oracle signatures, FHE pools.", status: "LIVE", live: true },
  { wave: 4, name: "PhantomMulti", desc: "Multi-outcome markets. Elections, sports, crypto. Up to 210 encrypted outcome buckets per market.", status: "Coming Wave 4", live: false },
  { wave: 5, name: "PhantomOracle", desc: "AI-powered resolution. Encrypted oracle inference on FHE data — trustless settlement, no resolver required.", status: "Coming Wave 5", live: false },
];

const RoadmapSection = () => {
  return (
    <section className="relative py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="liquid-glass rounded-full px-4 py-1.5 mb-6 inline-flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Roadmap</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold text-hero-heading">
            Five Waves of <span className="text-gradient-green">Encrypted Intelligence</span>
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {waves.map((w, i) => (
            <motion.div
              key={w.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              className={`liquid-glass rounded-2xl p-6 transition-all duration-300 ${
                w.live ? "hover:bg-white/[0.03] border border-primary/20" : "opacity-60 hover:opacity-80"
              }`}
            >
              <div className="flex items-center gap-2 mb-4">
                {w.live ? (
                  <Unlock className="w-4 h-4 text-primary" />
                ) : (
                  <Lock className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-xs font-mono text-muted-foreground uppercase">Wave {w.wave}</span>
              </div>
              <h3 className={`text-base font-semibold mb-2 ${w.live ? "text-foreground" : "text-muted-foreground"}`}>
                {w.name}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">{w.desc}</p>
              <div className={`inline-flex text-xs font-mono px-2 py-1 rounded-full ${
                w.live ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
              }`}>
                {w.status}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RoadmapSection;
