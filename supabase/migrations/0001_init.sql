-- ============================================================================
-- UaB Invoice — initial schema with multi-tenant Row-Level Security (RLS)
-- ----------------------------------------------------------------------------
-- Run this in the Supabase SQL editor (or via `supabase db push`).
--
-- Security model:
--   * Every table carries a `user_id` that defaults to the authenticated user.
--   * RLS is ENABLED and FORCED on every table, deny-by-default.
--   * Each policy restricts rows to `user_id = auth.uid()`, so one farm can
--     never read or write another farm's data — even with the public anon key.
--   * Public sign-ups are disabled in the Supabase Auth settings (Dashboard →
--     Authentication → Providers → Email → "Enable sign ups" = OFF). You create
--     users manually. This file does not grant any signup capability.
-- ============================================================================

-- Needed for gen_random_uuid()
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- profiles: one row per user (the farm "Stammdaten" + running invoice number)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  user_id              uuid primary key references auth.users (id) on delete cascade,
  farm_name            text not null default '',
  owner_name           text not null default '',
  street               text not null default '',
  city_line            text not null default '',
  phone                text not null default '',
  email                text not null default '',
  website              text not null default '',
  issue_place          text not null default '',
  iban                 text not null default '',
  bic                  text not null default '',
  account_holder       text not null default '',
  uid_text             text not null default '',
  next_invoice_number  integer not null default 1,
  invoice_year         integer not null default extract(year from now()),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- For databases created before invoice_year was added:
alter table public.profiles add column if not exists invoice_year integer not null default extract(year from now());

-- ----------------------------------------------------------------------------
-- customers: returning guests remembered for autocomplete
-- ----------------------------------------------------------------------------
create table if not exists public.customers (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  salutation  text not null default '',
  name        text not null default '',
  street      text not null default '',
  city_line   text not null default '',
  country     text not null default '',
  email       text not null default '',
  created_at  timestamptz not null default now()
);
create index if not exists customers_user_idx on public.customers (user_id);

-- For databases created before salutation/email were added:
alter table public.customers add column if not exists salutation text not null default '';
alter table public.customers add column if not exists email      text not null default '';

