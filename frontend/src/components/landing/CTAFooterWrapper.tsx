import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Twitter, Github, Send } from "lucide-react";
import { useHlsVideo } from "@/hooks/useHlsVideo";

const footerLinks = {
  Product: [
    { label: "Markets", href: "/markets" },
    { label: "Positions", href: "/positions" },
    { label: "Docs", href: "/docs" },
    { label: "Roadmap", href: "/docs" },
  ],
  Protocol: [
    { label: "How It Works", href: "/docs" },
    { label: "Architecture", href: "/docs" },
    { label: "Security", href: "/docs" },
    { label: "FHE Operations", href: "/docs" },
  ],
  Resources: [
    { label: "Documentation", href: "/docs" },
    { label: "Community", href: "#" },
    { label: "Support", href: "#" },
    { label: "Status", href: "#" },
  ],
};

const CTAFooterWrapper = () => {
  const videoRef = useHlsVideo("https://stream.mux.com/tLkHO1qZoaaQOUeVWo8hEBeGQfySP02EPS02BmnNFyXys.m3u8");

  return (
    <section className="relative overflow-hidden">
      {/* Background video */}
      <video ref={videoRef} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, hsl(260 87% 3%) 0%, hsl(260 87% 3% / 0.85) 15%, hsl(260 87% 3% / 0.4) 40%, hsl(260 87% 3% / 0.15) 60%, hsl(260 87% 3% / 0.3) 100%)",
        }}
      />

      {/* CTA */}
      <div className="relative z-10 py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="liquid-glass rounded-[2rem] p-12 sm:p-20 text-center"
          >
            <h2 className="text-3xl sm:text-5xl font-semibold text-hero-heading mb-6">
              The Prediction Market
              <br />
              <span className="text-gradient-green">That Can't Be Front-Run</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-4 leading-relaxed">
              Polymarket proved prediction markets are crypto's killer app — but on transparent chains, every bet is public. PHANTOM makes the prediction market that was always meant to exist.
            </p>
            <div className="flex flex-wrap gap-4 justify-center mt-8">
              <Link to="/markets">
                <Button variant="hero" size="lg">Start Predicting</Button>
              </Link>
              <Link to="/docs">
                <Button variant="heroSecondary" size="lg">Learn More</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/30">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-b from-secondary to-muted flex items-center justify-center">
                  <Shield className="w-4 h-4 text-primary" />
                </div>
                <span className="text-lg font-semibold tracking-tight">PHANTOM</span>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">The future is encrypted.</p>
              <div className="flex gap-3">
                {[Twitter, Github, Send].map((Icon, i) => (
                  <a key={i} href="#" className="w-9 h-9 rounded-full liquid-glass flex items-center justify-center text-muted-foreground hover:text-primary transition-colors">
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>

            {Object.entries(footerLinks).map(([title, links]) => (
              <div key={title}>
                <h4 className="text-sm font-semibold text-foreground mb-4">{title}</h4>
                <ul className="space-y-3">
                  {links.map((link) => (
                    <li key={link.label}>
                      <Link to={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 pt-8 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">© 2026 PHANTOM Protocol — The future is encrypted.</p>
            <div className="flex gap-6">
              <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </section>
  );
};

export default CTAFooterWrapper;
