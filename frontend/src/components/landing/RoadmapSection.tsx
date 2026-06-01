import { motion } from "framer-motion";
import { CheckCircle2, Circle } from "lucide-react";

const modules = [
  {
    name: "PhantomBet",
    desc: "Binary YES/NO markets. Encrypted direction, homomorphic pools, parimutuel claim after resolution.",
    live: true,
  },
  {
    name: "PhantomRounds",
    desc: "5m BTC / ETH / SOL price rounds. Keeper locks, oracle-settles, CoFHE reveals pools, users claim with permit + on-chain reveal.",
    live: true,
  },
  {
    name: "PhantomMulti",
    desc: "Multi-outcome encrypted markets (2–8 choices). Contract deployed; app routes focus on Bet + Rounds.",
    live: true,
  },
  {
    name: "Keeper service",
    desc: "Render-hosted bot: auto-create rounds, lock, resolve, reveal pools. Health at phantom-keeper.onrender.com.",
    live: true,
  },
  {
    name: "PhantomOracle",
    desc: "Encrypted AI-assisted resolution research — not in production UI yet.",
    live: false,
  },
];

const RoadmapSection = () => {
  return (
    <section className="relative py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="liquid-glass rounded-full px-4 py-1.5 mb-6 inline-flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Protocol modules</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold text-hero-heading">
            Built on <span className="text-gradient-green">Fhenix CoFHE</span>
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((m, i) => (
            <motion.div
              key={m.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className={`liquid-glass rounded-2xl p-6 ${m.live ? "border border-primary/15" : "opacity-55"}`}
            >
              <div className="flex items-center gap-2 mb-3">
                {m.live ? (
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-[10px] font-mono uppercase text-muted-foreground">
                  {m.live ? "Live" : "Planned"}
                </span>
              </div>
              <h3 className="text-base font-semibold mb-2">{m.name}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{m.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RoadmapSection;
