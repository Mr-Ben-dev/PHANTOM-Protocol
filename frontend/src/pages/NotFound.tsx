import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid-pattern opacity-20" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/[0.03] blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 text-center max-w-md"
      >
        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center mx-auto mb-8">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-7xl font-semibold text-hero-heading mb-4 font-mono tracking-tighter">404</h1>
        <p className="text-xl text-foreground mb-2">This prediction didn't come true.</p>
        <p className="text-muted-foreground mb-8">The page you're looking for doesn't exist or has been encrypted beyond retrieval.</p>
        <Link to="/markets">
          <Button variant="hero" size="lg" className="gap-2">
            Go to Markets <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </motion.div>
    </div>
  );
};

export default NotFound;
