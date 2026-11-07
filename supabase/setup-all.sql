-- Maison Lumière: full database setup (migrations + catalogue seed). Run once in the Supabase SQL Editor.

-- >>> supabase/migrations/20261107000100_init.sql
-- =============================================================================
-- Maison Lumière (placeholder brand) — core schema
-- One shared database for customers, events, invitations, guests, RSVPs and
-- seating. Every event-scoped row carries event_id, and composite foreign keys
-- guarantee children always belong to the same event as their parent. That
-- makes Row Level Security one simple rule: you can touch a row if you own its
-- event.
--
-- Designed for growth without rebuilds:
--   * categories + events.category_id  -> birthdays, christenings, corporate…
--   * currency on prices/orders, locale/timezone/country on events/profiles
--     -> international expansion
--   * ai_generations.provider/model    -> any AI video vendor, not only one
--   * RLS in the database (not only in the web app) -> a future mobile app can
--     talk to the same backend safely
-- =============================================================================

create extension if not exists pgcrypto;
create extension if not exists citext;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role         as enum ('customer', 'support', 'admin');
create type public.template_tier     as enum ('classic', 'premium', 'video', 'cinematic');
create type public.publish_status    as enum ('draft', 'live', 'archived');
create type public.media_kind        as enum ('image', 'video');
create type public.order_status      as enum ('pending', 'paid', 'refunded', 'cancelled', 'failed');
create type public.payment_status    as enum ('pending', 'succeeded', 'refunded', 'failed');
create type public.rsvp_status       as enum ('pending', 'accepted', 'declined');
create type public.invite_status     as enum ('not_sent', 'sent', 'opened', 'responded', 'revoked');
create type public.table_shape       as enum ('round', 'rectangle', 'oval', 'custom');
create type public.preference_kind   as enum ('together', 'apart');
create type public.ai_job_status     as enum ('queued', 'running', 'succeeded', 'failed', 'cancelled');
create type public.discount_kind     as enum ('percent', 'fixed');

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- 1. profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  full_name         text check (char_length(full_name) <= 120),
  role              public.user_role not null default 'customer',
  locale            text not null default 'en-GB',
  country_code      char(2) not null default 'GB',
  marketing_opt_in  boolean not null default false,
  marketing_opt_in_at timestamptz,
  deleted_requested_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- Role checks used by every policy. SECURITY DEFINER so they can read
-- profiles without recursing through profiles' own RLS.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'support'));
$$;

-- New sign-ups get a profile automatically.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Customers may edit their profile but never promote themselves.
create or replace function public.guard_profile_role() returns trigger
language plpgsql as $$
begin
  if new.role is distinct from old.role and not public.is_admin()
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Only administrators can change roles' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger profiles_role_guard before update on public.profiles
  for each row execute function public.guard_profile_role();

