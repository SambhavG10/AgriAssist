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
          url:='https://cemlsefaiamdbjckzzng.supabase.co/functions/v1/cron-update-prices',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer <YOUR_SERVICE_ROLE_KEY>"}'::jsonb
      ) as request_id;
    $$
  );
