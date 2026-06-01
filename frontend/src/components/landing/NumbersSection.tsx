import { motion } from "framer-motion";
import { useHlsVideo } from "@/hooks/useHlsVideo";

const NumbersSection = () => {
  const videoRef = useHlsVideo("https://stream.mux.com/Kec29dVyJgiPdtWaQtPuEiiGHkJIYQAVUJcNiIHUYeo.m3u8");

  return (
    <section className="relative py-32 px-6 overflow-hidden">
      {/* Background video */}
      <video ref={videoRef} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(to top, hsl(260 87% 3%) 0%, hsl(260 87% 3% / 0.85) 15%, hsl(260 87% 3% / 0.4) 40%, hsl(260 87% 3% / 0.15) 60%, hsl(260 87% 3% / 0.3) 100%)",
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Hero metric */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-24"
        >
          <div className="text-7xl sm:text-[8rem] lg:text-[10rem] font-semibold tracking-tighter text-hero-heading leading-none">
            FHE
          </div>
          <div className="text-xl text-muted-foreground mt-4">Fully Homomorphic Encryption</div>
          <p className="text-muted-foreground/70 max-w-md mx-auto mt-2 text-sm">
            The only encryption scheme that allows computation on encrypted data without ever decrypting it.
          </p>
        </motion.div>

        {/* Bottom metrics */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="liquid-glass rounded-3xl p-12 grid md:grid-cols-3"
        >
          <div className="text-center md:border-r border-border/50 pb-8 md:pb-0 md:pr-12">
            <div className="text-5xl sm:text-6xl font-semibold text-hero-heading tracking-tight font-mono">3</div>
            <div className="text-muted-foreground mt-2">Live contracts on-chain</div>
          </div>
          <div className="text-center py-8 md:py-0 md:px-12 border-t md:border-t-0 md:border-r border-border/50">
            <div className="text-5xl sm:text-6xl font-semibold text-hero-heading tracking-tight font-mono">10+</div>
            <div className="text-muted-foreground mt-2">On-chain prediction markets</div>
          </div>
          <div className="text-center pt-8 md:pt-0 md:pl-12 border-t md:border-t-0 border-border/50">
            <div className="text-5xl sm:text-6xl font-semibold text-hero-heading tracking-tight font-mono">100%</div>
            <div className="text-muted-foreground mt-2">Position privacy guaranteed</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default NumbersSection;
