import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Save, Upload } from 'lucide-react';

import { uploadImage, useSiteSettings, useUpdateSiteSettings } from '@/api/admin';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { PageHeader } from '@/components/PageHeader';
import { getApiErrorMessage } from '@/lib/apiError';

export function SettingsPage() {
  const { data, isLoading } = useSiteSettings();
  const update = useUpdateSiteSettings();
  const [v, setV] = useState({
    brandName: '',
    tagline: '',
    logoUrl: '',
    primaryColor: '#22e36a',
    secondaryColor: '#05070b',
    whatsappNumber: '',
    email: '',
    phone: '',
    instagram: '',
    tiktok: '',
    youtube: '',
    twitter: '',
    facebook: '',
    metaTitle: '',
    metaDescription: '',
  });

  useEffect(() => {
    if (data) {
      setV({
        brandName: data.brandName ?? '',
        tagline: data.tagline ?? '',
        logoUrl: data.logoUrl ?? '',
        primaryColor: data.primaryColor ?? '#22e36a',
        secondaryColor: data.secondaryColor ?? '#05070b',
        whatsappNumber: data.whatsappNumber ?? '',
        email: data.email ?? '',
        phone: data.phone ?? '',
        instagram: data.instagram ?? '',
        tiktok: data.tiktok ?? '',
        youtube: data.youtube ?? '',
        twitter: data.twitter ?? '',
        facebook: data.facebook ?? '',
        metaTitle: data.metaTitle ?? '',
        metaDescription: data.metaDescription ?? '',
      });
    }
  }, [data]);

  async function onUploadLogo(file: File) {
    try {
      const url = await uploadImage(file);
      setV({ ...v, logoUrl: url });
      toast.success('Logo uploaded');
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  function save() {
    update.mutate(v, {
      onSuccess: () => toast.success('Settings saved'),
      onError: (err) => toast.error(getApiErrorMessage(err)),
    });
  }

  if (isLoading) return <div className="grid h-32 place-items-center text-ink-200">Loading...</div>;

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Brand, theme, contact info"
        actions={
          <Button onClick={save} loading={update.isPending}>
            <Save className="h-4 w-4" />
            Save settings
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-base font-semibold">Branding</h3>
          <div className="grid gap-3">
            <Field label="Brand name">
              <Input value={v.brandName} onChange={(e) => setV({ ...v, brandName: e.target.value })} />
            </Field>
            <Field label="Tagline">
              <Input value={v.tagline} onChange={(e) => setV({ ...v, tagline: e.target.value })} />
            </Field>
            <Field label="Logo">
              <div className="flex items-center gap-3">
                {v.logoUrl ? (
                  <img src={v.logoUrl} alt="" className="h-10 w-10 rounded-md bg-ink-800 object-contain" />
                ) : (
                  <div className="grid h-10 w-10 place-items-center rounded-md bg-ink-800 text-ink-300 text-xs">No</div>
                )}
                <label className="inline-flex">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files && e.target.files[0] && onUploadLogo(e.target.files[0])}
                  />
                  <Button type="button" variant="secondary" onClick={(e) => (e.currentTarget.previousSibling as HTMLInputElement).click()}>
                    <Upload className="h-4 w-4" />
                    Upload logo
                  </Button>
                </label>
                {v.logoUrl ? (
                  <Button type="button" variant="ghost" onClick={() => setV({ ...v, logoUrl: '' })}>
                    Remove
                  </Button>
                ) : null}
              </div>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Primary color">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={v.primaryColor}
                    onChange={(e) => setV({ ...v, primaryColor: e.target.value })}
                    className="h-10 w-12 rounded-md border border-ink-700 bg-ink-800"
                  />
                  <Input value={v.primaryColor} onChange={(e) => setV({ ...v, primaryColor: e.target.value })} />
                </div>
              </Field>
              <Field label="Secondary color">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={v.secondaryColor}
                    onChange={(e) => setV({ ...v, secondaryColor: e.target.value })}
                    className="h-10 w-12 rounded-md border border-ink-700 bg-ink-800"
                  />
                  <Input value={v.secondaryColor} onChange={(e) => setV({ ...v, secondaryColor: e.target.value })} />
                </div>
              </Field>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 text-base font-semibold">Contact & socials</h3>
          <div className="grid gap-3">
            <Field label="WhatsApp number">
              <Input value={v.whatsappNumber} onChange={(e) => setV({ ...v, whatsappNumber: e.target.value })} placeholder="+201025754947" />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Email">
                <Input value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />
              </Field>
              <Field label="Phone">
                <Input value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Instagram"><Input value={v.instagram} onChange={(e) => setV({ ...v, instagram: e.target.value })} /></Field>
              <Field label="TikTok"><Input value={v.tiktok} onChange={(e) => setV({ ...v, tiktok: e.target.value })} /></Field>
              <Field label="YouTube"><Input value={v.youtube} onChange={(e) => setV({ ...v, youtube: e.target.value })} /></Field>
              <Field label="Twitter / X"><Input value={v.twitter} onChange={(e) => setV({ ...v, twitter: e.target.value })} /></Field>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="mb-3 text-base font-semibold">SEO</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Meta title">
              <Input value={v.metaTitle} onChange={(e) => setV({ ...v, metaTitle: e.target.value })} />
            </Field>
            <Field label="Meta description">
              <Textarea rows={2} value={v.metaDescription} onChange={(e) => setV({ ...v, metaDescription: e.target.value })} />
            </Field>
          </div>
        </Card>
      </div>
    </div>
  );
}