-- ---------------------------------------------------------------------------
-- 2. categories  3. templates
-- ---------------------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  name        text not null,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.templates (
  id            uuid primary key default gen_random_uuid(),
  category_id   uuid not null references public.categories (id),
  slug          text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  name          text not null,
  tier          public.template_tier not null,
  status        public.publish_status not null default 'draft',
  -- The template engine manifest (theme, scenes, layers, slots, sections).
  -- Validated by the app with Zod; schema_version allows safe evolution.
  manifest      jsonb not null default '{}'::jsonb,
  schema_version int not null default 1,
  preview_image_path text,
  preview_video_path text,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index templates_category_idx on public.templates (category_id, status);
create trigger templates_updated before update on public.templates
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. products  5. prices  6. promo_codes   (configurable, never hard-coded)
-- ---------------------------------------------------------------------------
create table public.products (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  name          text not null,
  description   text,
  -- Feature keys this product unlocks for an event, e.g. {'rsvp','seating'}.
  features      text[] not null default '{}',
  -- AI generations included (drafts + finals) for cost control.
  ai_generation_allowance int not null default 0 check (ai_generation_allowance >= 0),
  is_from_price boolean not null default false, -- "from £149.99"
  is_active     boolean not null default true,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger products_updated before update on public.products
  for each row execute function public.set_updated_at();

create table public.prices (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products (id) on delete cascade,
  currency      char(3) not null default 'GBP' check (currency ~ '^[A-Z]{3}$'),
  unit_amount   integer not null check (unit_amount >= 0), -- minor units (pence)
  stripe_price_id text unique,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);
-- Exactly one active price per product per currency.
create unique index prices_one_active on public.prices (product_id, currency) where is_active;

create table public.promo_codes (
  id            uuid primary key default gen_random_uuid(),
  code          citext not null unique check (char_length(code) between 3 and 40),
  kind          public.discount_kind not null,
  amount        integer not null check (amount > 0),
  currency      char(3),           -- required for fixed discounts
  max_redemptions int check (max_redemptions > 0),
  times_redeemed int not null default 0,
  valid_from    timestamptz,
  valid_until   timestamptz,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  check (kind = 'percent' and amount <= 100 or kind = 'fixed' and currency is not null)
);

-- ---------------------------------------------------------------------------
-- 7. events (the hub every customer record hangs off)
-- ---------------------------------------------------------------------------
create table public.events (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles (id) on delete cascade,
  category_id   uuid not null references public.categories (id),
  slug          text not null unique check (slug ~ '^[a-z0-9]([a-z0-9-]{1,78})[a-z0-9]$'),
  title         text not null check (char_length(title) <= 160),   -- "Sarah & James"
  host_names    text[] not null default '{}',                      -- ['Sarah','James']
  starts_at     timestamptz,
  timezone      text not null default 'Europe/London',
  locale        text not null default 'en-GB',
  country_code  char(2) not null default 'GB',
  venue_name    text,
  venue_address text,
  -- Category-specific details (ceremony, reception, dress code, accommodation…)
  details       jsonb not null default '{}'::jsonb,
  -- Which event-website sections are visible.
  sections      jsonb not null default '{}'::jsonb,
  is_published  boolean not null default false,
  website_password_hash text,
  noindex       boolean not null default true,
  -- Retention: data is deleted after this date unless extended.
  retain_until  date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index events_owner_idx on public.events (owner_id);
create trigger events_updated before update on public.events
  for each row execute function public.set_updated_at();

create or replace function public.owns_event(p_event_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.events where id = p_event_id and owner_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- 8. invitation_projects  9. media_assets
-- ---------------------------------------------------------------------------
create table public.invitation_projects (
  id                uuid primary key default gen_random_uuid(),
  event_id          uuid not null references public.events (id) on delete cascade,
  template_id       uuid not null references public.templates (id),
  draft_content     jsonb not null default '{}'::jsonb,
  published_content jsonb,
  draft_version     int not null default 1,     -- optimistic autosave lock
  published_version int not null default 0,
  published_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index invitation_projects_event_idx on public.invitation_projects (event_id);
create trigger invitation_projects_updated before update on public.invitation_projects
  for each row execute function public.set_updated_at();

create table public.media_assets (
  id                uuid primary key default gen_random_uuid(),
  event_id          uuid not null references public.events (id) on delete cascade,
  kind              public.media_kind not null,
  storage_bucket    text not null default 'event-media',
  storage_path      text not null unique,
  mime_type         text not null check (mime_type in (
                      'image/jpeg','image/png','image/webp','image/heic',
                      'video/mp4','video/quicktime','video/webm')),
  size_bytes        bigint not null check (size_bytes > 0),
  width             int, height int, duration_seconds numeric(6,2),
  contains_children boolean not null default false,
  ai_consent        boolean not null default false,
  created_at        timestamptz not null default now(),
  -- Size caps mirror the upload rules: 15 MB images, 200 MB / 90 s video.
  check (kind = 'image' and size_bytes <= 15 * 1024 * 1024
      or kind = 'video' and size_bytes <= 200 * 1024 * 1024
         and coalesce(duration_seconds, 0) <= 90),
  -- Photos with children are never eligible for AI processing.
  check (not (contains_children and ai_consent))
);
create index media_assets_event_idx on public.media_assets (event_id);

-- ---------------------------------------------------------------------------
-- 10. orders  11. order_items  12. payments  13. entitlements
-- Written only by trusted server code (Stripe webhook) — customers read.
-- ---------------------------------------------------------------------------
create table public.orders (
  id                uuid primary key default gen_random_uuid(),
  customer_id       uuid not null references public.profiles (id),
  event_id          uuid references public.events (id) on delete set null,
  status            public.order_status not null default 'pending',
  currency          char(3) not null default 'GBP',
  subtotal_amount   integer not null check (subtotal_amount >= 0),
  discount_amount   integer not null default 0 check (discount_amount >= 0),
  total_amount      integer not null check (total_amount >= 0),
  promo_code_id     uuid references public.promo_codes (id),
  stripe_checkout_session_id text unique,
  paid_at           timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (total_amount = subtotal_amount - discount_amount)
);
create index orders_customer_idx on public.orders (customer_id);
create trigger orders_updated before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders (id) on delete cascade,
  product_id    uuid not null references public.products (id),
  price_id      uuid not null references public.prices (id),
  quantity      int not null default 1 check (quantity > 0),
  unit_amount   integer not null check (unit_amount >= 0), -- price at time of sale
  created_at    timestamptz not null default now()
);

create table public.payments (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references public.orders (id) on delete cascade,
  provider          text not null default 'stripe',
  provider_payment_id text not null,
  provider_event_id text unique,                  -- webhook idempotency
  status            public.payment_status not null,
  amount            integer not null,
  currency          char(3) not null,
  raw               jsonb,
  created_at        timestamptz not null default now(),
  unique (provider, provider_payment_id)
);

create table public.entitlements (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events (id) on delete cascade,
  order_item_id uuid references public.order_items (id) on delete set null,
  feature       text not null,
  ai_generations_remaining int not null default 0 check (ai_generations_remaining >= 0),
  expires_at    timestamptz,
  created_at    timestamptz not null default now(),
  unique (event_id, feature, order_item_id)
);

create or replace function public.event_has_feature(p_event_id uuid, p_feature text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.entitlements
                 where event_id = p_event_id and feature = p_feature
                   and (expires_at is null or expires_at > now()));
$$;

-- ---------------------------------------------------------------------------
-- 14. guest_groups  15. households  16. guests
-- ---------------------------------------------------------------------------
create table public.guest_groups (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  colour      text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  unique (event_id, name),
  unique (id, event_id)
);

create table public.households (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 120), -- "The Patel family"
  email       citext,
  phone       text,
  postal_address text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, event_id)
);
create trigger households_updated before update on public.households
  for each row execute function public.set_updated_at();

create table public.guests (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events (id) on delete cascade,
  household_id  uuid not null,
  group_id      uuid,
  first_name    text not null check (char_length(first_name) between 1 and 80),
  last_name     text check (char_length(last_name) <= 80),
  email         citext,
  category      text,            -- free label: 'Bride''s family', 'Work' …
  is_child      boolean not null default false,
  is_vip        boolean not null default false,
  plus_one_of   uuid,            -- this guest is someone's plus-one
  -- Denormalised latest RSVP, maintained by trigger from rsvp_responses.
  rsvp_status   public.rsvp_status not null default 'pending',
  meal_choice   text,
  dietary_requirements text,
  allergies     text,
  child_meal    boolean not null default false,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (id, event_id),
  foreign key (household_id, event_id) references public.households (id, event_id) on delete cascade,
  foreign key (group_id, event_id) references public.guest_groups (id, event_id),
  foreign key (plus_one_of, event_id) references public.guests (id, event_id) on delete cascade,
  check (plus_one_of is null or plus_one_of <> id)
);
create index guests_event_idx on public.guests (event_id, rsvp_status);
create index guests_household_idx on public.guests (household_id);
create trigger guests_updated before update on public.guests
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 17. guest_invites  18. rsvp_responses
-- ---------------------------------------------------------------------------
create table public.guest_invites (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events (id) on delete cascade,
  household_id  uuid not null,
  token_hash    bytea not null unique,  -- sha256 of the secret; secret never stored
  status        public.invite_status not null default 'not_sent',
  sent_at       timestamptz, opened_at timestamptz, responded_at timestamptz,
  revoked_at    timestamptz,
  created_at    timestamptz not null default now(),
  foreign key (household_id, event_id) references public.households (id, event_id) on delete cascade
);
create index guest_invites_household_idx on public.guest_invites (household_id);

create table public.rsvp_responses (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events (id) on delete cascade,
  guest_id      uuid not null,
  invite_id     uuid references public.guest_invites (id) on delete set null,
  status        public.rsvp_status not null,
  meal_choice   text,
  dietary_requirements text,
  allergies     text,
  child_meal    boolean not null default false,
  message       text check (char_length(message) <= 2000),
  submitted_by  text not null default 'guest' check (submitted_by in ('guest', 'host', 'staff')),
  created_at    timestamptz not null default now(),
  foreign key (guest_id, event_id) references public.guests (id, event_id) on delete cascade
);
create index rsvp_responses_guest_idx on public.rsvp_responses (guest_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 19. seating_plans  20. venue_tables  21. table_seats
-- 22. guest_assignments  23. seating_preferences  24. seating_exports
-- ---------------------------------------------------------------------------
create table public.seating_plans (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  name        text not null default 'Main plan',
  is_active   boolean not null default true,
  -- Drafts (e.g. future AI suggestions) live as inactive plans and are never
  -- applied automatically.
  source      text not null default 'manual' check (source in ('manual', 'ai_suggestion')),
  version     int not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, event_id)
);
create unique index seating_plans_one_active on public.seating_plans (event_id) where is_active;
create trigger seating_plans_updated before update on public.seating_plans
  for each row execute function public.set_updated_at();

create table public.venue_tables (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null,
  plan_id     uuid not null,
  label       text not null check (char_length(label) between 1 and 40), -- "Table 1", "Top table"
  shape       public.table_shape not null default 'round',
  capacity    int not null check (capacity between 1 and 40),
  is_vip      boolean not null default false,
  is_reserved boolean not null default false,
  is_locked   boolean not null default false,
  pos_x       numeric(8,2) not null default 0,
  pos_y       numeric(8,2) not null default 0,
  rotation    numeric(5,2) not null default 0,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, event_id),
  unique (id, plan_id),
  unique (plan_id, label),
  foreign key (plan_id, event_id) references public.seating_plans (id, event_id) on delete cascade
);
create trigger venue_tables_updated before update on public.venue_tables
  for each row execute function public.set_updated_at();

create table public.table_seats (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null,
  table_id    uuid not null,
  seat_number int not null check (seat_number between 1 and 40),
  unique (table_id, seat_number),
  unique (id, table_id),
  foreign key (table_id, event_id) references public.venue_tables (id, event_id) on delete cascade
);

create table public.guest_assignments (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null,
  plan_id       uuid not null,
  guest_id      uuid not null,
  table_id      uuid not null,
  seat_id       uuid,
  needs_review  boolean not null default false,
  review_reason text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (plan_id, guest_id),          -- one seat per guest per plan
  unique (seat_id),                    -- one guest per seat
  foreign key (plan_id, event_id)  references public.seating_plans (id, event_id) on delete cascade,
  foreign key (table_id, plan_id)  references public.venue_tables (id, plan_id) on delete cascade,
  foreign key (seat_id, table_id)  references public.table_seats (id, table_id),
  -- Cascade only happens when the whole event is deleted; deleting a seated
  -- guest directly is refused by guard_seated_guest_delete() below.
  foreign key (guest_id, event_id) references public.guests (id, event_id) on delete cascade
);
create index guest_assignments_table_idx on public.guest_assignments (table_id);
create trigger guest_assignments_updated before update on public.guest_assignments
  for each row execute function public.set_updated_at();

create table public.seating_preferences (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null,
  plan_id     uuid not null,
  kind        public.preference_kind not null,
  guest_a_id  uuid, guest_b_id uuid,
  group_a_id  uuid, group_b_id uuid,
  note        text,
  created_at  timestamptz not null default now(),
  foreign key (plan_id, event_id) references public.seating_plans (id, event_id) on delete cascade,
  foreign key (guest_a_id, event_id) references public.guests (id, event_id) on delete cascade,
  foreign key (guest_b_id, event_id) references public.guests (id, event_id) on delete cascade,
  foreign key (group_a_id, event_id) references public.guest_groups (id, event_id) on delete cascade,
  foreign key (group_b_id, event_id) references public.guest_groups (id, event_id) on delete cascade,
  check (
    (guest_a_id is not null and guest_b_id is not null and guest_a_id <> guest_b_id
       and group_a_id is null and group_b_id is null)
    or
    (group_a_id is not null and group_b_id is not null and group_a_id <> group_b_id
       and guest_a_id is null and guest_b_id is null)
  )
);

create table public.seating_exports (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null,
  plan_id       uuid not null,
  version       int not null check (version > 0),
  snapshot      jsonb not null,
  snapshot_sha256 text not null,
  files         jsonb not null default '[]'::jsonb, -- [{kind,path,bytes}]
  created_by    uuid references public.profiles (id),
  created_at    timestamptz not null default now(),
  unique (plan_id, version),
  foreign key (plan_id, event_id) references public.seating_plans (id, event_id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- 25. ai_generations  26. email_logs  27. audit_log
-- ---------------------------------------------------------------------------
create table public.ai_generations (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events (id) on delete cascade,
  project_id    uuid references public.invitation_projects (id) on delete set null,
  provider      text not null,                 -- 'higgsfield', future vendors
  model         text not null,
  purpose       text not null default 'scene', -- scene | background | upscale …
  status        public.ai_job_status not null default 'queued',
  input         jsonb not null default '{}'::jsonb,
  output_media_id uuid references public.media_assets (id) on delete set null,
  provider_job_id text,
  cost_usd_micros bigint not null default 0 check (cost_usd_micros >= 0),
  attempts      int not null default 0,
  error         text,
  counts_against_allowance boolean not null default true,
  created_at    timestamptz not null default now(),
  started_at    timestamptz, finished_at timestamptz
);
create index ai_generations_status_idx on public.ai_generations (status, created_at);
create index ai_generations_event_idx on public.ai_generations (event_id);

create table public.email_logs (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid references public.events (id) on delete cascade,
  guest_id      uuid references public.guests (id) on delete set null,
  to_address    citext not null,
  template      text not null,           -- 'rsvp_confirmation', 'order_receipt' …
  provider      text not null default 'resend',
  provider_message_id text,
  status        text not null default 'queued',
  created_at    timestamptz not null default now()
);

create table public.audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid,
  action      text not null,
  entity      text not null,
  entity_id   uuid,
  detail      jsonb,
  created_at  timestamptz not null default now()
);

-- =============================================================================
-- Business rules enforced in the database
-- =============================================================================

-- RSVP -> guest summary + seating flags. Never deletes an assignment.
create or replace function public.apply_rsvp_response() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_old public.rsvp_status;
begin
  select rsvp_status into v_old from public.guests where id = new.guest_id for update;

  update public.guests
     set rsvp_status = new.status,
         meal_choice = coalesce(new.meal_choice, meal_choice),
         dietary_requirements = coalesce(new.dietary_requirements, dietary_requirements),
         allergies = coalesce(new.allergies, allergies),
         child_meal = new.child_meal
   where id = new.guest_id;

  if v_old is distinct from new.status then
    if new.status = 'accepted' then
      update public.guest_assignments
         set needs_review = false, review_reason = null
       where guest_id = new.guest_id and review_reason like 'RSVP changed%';
    else
      update public.guest_assignments
         set needs_review = true,
             review_reason = format('RSVP changed from %s to %s', v_old, new.status)
       where guest_id = new.guest_id;
    end if;
  end if;
  return new;
end $$;
create trigger rsvp_responses_apply after insert on public.rsvp_responses
  for each row execute function public.apply_rsvp_response();

-- Seating integrity: capacity, locks, declined guests.
create or replace function public.check_guest_assignment() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_table   public.venue_tables%rowtype;
  v_status  public.rsvp_status;
  v_count   int;
begin
  -- Deletes caused by a cascade (e.g. deleting the whole event or table) are
  -- allowed; only direct edits respect locks.
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;
  if tg_op in ('UPDATE', 'DELETE') then
    if exists (select 1 from public.venue_tables where id = old.table_id and is_locked)
       and (tg_op = 'DELETE' or old.table_id <> new.table_id or old.seat_id is distinct from new.seat_id) then
      raise exception 'Table is locked' using errcode = 'P0001', hint = 'locked';
    end if;
    if tg_op = 'DELETE' then return old; end if;
  end if;

  select * into v_table from public.venue_tables where id = new.table_id for update;
  if v_table.is_locked and (tg_op = 'INSERT' or old.table_id <> new.table_id
                            or old.seat_id is distinct from new.seat_id) then
    raise exception 'Table "%" is locked', v_table.label using errcode = 'P0001', hint = 'locked';
  end if;

  select rsvp_status into v_status from public.guests where id = new.guest_id;
  if v_status = 'declined' and (tg_op = 'INSERT' or old.table_id <> new.table_id) then
    raise exception 'Guest has declined and cannot be seated' using errcode = 'P0001', hint = 'declined';
  end if;

  -- Capacity counts everyone except declined guests (who no longer occupy a seat).
  select count(*) into v_count
    from public.guest_assignments a
    join public.guests g on g.id = a.guest_id
   where a.table_id = new.table_id
     and a.id <> new.id
     and g.rsvp_status <> 'declined';
  if v_count + 1 > v_table.capacity then
    raise exception 'Table "%" is full (% of % seats)', v_table.label, v_count, v_table.capacity
      using errcode = 'P0001', hint = 'capacity';
  end if;
  return new;
end $$;
create trigger guest_assignments_check
  before insert or update or delete on public.guest_assignments
  for each row execute function public.check_guest_assignment();

-- A table's capacity can't drop below the guests already sitting there.
create or replace function public.check_table_capacity() returns trigger
language plpgsql as $$
declare v_count int;
begin
  if new.capacity < old.capacity then
    select count(*) into v_count
      from public.guest_assignments a join public.guests g on g.id = a.guest_id
     where a.table_id = new.id and g.rsvp_status <> 'declined';
    if v_count > new.capacity then
      raise exception 'Table "%" has % guests seated; capacity cannot be %',
        new.label, v_count, new.capacity using errcode = 'P0001', hint = 'capacity';
    end if;
    if exists (select 1 from public.guest_assignments a join public.table_seats s on s.id = a.seat_id
                where s.table_id = new.id and s.seat_number > new.capacity) then
      raise exception 'Move guests off seats above % on "%" first', new.capacity, new.label
        using errcode = 'P0001', hint = 'capacity';
    end if;
    delete from public.table_seats where table_id = new.id and seat_number > new.capacity;
  end if;
  return new;
end $$;
create trigger venue_tables_capacity before update of capacity on public.venue_tables
  for each row execute function public.check_table_capacity();

-- Seats are numbered automatically from capacity.
create or replace function public.sync_table_seats() returns trigger
language plpgsql as $$
begin
  insert into public.table_seats (event_id, table_id, seat_number)
  select new.event_id, new.id, n from generate_series(1, new.capacity) n
  on conflict (table_id, seat_number) do nothing;
  return new;
end $$;
create trigger venue_tables_seats after insert or update of capacity on public.venue_tables
  for each row execute function public.sync_table_seats();

-- Batch save from the planner: one transaction, optimistic version check.
-- SECURITY INVOKER so the caller's RLS applies to every row it touches.
create or replace function public.apply_seating_changes(
  p_plan_id uuid, p_expected_version int, p_ops jsonb
) returns int
language plpgsql security invoker set search_path = public as $$
declare
  v_plan public.seating_plans%rowtype;
  v_op   jsonb;
begin
  select * into v_plan from public.seating_plans where id = p_plan_id for update;
  if not found then
    raise exception 'Seating plan not found' using errcode = 'P0002';
  end if;
  if v_plan.version <> p_expected_version then
    raise exception 'Plan was changed elsewhere (now version %)', v_plan.version
      using errcode = 'P0001', hint = 'version_conflict';
  end if;

  for v_op in select * from jsonb_array_elements(p_ops) loop
    case v_op ->> 'op'
      when 'assign' then
        insert into public.guest_assignments (event_id, plan_id, guest_id, table_id, seat_id)
        values (v_plan.event_id, p_plan_id, (v_op ->> 'guest_id')::uuid,
                (v_op ->> 'table_id')::uuid,
                case when nullif(v_op ->> 'seat_number', '') is null then null else
                  (select s.id from public.table_seats s
                    where s.table_id = (v_op ->> 'table_id')::uuid
                      and s.seat_number = (v_op ->> 'seat_number')::int) end)
        on conflict (plan_id, guest_id) do update
          set table_id = excluded.table_id, seat_id = excluded.seat_id;
      when 'unassign' then
        delete from public.guest_assignments
         where plan_id = p_plan_id and guest_id = (v_op ->> 'guest_id')::uuid;
      when 'lock' then
        update public.venue_tables set is_locked = (v_op ->> 'locked')::boolean
         where id = (v_op ->> 'table_id')::uuid and plan_id = p_plan_id;
      when 'resolve_review' then
        update public.guest_assignments set needs_review = false, review_reason = null
         where plan_id = p_plan_id and guest_id = (v_op ->> 'guest_id')::uuid;
      else
        raise exception 'Unknown seating operation: %', v_op ->> 'op' using errcode = '22023';
    end case;
  end loop;

  update public.seating_plans set version = version + 1 where id = p_plan_id
  returning version into v_plan.version;
  return v_plan.version;
end $$;

-- Dashboard statistics for one event (RLS applies: security invoker).
create or replace function public.event_stats(p_event_id uuid)
returns table (
  invited int, accepted int, declined int, pending int,
  total_capacity int, occupied int, available int,
  unassigned_accepted int, needs_review int, dietary_flags int
)
language sql stable security invoker set search_path = public as $$
  with g as (select * from public.guests where event_id = p_event_id),
       p as (select id from public.seating_plans where event_id = p_event_id and is_active),
       t as (select coalesce(sum(capacity), 0)::int cap from public.venue_tables where plan_id in (select id from p)),
       a as (select ga.*, gg.rsvp_status from public.guest_assignments ga
               join g gg on gg.id = ga.guest_id where ga.plan_id in (select id from p))
  select
    (select count(*) from g)::int,
    (select count(*) from g where rsvp_status = 'accepted')::int,
    (select count(*) from g where rsvp_status = 'declined')::int,
    (select count(*) from g where rsvp_status = 'pending')::int,
    (select cap from t),
    (select count(*) from a where rsvp_status = 'accepted')::int,
    greatest((select cap from t) - (select count(*) from a where rsvp_status <> 'declined'), 0)::int,
    (select count(*) from g where rsvp_status = 'accepted'
        and id not in (select guest_id from a))::int,
    (select count(*) from a where needs_review)::int,
    (select count(*) from g where rsvp_status = 'accepted'
        and (coalesce(allergies, '') <> '' or coalesce(dietary_requirements, '') <> ''))::int;
$$;

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.profiles            enable row level security;
alter table public.categories          enable row level security;
alter table public.templates           enable row level security;
alter table public.products            enable row level security;
alter table public.prices              enable row level security;
alter table public.promo_codes         enable row level security;
alter table public.events              enable row level security;
alter table public.invitation_projects enable row level security;
alter table public.media_assets        enable row level security;
alter table public.orders              enable row level security;
alter table public.order_items         enable row level security;
alter table public.payments            enable row level security;
alter table public.entitlements        enable row level security;
alter table public.guest_groups        enable row level security;
alter table public.households          enable row level security;
alter table public.guests              enable row level security;
alter table public.guest_invites       enable row level security;
alter table public.rsvp_responses      enable row level security;
alter table public.seating_plans       enable row level security;
alter table public.venue_tables        enable row level security;
alter table public.table_seats         enable row level security;
alter table public.guest_assignments   enable row level security;
alter table public.seating_preferences enable row level security;
alter table public.seating_exports     enable row level security;
alter table public.ai_generations      enable row level security;
alter table public.email_logs          enable row level security;
alter table public.audit_log           enable row level security;

-- Profiles: yourself only.
create policy profiles_self_select on public.profiles for select using (id = auth.uid());
create policy profiles_self_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Public catalogue: anyone may read live/active rows.
create policy categories_public on public.categories for select using (is_active);
create policy templates_public  on public.templates  for select using (status = 'live');
create policy products_public   on public.products   for select using (is_active);
create policy prices_public     on public.prices     for select using (is_active);
-- promo_codes: no public read (validated server-side only).

-- Events: owner has full control.
create policy events_owner on public.events for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Event-scoped tables the customer edits directly.
do $$
declare t text;
begin
  foreach t in array array[
    'invitation_projects', 'media_assets', 'guest_groups', 'households', 'guests',
    'guest_invites', 'rsvp_responses', 'seating_plans', 'venue_tables', 'table_seats',
    'guest_assignments', 'seating_preferences']
  loop
    execute format(
      'create policy %I on public.%I for all using (public.owns_event(event_id)) with check (public.owns_event(event_id))',
      t || '_owner', t);
  end loop;
end $$;

-- Event-scoped tables the customer may only read (server writes them).
create policy seating_exports_owner_read on public.seating_exports for select using (public.owns_event(event_id));
create policy entitlements_owner_read    on public.entitlements    for select using (public.owns_event(event_id));
create policy ai_generations_owner_read  on public.ai_generations  for select using (public.owns_event(event_id));
create policy orders_owner_read          on public.orders          for select using (customer_id = auth.uid());
create policy order_items_owner_read     on public.order_items     for select
  using (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()));
create policy payments_owner_read        on public.payments        for select
  using (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()));

