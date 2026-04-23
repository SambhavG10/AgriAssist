-- Enable required extensions
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Re-schedule 10-minute cron with new URL & Service Key
select
  cron.schedule(
    'update-crop-prices-job',
    '*/10 * * * *',
    $$
    select
      net.http_post(
          url:='https://kouzruxnyurjxqwdkijo.supabase.co/functions/v1/cron-update-prices',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvdXpydXhueXVyanhxd2RraWpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTEyMzQ1OCwiZXhwIjoyMDkwNjk5NDU4fQ.zHM9UjMlJ-ShkSfzMJI53Rkm0cU1WZCFBLNmT6EzZes"}'::jsonb
      ) as request_id;
    $$
  );


-- Re-create daily fetch function with new URL & Service Key
create or replace function public.trigger_fetch_market_prices()
returns void
language plpgsql
security definer
as $$
declare
  -- URL of the Edge Function
  url text := 'https://kouzruxnyurjxqwdkijo.supabase.co/functions/v1/fetch-market-prices';
  -- Service Role Key for authentication
  service_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvdXpydXhueXVyanhxd2RraWpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTEyMzQ1OCwiZXhwIjoyMDkwNjk5NDU4fQ.zHM9UjMlJ-ShkSfzMJI53Rkm0cU1WZCFBLNmT6EzZes';
  request_id bigint;
begin
  -- Make the HTTP POST request
  select net.http_post(
    url := url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    )
  ) into request_id;
end;
$$;

-- Re-schedule daily fetch
select cron.schedule(
  'fetch-market-prices-daily',
  '0 0 * * *',
  'select public.trigger_fetch_market_prices();'
);
