-- VRBOT Auto-Update: vrbot_releases table
create table if not exists vrbot_releases (
  id         uuid primary key default gen_random_uuid(),
  version    text not null,
  notes      text default '',
  files      jsonb default '[]',
  active     boolean default true,
  created_at timestamptz default now()
);

create index if not exists idx_releases_active
  on vrbot_releases(active, created_at desc);

alter table vrbot_releases enable row level security;

create policy "public read releases"
  on vrbot_releases for select using (active = true);