-- Staff: read everything; admins write catalogue tables.
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','categories','templates','products','prices','promo_codes','events',
    'invitation_projects','media_assets','orders','order_items','payments','entitlements',
    'guest_groups','households','guests','guest_invites','rsvp_responses','seating_plans',
    'venue_tables','table_seats','guest_assignments','seating_preferences','seating_exports',
    'ai_generations','email_logs','audit_log']
  loop
    execute format('create policy %I on public.%I for select using (public.is_staff())', t || '_staff_read', t);
  end loop;
  foreach t in array array['categories','templates','products','prices','promo_codes']
  loop
    execute format('create policy %I on public.%I for all using (public.is_admin()) with check (public.is_admin())',
                   t || '_admin_write', t);
  end loop;
end $$;
create policy profiles_admin_update on public.profiles for update using (public.is_admin()) with check (public.is_admin());

-- A locked table can't be deleted directly (it can when its event is deleted).
create or replace function public.guard_locked_table_delete() returns trigger
language plpgsql as $$
begin
  if old.is_locked and pg_trigger_depth() = 1 then
    raise exception 'Table "%" is locked', old.label using errcode = 'P0001', hint = 'locked';
  end if;
  return old;
end $$;
create trigger venue_tables_locked_delete before delete on public.venue_tables
  for each row execute function public.guard_locked_table_delete();

