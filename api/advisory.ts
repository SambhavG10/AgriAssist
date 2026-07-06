import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  // CORS Headers
  response.setHeader('Access-Control-Allow-Credentials', "true");
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  response.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (request.method === 'OPTIONS') {
    response.status(200).end();
    return;
  }

  try {
    const { crop, location } = request.body;

    if (!crop || !location) {
      return response.status(400).json({ error: "Crop and location are required." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Gemini API Key is MISSING in Vercel.");
    }

    const prompt = `
      As an expert agricultural assistant, provide specific farming advice for the crop "${crop}" in the location "${location}".
      Return the response STRICTLY as a JSON object with the following fields:
      {
        "sowing": "Best months/conditions for sowing in this location",
        "harvest": "Expected harvest time/duration",
        "irrigation": "Specific watering needs for this crop in this climate",
        "stages": ["Array of 4-5 major growth stages"],
        "diseases": ["Array of 3-4 common diseases/pests for this crop in this area"]
      }
      Provide concise but highly relevant local advice. Do not include any markdown formatting or extra text.
    `;

    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    console.log("[Advisory] Sending Crop Advisory Request to Google...");

    const googleResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    const data = await googleResponse.json() as any;

    if (!googleResponse.ok) {
      console.error("[Advisory] Google API Error Details:", JSON.stringify(data));
      throw new Error(data.error?.message || "Unknown error from Google");
    }

    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiResponse) {
      throw new Error("No text returned from AI.");
    }

    // Extract JSON block in case Gemini adds markdown formatting (e.g. ```json ... ```)
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON found in Gemini response.");
    }

    const parsedData = JSON.parse(jsonMatch[0]);
    response.status(200).json(parsedData);

  } catch (error: any) {
    console.error("Advisory Backend Crash:", error);
    response.status(500).json({
      error: "Backend Error",
      details: error.message,
    });
  }
}
