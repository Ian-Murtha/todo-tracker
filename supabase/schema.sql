-- Run this in the Supabase SQL Editor (Project > SQL Editor > New Query)

create extension if not exists "pgcrypto";

create table if not exists lists (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists entries (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references lists(id) on delete cascade,
  content text not null,
  done boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- Row Level Security
-- Since this app has no login, we allow the public "anon" key full access.
-- This is fine for a personal/private tool, but do NOT use this policy
-- if you ever add multiple users or make the anon key public-facing
-- without also adding auth.
alter table lists enable row level security;
alter table entries enable row level security;

create policy "Allow all on lists" on lists
  for all using (true) with check (true);

create policy "Allow all on entries" on entries
  for all using (true) with check (true);