-- Never silently drop a seated guest. Allowed only when the whole event is
-- being deleted (the event row is already gone inside that cascade).
create or replace function public.guard_seated_guest_delete() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.guest_assignments where guest_id = old.id)
     and exists (select 1 from public.events where id = old.event_id) then
    raise exception 'Guest is seated; remove them from their table first'
      using errcode = 'P0001', hint = 'seated';
  end if;
  return old;
end $$;
create trigger guests_seated_delete before delete on public.guests
  for each row execute function public.guard_seated_guest_delete();

-- >>> supabase/migrations/20261107000200_accounts_storage.sql
-- =============================================================================
-- Milestone 2: private storage, rate limiting, data-subject rights, retention
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Storage: private buckets. Object paths always start with the event id:
--   event-media/<event_id>/<uuid>.<ext>
--   exports/<event_id>/v<version>/<file>
-- so one rule decides access: you own the event in the first path segment.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('event-media', 'event-media', false, 200 * 1024 * 1024,
   array['image/jpeg','image/png','image/webp','image/heic','video/mp4','video/quicktime','video/webm']),
  ('exports', 'exports', false, 25 * 1024 * 1024,
   array['application/pdf','text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Returns null (never errors) for paths that don't start with a valid uuid.
create or replace function public.event_id_from_path(p_name text) returns uuid
language plpgsql immutable as $$
declare v text := split_part(p_name, '/', 1);
begin
  if v ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return v::uuid;
  end if;
  return null;
end $$;

create policy event_media_owner_read on storage.objects for select to authenticated
  using (bucket_id = 'event-media' and public.owns_event(public.event_id_from_path(name)));
create policy event_media_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'event-media' and public.owns_event(public.event_id_from_path(name)));
create policy event_media_owner_update on storage.objects for update to authenticated
  using (bucket_id = 'event-media' and public.owns_event(public.event_id_from_path(name)))
  with check (bucket_id = 'event-media' and public.owns_event(public.event_id_from_path(name)));
create policy event_media_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'event-media' and public.owns_event(public.event_id_from_path(name)));
-- Exports are written by the server only; owners may read them.
create policy exports_owner_read on storage.objects for select to authenticated
  using (bucket_id = 'exports' and public.owns_event(public.event_id_from_path(name)));
