# Maison Lumière (placeholder brand)

Premium digital wedding invitations with RSVP, guest management, a Smart Seating Planner and a Venue Handover Pack.
UK-first, built to expand to other countries, other occasions, AI video and a mobile app without a rebuild.

**Status:** Milestone 1 (foundation) complete. See [`PROGRESS.md`](PROGRESS.md).

## Stack

| Layer | Choice | Cost during development |
| --- | --- | --- |
| Web app | Next.js 16 (App Router, Cache Components), React 19, TypeScript, Tailwind CSS 4 | Free |
| Database, auth, storage | Supabase (Postgres + Row Level Security), run locally with the Supabase CLI | Free |
| Payments | Stripe Checkout in test mode (Milestone 4) | Free |
| Email | Resend free tier (Milestone 5) | Free |
| Tests | Vitest + a real local Postgres | Free |

Nothing paid is switched on. Paid tiers are only needed at public launch; see the plan doc.

## Project structure

```
src/
  app/                    Routes only: thin pages that compose components
    (auth)/               login, register, reset-password + server actions
    dashboard/            customer area (session read inside Suspense)
    invitations/ templates/ pricing/ …   public site (statically rendered)
  components/
    invitation/           InvitationRenderer: the ONE renderer for every template
    site/                 header, footer, cookie consent, illustrations
    ui/                   small shared UI pieces
  config/catalogue.ts     products, prices (minor units per currency), categories
  content/legal.ts        draft legal text (for solicitor review)
  lib/
    domain/               pure business rules: no React/Next/DB. Reusable by a mobile app
      seating.ts          capacity, assignment checks, preferences, undo/redo
    templates/            template manifest schema (Zod), content validation, library
    supabase/             server/browser clients; app runs without them configured
    auth/session.ts       data access layer: who is signed in, role checks
    brand.ts              the business name lives only here
  proxy.ts                session refresh + optimistic redirect for private areas
supabase/
  migrations/             the whole schema: 27 tables, constraints, triggers, RLS
  seed.sql                GENERATED from src/config/catalogue.ts (npm run db:seed)
  tests/                  shims that let the migrations run on plain Postgres
tests/db/                 database integration tests (RLS, capacity, RSVP sync…)
scripts/generate-seed.mts
```

### Why it's built this way

- **One shared database.** Customers, events, invitations, guests, RSVPs and seating all live in one Postgres schema. Every event-scoped row carries `event_id`, and composite foreign keys make it impossible to mix records from different events.
- **Rules in the database, not just the UI.** Capacity, locked tables, declined guests and "never silently delete a seated guest" are enforced by triggers. So the web app, a future mobile app and admin tools all get the same guarantees.
- **Row Level Security everywhere.** A customer can only ever read or write rows for events they own. Anonymous visitors see only the public catalogue.
- **Templates are data.** A design is a JSON manifest rendered by one component. Adding a design or a new occasion is a database row, not new code.
- **Ready for growth.** Prices are stored per currency and events carry locale, time zone and country for international expansion. Categories are a table for new occasions. `ai_generations` records the provider and model for any AI vendor. The domain logic is plain TypeScript a React Native app can import.

## Run it locally

Requirements: Node 20+ (22 recommended). For accounts you also need Docker, for the free local Supabase.

```bash
npm install
npm run dev            # http://localhost:3000. The public site works with no setup.
```

### Turn on accounts (free, local)

```bash
npx supabase init      # creates supabase/config.toml; keep the existing migrations
npx supabase start     # starts Postgres, Auth and Storage in Docker; applies migrations + seed.sql
cp .env.example .env.local
# paste the "API URL" and "Publishable key" values printed by `supabase start`
npm run dev
```

Confirmation emails go to the local inbox that `supabase start` prints (Mailpit), not to real addresses.

## Checks

```bash
npm run typecheck
npm run lint
npm test               # business-rule unit tests
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/lumiere_test npm run test:db
                       # rebuilds the schema in that throwaway database and tests RLS + rules
npm run build
```

`test:db` drops and recreates the `public` and `auth` schemas in the database you point it at. Only use a throwaway database.

## Changing prices or products

Edit `src/config/catalogue.ts`, then run `npm run db:seed` and apply `supabase/seed.sql`. Pages read from the catalogue today. From Milestone 4 checkout reads prices from the database on the server, so admins can change them without a deploy.

## Renaming the brand

Edit `src/lib/brand.ts`. Colours and fonts are design tokens in `src/app/globals.css` (`@theme`).
