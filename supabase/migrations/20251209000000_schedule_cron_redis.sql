-- Enable the required extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Schedule the job to run every 10 minutes
-- NOTE: Replace the URL with your actual deployed Edge Function URL
-- You can find this in your Supabase Dashboard -> Edge Functions
select
  cron.schedule(
    'update-crop-prices-job',
    '*/10 * * * *', -- Cron syntax for every 10 mins
    $$
    select
      net.http_post(
          url:='https://kouzruxnyurjxqwdkijo.supabase.co/functions/v1/cron-update-prices',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvdXpydXhueXVyanhxd2RraWpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTEyMzQ1OCwiZXhwIjoyMDkwNjk5NDU4fQ.zHM9UjMlJ-ShkSfzMJI53Rkm0cU1WZCFBLNmT6EzZes"}'::jsonb
      ) as request_id;
    $$
  );
