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
