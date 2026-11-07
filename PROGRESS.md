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
- ✅ **M3.2 Cinematic engine** — one renderer plays multi-scene films (preludes crossfading into the finished card) with CSS-only sequencing; reveals (letter-by-letter, blur, wipe, ink, foil, rise); scene transitions (dissolve, iris, rise, fade); parallax depth (pointer on desktop, slow drift on touch); shared Higgsfield asset library referenced by id; a "names" layer that adapts to couples, one person or an organisation; three motion levels (Cinematic / Gentle / Still) with reduced-motion respected; openings engine (sealed envelope, silk curtain, film title card, none) themed from each design's palette, personalised with the guest's name, with "Watch again". Midnight Garden is now a three-scene film. Previews for every design × opening at `/preview/[design]/[opening]`. Tests: 38 unit, 23 database, 12 opening journeys on mobile.
- ✅ **M3.3 Start flow** — `/start`: occasion → invitation type → design (filtered, with sample details for the occasion) → essentials with a live preview, occasion options (e.g. keep the age private) and account (sign up or sign in in place). One database call (`create_event_with_invitation`, migration 0005) creates the event and its first invitation together, with a unique address and a 25-event ceiling. New customers' drafts survive email confirmation (`/start/finish`). Studio landing page shows the saved invitation; the dashboard links to it. Tests: 9 unit, 2 database, 12 end-to-end checks on a phone screen against the live Supabase project.
- ✅ **Tuscan Vineyard template** (built from the user's reference recording, original artwork) — a gilded velvet-envelope opening (new `gilded` opening), a living watercolour film with letter-by-letter reveal, parchment website background (`site.paper`), script headings (`site.headings`), and caps-style names. These are generic engine capabilities reusable by other templates. Listed under weddings; seed and live Supabase updated. Tests: 49 unit, 25 database, 17 opening journeys on a phone screen. The envelope now dissolves into the invitation (no hard cut), and the film scene plays an animated clip of the couple walking down the vine rows (play-once asset support added to the engine). Not yet replicated: styled menu, venue illustration and dress-code visual blocks.
- ✅ **M3.4 Studio editor (first version)** — `/studio/[id]`: edit names, date, time, venue and wording; choose how it opens and how much it moves; change colours where the design allows. Live preview, autosave (about 1 s after you stop typing) with a version lock so a second tab or device can never silently overwrite, a half-finished draft saves fine (required details are enforced at publish), and the event title, hosts, date and venue stay in step. `/studio/[id]/preview` plays it exactly as a guest would. Tests: 4 unit, 17 end-to-end on a phone screen against the live Supabase project.
- ⏳ M3.5 Photos & video · M3.6 Preview & publish · M3.7 Twelve templates