-- ----------------------------------------------------------------------------
-- invoices: issued invoices (line items + recipient stored as jsonb snapshots)
-- ----------------------------------------------------------------------------
create table if not exists public.invoices (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  number        text not null default '',
  invoice_date  date not null default current_date,
  recipient     jsonb not null default '{}'::jsonb,
  stay_from     date,
  stay_to       date,
  nights        integer not null default 0,
  line_items    jsonb not null default '[]'::jsonb,
  payment_mode  text not null default 'transfer' check (payment_mode in ('transfer', 'received')),
  status        text not null default 'open'     check (status in ('open', 'paid')),
  paid_at       timestamptz,
  issuer        jsonb,
  total_gross   numeric(12,2) not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists invoices_user_idx on public.invoices (user_id, invoice_date desc);

-- ----------------------------------------------------------------------------
-- eurowork_sheets: monthly "Quartierbestätigung" sheets for the Eurowork
-- corporate customer. Each row is one month; the worker rows + day grid are
-- stored as a jsonb array.
-- ----------------------------------------------------------------------------
create table if not exists public.eurowork_sheets (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  month            integer not null default 1 check (month between 1 and 12),
  year             integer not null default 2025,
  quartier         text not null default '',
  street           text not null default '',
  plz_ort          text not null default '',
  phone            text not null default '',
  email            text not null default '',
  price_per_night  text not null default '',
  employees        jsonb not null default '[]'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists eurowork_user_idx on public.eurowork_sheets (user_id, year desc, month desc);

-- ----------------------------------------------------------------------------
-- updated_at trigger
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists invoices_set_updated_at on public.invoices;
create trigger invoices_set_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

drop trigger if exists eurowork_set_updated_at on public.eurowork_sheets;
create trigger eurowork_set_updated_at
  before update on public.eurowork_sheets
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Atomic invoice-number allocation. Increments the per-user counter and
-- returns the value that was used, so two devices can never collide.
-- ----------------------------------------------------------------------------
create or replace function public.next_invoice_number()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  -- Ensure a profile row exists for this user.
  insert into public.profiles (user_id)
  values (auth.uid())
  on conflict (user_id) do nothing;

  -- New calendar year: restart numbering at 1.
  update public.profiles
     set next_invoice_number = 1,
         invoice_year = extract(year from now())
   where user_id = auth.uid()
     and invoice_year < extract(year from now());

  update public.profiles
     set next_invoice_number = next_invoice_number + 1
   where user_id = auth.uid()
  returning next_invoice_number - 1 into n;

  return n;
end;
$$;

revoke all on function public.next_invoice_number() from public, anon;
grant execute on function public.next_invoice_number() to authenticated;

-- ============================================================================
-- Row-Level Security
-- ============================================================================
alter table public.profiles  enable row level security;
alter table public.customers enable row level security;
alter table public.invoices  enable row level security;
alter table public.profiles  force row level security;
alter table public.customers force row level security;
alter table public.invoices  force row level security;
alter table public.eurowork_sheets enable row level security;
alter table public.eurowork_sheets force row level security;

-- ----------------------------------------------------------------------------
-- Table privileges. Required because the project was created with
-- "Automatically expose new tables" = OFF, so the API roles receive no
-- privileges by default. RLS (above) still controls WHICH rows each user may
-- touch; these GRANTs only allow the authenticated role to attempt the
-- operation at all. The anon role is intentionally granted nothing.
-- ----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles  to authenticated;
grant select, insert, update, delete on public.customers to authenticated;
grant select, insert, update, delete on public.invoices  to authenticated;
grant select, insert, update, delete on public.eurowork_sheets to authenticated;

-- profiles ------------------------------------------------------------------
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (user_id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (user_id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles
  for delete using (user_id = auth.uid());

-- customers -----------------------------------------------------------------
drop policy if exists "customers_select_own" on public.customers;
create policy "customers_select_own" on public.customers
  for select using (user_id = auth.uid());

drop policy if exists "customers_insert_own" on public.customers;
create policy "customers_insert_own" on public.customers
  for insert with check (user_id = auth.uid());

drop policy if exists "customers_update_own" on public.customers;
create policy "customers_update_own" on public.customers
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "customers_delete_own" on public.customers;
create policy "customers_delete_own" on public.customers
  for delete using (user_id = auth.uid());

-- invoices ------------------------------------------------------------------
drop policy if exists "invoices_select_own" on public.invoices;
create policy "invoices_select_own" on public.invoices
  for select using (user_id = auth.uid());

drop policy if exists "invoices_insert_own" on public.invoices;
create policy "invoices_insert_own" on public.invoices
  for insert with check (user_id = auth.uid());

drop policy if exists "invoices_update_own" on public.invoices;
create policy "invoices_update_own" on public.invoices
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "invoices_delete_own" on public.invoices;
create policy "invoices_delete_own" on public.invoices
  for delete using (user_id = auth.uid());

-- eurowork_sheets -----------------------------------------------------------
drop policy if exists "eurowork_select_own" on public.eurowork_sheets;
create policy "eurowork_select_own" on public.eurowork_sheets
  for select using (user_id = auth.uid());

drop policy if exists "eurowork_insert_own" on public.eurowork_sheets;
create policy "eurowork_insert_own" on public.eurowork_sheets
  for insert with check (user_id = auth.uid());

drop policy if exists "eurowork_update_own" on public.eurowork_sheets;
create policy "eurowork_update_own" on public.eurowork_sheets
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "eurowork_delete_own" on public.eurowork_sheets;
create policy "eurowork_delete_own" on public.eurowork_sheets
  for delete using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Auto-create an (empty) profile the first time a user is created.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
