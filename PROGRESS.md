# Progress and outstanding features

Last updated: 7 November 2026. A feature is ticked only when it is implemented **and** tested.

## Milestone 1 — Foundation ✅

- [x] Next.js 16 + TypeScript app, modular structure (routes / components / pure domain / data access)
- [x] Database schema: 27 tables, constraints, triggers, Row Level Security on every table
- [x] Database rules: capacity, locked tables, declined guests not seated, RSVP change flags seat (never deletes), seated guest can't be deleted, cross-event mixing impossible, batch seating save with version check, dashboard statistics function
- [x] Configurable catalogue (per-currency prices) → generated `seed.sql`
- [x] Seating domain module: capacity summary, assignment checks, household moves, preference warnings, undo/redo
- [x] Template engine core: manifest schema, content validation, theme overrides, one shared renderer, 3 launch designs
- [x] Brand system (tokens, type, foil details), responsive site chrome, cookie consent (UK GDPR/PECR)
- [x] Public pages: home, categories, wedding gallery, template pages, pricing, how it works, planning features, AI studio, about, FAQ, contact, legal (drafts), 404, robots
- [x] Auth wiring: register, sign in, reset, email confirmation route, sign out, session refresh proxy, protected dashboard. Runs safely with Supabase not yet connected
- [x] Dashboard shell with live event statistics (via `event_stats`)
- **Tests:** 11 domain unit tests, 14 database integration tests, typecheck, lint, production build. All passing.

## Flagship template ✅ (7 Nov 2026)

- [x] Midnight Garden, end to end: sealed envelope addressed to the household → invitation rises out → wedding website
- [x] Wedding website: live countdown, our story, the day (timeline), venue + map link, parking, transport, dress code, where to stay, good to know, RSVP
- [x] Sections switch on/off per event; theme comes from the template, so other designs reuse the same site
- [x] Household RSVP: accept/decline per person, meal choice, children's menu, dietary needs, allergies, note; shared validation schema (`src/lib/rsvp/schema.ts`) ready for the server in M5
- [x] Studio pages and guest pages have separate layouts; guest pages show no cookie banner (essential cookies only)
- [x] Preview published as a single offline-capable page (scripts/inline-preview.py)

## Milestone 2 — Accounts ✅ (complete 7 Nov 2026)

- [x] Database set up in the Supabase project (London): 28 tables with RLS, 58 policies, 6 storage policies, private buckets, catalogue — verified in the SQL editor
- [x] Storage rules, server-only rate limiting, download my data, 14-day account deletion, retention purge, admin bootstrap, account settings page, admin overview
- [x] End-to-end test against the real Supabase project: register → confirmation email → confirm → dashboard; sign out; protected page redirects; wrong password refused; sign in; edit profile; download my data; customer blocked from /admin
- [x] Expired confirmation links handled; "Send a new confirmation email" on sign-in; clear unconfirmed-email message; marketing choice recorded at sign-up; header shows "My account" when signed in
- Note: Supabase's built-in email only sends to project team members (2/hour). Before beta: connect Resend as custom SMTP (free tier) so any couple can register.

## Previously planned for Milestone 2 (needs you: local Supabase via Docker, or a free Supabase project)

- [ ] Connect Supabase locally (`supabase start`) and verify a real sign-up end to end
- [ ] Storage buckets + storage RLS policies (private `event-media`, `exports`)
- [ ] Account settings: edit name, marketing choice, download my data, delete account (14-day grace)
- [ ] Admin role bootstrap + `/admin` shell gated by `requireRole`
- [ ] Rate limiting table + helper for login, RSVP and contact form

## Later milestones

- [ ] **M3 Invitation studio:** templates moved into DB, editor with autosave, uploads (signed URLs, byte-level type checks, EXIF strip), preview, publish, `/e/[slug]` event website with section toggles, 12 more templates
- [ ] **M4 Checkout:** Stripe Checkout (test mode), webhook fulfilment (idempotent), orders, promo codes, entitlements gating publish/RSVP/seating
- [ ] **M5 Guests and RSVP:** guest list UI, households, groups, CSV import/export, token links, RSVP form, confirmation emails, invite status tracking
- [ ] **M6 Smart Seating:** table setup, three-panel planner (dnd-kit), mobile tap-to-assign, locking, review flags, then the Venue Handover Pack (PDF, Excel, CSV, catering list), version history, venue share link
- [ ] **M7 AI studio:** reusable background loops via the Higgsfield connector, Level 3 concierge order flow, `ai_generations` queue with allowances and cost ceilings. Higgsfield API only after spend approval
- [ ] **M8 Admin and launch:** admin console, analytics (consent-gated), security review, mobile/performance testing, solicitor review of legal pages, ICO registration, beta

## Known limitations / decisions to revisit

- Pages read prices from `catalogue.ts` until checkout (M4) switches to database reads.
- Legal pages are drafts and say so on the page.
- `supabase/config.toml` is not committed yet; created by `npx supabase init` when you first run it locally.
- Brand name, support email and domain are placeholders in `src/lib/brand.ts`.

## Milestone 3 — Invitation Studio (in progress)

- ✅ **M3.1 Foundations** — occasion registry (8 occasions: fields, sections, reply questions, invitation types, settings such as surprise mode, hide age, child privacy), invitation types (save the date → light "hoping to come" reply; invitation and evening invitation → full RSVP; thank-you card → no countdown/RSVP), one shared section vocabulary, templates stored in the database with the occasions they suit (`templates_for_occasion`), one invitation of each type per event. Tests: 13 new unit tests, 3 new database tests. Occasion pages at `/invitations/[occasion]`.
- ⏳ M3.2 Cinematic engine · M3.3 Start flow · M3.4 Studio editor · M3.5 Photos & video · M3.6 Preview & publish · M3.7 Twelve templates
