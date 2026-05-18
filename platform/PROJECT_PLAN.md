# Fitness Coaching Platform — Implementation Plan

A production-ready, full-stack SaaS for online fitness coaching.

> **Why a separate `platform/` folder?** The repo root already contains
> a Next.js + Supabase build of the same product. The new spec asks for
> a different stack (React + Vite + Express + Prisma + JWT), so the new
> build lives side-by-side under `platform/` as a clean monorepo.

## 1. Stack

| Layer        | Tech                                                                |
| ------------ | ------------------------------------------------------------------- |
| Frontend     | React 18, Vite 5, TypeScript, Tailwind, React Router, Zustand,      |
|              | TanStack Query, React Hook Form + Zod, Framer Motion, Recharts      |
| Backend      | Node 20, Express 4, TypeScript, Prisma 5, Zod, bcrypt, JWT, Multer  |
| Database     | PostgreSQL 15+                                                      |
| Auth         | Phone + password, JWT access (15m) + refresh (30d) tokens (httpOnly)|
| File storage | Local disk under `apps/api/uploads` (swap for S3/Cloudinary)        |

## 2. Monorepo layout

```
platform/
  package.json              # workspaces root, shared scripts
  pnpm-workspace.yaml
  tsconfig.base.json
  README.md
  .env.example
  apps/
    api/                    # Express + Prisma backend
      src/
        config/             # env loading, constants
        lib/                # prisma client, jwt, bcrypt, logger
        middleware/         # auth, error handler, rate limit, multer
        modules/
          auth/             # login, refresh, logout, me
          users/            # admin CRUD members, member self profile
          training/         # training plans, days, exercises
          nutrition/        # nutrition plans, meals, food items
          libraries/        # exercise + food libraries
          progress/         # weight, measurements, photos, check-ins, logs
          notes/            # admin/member notes
          notifications/
          landing/          # site settings + sections (CMS)
          uploads/          # file upload handler
        utils/              # zod helpers, pagination, response
        index.ts            # app bootstrap
        server.ts           # http listener
      prisma/
        schema.prisma
        seed.ts
      uploads/              # runtime, gitignored
    web/                    # Vite + React frontend
      src/
        api/                # axios client, query hooks per resource
        components/         # ui primitives + composed components
        features/           # feature folders (auth, admin, member, landing)
        hooks/
        lib/                # cn, formatters, validators
        pages/
          public/           # /, /login, /contact
          admin/            # /admin/*
          member/           # /member/*
        routes.tsx          # router config + protected routes
        store/              # zustand auth store
        styles/             # tailwind base
        main.tsx
      index.html
      vite.config.ts
      tailwind.config.ts
      postcss.config.js
```

## 3. Database ERD (summary)

Enums:

- `Role` = `ADMIN | MEMBER`
- `MemberStatus` = `ACTIVE | INACTIVE | EXPIRED`
- `Gender` = `MALE | FEMALE | OTHER`
- `Goal` = `MUSCLE_GAIN | FAT_LOSS | STRENGTH | ENDURANCE | GENERAL_FITNESS`
- `FitnessLevel` = `BEGINNER | INTERMEDIATE | ADVANCED`
- `PhotoType` = `FRONT | SIDE | BACK | OTHER`
- `MealStatus` = `PENDING | COMPLETED | SKIPPED`
- `NotificationType` = `PLAN_ASSIGNED | NUTRITION_ASSIGNED | NOTE_ADDED | PHOTO_REMINDER | WEIGHT_REMINDER | GENERIC`

Core tables (Prisma models):

