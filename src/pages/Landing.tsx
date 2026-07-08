import Navbar from "../components/landing/Navbar";
import HeroSection from "../components/landing/HeroSection";
import ProductSection from "../components/landing/ProductSection";
import PrimitivesSection from "../components/landing/PrimitivesSection";
import FaqSection from "../components/landing/FaqSection";
import CtaSection from "../components/landing/CtaSection";
import Footer from "../components/landing/Footer";
import Reveal from "../components/landing/Reveal";
// import ProblemSection from "../components/landing/ProblemSection"; // light-themed — re-enable after its dark redesign

/**
 * Landing page (redesign, Tailwind, dark theme). `.lk-theme` opts this subtree
 * out of the legacy sharp-edge enforcement so the new rounded look applies.
 */
export default function Landing() {
  return (
    <div className="lk-theme min-h-screen overflow-x-clip bg-ink font-body text-white">
      <Navbar />
      <Reveal variant="up">
        <HeroSection />
      </Reveal>
      <Reveal variant="left">
        <ProductSection />
      </Reveal>
      <Reveal variant="up">
        <PrimitivesSection />
      </Reveal>
      <Reveal variant="right">
        <FaqSection />
      </Reveal>
      <Reveal variant="scale">
        <CtaSection />
      </Reveal>
      <Footer />
    </div>
  );
}