create policy storage_staff_read on storage.objects for select to authenticated
  using (bucket_id in ('event-media', 'exports') and public.is_staff());

-- ---------------------------------------------------------------------------
-- Rate limiting (fixed window) without an extra paid service.
-- Only trusted server code (service role) may call it, so nobody can burn
-- someone else's allowance to lock them out.
-- ---------------------------------------------------------------------------
create table public.rate_limits (
  bucket        text not null,
  window_start  timestamptz not null,
  hits          int not null default 0,
  primary key (bucket, window_start)
);
alter table public.rate_limits enable row level security; -- no policies: server only

create or replace function public.hit_rate_limit(p_bucket text, p_limit int, p_window_seconds int)
returns table (allowed boolean, remaining int, retry_after_seconds int)
language plpgsql security definer set search_path = public as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits int;
begin
  insert into public.rate_limits as r (bucket, window_start, hits)
  values (p_bucket, v_window, 1)
  on conflict (bucket, window_start) do update set hits = r.hits + 1
  returning r.hits into v_hits;

  -- Opportunistic clean-up of old windows (cheap, bounded).
  delete from public.rate_limits where window_start < now() - interval '1 day'
    and ctid in (select ctid from public.rate_limits where window_start < now() - interval '1 day' limit 100);

  return query select
    v_hits <= p_limit,
    greatest(p_limit - v_hits, 0),
    case when v_hits <= p_limit then 0
         else ceil(extract(epoch from (v_window + make_interval(secs => p_window_seconds) - now())))::int end;
end $$;
revoke all on function public.hit_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, int, int) to service_role;

-- ---------------------------------------------------------------------------
-- Orders survive account deletion (6-year tax retention) without keeping a
-- link to the person: snapshot the billing contact, then detach.
-- ---------------------------------------------------------------------------
alter table public.orders add column billing_name text, add column billing_email citext;
alter table public.orders alter column customer_id drop not null;
alter table public.orders drop constraint orders_customer_id_fkey;
alter table public.orders add constraint orders_customer_id_fkey
  foreign key (customer_id) references public.profiles (id) on delete set null;
alter table public.seating_exports drop constraint seating_exports_created_by_fkey;
alter table public.seating_exports add constraint seating_exports_created_by_fkey
  foreign key (created_by) references public.profiles (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Data-subject rights (UK GDPR): export, delete with a 14-day grace period.
-- ---------------------------------------------------------------------------

-- Everything we hold about the signed-in customer, as one JSON document.
-- SECURITY INVOKER: RLS guarantees it can only ever contain their own rows.
create or replace function public.export_my_data() returns jsonb
language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'exported_at', now(),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = auth.uid()),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'event', to_jsonb(e),
        'invitations', (select coalesce(jsonb_agg(to_jsonb(i)), '[]') from public.invitation_projects i where i.event_id = e.id),
        'media', (select coalesce(jsonb_agg(jsonb_build_object('path', m.storage_path, 'type', m.mime_type, 'bytes', m.size_bytes)), '[]')
                    from public.media_assets m where m.event_id = e.id),
        'guest_groups', (select coalesce(jsonb_agg(to_jsonb(g)), '[]') from public.guest_groups g where g.event_id = e.id),
        'households', (select coalesce(jsonb_agg(to_jsonb(h)), '[]') from public.households h where h.event_id = e.id),
        'guests', (select coalesce(jsonb_agg(to_jsonb(g)), '[]') from public.guests g where g.event_id = e.id),
        'rsvp_responses', (select coalesce(jsonb_agg(to_jsonb(r)), '[]') from public.rsvp_responses r where r.event_id = e.id),
        'tables', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.venue_tables t where t.event_id = e.id),
        'seat_assignments', (select coalesce(jsonb_agg(to_jsonb(a)), '[]') from public.guest_assignments a where a.event_id = e.id)
      )) from public.events e where e.owner_id = auth.uid()), '[]'),
    'orders', (select coalesce(jsonb_agg(to_jsonb(o)), '[]') from public.orders o where o.customer_id = auth.uid())
  );
$$;

create or replace function public.request_account_deletion() returns timestamptz
language plpgsql security invoker set search_path = public as $$
declare v timestamptz;
begin
  update public.profiles set deleted_requested_at = now()
   where id = auth.uid() and deleted_requested_at is null;
  select deleted_requested_at + interval '14 days' into v from public.profiles where id = auth.uid();
  return v;
end $$;

create or replace function public.cancel_account_deletion() returns void
language sql security invoker set search_path = public as $$
  update public.profiles set deleted_requested_at = null where id = auth.uid();
$$;

-- Run daily by the scheduler (service role). Deletes accounts whose grace
-- period has passed; events, guests and seating cascade; orders are kept,
-- detached, for tax records.
create or replace function public.purge_deleted_accounts() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.orders o set billing_name = coalesce(o.billing_name, p.full_name)
    from public.profiles p
   where o.customer_id = p.id and p.deleted_requested_at < now() - interval '14 days';
  with gone as (
    delete from auth.users u using public.profiles p
     where p.id = u.id and p.deleted_requested_at < now() - interval '14 days'
    returning u.id
  ) select count(*) into n from gone;
  insert into public.audit_log (action, entity, detail) values ('purge_accounts', 'profiles', jsonb_build_object('count', n));
  return n;
end $$;

-- Retention: events (and all guest data) end 12 months after the event date
-- unless the couple extends. Also run daily.
create or replace function public.purge_expired_events() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with gone as (
    delete from public.events
     where coalesce(retain_until, (starts_at at time zone 'UTC')::date + interval '12 months') < current_date
    returning id
  ) select count(*) into n from gone;
  insert into public.audit_log (action, entity, detail) values ('purge_events', 'events', jsonb_build_object('count', n));
  return n;
end $$;

revoke all on function public.purge_deleted_accounts() from public, anon, authenticated;
revoke all on function public.purge_expired_events() from public, anon, authenticated;
grant execute on function public.purge_deleted_accounts() to service_role;
grant execute on function public.purge_expired_events() to service_role;

-- ---------------------------------------------------------------------------
-- Staff roles: granted by an administrator, or bootstrapped once from the
-- SQL editor:  select public.set_user_role('you@example.com', 'admin');
-- ---------------------------------------------------------------------------
create or replace function public.set_user_role(p_email text, p_role public.user_role) returns void
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not public.is_admin()
     and session_user not in ('postgres', 'supabase_admin') then
    raise exception 'Only administrators can change roles' using errcode = '42501';
  end if;
  select id into v_id from auth.users where lower(email) = lower(p_email);
  if v_id is null then raise exception 'No account for %', p_email; end if;
  update public.profiles set role = p_role where id = v_id;
  insert into public.audit_log (actor_id, action, entity, entity_id, detail)
  values (auth.uid(), 'set_role', 'profiles', v_id, jsonb_build_object('role', p_role));
end $$;
revoke all on function public.set_user_role(text, public.user_role) from public, anon;

-- The role guard also accepts the one-time bootstrap from the SQL editor
-- (session_user is the database owner there, never an API user).
create or replace function public.guard_profile_role() returns trigger
language plpgsql as $$
begin
  if new.role is distinct from old.role and not public.is_admin()
     and coalesce(auth.role(), '') <> 'service_role'
     and session_user not in ('postgres', 'supabase_admin') then
    raise exception 'Only administrators can change roles' using errcode = '42501';
  end if;
  return new;
end $$;

-- >>> supabase/migrations/20261107000300_signup_marketing.sql
-- Record the marketing choice made at sign-up (PECR: explicit, timestamped opt-in).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_marketing boolean := coalesce((new.raw_user_meta_data ->> 'marketing_opt_in')::boolean, false);
begin
  insert into public.profiles (id, full_name, marketing_opt_in, marketing_opt_in_at)
  values (new.id,
          nullif(new.raw_user_meta_data ->> 'full_name', ''),
          v_marketing,
          case when v_marketing then now() end);
  return new;
end $$;

