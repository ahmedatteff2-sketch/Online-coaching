# Fitness Coaching Platform

A production-ready, full-stack SaaS for online fitness coaching:

- **Public landing page** that the admin can fully edit from inside the app
- **Authentication** with phone + password and JWT (access + httpOnly refresh)
- **Admin dashboard** to manage members, training plans, nutrition plans,
  libraries, landing-page content and brand settings
- **Member dashboard** (mobile-first) with workout logging, built-in rest
  timer, nutrition tracking, weight/measurements/photos, weekly check-ins
  and progress comparison

> The repository contains a parallel Next.js + Supabase implementation
> at the repo root. **This new build lives under `platform/`** as a
> standalone monorepo (Vite + Express + Prisma + Postgres).

## Tech stack

| Area     | Choice                                                                |
| -------- | --------------------------------------------------------------------- |
| Frontend | React 18, Vite 5, TypeScript, Tailwind, React Router 6, Zustand,      |
|          | TanStack Query, React Hook Form + Zod, Framer Motion, Recharts        |
| Backend  | Node 20+, Express 4, TypeScript, Prisma 5, Zod, bcrypt, JWT, Multer   |
| Database | PostgreSQL 14+                                                        |
| Auth     | Phone + password → bcrypt(12) + JWT 15 min access + 30 d refresh in   |
|          | httpOnly + sameSite=lax cookie, rotated on every refresh              |
| Storage  | Local disk under `apps/api/uploads` (swap for S3 / Cloudinary later)  |

## Folder layout

```
platform/
├─ package.json                 # npm workspaces root
├─ tsconfig.base.json
├─ PROJECT_PLAN.md              # detailed plan + ERD + API contract
├─ apps/
│  ├─ api/                      # Express + Prisma backend
│  │  ├─ prisma/{schema.prisma, seed.ts}
│  │  └─ src/
│  │     ├─ app.ts              # express bootstrap (helmet, cors, morgan)
│  │     ├─ server.ts           # listener
│  │     ├─ config/env.ts       # zod-validated env
│  │     ├─ lib/{prisma,jwt,errors,logger}.ts
│  │     ├─ middleware/{auth,validate,error,rateLimit,upload}.ts
│  │     ├─ utils/{asyncHandler,response}.ts
│  │     └─ modules/
│  │        ├─ auth/            # login, refresh, logout, me
│  │        ├─ admin/           # members, training, nutrition, libs, landing CMS, notes, overview
│  │        ├─ member/          # member-scoped endpoints
│  │        ├─ landing/         # public landing + contact form
│  │        ├─ uploads/
│  │        └─ health/
│  └─ web/                      # Vite + React frontend
│     └─ src/
│        ├─ main.tsx, App.tsx, routes
│        ├─ api/                # axios client + react-query hooks
│        ├─ store/auth.ts       # zustand session store
│        ├─ components/         # ui primitives + layout pieces + charts
│        ├─ features/landing/   # landing-page sections
│        └─ pages/{public,admin,member}
```

The `apps/api/src/modules/<feature>/<feature>.routes.ts` files own the
HTTP layer for each feature; queries go straight through Prisma so the
code stays small.

## Quick start

You need **Node 20+** and **PostgreSQL 14+**. The repo uses npm workspaces
(no extra package manager required).

```bash
cd platform

# 1. Install workspaces
npm install

# 2. Configure env (api and web each have their own .env)
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# edit DATABASE_URL + JWT_*_SECRET in apps/api/.env

# 3. Database
npm run db:generate            # prisma generate
npm run db:migrate             # creates the schema
npm run db:seed                # seeds default admin + landing content

# 4. Run both apps in dev (api on :4000, web on :5173)
npm run dev
```

Open http://localhost:5173 — you'll land on the public site. Click
**Member login** and use the seeded admin:

```
phone:    01025754947
password: admin123
```

Admin lands on `/admin/dashboard`, members on `/member/dashboard`.

## Environment

`apps/api/.env`

