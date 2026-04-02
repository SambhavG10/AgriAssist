import { Redis } from 'https://esm.sh/@upstash/redis'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const redis = new Redis({
  url: Deno.env.get('UPSTASH_REDIS_REST_URL')!,
  token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!,
})

Deno.serve(async (req) => {
  // Handle CORS (Cross-Origin Resource Sharing) for React
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Read directly from Cache
    const cachedData = await redis.get('crop_prices')

    // 2. Handle Cache Miss (Optional safety net)
    if (!cachedData) {
       // Try to return empty array or specific error indicating warming up
       // Or we could fallback to DB here if we wanted, but let's stick to the plan
       return new Response(JSON.stringify({ error: "Data warming up, try again in 1 min" }), { 
         headers: { ...corsHeaders, "Content-Type": "application/json" },
         status: 503 
       })
    }

    // 3. Return data instantly
    return new Response(JSON.stringify(cachedData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