-- >>> supabase/migrations/20261107000400_occasions_kinds.sql
-- =============================================================================
-- 0004 — Occasions, invitation types and the template library in the database
--
-- * An event (one occasion = one category) can now hold several invitations:
--   a save-the-date, the main invitation, an evening invitation and a
--   thank-you card. They share the guest list and the RSVP store.
-- * A design can be offered for several occasions (templates.occasions).
-- =============================================================================

create type public.invitation_kind as enum ('save_the_date', 'invitation', 'evening_invitation', 'thank_you');

alter table public.invitation_projects
  add column kind  public.invitation_kind not null default 'invitation',
  add column title text check (char_length(title) <= 120),
  -- Sections switched on for this invitation (validated by the app against
  -- the occasion, invitation type and design).
  add column sections text[] not null default '{}';

-- One of each type per event keeps the dashboard and guest links unambiguous.
alter table public.invitation_projects
  add constraint invitation_projects_one_per_kind unique (event_id, kind);

-- Occasions a design is offered for (category slugs). Must include its home category.
alter table public.templates
  add column occasions text[] not null default '{}'
    check (array_position(occasions, null) is null);
create index templates_occasions_idx on public.templates using gin (occasions);

-- Keep a template's occasions honest: every slug must be a real category,
-- and its home category is always included.
create or replace function public.check_template_occasions() returns trigger
language plpgsql set search_path = public as $$
declare
  home text;
  unknown text;
begin
  select slug into home from categories where id = new.category_id;
  if not (home = any (new.occasions)) then
    new.occasions := array_prepend(home, new.occasions);
  end if;
  select o into unknown from unnest(new.occasions) o
   where not exists (select 1 from categories c where c.slug = o) limit 1;
  if unknown is not null then
    raise exception 'Unknown occasion "%" on template %', unknown, new.slug using errcode = '23503';
  end if;
  return new;
end $$;

create trigger templates_check_occasions before insert or update of occasions, category_id on public.templates
  for each row execute function public.check_template_occasions();

-- Live designs for an occasion, for the start flow and gallery (public).
create or replace function public.templates_for_occasion(p_occasion text)
returns setof public.templates
language sql stable set search_path = public as $$
  select t.* from templates t
   where t.status = 'live' and p_occasion = any (t.occasions)
     and exists (select 1 from categories c where c.slug = p_occasion and c.is_active)
   order by t.sort_order, t.name
$$;
grant execute on function public.templates_for_occasion(text) to anon, authenticated;

-- >>> supabase/migrations/20261107000500_start_flow.sql
-- =============================================================================
-- 0005 — Start flow: create an event and its first invitation in one step
--
-- Runs as the signed-in customer (security invoker), so every row is still
-- checked by RLS: a customer can only create events they own. The two inserts
-- happen together or not at all, and the web address is made unique here.
-- =============================================================================

create or replace function public.slugify(p text) returns text
language sql immutable set search_path = public as $$
  select coalesce(nullif(trim(both '-' from left(regexp_replace(lower(
    translate(p, 'àáâãäåçèéêëìíîïñòóôõöøùúûüýÿ', 'aaaaaaceeeeiiiinoooooouuuuyy')),
    '[^a-z0-9]+', '-', 'g'), 60)), ''), 'celebration')
$$;

create or replace function public.create_event_with_invitation(
  p_occasion   text,                    -- category slug
  p_template   text,                    -- template slug
  p_kind       public.invitation_kind,
  p_title      text,
  p_hosts      text[],
  p_starts_at  timestamptz,
  p_timezone   text,
  p_venue      text,
  p_details    jsonb,                   -- occasion settings etc.
  p_content    jsonb,                   -- invitation draft content
  p_sections   text[]                   -- sections switched on
) returns table (event_id uuid, project_id uuid, event_slug text)
language plpgsql security invoker set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_category uuid;
  v_template uuid;
  v_slug text;
  v_base text := slugify(p_title);
  v_event uuid;
  v_project uuid;
  v_tries int := 0;
begin
  if v_uid is null then
    raise exception 'Sign in to create an invitation' using errcode = '42501';
  end if;
  -- A generous ceiling that stops scripted abuse without bothering anyone real.
  if (select count(*) from events where owner_id = v_uid) >= 25 then
    raise exception 'You have reached the limit of 25 events. Contact us if you need more.' using errcode = '54000';
  end if;

  select id into v_category from categories where slug = p_occasion and is_active;
  if v_category is null then
    raise exception 'That occasion is not available' using errcode = '22023';
  end if;
  select id into v_template from templates
   where slug = p_template and status = 'live' and p_occasion = any (occasions);
  if v_template is null then
    raise exception 'That design is not available for this occasion' using errcode = '22023';
  end if;

  loop
    -- e.g. sarah-james-k3f9q: readable, and hard to guess.
    v_slug := left(v_base, 50) || '-' || substr(md5(gen_random_uuid()::text), 1, 5);
    begin
      insert into events (owner_id, category_id, slug, title, host_names, starts_at, timezone, venue_name, details, sections)
      values (v_uid, v_category, v_slug, left(p_title, 160), coalesce(p_hosts, '{}'), p_starts_at,
              coalesce(p_timezone, 'Europe/London'), nullif(trim(p_venue), ''), coalesce(p_details, '{}'),
              to_jsonb(coalesce(p_sections, '{}')))
      returning id into v_event;
      exit;
    exception when unique_violation then
      v_tries := v_tries + 1;
      if v_tries >= 5 then raise; end if;
    end;
  end loop;

  insert into invitation_projects (event_id, template_id, kind, draft_content, sections)
  values (v_event, v_template, p_kind, coalesce(p_content, '{}'), coalesce(p_sections, '{}'))
  returning id into v_project;

  return query select v_event, v_project, v_slug;
end $$;

revoke all on function public.create_event_with_invitation(text, text, public.invitation_kind, text, text[], timestamptz, text, text, jsonb, jsonb, text[]) from public, anon;
grant execute on function public.create_event_with_invitation(text, text, public.invitation_kind, text, text[], timestamptz, text, text, jsonb, jsonb, text[]) to authenticated;

