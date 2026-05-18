import { useLanding } from '@/api/landing';
import { ContactSection } from '@/features/landing/sections';
import { PublicNav } from './PublicNav';
import { PageLoader } from '@/components/PageLoader';

export function ContactPage() {
  const { data, isLoading } = useLanding();
  if (isLoading || !data) return <PageLoader />;
  const contact = data.sections.find((s) => s.key === 'contact');
  return (
    <div className="min-h-screen">
      <PublicNav brandName={data.settings.brandName} />
      <main className="py-12">
        <ContactSection section={contact} whatsappNumber={data.settings.whatsappNumber} />
      </main>
    </div>
  );
}
