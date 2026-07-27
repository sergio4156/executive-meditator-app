import Navigation from '@/components/layout/Navigation';
import Footer from '@/components/layout/Footer';
import HeroSection from '@/components/sections/HeroSection';
import WhoSection from '@/components/sections/WhoSection';
import InstructionsSection from '@/components/sections/InstructionsSection';
import VideoSection from '@/components/sections/VideoSection';
import PricingSection from '@/components/sections/PricingSection';
import CorporateSection from '@/components/sections/CorporateSection';

export const metadata = {
  alternates: { canonical: '/' },
};

export default function Home() {
  return (
    <main>
      <Navigation />
      <HeroSection />
      <WhoSection />
      <InstructionsSection />
      <VideoSection />
      <PricingSection />
      <CorporateSection />
      <Footer />
    </main>
  );
}
