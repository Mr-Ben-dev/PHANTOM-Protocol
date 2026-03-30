import { Link } from "react-router-dom";
import { Shield, Twitter, Github, Send } from "lucide-react";

const Footer = () => {
  const footerLinks = {
    Product: [
      { label: "Markets", href: "/markets" },
      { label: "Positions", href: "/positions" },
      { label: "Docs", href: "/docs" },
    ],
    Protocol: [
      { label: "How It Works", href: "/docs" },
      { label: "Architecture", href: "/docs" },
      { label: "Security", href: "/docs" },
    ],
    Community: [
      { label: "Twitter", href: "#" },
      { label: "GitHub", href: "#" },
      { label: "Telegram", href: "#" },
    ],
  };

  return (
    <footer className="relative z-10 border-t border-border/30 bg-background/80 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-secondary to-muted flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <span className="text-lg font-semibold tracking-tight">PHANTOM</span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              The future is encrypted.
            </p>
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
  );
};

export default Footer;
