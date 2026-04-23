import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

export interface AIAdvisoryData {
    sowing: string;
    harvest: string;
    irrigation: string;
    stages: string[];
    diseases: string[];
}

export const fetchAIAdvisory = async (crop: string, location: string): Promise<AIAdvisoryData> => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // More robust JSON extraction
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("No JSON found in AI response");
        }

        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        console.error("Error fetching AI advisory:", error);
        throw error;
    }
};
