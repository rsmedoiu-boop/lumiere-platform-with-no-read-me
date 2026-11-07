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
