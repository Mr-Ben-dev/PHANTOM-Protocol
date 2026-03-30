import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { useHlsVideo } from "@/hooks/useHlsVideo";

const ChessSection = () => {
  const videoRef = useHlsVideo("https://stream.mux.com/1CCfG6mPC7LbMOAs6iBOfPeNd3WaKlZuHuKHp00G62j8.m3u8");

  return (
    <section className="py-32 px-4">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
        {/* Left — Video */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="liquid-glass rounded-3xl aspect-[4/3] overflow-hidden"
        >
          <video ref={videoRef} autoPlay loop muted playsInline className="w-full h-full object-cover" />
        </motion.div>

        {/* Right — Content */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        >
          <div className="liquid-glass rounded-full px-4 py-1.5 mb-6 inline-flex items-center gap-2">
            <span className="text-sm text-muted-foreground">How It Works</span>
            <span className="bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
              FHE Flow <ChevronRight className="w-3 h-3" />
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-semibold text-hero-heading leading-tight">
            Every Bet Stays
            <br />
            <span className="text-gradient-green">Fully Encrypted</span>
          </h2>

          <p className="text-muted-foreground mt-4 leading-relaxed">
            Your bet amount and direction are encrypted in your browser using FHE before leaving your device. The smart contract processes encrypted bets using homomorphic operations — without ever seeing the plaintext.
          </p>

          <ul className="mt-6 space-y-3">
            {["Client-side FHE encryption", "Homomorphic pool aggregation", "EIP-712 permit-based decryption"].map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-foreground/80">
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                {item}
              </li>
            ))}
          </ul>

          <div className="flex gap-4 mt-8">
            <Link to="/markets">
              <Button variant="hero">Launch App</Button>
            </Link>
            <Link to="/docs">
              <Button variant="heroSecondary">Read the Docs</Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ChessSection;