```
User (id, phone unique, passwordHash, role, fullName, profileImage, isActive, createdAt, updatedAt)
  └─ MemberProfile? (1-1) (age, gender, height, currentWeight, goal, level, medicalNotes,
                            startDate, expiryDate, status, subscriptionPlanId?)
  └─ AdminProfile? (1-1)  (bio, settings JSON)

Subscription / PricingPlan
  PricingPlan (id, name, priceCents, durationDays, features JSON[], ctaLabel, isActive, order)
  Subscription (id, memberId, planId?, startDate, endDate, status)

TrainingPlan (id, memberId?, isTemplate, name, goal, startDate, endDate, daysPerWeek, notes, createdById)
  └─ TrainingDay (id, planId, dayNumber, name, targetMuscles[], notes)
       └─ Exercise (id, dayId, libraryId?, name, muscleGroup, videoUrl, imageUrl, instructions,
                     sets, repsMin, repsMax, restSeconds, tempo, rpe, notes, order)

ExerciseLibrary (id, name, muscleGroup, videoUrl, imageUrl, instructions,
                  defaultSets, defaultReps, defaultRestSeconds, createdById)

WorkoutLog (id, memberId, dayId, date, durationSec, notes)
  └─ WorkoutSetLog (id, logId, exerciseId, setNumber, weight, reps, completed,
                     restSecondsUsed, rpe, notes)

NutritionPlan (id, memberId?, isTemplate, name, goal, calories, proteinG, carbsG,
                 fatsG, waterMl, mealsPerDay, notes, createdById)
  └─ Meal (id, planId, order, name, time, notes)
       └─ FoodItem (id, mealId, libraryId?, name, quantity, unit, calories, proteinG,
                     carbsG, fatsG, alternatives Json[])

FoodLibrary (id, name, servingSize, unit, calories, proteinG, carbsG, fatsG, createdById)

NutritionLog (id, memberId, date, mealId, status, percentFollowed, notes)

WeightLog (id, memberId, date, weightKg, notes)
BodyMeasurement (id, memberId, date, chest, waist, hip, thigh, calf, biceps, forearm,
                  shoulder, neck, bodyFatPct, notes)
ProgressPhoto (id, memberId, date, type, url, notes)
CheckIn (id, memberId, weekStart, weightKg, energy, sleep, hunger, stress,
          workoutScore, nutritionScore, notes, adminFeedback?)

AdminNote (id, memberId, authorId, body, isPrivate, kind, createdAt)
MemberNote (id, memberId, body, createdAt)        // member's own notes
Notification (id, userId, type, title, body, readAt, createdAt, link?)

SiteSettings (id=1 row, brandName, logoUrl, primaryColor, secondaryColor,
               whatsappNumber, instagram, tiktok, youtube, twitter, facebook,
               heroFontScale, isDark)
LandingPageSection (id, key unique, order, isVisible, title, subtitle,
                     content Json, image?, ctaLabel?, ctaLink?)
Service (id, order, icon, title, description, isVisible)
Testimonial (id, order, name, image, rating, text, isVisible)
FAQ (id, order, question, answer, isVisible)
ContactMessage (id, name, phone, email?, message, createdAt)  // contact form
```

Relationships use `onDelete: Cascade` for child rows owned by a member,
`SetNull` for optional links (e.g. exercise → library).

## 4. API contract (high level)

All endpoints return `{ data, error?, meta? }`. Auth-protected unless
noted. Access token sent as `Authorization: Bearer …`; refresh token in
httpOnly cookie.

### Public

```
GET  /api/health                              -> { status: "ok" }
GET  /api/landing                             -> full landing page payload
                                                  { settings, sections, services,
                                                    testimonials, faqs, packages }
POST /api/contact                             -> create ContactMessage  (rate-limited)
```

### Auth

```
POST /api/auth/login        { phone, password }   -> { user, accessToken } + cookie
POST /api/auth/refresh                            -> { accessToken } + rotated cookie
POST /api/auth/logout                             -> clears cookie
GET  /api/auth/me                                 -> { user }
```

### Admin (`role=ADMIN`)

Members:
```
GET    /api/admin/members?search=&status=&page=
POST   /api/admin/members
GET    /api/admin/members/:id
PATCH  /api/admin/members/:id
DELETE /api/admin/members/:id
POST   /api/admin/members/:id/password
POST   /api/admin/members/:id/status
GET    /api/admin/members/:id/overview        // weights, photos, adherence
```

Training:
```
GET    /api/admin/training-plans?memberId=&template=
POST   /api/admin/training-plans
GET    /api/admin/training-plans/:id
PATCH  /api/admin/training-plans/:id
DELETE /api/admin/training-plans/:id
POST   /api/admin/training-plans/:id/duplicate
POST   /api/admin/training-plans/:id/assign       // { memberIds[] }

POST   /api/admin/training-days                   // create/update inline
PATCH  /api/admin/training-days/:id
DELETE /api/admin/training-days/:id

POST   /api/admin/exercises
PATCH  /api/admin/exercises/:id
DELETE /api/admin/exercises/:id
```

Exercise / Food libraries:
```
GET/POST/PATCH/DELETE /api/admin/exercise-library[/:id]
GET/POST/PATCH/DELETE /api/admin/food-library[/:id]
```

