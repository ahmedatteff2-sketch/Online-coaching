-- =============================================================================
-- Security hardening (Phase 10)
-- =============================================================================
-- Closes a set of privilege-escalation and paywall-bypass holes that the
-- earlier RLS policies left open. Specifically:
--
--   1. `profiles.role` was writable by the row owner — any client could
--      promote themselves to admin with a single Supabase update.
--   2. `clients.subscription_*` columns were writable by the row owner
--      — any client could mark their own account "active" and bypass
--      the paywall.
--   3. The `handle_new_user` trigger read `role` from
--      `raw_user_meta_data`, so any anonymous signup could pass
--      `data: { role: 'admin' }` and get an admin profile created.
--   4. `coaching_applications` had no upper bounds on free-text fields,
--      letting spammers stuff multi-megabyte rows through the public
--      intake form.
--   5. Add `admin_audit_log` to record every privileged action so we
--      can investigate incidents and meet retention requirements.
--
-- All changes are idempotent.
-- -----------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. handle_new_user — hardcode role='client'; ignore any role value the
--    client passed in raw_user_meta_data.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Note: role is intentionally NOT read from raw_user_meta_data — the
  -- client controls that payload via supabase.auth.signUp(), so trusting
  -- it would let any anonymous signup self-elevate to admin. Admin
  -- promotion must go through the bootstrap script (service role) or a
  -- guarded admin server action.
  insert into public.profiles (id, email, role, full_name)
  values (
    new.id,
    new.email,
    'client',
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. profiles — lock down which columns the row owner can change.
--    Owner can update: full_name, preferred_locale.
--    Admin can update: everything.
--    role and email are protected by a BEFORE UPDATE trigger so that
--    even a generous policy can't accidentally re-open them.
-- ---------------------------------------------------------------------------
create or replace function public.profiles_protect_admin_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_is_admin boolean := public.is_admin();
begin
  if caller_is_admin then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'profiles.role can only be changed by an administrator';
  end if;
  if new.email is distinct from old.email then
    raise exception 'profiles.email can only be changed by an administrator';
  end if;
  if new.id is distinct from old.id then
    raise exception 'profiles.id is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_protect_admin_columns on public.profiles;
create trigger trg_profiles_protect_admin_columns
  before update on public.profiles
  for each row execute function public.profiles_protect_admin_columns();

-- ---------------------------------------------------------------------------
-- 3. clients — protect the subscription lifecycle columns from
--    self-update. Only admins or SECURITY DEFINER helpers
--    (`recompute_client_subscription`) may touch them.
-- ---------------------------------------------------------------------------
create or replace function public.clients_protect_subscription_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_is_admin boolean := public.is_admin();
begin
  if caller_is_admin then
    return new;
  end if;

  if new.user_id is distinct from old.user_id then
    raise exception 'clients.user_id is immutable';
  end if;
  if new.subscription_status is distinct from old.subscription_status then
    raise exception 'clients.subscription_status is admin-only';
  end if;
  if new.subscription_starts_at is distinct from old.subscription_starts_at then
    raise exception 'clients.subscription_starts_at is admin-only';
  end if;
  if new.subscription_ends_at is distinct from old.subscription_ends_at then
    raise exception 'clients.subscription_ends_at is admin-only';
  end if;
  if new.last_payment_at is distinct from old.last_payment_at then
    raise exception 'clients.last_payment_at is admin-only';
  end if;
  if new.last_payment_id is distinct from old.last_payment_id then
    raise exception 'clients.last_payment_id is admin-only';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_clients_protect_subscription_columns on public.clients;
create trigger trg_clients_protect_subscription_columns
  before update on public.clients
  for each row execute function public.clients_protect_subscription_columns();

-- ---------------------------------------------------------------------------
-- 4. coaching_applications — bound free-text fields so a spammer can't
--    stuff multi-megabyte rows. Run with `not valid` and then validate
--    to avoid blocking the migration on legacy rows that exceed the
--    limit; truncate them first if you have such data.
-- ---------------------------------------------------------------------------
do $$ begin
  alter table public.coaching_applications
    add constraint coaching_applications_motivation_text_len
      check (motivation_text is null or char_length(motivation_text) <= 2000) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.coaching_applications
    add constraint coaching_applications_notes_len
      check (notes is null or char_length(notes) <= 2000) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.coaching_applications
    add constraint coaching_applications_medications_len
      check (medications is null or char_length(medications) <= 1000) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.coaching_applications
    add constraint coaching_applications_injuries_len
      check (injuries_or_conditions is null or char_length(injuries_or_conditions) <= 2000) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.coaching_applications
    add constraint coaching_applications_allergies_len
      check (allergies is null or char_length(allergies) <= 1000) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.coaching_applications
    add constraint coaching_applications_surgeries_len
      check (surgeries_text is null or char_length(surgeries_text) <= 2000) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.coaching_applications
    add constraint coaching_applications_dietary_len
      check (dietary_restrictions is null or char_length(dietary_restrictions) <= 1000) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.coaching_applications
    add constraint coaching_applications_foods_disliked_len
      check (foods_disliked is null or char_length(foods_disliked) <= 1000) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.coaching_applications
    add constraint coaching_applications_diet_summary_len
      check (current_diet_summary is null or char_length(current_diet_summary) <= 2000) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.coaching_applications
    add constraint coaching_applications_previous_results_len
      check (previous_results_text is null or char_length(previous_results_text) <= 2000) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.coaching_applications
    add constraint coaching_applications_equipment_len
      check (available_equipment_text is null or char_length(available_equipment_text) <= 2000) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.coaching_applications
    add constraint coaching_applications_full_name_len
      check (char_length(full_name) between 1 and 200) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.coaching_applications
    add constraint coaching_applications_email_len
      check (char_length(email) between 3 and 320) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.coaching_applications
    add constraint coaching_applications_phone_len
      check (char_length(phone) between 5 and 32) not valid;
exception when duplicate_object then null; end $$;

-- Validate constraints against existing rows. If you have legacy data
-- that violates these bounds, truncate it first or skip these statements.
do $$
declare
  c text;
begin
  for c in select unnest(array[
    'coaching_applications_motivation_text_len',
    'coaching_applications_notes_len',
    'coaching_applications_medications_len',
    'coaching_applications_injuries_len',
    'coaching_applications_allergies_len',
    'coaching_applications_surgeries_len',
    'coaching_applications_dietary_len',
    'coaching_applications_foods_disliked_len',
    'coaching_applications_diet_summary_len',
    'coaching_applications_previous_results_len',
    'coaching_applications_equipment_len',
    'coaching_applications_full_name_len',
    'coaching_applications_email_len',
    'coaching_applications_phone_len'
  ])
  loop
    begin
      execute format('alter table public.coaching_applications validate constraint %I', c);
    exception when others then
      raise notice 'Skipped validating %: %', c, sqlerrm;
    end;
  end loop;
end$$;

-- ---------------------------------------------------------------------------
-- 5. admin_audit_log — append-only record of privileged actions.
-- ---------------------------------------------------------------------------
create table if not exists public.admin_audit_log (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid not null references public.profiles(id) on delete set null,
  action       text not null,
  target_table text,
  target_id    uuid,
  metadata     jsonb not null default '{}'::jsonb,
  ip_address   inet,
  user_agent   text,
  created_at   timestamptz not null default now()
);

create index if not exists idx_admin_audit_log_actor_created
  on public.admin_audit_log (actor_id, created_at desc);
create index if not exists idx_admin_audit_log_action_created
  on public.admin_audit_log (action, created_at desc);
create index if not exists idx_admin_audit_log_target
  on public.admin_audit_log (target_table, target_id);

alter table public.admin_audit_log enable row level security;

-- Only admins may read. No DELETE or UPDATE policy → table is
-- effectively append-only under RLS.
drop policy if exists admin_audit_log_admin_read on public.admin_audit_log;
create policy admin_audit_log_admin_read
  on public.admin_audit_log for select
  using (public.is_admin());

-- Inserts go through a SECURITY DEFINER helper, so we don't need an
-- INSERT policy for direct anon/authenticated writes. Still, allow
-- admins to insert via the policy for ad-hoc backfills.
drop policy if exists admin_audit_log_admin_insert on public.admin_audit_log;
create policy admin_audit_log_admin_insert
  on public.admin_audit_log for insert
  with check (public.is_admin());

-- Helper used by server actions. SECURITY DEFINER so callers don't
-- need to worry about RLS for the insert path.
create or replace function public.record_admin_action(
  p_action       text,
  p_target_table text default null,
  p_target_id    uuid default null,
  p_metadata     jsonb default '{}'::jsonb,
  p_ip_address   inet default null,
  p_user_agent   text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  new_id uuid;
begin
  if caller is null then
    raise exception 'record_admin_action requires an authenticated caller';
  end if;
  if not public.is_admin() then
    raise exception 'record_admin_action requires admin privileges';
  end if;
  insert into public.admin_audit_log (
    actor_id, action, target_table, target_id, metadata, ip_address, user_agent
  ) values (
    caller, p_action, p_target_table, p_target_id,
    coalesce(p_metadata, '{}'::jsonb), p_ip_address, p_user_agent
  )
  returning id into new_id;
  return new_id;
end;
$$;
