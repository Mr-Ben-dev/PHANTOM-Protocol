import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { useHlsVideo } from "@/hooks/useHlsVideo";

const stats = [
  { value: "100%", label: "bet privacy" },
  { value: "Zero", label: "MEV exposure" },
  { value: "15+", label: "FHE operations" },
  { value: "< 2s", label: "encryption time" },
];

const ReverseChessSection = () => {
  const videoRef = useHlsVideo("https://stream.mux.com/f0001qPDy00mvqP023lqK3lWx31uHvxirFCHK1yNLczzqxY.m3u8");

  return (
    <section className="py-32 px-4">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
        {/* Left — Content */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="order-2 lg:order-1"
        >
          <div className="liquid-glass rounded-full px-4 py-1.5 mb-6 inline-flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Encrypted Positions</span>
            <span className="bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
              CoFHE <ChevronRight className="w-3 h-3" />
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-semibold text-hero-heading leading-tight">
            Predict Markets
            <br />
            <span className="text-gradient-green">Without Exposure</span>
          </h2>

          <p className="text-muted-foreground mt-4 leading-relaxed">
            Place bets on real-world outcomes where your position is completely invisible. No front-running, no position tracking, no information leakage.
          </p>

          <div className="grid grid-cols-2 gap-4 mt-8">
            {stats.map((stat) => (
              <div key={stat.label} className="liquid-glass rounded-2xl p-4">
                <div className="text-xl font-semibold text-primary font-mono">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <Link to="/markets">
              <Button variant="hero">Start Predicting</Button>
            </Link>
          </div>
        </motion.div>

        {/* Right — Video */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="order-1 lg:order-2 liquid-glass rounded-3xl aspect-[4/3] overflow-hidden"
        >
          <video ref={videoRef} autoPlay loop muted playsInline className="w-full h-full object-cover" />
        </motion.div>
      </div>
    </section>
  );
};

export default ReverseChessSection;
