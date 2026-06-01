import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Menu, X, Wallet, AlertTriangle } from "lucide-react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useWalletAuth } from "@/hooks/useWalletAuth";

const navLinks = [
  { label: "Markets", href: "/markets" },
  { label: "Rounds", href: "/rounds" },
  { label: "Positions", href: "/positions" },
  { label: "Docs", href: "/docs" },
];

const Navbar = () => {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { address, isConnected, isWrongChain, connect, disconnect, ensureRightChain } =
    useWalletAuth();

  useEffect(() => {
    return scrollY.on("change", (v) => setScrolled(v > 40));
  }, [scrollY]);

  const bgOpacity = useTransform(scrollY, [0, 80], [0, 1]);

  const shortAddr = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : null;

  return (
    <>
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 left-0 right-0 z-50"
      >
        {/* Scroll-aware background */}
        <motion.div
          className="absolute inset-0 border-b border-border/0 transition-colors duration-300"
          style={{
            opacity: bgOpacity,
            backgroundColor: "hsl(260 87% 3% / 0.85)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderBottomColor: scrolled ? "hsl(240 4% 20% / 0.3)" : "transparent",
          }}
        />

        <div className="relative z-10 max-w-[1200px] mx-auto px-6 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-secondary to-muted flex items-center justify-center group-hover:shadow-[0_0_20px_hsl(121_95%_76%/0.2)] transition-shadow duration-300">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <span className="text-lg font-semibold text-foreground tracking-tight">PHANTOM</span>
          </Link>

          {/* Center nav links — desktop */}
          <div className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.href;
              return (
                <Link key={link.href} to={link.href}>
                  <button
                    className={`relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="navbar-active"
                        className="absolute inset-0 rounded-full bg-white/[0.06] border border-white/[0.08]"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{link.label}</span>
                  </button>
                </Link>
              );
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {isWrongChain ? (
              <Button
                variant="destructive"
                size="sm"
                className="hidden sm:inline-flex text-sm px-5 py-2 h-9 gap-1.5"
                onClick={ensureRightChain}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Wrong Network
              </Button>
            ) : isConnected ? (
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:inline-flex text-sm px-4 py-2 h-9 gap-2 font-mono border-primary/30 text-primary hover:bg-primary/10"
                onClick={() => disconnect()}
              >
                <Wallet className="w-3.5 h-3.5" />
                {shortAddr}
              </Button>
            ) : (
              <Button
                variant="hero"
                size="sm"
                className="hidden sm:inline-flex text-sm px-5 py-2 h-9"
                onClick={() => connect()}
              >
                Connect Wallet
              </Button>
            )}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition-colors"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-[60px] left-0 right-0 z-40 p-4 md:hidden"
          >
            <div className="liquid-glass rounded-2xl p-4 space-y-1" style={{ backgroundColor: "hsl(260 87% 3% / 0.95)", backdropFilter: "blur(20px)" }}>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    location.pathname === link.href
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-2 border-t border-border/30">
                {isWrongChain ? (
                  <Button variant="destructive" size="sm" className="w-full mt-2" onClick={ensureRightChain}>
                    Switch to Arbitrum Sepolia
                  </Button>
                ) : isConnected ? (
                  <Button variant="outline" size="sm" className="w-full mt-2 font-mono" onClick={() => disconnect()}>
                    {shortAddr}
                  </Button>
                ) : (
                  <Button variant="hero" size="sm" className="w-full mt-2" onClick={() => connect()}>
                    Connect Wallet
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
