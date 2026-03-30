import { motion } from "framer-motion";
import { Eye, BarChart3, Brain } from "lucide-react";

const problems = [
  {
    icon: Eye,
    title: "Front-Running",
    text: "On transparent chains, bots see your bet in the mempool and move the price before your transaction settles. You always get the worst price.",
  },
  {
    icon: BarChart3,
    title: "Position Tracking",
    text: "Every bet you place is visible to everyone. Whales track your positions and counter-trade you. Your strategy is public intelligence.",
  },
  {
    icon: Brain,
    title: "Information Leakage",
    text: "Institutional forecasters cannot participate without revealing proprietary models. The act of betting IS the information leak.",
  },
];

const item = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
};

const ProblemSection = () => {
  return (
    <section className="relative py-32 px-6 bg-grid-pattern">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="liquid-glass rounded-full px-4 py-1.5 mb-6 inline-flex items-center gap-2">
            <span className="text-sm text-muted-foreground">The Problem</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold text-hero-heading">
            Public Bets Are <span className="text-gradient-green">Broken</span> Bets
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {problems.map((problem, i) => (
            <motion.div
              key={problem.title}
              variants={item}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="liquid-glass rounded-3xl p-8 group hover:bg-white/[0.03] transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:glow-green-sm transition-all">
                <problem.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">{problem.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{problem.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
