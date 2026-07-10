-- Enable PostGIS for location queries
create extension if not exists "postgis";

-- ─────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────
create table profiles (
  id            uuid references auth.users on delete cascade primary key,
  name          text not null,
  age           int,
  weight_kg     numeric,
  bio           text,
  avatar_url    text,
  gym_name      text,
  gym_verified  boolean default false,
  martial_arts  text[]  default '{}',
  skill_level   text    default 'beginner', -- beginner | intermediate | advanced
  availability  text[]  default '{}',       -- weekdays | weekends | mornings | evenings
  location_lat  numeric,
  location_lng  numeric,
  location_city text,
  push_token    text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can view all profiles"
  on profiles for select using (true);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

-- ─────────────────────────────────────────
-- SWIPES
-- ─────────────────────────────────────────
create table swipes (
  id          uuid default gen_random_uuid() primary key,
  swiper_id   uuid references profiles(id) on delete cascade,
  swiped_id   uuid references profiles(id) on delete cascade,
  direction   text not null, -- 'right' | 'left'
  created_at  timestamptz default now(),
  unique(swiper_id, swiped_id)
);

alter table swipes enable row level security;

create policy "Users can insert own swipes"
  on swipes for insert with check (auth.uid() = swiper_id);

create policy "Users can view own swipes"
  on swipes for select using (auth.uid() = swiper_id or auth.uid() = swiped_id);

-- ─────────────────────────────────────────
-- MATCHES  (auto-created via trigger)
-- ─────────────────────────────────────────
create table matches (
  id          uuid default gen_random_uuid() primary key,
  user1_id    uuid references profiles(id) on delete cascade,
  user2_id    uuid references profiles(id) on delete cascade,
  created_at  timestamptz default now(),
  unique(user1_id, user2_id)
);

alter table matches enable row level security;

create policy "Users can view own matches"
  on matches for select
  using (auth.uid() = user1_id or auth.uid() = user2_id);

-- Trigger: create a match when both users swipe right
create or replace function check_mutual_swipe()
returns trigger as $$
begin
  if new.direction = 'right' then
    if exists (
      select 1 from swipes
      where swiper_id = new.swiped_id
      and   swiped_id = new.swiper_id
      and   direction = 'right'
    ) then
      insert into matches (user1_id, user2_id)
      values (least(new.swiper_id, new.swiped_id),
              greatest(new.swiper_id, new.swiped_id))
      on conflict do nothing;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_swipe_inserted
  after insert on swipes
  for each row execute procedure check_mutual_swipe();

-- ─────────────────────────────────────────
-- MESSAGES
-- ─────────────────────────────────────────
create table messages (
  id          uuid default gen_random_uuid() primary key,
  match_id    uuid references matches(id) on delete cascade,
  sender_id   uuid references profiles(id) on delete cascade,
  content     text not null,
  read        boolean default false,
  created_at  timestamptz default now(),
  deleted_at  timestamptz
);

alter table messages enable row level security;

create policy "Match participants can insert messages"
  on messages for insert
  with check (
    auth.uid() = sender_id and
    exists (
      select 1 from matches
      where id = match_id
      and (user1_id = auth.uid() or user2_id = auth.uid())
    )
  );

create policy "Match participants can read messages"
  on messages for select
  using (
    exists (
      select 1 from matches
      where id = match_id
      and (user1_id = auth.uid() or user2_id = auth.uid())
    )
  );

create policy "Senders can update their messages"
  on messages for update
  using (auth.uid() = sender_id)
  with check (auth.uid() = sender_id);

-- ─────────────────────────────────────────
-- BLOCKS
-- ─────────────────────────────────────────
create table blocks (
  id          uuid default gen_random_uuid() primary key,
  blocker_id  uuid references profiles(id) on delete cascade not null,
  blocked_id  uuid references profiles(id) on delete cascade not null,
  created_at  timestamptz default now(),
  unique(blocker_id, blocked_id),
  check(blocker_id <> blocked_id)
);

alter table blocks enable row level security;

create policy "Users can insert own blocks"
  on blocks for insert
  with check (auth.uid() = blocker_id);

create policy "Users can view own blocks"
  on blocks for select
  using (auth.uid() = blocker_id);

create policy "Users can delete own blocks"
  on blocks for delete
  using (auth.uid() = blocker_id);

-- ─────────────────────────────────────────
-- REPORTS
-- ─────────────────────────────────────────
create table reports (
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

create policy "Users can insert own reports"
  on reports for insert
  with check (auth.uid() = reporter_id);

create policy "Users can view own reports"
  on reports for select
  using (auth.uid() = reporter_id);

-- Enable realtime for messages
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table matches;
