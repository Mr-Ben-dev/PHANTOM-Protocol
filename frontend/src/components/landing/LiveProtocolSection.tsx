import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Activity, Globe, Lock, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";

const facts = [
  {
    icon: Globe,
    title: "Arbitrum Sepolia",
    text: "PhantomBet, PhantomRounds, and keeper automation are deployed on chain 421614 with Fhenix CoFHE.",
  },
  {
    icon: Lock,
    title: "Encrypted by default",
    text: "Bet direction and pool totals stay as FHE ciphertext on-chain. ETH stake is public; your side is not.",
  },
  {
    icon: Timer,
    title: "Live price rounds",
    text: "BTC, ETH, and SOL 5-minute UP/DOWN rounds — created, locked, and resolved by the keeper bot 24/7.",
  },
  {
    icon: Activity,
    title: "Real markets",
    text: "Seeded prediction markets on crypto, macro, and DeFi outcomes — not placeholder demo copy.",
  },
];

const LiveProtocolSection = () => {
  return (
    <section className="py-32 px-6 bg-grid-pattern">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <div className="liquid-glass rounded-full px-4 py-1.5 mb-6 inline-flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Live on testnet</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-semibold text-hero-heading">
            What is <span className="text-gradient-green">actually live</span>
          </h2>
          <p className="text-muted-foreground mt-4 max-w-xl mx-auto text-sm leading-relaxed">
            PHANTOM is a privacy-first prediction protocol on Fhenix CoFHE — binary markets, encrypted pools, and automated crypto price rounds you can use today.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-5 mb-10">
          {facts.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="liquid-glass rounded-2xl p-6"
            >
              <f.icon className="w-5 h-5 text-primary mb-3" />
              <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.text}</p>
            </motion.div>
          ))}
        </div>

        <div className="text-center">
          <Link to="/markets">
            <Button variant="hero" size="lg">Open markets</Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default LiveProtocolSection;
