import LandingFeira from "@/components/feira/LandingFeira";
import Pricing from "@/components/landing/Pricing";
import SiteFooter from "@/components/landing/SiteFooter";

// Prévia "Feira": landing enxuta, só com afirmações verdadeiras (ver docs/DIRECAO_VISUAL.md).
const Index = () => (
  <div className="min-h-dvh scroll-smooth">
    <LandingFeira />
    <Pricing />
    <SiteFooter />
  </div>
);

export default Index;
