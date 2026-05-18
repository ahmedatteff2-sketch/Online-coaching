import { motion } from 'framer-motion';
import {
  Dumbbell,
  Utensils,
  LineChart,
  MessageCircle,
  Ruler,
  CalendarCheck,
  Camera,
  Timer,
  Flame,
  Eye,
  Star,
  Check,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ErrorMessage } from '@/components/ErrorMessage';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { fmtMoney } from '@/lib/format';
import { getApiErrorMessage } from '@/lib/apiError';
import { useSubmitContact } from '@/api/landing';
import type {
  LandingPayload,
  LandingSection,
  PricingPlan,
  Service,
  Testimonial,
  FAQ,
} from '@/api/types';

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.5 },
};

const iconMap: Record<string, JSX.Element> = {
  dumbbell: <Dumbbell className="h-5 w-5" />,
  utensils: <Utensils className="h-5 w-5" />,
  'line-chart': <LineChart className="h-5 w-5" />,
  'message-circle': <MessageCircle className="h-5 w-5" />,
  ruler: <Ruler className="h-5 w-5" />,
  'calendar-check': <CalendarCheck className="h-5 w-5" />,
  camera: <Camera className="h-5 w-5" />,
  timer: <Timer className="h-5 w-5" />,
  flame: <Flame className="h-5 w-5" />,
  eye: <Eye className="h-5 w-5" />,
};

function getIcon(key: string | undefined) {
  if (!key) return iconMap.dumbbell;
  return iconMap[key] ?? iconMap.dumbbell;
}

