import { useState } from 'react';
import { Plus, Save, Trash2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

import {
  faqs,
  pricingPlans,
  sections,
  services,
  testimonials,
  useFaqsAdmin,
  usePricingPlansAdmin,
  useSections,
  useServicesAdmin,
  useTestimonialsAdmin,
} from '@/api/admin';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { Empty } from '@/components/ui/Empty';
import { PageHeader } from '@/components/PageHeader';
import { getApiErrorMessage } from '@/lib/apiError';

type Tab = 'sections' | 'services' | 'testimonials' | 'faqs' | 'pricing';

export function LandingEditorPage() {
  const [tab, setTab] = useState<Tab>('sections');

  return (
    <div>
      <PageHeader
        title="Landing Page"
        description="Edit the public site content."
      />

      <div className="mb-4 inline-flex flex-wrap rounded-xl border border-ink-700/60 bg-ink-900/50 p-1">
        {(['sections', 'services', 'testimonials', 'faqs', 'pricing'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-sm capitalize ${
              tab === t ? 'bg-accent-400 text-ink-950' : 'text-ink-200 hover:text-ink-100'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'sections' ? <SectionsTab /> : null}
      {tab === 'services' ? <ServicesTab /> : null}
      {tab === 'testimonials' ? <TestimonialsTab /> : null}
      {tab === 'faqs' ? <FaqsTab /> : null}
      {tab === 'pricing' ? <PricingTab /> : null}
    </div>
  );
}

function SectionsTab() {
  const { data } = useSections();
  const update = sections.useUpdate();
  const remove = sections.useDelete();

  if (!data) return <div className="text-ink-200">Loading...</div>;
  if (data.length === 0) return <Empty title="No sections" />;

  return (
    <div className="grid gap-4">
      {data.map((s) => (
        <Card key={s.id}>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-ink-300">key</div>
              <div className="font-mono text-sm">{s.key}</div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  update.mutate(
                    { id: s.id, body: { isVisible: !s.isVisible } },
                    { onSuccess: () => toast.success('Updated') },
                  )
                }
              >
                {s.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                {s.isVisible ? 'Visible' : 'Hidden'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (!confirm(`Delete section "${s.key}"?`)) return;
                  remove.mutate(s.id, { onSuccess: () => toast.success('Deleted') });
                }}
              >
                <Trash2 className="h-4 w-4 text-danger" />
              </Button>
            </div>
          </div>
          <SectionEditor
            id={s.id}
            initial={{
              title: s.title ?? '',
              subtitle: s.subtitle ?? '',
              ctaLabel: s.ctaLabel ?? '',
              ctaLink: s.ctaLink ?? '',
              image: s.image ?? '',
              order: s.order,
            }}
          />
        </Card>
      ))}
    </div>
  );
}

function SectionEditor({
  id,
  initial,
}: {
  id: string;
  initial: { title: string; subtitle: string; ctaLabel: string; ctaLink: string; image: string; order: number };
}) {
  const update = sections.useUpdate();
  const [v, setV] = useState(initial);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Title">
        <Input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} />
      </Field>
      <Field label="Order">
        <Input
          type="number"
          value={v.order}
          onChange={(e) => setV({ ...v, order: Number(e.target.value) })}
        />
      </Field>
      <Field label="Subtitle" className="sm:col-span-2">
        <Textarea
          rows={2}
          value={v.subtitle}
          onChange={(e) => setV({ ...v, subtitle: e.target.value })}
        />
      </Field>
      <Field label="CTA label">
        <Input value={v.ctaLabel} onChange={(e) => setV({ ...v, ctaLabel: e.target.value })} />
      </Field>
      <Field label="CTA link">
        <Input value={v.ctaLink} onChange={(e) => setV({ ...v, ctaLink: e.target.value })} />
      </Field>
      <Field label="Image URL" className="sm:col-span-2">
        <Input value={v.image} onChange={(e) => setV({ ...v, image: e.target.value })} />
      </Field>
      <div className="sm:col-span-2 text-right">
        <Button
          size="sm"
          loading={update.isPending}
          onClick={() =>
            update.mutate(
              {
                id,
                body: {
                  title: v.title || null,
                  subtitle: v.subtitle || null,
                  ctaLabel: v.ctaLabel || null,
                  ctaLink: v.ctaLink || null,
                  image: v.image || null,
                  order: v.order,
                },
              },
              {
                onSuccess: () => toast.success('Saved'),
                onError: (err) => toast.error(getApiErrorMessage(err)),
              },
            )
          }
        >
          <Save className="h-4 w-4" />
          Save
        </Button>
      </div>
    </div>
  );
}

function ServicesTab() {
  const { data } = useServicesAdmin();
  const create = services.useCreate();
  const update = services.useUpdate();
  const remove = services.useDelete();

  function add() {
    create.mutate(
      { title: 'New service', description: '', icon: 'dumbbell', order: data?.length ?? 0, isVisible: true },
      { onSuccess: () => toast.success('Added') },
    );
  }
  if (!data) return <div className="text-ink-200">Loading...</div>;
  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button size="sm" variant="secondary" onClick={add}>
          <Plus className="h-4 w-4" />
          Add service
        </Button>
      </div>
      {data.length === 0 ? (
        <Empty title="No services" />
      ) : (
        <div className="grid gap-3">
          {data.map((s) => (
            <Card key={s.id}>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Title"><Input defaultValue={s.title} onBlur={(e) => update.mutate({ id: s.id, body: { title: e.target.value } })} /></Field>
                <Field label="Icon"><Input defaultValue={s.icon} onBlur={(e) => update.mutate({ id: s.id, body: { icon: e.target.value } })} /></Field>
                <Field label="Order"><Input type="number" defaultValue={s.order} onBlur={(e) => update.mutate({ id: s.id, body: { order: Number(e.target.value) } })} /></Field>
              </div>
              <Field label="Description" className="mt-2">
                <Textarea rows={2} defaultValue={s.description} onBlur={(e) => update.mutate({ id: s.id, body: { description: e.target.value } })} />
              </Field>
              <div className="mt-2 flex items-center justify-between">
                <Button size="sm" variant="secondary" onClick={() => update.mutate({ id: s.id, body: { isVisible: !s.isVisible } })}>
                  {s.isVisible ? 'Visible' : 'Hidden'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove.mutate(s.id)}>
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function TestimonialsTab() {
  const { data } = useTestimonialsAdmin();
  const create = testimonials.useCreate();
  const update = testimonials.useUpdate();
  const remove = testimonials.useDelete();

  function add() {
    create.mutate(
      { name: 'New testimonial', text: '', rating: 5, order: data?.length ?? 0, isVisible: true },
      { onSuccess: () => toast.success('Added') },
    );
  }
  if (!data) return <div className="text-ink-200">Loading...</div>;
  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button size="sm" variant="secondary" onClick={add}>
          <Plus className="h-4 w-4" />
          Add testimonial
        </Button>
      </div>
      {data.length === 0 ? (
        <Empty title="No testimonials" />
      ) : (
        <div className="grid gap-3">
          {data.map((t) => (
            <Card key={t.id}>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Name"><Input defaultValue={t.name} onBlur={(e) => update.mutate({ id: t.id, body: { name: e.target.value } })} /></Field>
                <Field label="Image URL"><Input defaultValue={t.image ?? ''} onBlur={(e) => update.mutate({ id: t.id, body: { image: e.target.value || null } })} /></Field>
                <Field label="Rating (1-5)"><Input type="number" min={1} max={5} defaultValue={t.rating} onBlur={(e) => update.mutate({ id: t.id, body: { rating: Number(e.target.value) } })} /></Field>
              </div>
              <Field label="Text" className="mt-2">
                <Textarea rows={3} defaultValue={t.text} onBlur={(e) => update.mutate({ id: t.id, body: { text: e.target.value } })} />
              </Field>
              <div className="mt-2 flex items-center justify-between">
                <Button size="sm" variant="secondary" onClick={() => update.mutate({ id: t.id, body: { isVisible: !t.isVisible } })}>
                  {t.isVisible ? 'Visible' : 'Hidden'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove.mutate(t.id)}>
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function FaqsTab() {
  const { data } = useFaqsAdmin();
  const create = faqs.useCreate();
  const update = faqs.useUpdate();
  const remove = faqs.useDelete();

  function add() {
    create.mutate(
      { question: 'New question', answer: '', order: data?.length ?? 0, isVisible: true },
      { onSuccess: () => toast.success('Added') },
    );
  }
  if (!data) return <div className="text-ink-200">Loading...</div>;
  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button size="sm" variant="secondary" onClick={add}>
          <Plus className="h-4 w-4" />
          Add FAQ
        </Button>
      </div>
      {data.length === 0 ? (
        <Empty title="No FAQs" />
      ) : (
        <div className="grid gap-3">
          {data.map((q) => (
            <Card key={q.id}>
              <Field label="Question">
                <Input defaultValue={q.question} onBlur={(e) => update.mutate({ id: q.id, body: { question: e.target.value } })} />
              </Field>
              <Field label="Answer" className="mt-2">
                <Textarea rows={3} defaultValue={q.answer} onBlur={(e) => update.mutate({ id: q.id, body: { answer: e.target.value } })} />
              </Field>
              <div className="mt-2 flex items-center justify-between">
                <Button size="sm" variant="secondary" onClick={() => update.mutate({ id: q.id, body: { isVisible: !q.isVisible } })}>
                  {q.isVisible ? 'Visible' : 'Hidden'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove.mutate(q.id)}>
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function PricingTab() {
  const { data } = usePricingPlansAdmin();
  const create = pricingPlans.useCreate();
  const update = pricingPlans.useUpdate();
  const remove = pricingPlans.useDelete();

  function add() {
    create.mutate(
      {
        name: 'New plan',
        priceCents: 4900,
        durationDays: 30,
        features: [],
        ctaLabel: 'Choose plan',
        order: data?.length ?? 0,
        isVisible: true,
        isPopular: false,
      },
      { onSuccess: () => toast.success('Added') },
    );
  }
  if (!data) return <div className="text-ink-200">Loading...</div>;
  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button size="sm" variant="secondary" onClick={add}>
          <Plus className="h-4 w-4" />
          Add plan
        </Button>
      </div>
      {data.length === 0 ? (
        <Empty title="No pricing plans" />
      ) : (
        <div className="grid gap-3">
          {data.map((p) => (
            <Card key={p.id}>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Name">
                  <Input defaultValue={p.name} onBlur={(e) => update.mutate({ id: p.id, body: { name: e.target.value } })} />
                </Field>
                <Field label="Price (cents)">
                  <Input
                    type="number"
                    defaultValue={p.priceCents}
                    onBlur={(e) => update.mutate({ id: p.id, body: { priceCents: Number(e.target.value) } })}
                  />
                </Field>
                <Field label="Duration (days)">
                  <Input
                    type="number"
                    defaultValue={p.durationDays}
                    onBlur={(e) => update.mutate({ id: p.id, body: { durationDays: Number(e.target.value) } })}
                  />
                </Field>
              </div>
              <Field label="Description" className="mt-2">
                <Input defaultValue={p.description ?? ''} onBlur={(e) => update.mutate({ id: p.id, body: { description: e.target.value || null } })} />
              </Field>
              <Field label="Features (one per line)" className="mt-2">
                <Textarea
                  rows={3}
                  defaultValue={p.features.join('\n')}
                  onBlur={(e) =>
                    update.mutate({
                      id: p.id,
                      body: { features: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) },
                    })
                  }
                />
              </Field>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => update.mutate({ id: p.id, body: { isVisible: !p.isVisible } })}>
                    {p.isVisible ? 'Visible' : 'Hidden'}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => update.mutate({ id: p.id, body: { isPopular: !p.isPopular } })}>
                    {p.isPopular ? 'Popular ★' : 'Mark popular'}
                  </Button>
                </div>
                <Button size="sm" variant="ghost" onClick={() => remove.mutate(p.id)}>
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
