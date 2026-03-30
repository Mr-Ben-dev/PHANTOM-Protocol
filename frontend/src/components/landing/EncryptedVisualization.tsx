import { motion } from "framer-motion";

const EncryptedVisualization = () => {
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
            <span className="text-sm text-muted-foreground">Transparency</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold text-hero-heading">
            What's <span className="text-gradient-green">Encrypted</span>?
          </h2>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-10 items-center">
          {/* Left - Text */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-lg text-foreground/90 leading-relaxed mb-6">
              PHANTOM makes encryption tangible. On every page, our "What's Encrypted?" panel shows you exactly what data is hidden and who has access.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Unlike other protocols that claim privacy, PHANTOM shows you the ciphertext handles and ACL permissions in real time.
            </p>
          </motion.div>

          {/* Right - Code Display */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="liquid-glass rounded-2xl p-6 font-mono text-sm"
          >
            <div className="space-y-1 text-muted-foreground">
              <p className="text-foreground">┌─ Market #1: <span className="text-hero-sub">"Will ETH hit $5000?"</span></p>
              <p>│</p>
              <p>├─ YES Pool: <span className="text-primary">0x7f8a...c3d1</span> <span className="text-primary/60">[ENCRYPTED]</span></p>
              <p>│  └─ ACL: <span className="text-foreground/70">Contract ✓</span> | <span className="text-destructive/70">Public ✗</span></p>
              <p>│</p>
              <p>├─ NO Pool: <span className="text-primary">0x3e2b...9f0a</span> <span className="text-primary/60">[ENCRYPTED]</span></p>
              <p>│  └─ ACL: <span className="text-foreground/70">Contract ✓</span> | <span className="text-destructive/70">Public ✗</span></p>
              <p>│</p>
              <p>├─ Your Bet: <span className="text-primary">0xa1c4...7e82</span> <span className="text-primary/60">[ENCRYPTED]</span></p>
              <p>│  └─ ACL: <span className="text-foreground/70">You ✓</span> | <span className="text-destructive/70">Others ✗</span></p>
              <p>│</p>
              <p>└─ Total Bettors: <span className="text-foreground">47</span> <span className="text-hero-sub">[PUBLIC]</span></p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default EncryptedVisualization;
