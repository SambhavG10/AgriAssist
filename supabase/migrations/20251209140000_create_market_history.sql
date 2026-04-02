create table if not exists public.market_prices_history (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default now(),
    data jsonb not null
);

alter table public.market_prices_history enable row level security;

create policy "Allow public read access" on public.market_prices_history
    for select using (true);

create policy "Allow authenticated insert" on public.market_prices_history
    for insert with check (auth.role() = 'service_role');
