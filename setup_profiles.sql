-- Create a table for public profiles if it doesn't exist
create table if not exists profiles (
  id uuid references auth.users on delete cascade not null primary key,
  updated_at timestamp with time zone,
  nickname text,
  name text,
  avatar_url text,
  email text,
  team_id text
);

-- Ensure columns exist (if table already existed with different schema)
alter table profiles add column if not exists name text;
alter table profiles add column if not exists nickname text;
alter table profiles add column if not exists avatar_url text;
alter table profiles add column if not exists email text;
alter table profiles add column if not exists team_id text;


-- Set up Row Level Security (RLS)
alter table profiles enable row level security;

-- Re-create policies to be safe (drop first to avoid error if exists)
drop policy if exists "Public profiles are viewable by everyone." on profiles;
create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

drop policy if exists "Users can insert their own profile." on profiles;
create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile." on profiles;
create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, nickname, avatar_url, email)
  values (
    new.id, 
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email),
    new.raw_user_meta_data->>'nickname',
    new.raw_user_meta_data->>'avatar_url',
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function on new user creation
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill profiles for existing users
-- Only insert if not exists
insert into public.profiles (id, name, nickname, avatar_url, email)
select 
  id, 
  coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', email),
  raw_user_meta_data->>'nickname', 
  raw_user_meta_data->>'avatar_url',
  email
from auth.users
where id not in (select id from public.profiles);
