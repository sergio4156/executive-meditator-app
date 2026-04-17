import Navigation from '@/components/layout/Navigation';
import Footer from '@/components/layout/Footer';
import HeroSection from '@/components/sections/HeroSection';
import InstructionsSection from '@/components/sections/InstructionsSection';
import VideoSection from '@/components/sections/VideoSection';
import PricingSection from '@/components/sections/PricingSection';
import CorporateSection from '@/components/sections/CorporateSection';
export default function Home() {
  return (
    <main>
      <Navigation />
      <HeroSection />
      <InstructionsSection />
      <VideoSection />
      <PricingSection />
      <CorporateSection />
      <Footer />
    </main>
  );
}