-- >>> supabase/seed.sql
-- GENERATED by scripts/generate-seed.ts from src/config/catalogue.ts — do not edit by hand.
begin;
insert into public.categories (slug, name, sort_order, is_active) values ('weddings', 'Weddings', 1, true) on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.categories (slug, name, sort_order, is_active) values ('engagements', 'Engagements', 2, true) on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.categories (slug, name, sort_order, is_active) values ('birthdays', 'Birthdays', 3, true) on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.categories (slug, name, sort_order, is_active) values ('anniversaries', 'Anniversaries', 4, true) on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.categories (slug, name, sort_order, is_active) values ('christenings', 'Christenings & naming days', 5, true) on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.categories (slug, name, sort_order, is_active) values ('baby-showers', 'Baby showers', 6, true) on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.categories (slug, name, sort_order, is_active) values ('corporate', 'Corporate events', 7, true) on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.categories (slug, name, sort_order, is_active) values ('celebrations', 'Other celebrations', 8, true) on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.products (slug, name, description, features, ai_generation_allowance, is_from_price, sort_order) values ('classic-animated', 'Classic Animated Invitation', 'A ready-made animated design, personalised with your names, date and venue.', array['invitation_classic', 'countdown']::text[], 0, false, 1) on conflict (slug) do update set name = excluded.name, description = excluded.description, features = excluded.features, ai_generation_allowance = excluded.ai_generation_allowance, is_from_price = excluded.is_from_price, sort_order = excluded.sort_order;
update public.prices set is_active = false where product_id = (select id from public.products where slug = 'classic-animated') and currency = 'GBP' and is_active and unit_amount <> 1999;
insert into public.prices (product_id, currency, unit_amount) select id, 'GBP', 1999 from public.products where slug = 'classic-animated' and not exists (select 1 from public.prices pr where pr.product_id = products.id and pr.currency = 'GBP' and pr.is_active);
insert into public.products (slug, name, description, features, ai_generation_allowance, is_from_price, sort_order) values ('premium-editable', 'Premium Editable Invitation', 'Our premium collection with editable wording, colours and typography.', array['invitation_premium', 'countdown']::text[], 0, false, 2) on conflict (slug) do update set name = excluded.name, description = excluded.description, features = excluded.features, ai_generation_allowance = excluded.ai_generation_allowance, is_from_price = excluded.is_from_price, sort_order = excluded.sort_order;
update public.prices set is_active = false where product_id = (select id from public.products where slug = 'premium-editable') and currency = 'GBP' and is_active and unit_amount <> 3499;
insert into public.prices (product_id, currency, unit_amount) select id, 'GBP', 3499 from public.products where slug = 'premium-editable' and not exists (select 1 from public.prices pr where pr.product_id = products.id and pr.currency = 'GBP' and pr.is_active);
insert into public.products (slug, name, description, features, ai_generation_allowance, is_from_price, sort_order) values ('personalised-video', 'Personalised Video Invitation', 'Your own photographs and video clips woven into an animated invitation.', array['invitation_premium', 'personal_media', 'countdown']::text[], 0, false, 3) on conflict (slug) do update set name = excluded.name, description = excluded.description, features = excluded.features, ai_generation_allowance = excluded.ai_generation_allowance, is_from_price = excluded.is_from_price, sort_order = excluded.sort_order;
update public.prices set is_active = false where product_id = (select id from public.products where slug = 'personalised-video') and currency = 'GBP' and is_active and unit_amount <> 5999;
insert into public.prices (product_id, currency, unit_amount) select id, 'GBP', 5999 from public.products where slug = 'personalised-video' and not exists (select 1 from public.prices pr where pr.product_id = products.id and pr.currency = 'GBP' and pr.is_active);
insert into public.products (slug, name, description, features, ai_generation_allowance, is_from_price, sort_order) values ('ai-cinematic', 'AI Cinematic Invitation', 'A studio-crafted cinematic film built around your story, with storyboard approval.', array['invitation_premium', 'personal_media', 'ai_cinematic', 'countdown']::text[], 4, false, 4) on conflict (slug) do update set name = excluded.name, description = excluded.description, features = excluded.features, ai_generation_allowance = excluded.ai_generation_allowance, is_from_price = excluded.is_from_price, sort_order = excluded.sort_order;
update public.prices set is_active = false where product_id = (select id from public.products where slug = 'ai-cinematic') and currency = 'GBP' and is_active and unit_amount <> 8999;
insert into public.prices (product_id, currency, unit_amount) select id, 'GBP', 8999 from public.products where slug = 'ai-cinematic' and not exists (select 1 from public.prices pr where pr.product_id = products.id and pr.currency = 'GBP' and pr.is_active);
insert into public.products (slug, name, description, features, ai_generation_allowance, is_from_price, sort_order) values ('website-rsvp', 'Wedding Website & RSVP', 'A beautiful event website with personal RSVP links and guest management.', array['website', 'countdown', 'rsvp', 'guest_management']::text[], 0, false, 5) on conflict (slug) do update set name = excluded.name, description = excluded.description, features = excluded.features, ai_generation_allowance = excluded.ai_generation_allowance, is_from_price = excluded.is_from_price, sort_order = excluded.sort_order;
update public.prices set is_active = false where product_id = (select id from public.products where slug = 'website-rsvp') and currency = 'GBP' and is_active and unit_amount <> 4999;
insert into public.prices (product_id, currency, unit_amount) select id, 'GBP', 4999 from public.products where slug = 'website-rsvp' and not exists (select 1 from public.prices pr where pr.product_id = products.id and pr.currency = 'GBP' and pr.is_active);
insert into public.products (slug, name, description, features, ai_generation_allowance, is_from_price, sort_order) values ('complete-experience', 'Complete Wedding Experience', 'Premium invitation, your photos and video, website, RSVP, guest management, Smart Seating Planner and Venue Handover Pack.', array['invitation_premium', 'personal_media', 'website', 'countdown', 'rsvp', 'guest_management', 'seating', 'venue_handover']::text[], 0, false, 6) on conflict (slug) do update set name = excluded.name, description = excluded.description, features = excluded.features, ai_generation_allowance = excluded.ai_generation_allowance, is_from_price = excluded.is_from_price, sort_order = excluded.sort_order;
update public.prices set is_active = false where product_id = (select id from public.products where slug = 'complete-experience') and currency = 'GBP' and is_active and unit_amount <> 11999;
insert into public.prices (product_id, currency, unit_amount) select id, 'GBP', 11999 from public.products where slug = 'complete-experience' and not exists (select 1 from public.prices pr where pr.product_id = products.id and pr.currency = 'GBP' and pr.is_active);
insert into public.products (slug, name, description, features, ai_generation_allowance, is_from_price, sort_order) values ('bespoke-premium', 'Bespoke Premium Service', 'A one-of-a-kind design created with our studio, from concept to final film.', array['invitation_premium', 'personal_media', 'ai_cinematic', 'website', 'countdown', 'rsvp', 'guest_management', 'seating', 'venue_handover', 'bespoke_service']::text[], 8, true, 7) on conflict (slug) do update set name = excluded.name, description = excluded.description, features = excluded.features, ai_generation_allowance = excluded.ai_generation_allowance, is_from_price = excluded.is_from_price, sort_order = excluded.sort_order;
update public.prices set is_active = false where product_id = (select id from public.products where slug = 'bespoke-premium') and currency = 'GBP' and is_active and unit_amount <> 14999;
insert into public.prices (product_id, currency, unit_amount) select id, 'GBP', 14999 from public.products where slug = 'bespoke-premium' and not exists (select 1 from public.prices pr where pr.product_id = products.id and pr.currency = 'GBP' and pr.is_active);
insert into public.templates (category_id, slug, name, tier, status, manifest, schema_version, occasions, sort_order) select id, 'ivory-vow', 'Ivory Vow', 'classic', 'live', '{"schemaVersion":1,"theme":{"palette":{"background":"#fbfaf7","ink":"#25283a","accent":"#b39557","muted":"#7d7f8c"},"fonts":{"display":"cormorant","body":"jost"},"editable":{"palette":false,"fonts":false}},"slots":[{"key":"partnerOne","type":"text","label":"First name","maxLength":24,"required":true,"default":"Sarah"},{"key":"partnerTwo","type":"text","label":"Second name","maxLength":24,"required":true,"default":"James"},{"key":"date","type":"date","label":"Date","required":true,"default":"2027-06-12"},{"key":"time","type":"time","label":"Start time","required":false,"default":"14:00"},{"key":"venue","type":"text","label":"Venue","maxLength":60,"required":true,"default":"Ashcombe House, Oxfordshire"},{"key":"invitationLine","type":"longtext","label":"Invitation wording","maxLength":140,"required":false,"default":"request the pleasure of your company to celebrate their marriage"},{"key":"lead","type":"text","label":"Opening words","maxLength":40,"required":false,"default":"You are invited"},{"key":"photo","type":"image","label":"Photograph","required":false}],"scenes":[{"id":"card","background":{"kind":"color","value":"#fbfaf7","overlay":0,"veil":"even","parallax":false},"layers":[{"type":"ornament","name":"monogram","animation":"settle","delayMs":0},{"type":"names","layout":"stacked","animation":"ink-in","delayMs":200},{"type":"ornament","name":"foil-rule","animation":"foil-draw","delayMs":1800},{"type":"text","slot":"invitationLine","style":"body","animation":"settle","delayMs":2100},{"type":"text","slot":"date","style":"date","animation":"settle","delayMs":2300},{"type":"text","slot":"venue","style":"small","animation":"settle","delayMs":2400},{"type":"countdown","slot":"date"},{"type":"rsvp"}],"transition":"fade","align":"center"}],"sections":["countdown","schedule","venue","dress_code","extra","rsvp"],"motion":{"opening":"envelope","level":"gentle"}}'::jsonb, 1, array['weddings', 'engagements', 'birthdays', 'anniversaries', 'christenings', 'baby-showers', 'corporate', 'celebrations']::text[], 1 from public.categories where slug = 'weddings' on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, tier = excluded.tier, status = excluded.status, manifest = excluded.manifest, schema_version = excluded.schema_version, occasions = excluded.occasions, sort_order = excluded.sort_order;
insert into public.templates (category_id, slug, name, tier, status, manifest, schema_version, occasions, sort_order) select id, 'midnight-garden', 'Midnight Garden', 'premium', 'live', '{"schemaVersion":1,"theme":{"palette":{"background":"#1c2238","ink":"#f1eadb","accent":"#c9ad6e","muted":"#9aa0b6"},"fonts":{"display":"cormorant","body":"jost"},"editable":{"palette":true,"fonts":true}},"slots":[{"key":"partnerOne","type":"text","label":"First name","maxLength":24,"required":true,"default":"Sarah"},{"key":"partnerTwo","type":"text","label":"Second name","maxLength":24,"required":true,"default":"James"},{"key":"date","type":"date","label":"Date","required":true,"default":"2027-06-12"},{"key":"time","type":"time","label":"Start time","required":false,"default":"14:00"},{"key":"venue","type":"text","label":"Venue","maxLength":60,"required":true,"default":"Ashcombe House, Oxfordshire"},{"key":"invitationLine","type":"longtext","label":"Invitation wording","maxLength":140,"required":false,"default":"request the pleasure of your company to celebrate their marriage"},{"key":"lead","type":"text","label":"Opening words","maxLength":40,"required":false,"default":"You are invited"},{"key":"photo","type":"image","label":"Photograph","required":false}],"scenes":[{"id":"dusk","background":{"kind":"asset","value":"night-garden","overlay":0.4,"veil":"even","parallax":true},"layers":[{"type":"ornament","name":"stars","animation":"blur","delayMs":200,"depth":0.8},{"type":"text","slot":"lead","style":"heading","animation":"letters","delayMs":600,"depth":0.4}],"transition":"dissolve","align":"center","durationMs":3000},{"id":"names","background":{"kind":"asset","value":"night-garden","overlay":0.45,"veil":"even","parallax":true},"layers":[{"type":"names","layout":"stacked","animation":"letters","delayMs":300,"depth":0.5},{"type":"ornament","name":"foil-rule","animation":"foil-draw","delayMs":1900,"depth":0.2}],"transition":"dissolve","align":"center","durationMs":3600},{"id":"card","background":{"kind":"asset","value":"night-garden","overlay":0.78,"veil":"even","parallax":true},"layers":[{"type":"ornament","name":"laurel","animation":"settle","delayMs":0,"depth":0.3},{"type":"text","slot":"invitationLine","style":"small","animation":"settle","delayMs":300},{"type":"names","layout":"stacked","animation":"wipe","delayMs":500,"depth":0.15},{"type":"ornament","name":"foil-rule","animation":"foil-draw","delayMs":1500},{"type":"text","slot":"date","style":"date","animation":"rise","delayMs":1800},{"type":"text","slot":"venue","style":"small","animation":"rise","delayMs":2000},{"type":"countdown","slot":"date"},{"type":"rsvp"}],"transition":"iris","align":"center"}],"sections":["countdown","story","schedule","venue","dress_code","accommodation","gallery","gifts","extra","rsvp"],"motion":{"opening":"envelope","level":"cinematic"}}'::jsonb, 1, array['weddings', 'engagements', 'anniversaries', 'birthdays', 'celebrations']::text[], 2 from public.categories where slug = 'weddings' on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, tier = excluded.tier, status = excluded.status, manifest = excluded.manifest, schema_version = excluded.schema_version, occasions = excluded.occasions, sort_order = excluded.sort_order;
insert into public.templates (category_id, slug, name, tier, status, manifest, schema_version, occasions, sort_order) select id, 'riviera', 'Riviera', 'video', 'live', '{"schemaVersion":1,"theme":{"palette":{"background":"#f4e6e1","ink":"#3a2f36","accent":"#a5765f","muted":"#8a7b80"},"fonts":{"display":"cormorant","body":"jost"},"editable":{"palette":true,"fonts":false}},"slots":[{"key":"partnerOne","type":"text","label":"First name","maxLength":24,"required":true,"default":"Sarah"},{"key":"partnerTwo","type":"text","label":"Second name","maxLength":24,"required":true,"default":"James"},{"key":"date","type":"date","label":"Date","required":true,"default":"2027-06-12"},{"key":"time","type":"time","label":"Start time","required":false,"default":"14:00"},{"key":"venue","type":"text","label":"Venue","maxLength":60,"required":true,"default":"Ashcombe House, Oxfordshire"},{"key":"invitationLine","type":"longtext","label":"Invitation wording","maxLength":140,"required":false,"default":"request the pleasure of your company to celebrate their marriage"},{"key":"lead","type":"text","label":"Opening words","maxLength":40,"required":false,"default":"You are invited"},{"key":"photo","type":"image","label":"Photograph","required":false}],"scenes":[{"id":"card","background":{"kind":"color","value":"#f4e6e1","overlay":0,"veil":"even","parallax":false},"layers":[{"type":"image","slot":"photo","shape":"arch","animation":"blur","delayMs":0,"depth":0.35},{"type":"names","layout":"stacked","animation":"ink-in","delayMs":400},{"type":"text","slot":"date","style":"date","animation":"settle","delayMs":2000},{"type":"text","slot":"venue","style":"small","animation":"settle","delayMs":2100},{"type":"countdown","slot":"date"},{"type":"rsvp"}],"transition":"rise","align":"center"}],"sections":["countdown","story","schedule","venue","accommodation","gallery","video","extra","rsvp"],"motion":{"opening":"curtain","level":"cinematic"}}'::jsonb, 1, array['weddings', 'engagements', 'anniversaries']::text[], 3 from public.categories where slug = 'weddings' on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, tier = excluded.tier, status = excluded.status, manifest = excluded.manifest, schema_version = excluded.schema_version, occasions = excluded.occasions, sort_order = excluded.sort_order;
insert into public.templates (category_id, slug, name, tier, status, manifest, schema_version, occasions, sort_order) select id, 'tuscan-vineyard', 'Tuscan Vineyard', 'premium', 'live', '{"schemaVersion":1,"theme":{"palette":{"background":"#f6e9d3","ink":"#4a2a2e","accent":"#8a5a2b","muted":"#6f5b4b"},"fonts":{"display":"cormorant","body":"jost","script":"pinyon"},"editable":{"palette":true,"fonts":false}},"slots":[{"key":"partnerOne","type":"text","label":"First name","maxLength":24,"required":true,"default":"Sarah"},{"key":"partnerTwo","type":"text","label":"Second name","maxLength":24,"required":true,"default":"James"},{"key":"date","type":"date","label":"Date","required":true,"default":"2027-06-12"},{"key":"time","type":"time","label":"Start time","required":false,"default":"14:00"},{"key":"venue","type":"text","label":"Venue","maxLength":60,"required":true,"default":"Ashcombe House, Oxfordshire"},{"key":"invitationLine","type":"longtext","label":"Invitation wording","maxLength":140,"required":false,"default":"request the pleasure of your company to celebrate their marriage"},{"key":"lead","type":"text","label":"Opening words","maxLength":40,"required":false,"default":"You are invited"},{"key":"photo","type":"image","label":"Photograph","required":false}],"scenes":[{"id":"golden-hour","background":{"kind":"asset","value":"tuscan-golden-hour","overlay":0.6,"veil":"top","parallax":true},"layers":[{"type":"ornament","name":"sprig","animation":"blur","delayMs":300,"depth":0.5},{"type":"text","slot":"lead","style":"heading","animation":"letters","delayMs":700,"depth":0.3}],"transition":"dissolve","align":"start","durationMs":3400},{"id":"card","background":{"kind":"asset","value":"tuscan-golden-hour","overlay":0.95,"veil":"top","parallax":true},"layers":[{"type":"names","layout":"caps","animation":"wipe","delayMs":200},{"type":"text","slot":"invitationLine","style":"small","animation":"settle","delayMs":1500},{"type":"ornament","name":"foil-rule","animation":"foil-draw","delayMs":1800},{"type":"text","slot":"date","style":"date","animation":"rise","delayMs":2100},{"type":"text","slot":"venue","style":"small","animation":"rise","delayMs":2300},{"type":"countdown","slot":"date"},{"type":"rsvp"}],"transition":"rise","align":"start"}],"sections":["countdown","story","schedule","venue","dress_code","accommodation","gallery","gifts","extra","rsvp"],"motion":{"opening":"gilded","level":"cinematic","art":{"closed":"velvet-envelope","revealed":"velvet-envelope-gilded"}},"site":{"paper":"parchment-olive","headings":"script"}}'::jsonb, 1, array['weddings', 'engagements', 'anniversaries']::text[], 4 from public.categories where slug = 'weddings' on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, tier = excluded.tier, status = excluded.status, manifest = excluded.manifest, schema_version = excluded.schema_version, occasions = excluded.occasions, sort_order = excluded.sort_order;
commit;
