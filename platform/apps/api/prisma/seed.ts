import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const prisma = new PrismaClient();

const ADMIN_PHONE = process.env.DEFAULT_ADMIN_PHONE ?? '01025754947';
const ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD ?? 'admin123';
const ADMIN_NAME = process.env.DEFAULT_ADMIN_NAME ?? 'Coach Admin';

async function main() {
  console.log('Seeding database...');

  // -----------------------------------------------------------------
  // Default admin
  // -----------------------------------------------------------------
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const admin = await prisma.user.upsert({
    where: { phone: ADMIN_PHONE },
    update: { fullName: ADMIN_NAME, role: Role.ADMIN, isActive: true },
    create: {
      phone: ADMIN_PHONE,
      passwordHash,
      role: Role.ADMIN,
      fullName: ADMIN_NAME,
      isActive: true,
    },
  });
  console.log(`  ✓ admin user (${admin.phone})`);

  // -----------------------------------------------------------------
  // Site settings (singleton row, id=1)
  // -----------------------------------------------------------------
  await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      brandName: 'Coach Pro',
      tagline: 'Train smarter. Transform faster.',
      primaryColor: '#22e36a',
      secondaryColor: '#05070b',
      whatsappNumber: '+201025754947',
      instagram: 'https://instagram.com/',
      tiktok: 'https://tiktok.com/',
      youtube: 'https://youtube.com/',
      metaTitle: 'Coach Pro — Online Fitness Coaching',
      metaDescription:
        'Personalised online coaching: custom training, nutrition, weekly check-ins and full progress tracking.',
    },
  });
  console.log('  ✓ site settings');

  // -----------------------------------------------------------------
  // Landing page sections
  // -----------------------------------------------------------------
  const sections = [
    {
      key: 'hero',
      order: 0,
      title: 'Build the body. Build the discipline.',
      subtitle:
        'Personalised online coaching for serious results. Custom training, nutrition, weekly accountability — all in one place.',
      ctaLabel: 'Start your transformation',
      ctaLink: '/login',
      image:
        'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=2000&q=80',
      content: { overlay: 0.65 },
    },
    {
      key: 'about',
      order: 1,
      title: 'A coaching system built around you',
      subtitle:
        'Plans tailored to your goal, body, schedule and experience — not a one-size-fits-all template.',
      content: {
        bullets: [
          'Custom workout programming, week by week',
          'Macro-based nutrition with food preferences',
          'Weekly photo, weight & measurement reviews',
          'Direct coach feedback in the app',
        ],
      },
    },
    {
      key: 'how-it-works',
      order: 2,
      title: 'How it works',
      subtitle: 'Four steps from first message to first transformation',
      content: {
        steps: [
          { title: 'Apply', description: 'Tell us your goal, training history and schedule.' },
          { title: 'Get your plan', description: 'A custom workout + nutrition plan delivered in the app.' },
          { title: 'Track everything', description: 'Log workouts, weight, measurements and weekly photos.' },
          { title: 'Adapt & progress', description: 'Weekly reviews, plan updates and accountability.' },
        ],
      },
    },
    {
      key: 'features',
      order: 3,
      title: 'Tools built for results',
      subtitle: '',
      content: {
        items: [
          { icon: 'dumbbell', title: 'Smart workout tracking' },
          { icon: 'timer', title: 'Built-in rest timer' },
          { icon: 'utensils', title: 'Nutrition macros' },
          { icon: 'ruler', title: 'Body measurements' },
          { icon: 'camera', title: 'Progress photos' },
          { icon: 'line-chart', title: 'Weekly comparison' },
          { icon: 'flame', title: 'Adherence score' },
          { icon: 'eye', title: 'Coach monitoring' },
        ],
      },
    },
    {
      key: 'contact',
      order: 4,
      title: "Let's talk",
      subtitle: 'Reach out and start your journey.',
      content: {},
    },
    {
      key: 'footer',
      order: 5,
      title: 'Coach Pro',
      subtitle: 'Train smarter. Transform faster.',
      content: {},
    },
  ];

  for (const s of sections) {
    await prisma.landingPageSection.upsert({
      where: { key: s.key },
      update: s as any,
      create: s as any,
    });
  }
  console.log(`  ✓ ${sections.length} landing sections`);

  // -----------------------------------------------------------------
  // Services
  // -----------------------------------------------------------------
  const services = [
    { title: 'Training plans', description: 'Custom programming for your goal and equipment.', icon: 'dumbbell', order: 0 },
    { title: 'Nutrition plans', description: 'Macro-based nutrition, food preferences respected.', icon: 'utensils', order: 1 },
    { title: 'Progress tracking', description: 'Weight, measurements, photos and adherence.', icon: 'line-chart', order: 2 },
    { title: 'Online coaching', description: 'Direct messaging and weekly review with your coach.', icon: 'message-circle', order: 3 },
    { title: 'Body measurement', description: 'Track body composition over time.', icon: 'ruler', order: 4 },
    { title: 'Weekly check-ins', description: 'Stay accountable, adjust the plan, keep momentum.', icon: 'calendar-check', order: 5 },
  ];
  // Reset & insert (idempotent)
  await prisma.service.deleteMany({});
  await prisma.service.createMany({ data: services });
  console.log(`  ✓ ${services.length} services`);

  // -----------------------------------------------------------------
  // Testimonials
  // -----------------------------------------------------------------
  const testimonials = [
    { name: 'Mohamed A.', text: 'Down 14kg in 5 months. The plan was tough but the structure made it doable.', rating: 5, order: 0 },
    { name: 'Sara H.', text: 'Best decision I made. The weekly check-ins kept me consistent for the first time ever.', rating: 5, order: 1 },
    { name: 'Karim M.', text: 'Gained real muscle without losing my abs. The macro coaching is on another level.', rating: 5, order: 2 },
  ];
  await prisma.testimonial.deleteMany({});
  await prisma.testimonial.createMany({ data: testimonials });
  console.log(`  ✓ ${testimonials.length} testimonials`);

  // -----------------------------------------------------------------
  // FAQs
  // -----------------------------------------------------------------
  const faqs = [
    { question: 'Do I need a gym to follow the plans?', answer: 'No. Plans can be tailored to a full gym, a home setup, or bodyweight only.', order: 0 },
    { question: 'How often is the plan updated?', answer: 'Every week, based on your check-in (weight, photos, adherence and feedback).', order: 1 },
    { question: 'Can I message my coach?', answer: 'Yes — every member can leave notes and the coach replies inside the app.', order: 2 },
    { question: 'Will I have to do extreme dieting?', answer: 'Never. Sustainable adherence beats extremes every time.', order: 3 },
  ];
  await prisma.fAQ.deleteMany({});
  await prisma.fAQ.createMany({ data: faqs });
  console.log(`  ✓ ${faqs.length} FAQs`);

  // -----------------------------------------------------------------
  // Pricing plans
  // -----------------------------------------------------------------
  const plans = [
    {
      name: 'Starter',
      description: 'For beginners ready to commit',
      priceCents: 4900,
      durationDays: 30,
      features: ['Custom training plan', 'Macro-based nutrition', 'Weekly check-in', 'In-app messaging'],
      ctaLabel: 'Start now',
      order: 0,
    },
    {
      name: 'Pro',
      description: 'Most popular — full system',
      priceCents: 12900,
      durationDays: 90,
      features: ['Everything in Starter', '3-month progressive plan', 'Weekly photo + measurement review', 'Priority feedback'],
      ctaLabel: 'Go pro',
      isPopular: true,
      order: 1,
    },
    {
      name: 'Elite',
      description: '6-month transformation',
      priceCents: 22900,
      durationDays: 180,
      features: ['Everything in Pro', '6-month roadmap', 'Form review videos', 'Direct WhatsApp access'],
      ctaLabel: 'Apply',
      order: 2,
    },
  ];
  await prisma.pricingPlan.deleteMany({});
  await prisma.pricingPlan.createMany({ data: plans as any });
  console.log(`  ✓ ${plans.length} pricing plans`);

  // -----------------------------------------------------------------
  // Exercise library — small starter set
  // -----------------------------------------------------------------
  const exercises = [
    { name: 'Barbell Back Squat',  muscleGroup: 'Legs',   defaultSets: 4, defaultRepsMin: 6,  defaultRepsMax: 10, defaultRestSeconds: 120 },
    { name: 'Romanian Deadlift',   muscleGroup: 'Hamstrings', defaultSets: 3, defaultRepsMin: 8, defaultRepsMax: 12, defaultRestSeconds: 120 },
    { name: 'Bench Press',         muscleGroup: 'Chest',  defaultSets: 4, defaultRepsMin: 6,  defaultRepsMax: 10, defaultRestSeconds: 120 },
    { name: 'Incline Dumbbell Press', muscleGroup: 'Chest', defaultSets: 3, defaultRepsMin: 8, defaultRepsMax: 12, defaultRestSeconds: 90 },
    { name: 'Pull-up',             muscleGroup: 'Back',   defaultSets: 4, defaultRepsMin: 5,  defaultRepsMax: 10, defaultRestSeconds: 120 },
    { name: 'Barbell Row',         muscleGroup: 'Back',   defaultSets: 4, defaultRepsMin: 6,  defaultRepsMax: 10, defaultRestSeconds: 120 },
    { name: 'Overhead Press',      muscleGroup: 'Shoulders', defaultSets: 3, defaultRepsMin: 6, defaultRepsMax: 10, defaultRestSeconds: 120 },
    { name: 'Lateral Raise',       muscleGroup: 'Shoulders', defaultSets: 3, defaultRepsMin: 12, defaultRepsMax: 15, defaultRestSeconds: 60 },
    { name: 'Barbell Curl',        muscleGroup: 'Biceps', defaultSets: 3, defaultRepsMin: 8,  defaultRepsMax: 12, defaultRestSeconds: 60 },
    { name: 'Triceps Pushdown',    muscleGroup: 'Triceps', defaultSets: 3, defaultRepsMin: 10, defaultRepsMax: 15, defaultRestSeconds: 60 },
    { name: 'Plank',               muscleGroup: 'Core',   defaultSets: 3, defaultRepsMin: 30, defaultRepsMax: 60, defaultRestSeconds: 45 },
    { name: 'Hanging Leg Raise',   muscleGroup: 'Core',   defaultSets: 3, defaultRepsMin: 8,  defaultRepsMax: 15, defaultRestSeconds: 60 },
  ];
  for (const ex of exercises) {
    await prisma.exerciseLibrary.upsert({
      where: { id: `seed-${ex.name.replace(/\s+/g, '-').toLowerCase()}` },
      update: {},
      create: { id: `seed-${ex.name.replace(/\s+/g, '-').toLowerCase()}`, ...ex, createdById: admin.id },
    });
  }
  console.log(`  ✓ ${exercises.length} exercise-library entries`);

  // -----------------------------------------------------------------
  // Food library — small starter set
  // -----------------------------------------------------------------
  const foods = [
    { name: 'Chicken breast (cooked)', servingSize: 100, unit: 'g', calories: 165, proteinG: 31, carbsG: 0,  fatsG: 3.6 },
    { name: 'White rice (cooked)',     servingSize: 100, unit: 'g', calories: 130, proteinG: 2.7, carbsG: 28, fatsG: 0.3 },
    { name: 'Brown rice (cooked)',     servingSize: 100, unit: 'g', calories: 112, proteinG: 2.6, carbsG: 23, fatsG: 0.9 },
    { name: 'Oats (raw)',              servingSize: 100, unit: 'g', calories: 389, proteinG: 17, carbsG: 66, fatsG: 7  },
    { name: 'Egg (whole, large)',      servingSize: 50,  unit: 'g', calories: 72,  proteinG: 6.3, carbsG: 0.4, fatsG: 4.8 },
    { name: 'Banana',                  servingSize: 118, unit: 'g', calories: 105, proteinG: 1.3, carbsG: 27, fatsG: 0.4 },
    { name: 'Olive oil',               servingSize: 10,  unit: 'g', calories: 88,  proteinG: 0,   carbsG: 0,  fatsG: 10 },
    { name: 'Whey protein (1 scoop)',  servingSize: 30,  unit: 'g', calories: 120, proteinG: 24, carbsG: 3,  fatsG: 1.5 },
    { name: 'Almonds',                 servingSize: 28,  unit: 'g', calories: 164, proteinG: 6,   carbsG: 6,  fatsG: 14 },
    { name: 'Sweet potato (cooked)',   servingSize: 100, unit: 'g', calories: 86,  proteinG: 1.6, carbsG: 20, fatsG: 0.1 },
  ];
  for (const f of foods) {
    await prisma.foodLibrary.upsert({
      where: { id: `seed-${f.name.replace(/\s+/g, '-').replace(/[(),.]/g, '').toLowerCase()}` },
      update: {},
      create: { id: `seed-${f.name.replace(/\s+/g, '-').replace(/[(),.]/g, '').toLowerCase()}`, ...f, createdById: admin.id },
    });
  }
  console.log(`  ✓ ${foods.length} food-library entries`);

  console.log('\nSeed complete.');
  console.log(`Login as admin -> phone: ${ADMIN_PHONE}, password: ${ADMIN_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
