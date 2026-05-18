import { useEffect } from 'react';
import { useLanding } from '@/api/landing';
import { PageLoader } from '@/components/PageLoader';
import { ErrorMessage } from '@/components/ErrorMessage';
import { getApiErrorMessage } from '@/lib/apiError';
import { PublicNav } from './PublicNav';
import {
  HeroSection,
  AboutSection,
  HowItWorksSection,
  ServicesSection,
  FeaturesSection,
  TestimonialsSection,
  PricingSection,
  FaqSection,
  ContactSection,
  FooterSection,
} from '@/features/landing/sections';

export function LandingPage() {
  const { data, isLoading, error } = useLanding();

  useEffect(() => {
    if (data?.settings) {
      document.title = data.settings.metaTitle ?? data.settings.brandName;
      const meta = document.querySelector('meta[name="description"]');
      if (data.settings.metaDescription) {
        if (meta) meta.setAttribute('content', data.settings.metaDescription);
        else {
          const m = document.createElement('meta');
          m.name = 'description';
          m.content = data.settings.metaDescription;
          document.head.appendChild(m);
        }
      }
    }
  }, [data?.settings]);

  if (isLoading) return <PageLoader />;
  if (error || !data)
    return (
      <div className="container-app py-20">
        <ErrorMessage message={getApiErrorMessage(error)} />
      </div>
    );

  const sectionByKey = Object.fromEntries(data.sections.map((s) => [s.key, s]));
  const brand = data.settings.brandName;

  return (
    <div className="min-h-screen">
      <PublicNav brandName={brand} />
      <main>
        <HeroSection section={sectionByKey.hero} brandName={brand} />
        <AboutSection section={sectionByKey.about} />
        <HowItWorksSection section={sectionByKey['how-it-works']} />
        <ServicesSection services={data.services} />
        <FeaturesSection section={sectionByKey.features} />
        <TestimonialsSection items={data.testimonials} />
        <PricingSection plans={data.pricingPlans} />
        <FaqSection items={data.faqs} />
        <ContactSection
          section={sectionByKey.contact}
          whatsappNumber={data.settings.whatsappNumber}
        />
      </main>
      <FooterSection data={data} />
    </div>
  );
}
