import { motion } from "framer-motion";

const testimonials = [
  {
    quote: "PHANTOM is the first protocol that actually delivers on encrypted trading. We can participate in prediction markets without revealing our models or positions.",
    name: "Alex Chen",
    role: "Head of Research, Cipher Capital",
    initials: "AC",
  },
  {
    quote: "The FHE implementation is production-grade. We've tested the encryption pipeline extensively — your bets are genuinely invisible on-chain. This is the future of DeFi privacy.",
    name: "Maria Volkov",
    role: "CTO, DarkPool Labs",
    initials: "MV",
  },
  {
    quote: "Finally, a prediction market where institutional forecasters can participate without the act of betting becoming the signal. PHANTOM changes the game.",
    name: "James Park",
    role: "Portfolio Manager, Nexus Fund",
    initials: "JP",
  },
];

const TestimonialsSection = () => {
  return (
    <section className="py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-5xl font-semibold text-hero-heading">
            Trusted by Crypto's
            <br />
            <span className="text-gradient-green">Sharpest Minds</span>
          </h2>
          <p className="text-muted-foreground mt-4">Hear from the teams building on encrypted infrastructure.</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`liquid-glass rounded-3xl p-8 ${i === 1 ? "md:-translate-y-6" : ""}`}
            >
              <p className="text-foreground/80 text-sm leading-relaxed mb-6">"{t.quote}"</p>
              <div className="border-t border-border/50 pt-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-muted-foreground">
                  {t.initials}
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
