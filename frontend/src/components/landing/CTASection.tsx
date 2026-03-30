import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const CTASection = () => {
  return (
    <section className="relative py-32 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="liquid-glass rounded-[2rem] p-12 sm:p-20 text-center"
        >
          <h2 className="text-3xl sm:text-5xl font-bold text-hero-heading mb-6">
            The Prediction Market That
            <br />
            <span className="text-gradient-green">Can't Be Front-Run</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-4 leading-relaxed">
            Polymarket proved prediction markets are crypto's killer app — but on transparent chains, every bet is public. PHANTOM makes the prediction market that was always meant to exist: one where your position is real, but invisible.
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
    </section>
  );
};

export default CTASection;
