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
