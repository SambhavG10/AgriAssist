create table if not exists auth_challenges (
  id uuid primary key default gen_random_uuid(),
  challenge text not null,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);