// ---------------------------------------------------------------------------
// HERO
// ---------------------------------------------------------------------------
export function HeroSection({
  section,
  brandName,
}: {
  section: LandingSection | undefined;
  brandName: string;
}) {
  if (!section) return null;
  const overlay =
    typeof section.content?.overlay === 'number' ? Number(section.content.overlay) : 0.6;

  return (
    <section className="relative overflow-hidden">
      {section.image ? (
        <div className="absolute inset-0">
          <img
            src={section.image}
            alt=""
            className="h-full w-full object-cover"
            loading="eager"
            decoding="async"
          />
          <div className="absolute inset-0 bg-ink-950" style={{ opacity: overlay }} />
          <div className="absolute inset-0 bg-grid-fade" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-ink-950 bg-grid-fade" />
      )}

      <div className="relative container-app py-24 md:py-36">
        <motion.div {...fadeUp}>
          <Badge tone="success" className="mb-6">
            {brandName}
          </Badge>
          <h1 className="display max-w-4xl text-5xl leading-[0.95] sm:text-6xl md:text-7xl lg:text-[88px]">
            {section.title ?? 'Build the body. Build the discipline.'}
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-ink-100/90">
            {section.subtitle}
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            {section.ctaLabel ? (
              <a href={section.ctaLink ?? '/login'}>
                <Button size="lg">{section.ctaLabel}</Button>
              </a>
            ) : null}
            <a href="#contact">
              <Button size="lg" variant="outline">
                Talk to a coach
              </Button>
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// ABOUT
// ---------------------------------------------------------------------------
export function AboutSection({ section }: { section: LandingSection | undefined }) {
  if (!section) return null;
  const bullets = (section.content?.bullets as string[] | undefined) ?? [];
  return (
    <section className="container-app py-20 md:py-28">
      <motion.div {...fadeUp} className="grid gap-10 md:grid-cols-2 md:items-center">
        <div>
          <Badge tone="muted" className="mb-4">About</Badge>
          <h2 className="display text-4xl md:text-5xl">{section.title}</h2>
          <p className="mt-4 max-w-xl text-ink-200">{section.subtitle}</p>
        </div>
        <ul className="grid gap-3">
          {bullets.map((b) => (
            <li key={b} className="surface-card flex items-start gap-3">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-accent-400/10 text-accent-400">
                <Check className="h-4 w-4" />
              </span>
              <span className="leading-snug text-ink-100">{b}</span>
            </li>
          ))}
        </ul>
      </motion.div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// HOW IT WORKS
// ---------------------------------------------------------------------------
export function HowItWorksSection({ section }: { section: LandingSection | undefined }) {
  if (!section) return null;
  const steps = (section.content?.steps as { title: string; description: string }[] | undefined) ?? [];
  return (
    <section className="container-app py-20 md:py-28">
      <motion.div {...fadeUp}>
        <Badge tone="muted" className="mb-4">How it works</Badge>
        <h2 className="display text-4xl md:text-5xl">{section.title}</h2>
        <p className="mt-3 max-w-xl text-ink-200">{section.subtitle}</p>
      </motion.div>
      <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <motion.div key={s.title} {...fadeUp} transition={{ duration: 0.4, delay: i * 0.05 }}>
            <Card className="h-full">
              <div className="display mb-3 text-accent-400">0{i + 1}</div>
              <h3 className="text-lg font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-ink-200">{s.description}</p>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// SERVICES
// ---------------------------------------------------------------------------
export function ServicesSection({ services }: { services: Service[] }) {
  if (!services.length) return null;
  return (
    <section className="container-app py-20 md:py-28">
      <motion.div {...fadeUp}>
        <Badge tone="muted" className="mb-4">Services</Badge>
        <h2 className="display text-4xl md:text-5xl">Everything you need to transform</h2>
      </motion.div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s, i) => (
          <motion.div key={s.id} {...fadeUp} transition={{ duration: 0.4, delay: i * 0.04 }}>
            <Card className="h-full">
              <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-accent-900/30 text-accent-300">
                {getIcon(s.icon)}
              </div>
              <h3 className="text-lg font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-ink-200">{s.description}</p>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// FEATURES
// ---------------------------------------------------------------------------
export function FeaturesSection({ section }: { section: LandingSection | undefined }) {
  if (!section) return null;
  const items =
    (section.content?.items as { icon: string; title: string }[] | undefined) ?? [];
  return (
    <section className="container-app py-20 md:py-28">
      <motion.div {...fadeUp}>
        <Badge tone="muted" className="mb-4">Features</Badge>
        <h2 className="display text-4xl md:text-5xl">{section.title}</h2>
      </motion.div>
      <div className="mt-10 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {items.map((it, i) => (
          <motion.div key={it.title} {...fadeUp} transition={{ duration: 0.35, delay: i * 0.03 }}>
            <Card className="flex h-full items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent-900/30 text-accent-300">
                {getIcon(it.icon)}
              </span>
              <span className="font-medium leading-tight">{it.title}</span>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// TESTIMONIALS
// ---------------------------------------------------------------------------
export function TestimonialsSection({ items }: { items: Testimonial[] }) {
  if (!items.length) return null;
  return (
    <section className="container-app py-20 md:py-28">
      <motion.div {...fadeUp}>
        <Badge tone="muted" className="mb-4">Results</Badge>
        <h2 className="display text-4xl md:text-5xl">Real members. Real results.</h2>
      </motion.div>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {items.map((t, i) => (
          <motion.div key={t.id} {...fadeUp} transition={{ duration: 0.4, delay: i * 0.05 }}>
            <Card className="h-full">
              <div className="mb-3 flex gap-0.5 text-accent-400">
                {Array.from({ length: t.rating }).map((_, idx) => (
                  <Star key={idx} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="text-sm leading-relaxed text-ink-100">"{t.text}"</p>
              <div className="mt-4 flex items-center gap-3">
                {t.image ? (
                  <img src={t.image} alt={t.name} className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-ink-700 text-xs font-bold">
                    {t.name.slice(0, 1)}
                  </span>
                )}
                <span className="text-sm font-semibold">{t.name}</span>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// PRICING
// ---------------------------------------------------------------------------
export function PricingSection({ plans }: { plans: PricingPlan[] }) {
  if (!plans.length) return null;
  return (
    <section id="pricing" className="container-app py-20 md:py-28">
      <motion.div {...fadeUp} className="text-center md:text-left">
        <Badge tone="muted" className="mb-4">Packages</Badge>
        <h2 className="display text-4xl md:text-5xl">Pick the plan that fits</h2>
      </motion.div>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {plans.map((p, i) => (
          <motion.div key={p.id} {...fadeUp} transition={{ duration: 0.45, delay: i * 0.05 }}>
            <Card
              className={`relative h-full ${
                p.isPopular ? 'ring-2 ring-accent-400/60 shadow-glow' : ''
              }`}
            >
              {p.isPopular ? (
                <Badge tone="success" className="absolute -top-3 left-5">
                  Most popular
                </Badge>
              ) : null}
              <h3 className="text-lg font-semibold">{p.name}</h3>
              {p.description ? <p className="mt-1 text-sm text-ink-200">{p.description}</p> : null}
              <div className="mt-5 flex items-baseline gap-2">
                <span className="display text-4xl">{fmtMoney(p.priceCents, p.currency)}</span>
                <span className="text-sm text-ink-200">/ {p.durationDays} days</span>
              </div>
              <ul className="mt-5 grid gap-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 text-accent-400" />
                    <span className="text-ink-100">{f}</span>
                  </li>
                ))}
              </ul>
              <a href={p.ctaLink ?? '/login'} className="mt-6 block">
                <Button fullWidth variant={p.isPopular ? 'primary' : 'secondary'}>
                  {p.ctaLabel}
                </Button>
              </a>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------
export function FaqSection({ items }: { items: FAQ[] }) {
  const [open, setOpen] = useState<string | null>(items[0]?.id ?? null);
  if (!items.length) return null;
  return (
    <section className="container-app py-20 md:py-28">
      <motion.div {...fadeUp}>
        <Badge tone="muted" className="mb-4">FAQ</Badge>
        <h2 className="display text-4xl md:text-5xl">Common questions</h2>
      </motion.div>
      <div className="mt-10 grid gap-3">
        {items.map((q) => {
          const isOpen = open === q.id;
          return (
            <Card key={q.id} className="!p-0">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : q.id)}
                className="flex w-full items-center justify-between gap-4 p-5 text-left"
              >
                <span className="font-medium">{q.question}</span>
                <span className={`text-accent-400 transition ${isOpen ? 'rotate-45' : ''}`}>+</span>
              </button>
              {isOpen ? (
                <div className="border-t border-ink-700/60 p-5 text-sm text-ink-200">{q.answer}</div>
              ) : null}
            </Card>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// CONTACT
// ---------------------------------------------------------------------------
export function ContactSection({
  section,
  whatsappNumber,
}: {
  section: LandingSection | undefined;
  whatsappNumber: string | null;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const submit = useSubmitContact();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit.mutate(
      { name, phone, email: email || undefined, message },
      {
        onSuccess: () => {
          setName('');
          setPhone('');
          setEmail('');
          setMessage('');
        },
      },
    );
  }
  return (
    <section id="contact" className="container-app py-20 md:py-28">
      <div className="grid gap-10 md:grid-cols-2 md:items-start">
        <motion.div {...fadeUp}>
          <Badge tone="muted" className="mb-4">Contact</Badge>
          <h2 className="display text-4xl md:text-5xl">{section?.title ?? "Let's talk"}</h2>
          <p className="mt-3 max-w-md text-ink-200">{section?.subtitle}</p>
          {whatsappNumber ? (
            <a
              href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex"
            >
              <Button variant="secondary">
                <MessageCircle className="h-4 w-4" />
                WhatsApp {whatsappNumber}
              </Button>
            </a>
          ) : null}
        </motion.div>
        <Card>
          <form onSubmit={onSubmit} className="grid gap-3">
            {submit.isSuccess ? (
              <div className="rounded-xl border border-accent-700/50 bg-accent-900/20 p-3 text-sm text-accent-200">
                Thanks — we'll be in touch soon.
              </div>
            ) : null}
            <ErrorMessage
              message={submit.isError ? getApiErrorMessage(submit.error) : null}
            />
            <Field label="Your name">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="John Doe"
              />
            </Field>
            <Field label="Phone">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                inputMode="tel"
                placeholder="+201025754947"
              />
            </Field>
            <Field label="Email (optional)">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
              />
            </Field>
            <Field label="Message">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={5}
                placeholder="Goals, current routine, equipment..."
              />
            </Field>
            <Button type="submit" loading={submit.isPending} fullWidth>
              Send message
            </Button>
          </form>
        </Card>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// FOOTER
// ---------------------------------------------------------------------------
export function FooterSection({ data }: { data: LandingPayload }) {
  const s = data.settings;
  return (
    <footer className="border-t border-ink-700/60 bg-ink-900/40 py-12">
      <div className="container-app grid gap-8 md:grid-cols-4">
        <div>
          <div className="display text-2xl">{s.brandName}</div>
          <p className="mt-2 max-w-xs text-sm text-ink-200">{s.tagline}</p>
        </div>
        <div>
          <h4 className="label-faded mb-3">Site</h4>
          <ul className="grid gap-1 text-sm">
            <li>
              <a href="#contact" className="text-ink-200 hover:text-ink-100">
                Contact
              </a>
            </li>
            <li>
              <a href="#pricing" className="text-ink-200 hover:text-ink-100">
                Pricing
              </a>
            </li>
            <li>
              <a href="/login" className="text-ink-200 hover:text-ink-100">
                Member login
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="label-faded mb-3">Connect</h4>
          <ul className="grid gap-1 text-sm">
            {s.instagram ? (
              <li>
                <a href={s.instagram} className="text-ink-200 hover:text-ink-100">
                  Instagram
                </a>
              </li>
            ) : null}
            {s.tiktok ? (
              <li>
                <a href={s.tiktok} className="text-ink-200 hover:text-ink-100">
                  TikTok
                </a>
              </li>
            ) : null}
            {s.youtube ? (
              <li>
                <a href={s.youtube} className="text-ink-200 hover:text-ink-100">
                  YouTube
                </a>
              </li>
            ) : null}
          </ul>
        </div>
        <div>
          <h4 className="label-faded mb-3">Reach us</h4>
          <ul className="grid gap-1 text-sm text-ink-200">
            {s.whatsappNumber ? <li>WhatsApp: {s.whatsappNumber}</li> : null}
            {s.email ? <li>{s.email}</li> : null}
            {s.address ? <li>{s.address}</li> : null}
          </ul>
        </div>
      </div>
      <div className="container-app mt-8 border-t border-ink-700/60 pt-6 text-xs text-ink-300">
        © {new Date().getFullYear()} {s.brandName}. All rights reserved.
      </div>
    </footer>
  );
}
