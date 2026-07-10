alter table messages
  add column if not exists deleted_at timestamptz;

create table if not exists blocks (
  id          uuid default gen_random_uuid() primary key,
  blocker_id  uuid references profiles(id) on delete cascade not null,
  blocked_id  uuid references profiles(id) on delete cascade not null,
  created_at  timestamptz default now(),
  unique(blocker_id, blocked_id),
  check(blocker_id <> blocked_id)
);

alter table blocks enable row level security;

drop policy if exists "Users can insert own blocks" on blocks;
create policy "Users can insert own blocks"
  on blocks for insert
  with check (auth.uid() = blocker_id);

drop policy if exists "Users can view own blocks" on blocks;
create policy "Users can view own blocks"
  on blocks for select
  using (auth.uid() = blocker_id);

drop policy if exists "Users can delete own blocks" on blocks;
create policy "Users can delete own blocks"
  on blocks for delete
  using (auth.uid() = blocker_id);

create table if not exists reports (
  id           uuid default gen_random_uuid() primary key,
  reporter_id  uuid references profiles(id) on delete cascade not null,
  reported_id  uuid references profiles(id) on delete cascade not null,
  reason       text not null,
  details      text,
  match_id     uuid references matches(id) on delete set null,
  resolved     boolean default false,
  created_at   timestamptz default now(),
  check(reporter_id <> reported_id)
);

alter table reports enable row level security;

drop policy if exists "Users can insert own reports" on reports;
create policy "Users can insert own reports"
  on reports for insert
  with check (auth.uid() = reporter_id);

drop policy if exists "Users can view own reports" on reports;
create policy "Users can view own reports"
  on reports for select
  using (auth.uid() = reporter_id);
