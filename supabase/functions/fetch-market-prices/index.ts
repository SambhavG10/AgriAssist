import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const API_KEY = Deno.env.get('DATA_GOV_API_KEY')
    const RESOURCE_ID = Deno.env.get('DATA_GOV_RESOURCE_ID') || '9ef84268-d588-465a-a308-a864a43d0070'

    if (!API_KEY) {
      throw new Error('DATA_GOV_API_KEY is not set')
    }

    console.log('Fetching market data from API...')
    
    let allRecords: any[] = [];
    let offset = 0;
    const limit = 2000; // Fetch in chunks of 2000
    let total = 0;

    do {
      console.log(`Fetching chunk: offset=${offset}, limit=${limit}`);
      const response = await fetch(
        `https://api.data.gov.in/resource/${RESOURCE_ID}?api-key=${API_KEY}&format=json&limit=${limit}&offset=${offset}`
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const records = data.records || [];
      
      // First chunk determines the total
      if (offset === 0) {
        total = parseInt(data.total || '0', 10);
        console.log(`Total records available: ${total}`);
      }

      if (records.length === 0) break;

      allRecords = [...allRecords, ...records];
      offset += records.length;

      // Safety break to prevent infinite loops if API misbehaves
      if (offset >= total) break;
      
    } while (true);

    console.log(`Fetched total ${allRecords.length} records.`);

    if (allRecords.length > 0) {
      // 1. Update Cache (Current View)
      const { error: cacheError } = await supabase
        .from('market_prices_cache')
        .upsert({
          id: 1,
          data: allRecords,
          updated_at: new Date().toISOString(),
        })

      if (cacheError) throw cacheError
      console.log('Market prices cache updated successfully')

      // 2. Append to History (Historical View)
      const { error: historyError } = await supabase
        .from('market_prices_history')
        .insert({
          data: allRecords
        })

      if (historyError) {
        console.error('Failed to update market history:', historyError)
        // We don't throw here to avoid failing the whole job if just history fails
      } else {
        console.log('Market prices history updated successfully')
      }
    }

    return new Response(JSON.stringify({ success: true, count: allRecords.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
