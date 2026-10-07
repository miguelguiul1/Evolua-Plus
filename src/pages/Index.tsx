import HeroSection from "@/components/HeroSection";
import Calculator from "@/components/Calculator";
import HowItWorks from "@/components/landing/HowItWorks";
import Benefits from "@/components/landing/Benefits";
import Features from "@/components/landing/Features";
import Demo from "@/components/landing/Demo";
import Diferenciais from "@/components/landing/Diferenciais";
import SocialProof from "@/components/landing/SocialProof";
import Pricing from "@/components/landing/Pricing";
import LandingFAQ from "@/components/landing/LandingFAQ";
import FinalCTA from "@/components/landing/FinalCTA";
import SiteFooter from "@/components/landing/SiteFooter";

const Index = () => {
  return (
    <div className="min-h-dvh bg-background scroll-smooth">
      <HeroSection />
      <HowItWorks />
      <Benefits />
      <Features />
      <Demo />
      <Calculator />
      <Diferenciais />
      <SocialProof />
      <Pricing />
      <LandingFAQ />
      <FinalCTA />
      <SiteFooter />
    </div>
  );
};

export default Index;
