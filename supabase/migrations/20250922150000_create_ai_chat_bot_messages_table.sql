create table if not exists ai_chat_bot_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null,
  content text not null,
  type text default 'text'::text not null
);

-- Enable RLS
alter table ai_chat_bot_messages enable row level security;

-- Policies for ai_chat_bot_messages
create policy "Users can view their own chat messages"
on ai_chat_bot_messages for select
using (auth.uid() = user_id);

create policy "Users can insert their own chat messages"
on ai_chat_bot_messages for insert
with check (auth.uid() = user_id);

create policy "Users can delete their own chat messages"
on ai_chat_bot_messages for delete
using (auth.uid() = user_id);
