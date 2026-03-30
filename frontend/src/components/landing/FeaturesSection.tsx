import { motion } from "framer-motion";
import { ChevronRight, Zap, BarChart3, ShieldCheck } from "lucide-react";
import { useHlsVideo } from "@/hooks/useHlsVideo";

const features = [
  {
    icon: Zap,
    title: "FHE Encryption Engine",
    description: "Every bet is encrypted client-side before touching the blockchain. Homomorphic operations compute on ciphertext without decryption.",
    stat: "15+",
    statLabel: "FHE operations supported",
  },
  {
    icon: BarChart3,
    title: "Encrypted Pool Mechanics",
    description: "YES and NO pools aggregate encrypted bets using homomorphic addition. Total exposure remains invisible to all participants.",
    stat: "100%",
    statLabel: "position privacy",
  },
  {
    icon: ShieldCheck,
    title: "ACL Permission System",
    description: "Granular access control on every ciphertext handle. Only authorized parties can decrypt — enforced at the contract level.",
    stat: "Zero",
    statLabel: "MEV exposure",
  },
];

const FeaturesSection = () => {
  const videoRef = useHlsVideo("https://stream.mux.com/Jwr2RhmsNrd6GEspBNgm02vJsRZAGlaoQIh4AucGdASw.m3u8");

  return (
    <section className="relative py-32 px-6 overflow-hidden">
      {/* Background HLS video */}
      <video ref={videoRef} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 h-[40%] bg-gradient-to-b from-background via-background/80 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-background via-background/80 to-transparent" />
      <div className="absolute inset-0 bg-background/40" />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="liquid-glass rounded-full px-4 py-1.5 mb-6 inline-flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Core Protocol</span>
            <span className="bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
              Overview <ChevronRight className="w-3 h-3" />
            </span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-semibold text-hero-heading">
            Built for Markets That
            <br />
            <span className="text-gradient-green">Stay Private</span>
          </h2>
          <p className="text-muted-foreground mt-4 max-w-lg mx-auto">
            Three pillars that keep your predictions encrypted without sacrificing on-chain verifiability.
          </p>
        </motion.div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="liquid-glass rounded-3xl p-8 hover:bg-white/[0.03] transition-colors"
            >
              <feature.icon className="w-6 h-6 text-primary mb-4" />
              <h3 className="text-lg font-semibold text-hero-heading mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">{feature.description}</p>
              <div className="border-t border-border/50 pt-4">
                <div className="text-2xl font-semibold text-primary font-mono">{feature.stat}</div>
                <div className="text-xs text-muted-foreground mt-1">{feature.statLabel}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
