import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  console.log(`Method: ${req.method}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Request body:', body);
    
    const query = body.query;
    const language = body.language || 'en';

    if (!query) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For now, return a simple response to test the connection
    let responseMessage;
    
    if (language.startsWith('ml')) {
      responseMessage = `നിങ്ങളുടെ ചോദ്യം "${query}" ലഭിച്ചു. ഇതൊരു ടെസ്റ്റ് മറുപടിയാണ്.`;
    } else {
      responseMessage = `Received your query: "${query}". This is a test response.`;
    }

    console.log('Sending response:', responseMessage);

    return new Response(JSON.stringify({ reply: responseMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in function:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});