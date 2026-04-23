import { Redis } from 'https://esm.sh/@upstash/redis'

Deno.serve(async (req) => {
  try {
    console.log("Cron job started: Fetching fresh crop prices (Safe Limit)...")

    const redisUrl = Deno.env.get('UPSTASH_REDIS_REST_URL');
    const redisToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');
    const apiKey = Deno.env.get('DATA_GOV_API_KEY');
    const resourceId = Deno.env.get('DATA_GOV_RESOURCE_ID') || '9ef84268-d588-465a-a308-a864a43d0070';

    if (!redisUrl || !redisToken) {
      throw new Error('Missing Upstash Redis secrets');
    }
    if (!apiKey) {
      throw new Error('DATA_GOV_API_KEY is not set');
    }

    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
    })

    // SAFE LIMIT: Fetch max 1000 records to avoid Edge Function timeout (546)
    // The Govt API is slow, so we can't fetch 10k+ records in one go.
    const MAX_SAFE_RECORDS = 1000;
    
    let allRecords: any[] = [];
    let offset = 0;
    const limit = 500; // Fetch in chunks of 500
    let total = 0;

    // Fetch first chunk
    console.log(`Fetching first chunk...`);
    const firstResponse = await fetch(
      `https://api.data.gov.in/resource/${resourceId}?api-key=${apiKey}&format=json&limit=${limit}&offset=${offset}`
    );

    if (!firstResponse.ok) {
      const text = await firstResponse.text();
      throw new Error(`API Error (First Chunk): ${firstResponse.status} ${firstResponse.statusText} - ${text}`);
    }

    const firstData = await firstResponse.json();
    const records = firstData.records || [];
    total = parseInt(firstData.total || '0', 10);
    console.log(`Total records available: ${total}`);

    allRecords = [...records];
    offset += records.length;

    // Fetch one more chunk if needed, but respect MAX_SAFE_RECORDS
    while (offset < total && offset < MAX_SAFE_RECORDS) {
       console.log(`Fetching chunk: offset=${offset}, limit=${limit}`);
       const response = await fetch(
        `https://api.data.gov.in/resource/${resourceId}?api-key=${apiKey}&format=json&limit=${limit}&offset=${offset}`
      );
      
      if (!response.ok) {
         console.error(`Failed to fetch chunk at offset ${offset}`);
         break; 
      }

      const data = await response.json();
      const newRecords = data.records || [];
      if (newRecords.length === 0) break;

      allRecords = [...allRecords, ...newRecords];
      offset += newRecords.length;
    }

    console.log(`Fetched ${allRecords.length} records. Writing to Redis...`);

    if (allRecords.length > 0) {
        await redis.set('crop_prices', JSON.stringify(allRecords), { ex: 86400 });
        await redis.set('crop_prices_updated_at', new Date().toISOString());
        console.log("Successfully updated crop_prices in Redis.");
    } else {
        console.log("No records fetched, skipping Redis update.");
    }

    return new Response(
      JSON.stringify({ success: true, count: allRecords.length, note: "Limited to 1000 records for performance" }),
      { headers: { "Content-Type": "application/json" } },
    )
  } catch (error) {
    console.error("Error in cron-update-prices:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }
})
