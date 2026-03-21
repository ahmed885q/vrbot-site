-- VRBOT Auto-Update: vrbot_releases table + storage bucket
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

drop policy if exists "public read releases" on vrbot_releases;
create policy "public read releases"
  on vrbot_releases for select using (active = true);

-- Storage bucket (public read)
insert into storage.buckets (id, name, public)
  values ('vrbot-updates', 'vrbot-updates', true)
  on conflict (id) do nothing;

drop policy if exists "public read updates" on storage.objects;
create policy "public read updates"
  on storage.objects for select
  using (bucket_id = 'vrbot-updates');
