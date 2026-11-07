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
