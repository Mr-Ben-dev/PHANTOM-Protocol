import { motion } from "framer-motion";
import { Lock, Server, ShieldCheck, Key } from "lucide-react";

const steps = [
  {
    icon: Lock,
    title: "Encrypt",
    text: "Your bet amount and direction are encrypted in your browser using FHE before leaving your device. The plaintext never touches the blockchain.",
  },
  {
    icon: Server,
    title: "Compute",
    text: "The smart contract processes your encrypted bet using homomorphic operations. It adds your ciphertext to the pool — without ever decrypting it.",
  },
  {
    icon: ShieldCheck,
    title: "Resolve",
    text: "An oracle reports the real-world outcome. The contract evaluates winners using encrypted pool math. Individual bets remain sealed.",
  },
  {
    icon: Key,
    title: "Reveal",
    text: "Only winners can decrypt their payout by signing an EIP-712 cryptographic permit. Losing bets are never revealed.",
  },
];

const HowItWorksSection = () => {
  return (
    <section className="relative py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <div className="liquid-glass rounded-full px-4 py-1.5 mb-6 inline-flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Protocol</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold text-hero-heading">
            How Encrypted Betting <span className="text-gradient-green">Works</span>
          </h2>
        </motion.div>

        <div className="relative">
          {/* Connecting line */}
          <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-primary/30 via-primary/10 to-transparent" />

          <div className="space-y-12 lg:space-y-0 lg:grid lg:grid-cols-4 lg:gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="relative"
              >
                {/* Step number */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-sm font-mono font-bold">
                    {i + 1}
                  </div>
                  {i < 3 && (
                    <div className="hidden lg:block flex-1 h-px bg-gradient-to-r from-primary/30 to-transparent" />
                  )}
                </div>

                <div className="liquid-glass rounded-2xl p-6 hover:bg-white/[0.03] transition-all duration-300">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <step.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
