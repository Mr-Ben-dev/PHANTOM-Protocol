import { motion } from "framer-motion";

const techItems = [
  { name: "Fhenix CoFHE", desc: "FHE coprocessor for encrypted on-chain computation" },
  { name: "Arbitrum Sepolia", desc: "L2 testnet with low gas and fast finality" },
  { name: "FHE.sol", desc: "Solidity library for homomorphic encryption operations" },
  { name: "CoFHE SDK", desc: "Client-side encryption and permit management" },
  { name: "Privara SDK", desc: "Stablecoin payment rails for settlement" },
  { name: "EIP-712", desc: "Typed data signing for cryptographic permits" },
];

const TechStackSection = () => {
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
            <span className="text-sm text-muted-foreground">Infrastructure</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold text-hero-heading">
            Built on the <span className="text-gradient-green">Strongest</span> Foundation
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {techItems.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="liquid-glass rounded-2xl p-6 hover:bg-white/[0.03] transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <span className="text-primary font-mono font-bold text-sm">{t.name.charAt(0)}</span>
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2">{t.name}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TechStackSection;
