import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  // 1. CORS Headers
  response.setHeader('Access-Control-Allow-Credentials', "true");
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  response.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (request.method === 'OPTIONS') {
    response.status(200).end();
    return;
  }

  try {
    const { query, language } = request.body;
    
    // 2. Grab Key
    const apiKey = process.env.VITE_GEMINI_API_KEY ;
    if (!apiKey) throw new Error("API Key is MISSING in Vercel.");

    // 3. Define the System Prompt & User Message manually
    const systemPrompt = `You are a helpful assistant for farmers. Your name is AgriAssist. Respond in ${language === 'ml-IN' ? 'Malayalam' : language === 'hi-IN' ? 'Hindi' : 'English'}.`;
    
    // 4. DIRECT HTTP CALL (Bypassing the SDK library)
    // We use 'gemini-1.5-flash' which is the standard current model
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    console.log("[ChatBot] Sending Raw Request to Google...");

    const googleResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\nUser Query: ${query}`
          }]
        }]
      })
    });

    const data = await googleResponse.json();

    // 5. Handle Google Errors
    if (!googleResponse.ok) {
      console.error("[ChatBot] Google API Error Details:", JSON.stringify(data));
      throw new Error(data.error?.message || "Unknown error from Google");
    }

    // 6. Extract Reply
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!aiResponse) {
       throw new Error("No text returned from AI.");
    }

    response.status(200).json({ reply: aiResponse });

  } catch (error: any) {
    console.error("Backend Crash:", error);
    response.status(500).json({ 
      error: "Backend Error",
      details: error.message, 
    });
  }
}