Nutrition:
```
GET/POST/PATCH/DELETE /api/admin/nutrition-plans[/:id]
POST   /api/admin/nutrition-plans/:id/duplicate
POST   /api/admin/nutrition-plans/:id/assign
POST/PATCH/DELETE /api/admin/meals[/:id]
POST/PATCH/DELETE /api/admin/food-items[/:id]
```

Progress (read-only views over members' data):
```
GET /api/admin/members/:id/weights
GET /api/admin/members/:id/measurements
GET /api/admin/members/:id/photos
GET /api/admin/members/:id/check-ins
GET /api/admin/members/:id/workout-logs
GET /api/admin/members/:id/nutrition-logs
POST /api/admin/check-ins/:id/feedback
```

Notes:
```
GET/POST/PATCH/DELETE /api/admin/notes[/:id]
```

Landing CMS + settings:
```
GET    /api/admin/site-settings
PATCH  /api/admin/site-settings
GET/POST/PATCH/DELETE /api/admin/sections[/:id]
GET/POST/PATCH/DELETE /api/admin/services[/:id]
GET/POST/PATCH/DELETE /api/admin/testimonials[/:id]
GET/POST/PATCH/DELETE /api/admin/faqs[/:id]
GET/POST/PATCH/DELETE /api/admin/pricing-plans[/:id]
GET    /api/admin/contact-messages
DELETE /api/admin/contact-messages/:id
```

Admin dashboard:
```
GET /api/admin/overview   -> KPIs, recent activity
```

Uploads:
```
POST /api/uploads/image       // multipart, returns { url }
```

### Member (`role=MEMBER`, scoped to self)

```
GET   /api/member/overview
GET   /api/member/me
PATCH /api/member/me                          // profile + weight + measurements + image
POST  /api/member/me/password

GET   /api/member/training-plan
POST  /api/member/workout-logs                // { dayId, exerciseId, setNumber, weight, reps, ... }
GET   /api/member/workout-logs?from=&to=

GET   /api/member/nutrition-plan
POST  /api/member/nutrition-logs              // mark meal status

POST  /api/member/weights      GET /api/member/weights
POST  /api/member/measurements GET /api/member/measurements
POST  /api/member/photos       GET /api/member/photos
POST  /api/member/check-ins    GET /api/member/check-ins

GET   /api/member/notes
GET   /api/member/notifications
POST  /api/member/notifications/:id/read
```

## 5. Page map

```
Public
  /                       Landing (driven by API)
  /login                  Auth (phone + password)
  /contact                Contact form

Admin (/admin/*)
  /admin/dashboard
  /admin/members
  /admin/members/new
  /admin/members/:id           overview tab
  /admin/members/:id/training
  /admin/members/:id/nutrition
  /admin/members/:id/progress
  /admin/members/:id/photos
  /admin/members/:id/check-ins
  /admin/members/:id/notes
  /admin/training-plans
  /admin/training-plans/:id
  /admin/nutrition-plans
  /admin/nutrition-plans/:id
  /admin/exercise-library
  /admin/food-library
  /admin/landing-page-editor
  /admin/settings

Member (/member/*)
  /member/dashboard
  /member/workouts
  /member/workouts/:dayId      with rest timer
  /member/nutrition
  /member/weight
  /member/measurements
  /member/photos
  /member/progress             before/after compare
  /member/check-in
  /member/notes
  /member/profile
```

## 6. Security checklist

- bcrypt cost 12.
- Access token 15m, refresh 30d (rotated on use, stored httpOnly + sameSite=lax + secure).
- `role` claim in JWT; route guards on every admin/member endpoint.
- Member queries always filtered by `req.user.id` to prevent IDOR.
- `helmet`, CORS allowlist, JSON body limit.
- `express-rate-limit` on `/api/auth/login` and `/api/contact`.
- Zod validation on every body / params / query.
- Multer: file size cap 5 MB, MIME allowlist (`image/jpeg|png|webp`).
- All uploaded files renamed to UUID, served from `/uploads`.
- Errors funneled through a single error middleware that hides stack
  traces in production.

## 7. Build & verification

- `pnpm install` at `platform/` (workspaces).
- `pnpm --filter api prisma generate` then `pnpm --filter api build`
  must succeed (typecheck included).
- `pnpm --filter web build` must succeed.
- Seed script creates default admin (`01025754947 / admin123`) and
  sample landing content so the first deploy is "useful out of the box".