| Var                                  | Default                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------- |
| `NODE_ENV`                           | `development`                                                             |
| `PORT`                               | `4000`                                                                    |
| `DATABASE_URL`                       | `postgresql://postgres:postgres@localhost:5432/fitness_coaching?schema=public` |
| `JWT_ACCESS_SECRET`                  | **change me — at least 16 characters**                                    |
| `JWT_REFRESH_SECRET`                 | **change me — at least 16 characters**                                    |
| `JWT_ACCESS_TTL`                     | `15m`                                                                     |
| `JWT_REFRESH_TTL`                    | `30d`                                                                     |
| `CORS_ORIGIN`                        | `http://localhost:5173` (comma-separate for multiple)                     |
| `COOKIE_SECURE`                      | `false` in dev, **set `true` in production**                              |
| `COOKIE_DOMAIN`                      | empty in dev; set to your apex domain in prod                             |
| `UPLOAD_DIR`                         | `./uploads` (created automatically)                                       |
| `PUBLIC_BASE_URL`                    | `http://localhost:4000` — used for absolute upload URLs                   |
| `RATE_LIMIT_LOGIN_MAX`               | `10` (per 15 minutes per IP)                                              |
| `DEFAULT_ADMIN_PHONE` / `_PASSWORD` / `_NAME` | seed defaults: `01025754947` / `admin123` / `Coach Admin`        |

`apps/web/.env`

| Var            | Default                       |
| -------------- | ----------------------------- |
| `VITE_API_URL` | `http://localhost:4000/api`   |

## Available scripts (run from `platform/`)

| Command              | What it does                                       |
| -------------------- | -------------------------------------------------- |
| `npm run dev`        | Run API + web in parallel (npm-run-all)            |
| `npm run dev:api`    | API only (`tsx watch`)                             |
| `npm run dev:web`    | Web only (Vite dev server)                         |
| `npm run build`      | Build api + web                                    |
| `npm run typecheck`  | `tsc --noEmit` for both                            |
| `npm run db:generate`| `prisma generate`                                  |
| `npm run db:migrate` | `prisma migrate dev`                               |
| `npm run db:seed`    | Run `apps/api/prisma/seed.ts`                      |

## API surface (high level)

- `POST /api/auth/login` — returns `{ user, accessToken }` and sets
  refresh cookie
- `POST /api/auth/refresh` — rotates refresh + returns new access token
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/landing` — full landing payload (settings, sections,
  services, testimonials, FAQs, pricing)
- `POST /api/contact` — public contact form (rate limited)
- `GET/POST/PATCH/DELETE /api/admin/...` — admin-only CRUD
- `GET/POST /api/member/...` — member-scoped routes (always filtered by
  `req.user.sub`)
- `POST /api/uploads/image` — image upload (5 MB max, jpeg/png/webp/gif)

See `PROJECT_PLAN.md` for the full contract and ERD.

## Security

- Passwords hashed with bcrypt cost 12.
- JWT access tokens are short-lived (15 min) and never persisted on the
  client. Refresh tokens are rotated and stored as httpOnly + sameSite
  cookies, hashed in the database, and revoked on logout/rotation.
- `helmet`, CORS allow-list, JSON body size limit, login + contact rate
  limiting.
- Every member endpoint scopes Prisma queries by the JWT `sub` to
  prevent IDOR; admin endpoints are guarded by `requireAdmin`.
- Multer caps uploads at 5 MB and only allows
  `image/{jpeg,png,webp,gif}`. Files are renamed to UUIDs and served
  from `/uploads`.

## Deployment

- **Frontend**: any static host. Build with `npm --workspace apps/web run build`,
  output in `apps/web/dist`.
- **Backend**: any Node host. Build with
  `npm --workspace apps/api run build` then
  `npm --workspace apps/api run start`. On first boot run
  `npm --workspace apps/api run prisma:deploy` and (optionally) the seed.
- **Database**: any Postgres provider (Supabase, Neon, Railway, RDS).

For Render-style providers:

```yaml
# render-api.yaml (illustrative)
services:
  - type: web
    name: fitness-api
    env: node
    plan: starter
    rootDir: platform/apps/api
    buildCommand: npm install && npx prisma generate && npm run build && npx prisma migrate deploy
    startCommand: node dist/server.js
```

Set `COOKIE_SECURE=true` and the correct `CORS_ORIGIN` in production.

## Default seed content

Running `npm run db:seed` creates:

- **Admin** — phone `01025754947`, password `admin123`, full name "Coach Admin"
- **Site settings** — brand "Coach Pro", neon-green accent
- **Six landing-page sections** — hero, about, how-it-works, features,
  contact, footer
- **Six services**, three testimonials, four FAQs, three pricing plans
  (Starter / Pro / Elite)
- **Twelve exercise-library entries** and **ten food-library entries**
  to demo the libraries

The seed is idempotent — you can re-run it any time.
