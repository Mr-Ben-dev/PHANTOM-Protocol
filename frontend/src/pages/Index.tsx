import Navbar from "@/components/shared/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import ProblemSection from "@/components/landing/ProblemSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import NumbersSection from "@/components/landing/NumbersSection";
import TechStackSection from "@/components/landing/TechStackSection";
import RoadmapSection from "@/components/landing/RoadmapSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import CTAFooterWrapper from "@/components/landing/CTAFooterWrapper";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <ProblemSection />
      <HowItWorksSection />
      <FeaturesSection />
      <NumbersSection />
      <TechStackSection />
      <RoadmapSection />
      <TestimonialsSection />
      <CTAFooterWrapper />
    </div>
  );
};

export default Index;
