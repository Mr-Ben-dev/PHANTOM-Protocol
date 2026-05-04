import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronRight, Shield } from "lucide-react";

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.3 } },
};
const item = {
  hidden: { opacity: 0, y: 24, filter: "blur(8px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const } },
};

const brands = ["Fhenix", "Arbitrum", "Privy", "CoFHE", "Privara", "Zama"];

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Background video */}
      <div className="absolute inset-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        >
          <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260309_042944_4a2205b7-b061-490a-852b-92d9e9955ce9.mp4" type="video/mp4" />
        </video>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, transparent 0%, transparent 30%, hsl(260 87% 3% / 0.1) 45%, hsl(260 87% 3% / 0.4) 60%, hsl(260 87% 3% / 0.75) 75%, hsl(260 87% 3%) 95%)",
          }}
        />
      </div>

      {/* Content */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pt-32 pb-20"
      >
        {/* Badge */}
        <motion.div variants={item}>
          <div className="liquid-glass rounded-full px-4 py-1.5 mb-8 inline-flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Powered by FHE</span>
            <span className="bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
              Wave 3 — Live on Arbitrum <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={item}
          className="text-4xl sm:text-6xl lg:text-7xl font-semibold text-hero-heading leading-[1.05] tracking-tight text-center max-w-5xl"
        >
          The Future Is
          <br />
          <span className="text-gradient-green">Encrypted</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          variants={item}
          className="text-lg text-hero-sub max-w-md mt-4 opacity-80 text-center leading-relaxed"
        >
          Bet on real-world outcomes and live price movements with fully encrypted positions. Your bet amount, direction, and pool totals are invisible on-chain — powered by Fully Homomorphic Encryption.
        </motion.p>

        {/* CTAs */}
        <motion.div variants={item} className="flex flex-wrap gap-4 mt-8 justify-center">
          <Link to="/markets">
            <Button variant="hero" size="lg">Launch App</Button>
          </Link>
          <Link to="/docs">
            <Button variant="heroSecondary" size="lg">Read the Docs</Button>
          </Link>
        </motion.div>
      </motion.div>

      {/* Social Proof Bar */}
      <div className="relative z-10 pb-12 px-6">
        <div className="max-w-5xl mx-auto flex items-center gap-12">
          <p className="text-foreground/50 text-sm leading-tight shrink-0 hidden sm:block">
            Built on the strongest<br />encryption infrastructure
          </p>
          <div className="flex-1 overflow-hidden">
            <div className="flex animate-marquee gap-8">
              {[...brands, ...brands].map((brand, i) => (
                <div key={i} className="flex items-center gap-2 shrink-0">
                  <div className="liquid-glass w-6 h-6 rounded-lg flex items-center justify-center text-xs font-semibold text-muted-foreground">
                    {brand[0]}
                  </div>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">{brand}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
