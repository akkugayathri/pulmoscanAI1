import { Layout } from '@/components/layout/Layout';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { DiseasesSection } from '@/components/landing/DiseasesSection';
import { DisclaimerBanner } from '@/components/landing/DisclaimerBanner';
import { CTASection } from '@/components/landing/CTASection';

const Index = () => {
  return (
    <Layout>
      <HeroSection />
      <FeaturesSection />
      <DiseasesSection />
      <DisclaimerBanner />
      <CTASection />
    </Layout>
  );
};

export default Index;