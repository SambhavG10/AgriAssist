import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

console.log("transcribe-audio function (Hugging Face) booting up");

const HUGGINGFACE_API_KEY = Deno.env.get("HUGGINGFACE_API_KEY");
const API_URL = "https://api-inference.huggingface.co/models/distil-whisper/distil-large-v2";

serve(async (req) => {
  console.log("Function invoked, method:", req.method);

  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS request");
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("Attempting to parse request JSON...");
    const { audio } = await req.json();
    if (!audio) {
      console.error("No audio data in request body");
      throw new Error("No audio data received.");
    }
    console.log("Successfully parsed audio data from request.");

    const audioData = new Uint8Array(atob(audio).split('').map(char => char.charCodeAt(0)));
    console.log(`Decoded audio data size: ${audioData.length} bytes`);

    if (!HUGGINGFACE_API_KEY) {
      console.error("HUGGINGFACE_API_KEY is not set in environment variables.");
      throw new Error("Server configuration error: Missing API key.");
    }
    console.log("Hugging Face API key found.");

    const audioBlob = new Blob([audioData], { type: "audio/webm" });

    console.log("Sending request to Hugging Face Inference API...");
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HUGGINGFACE_API_KEY}`,
        "Content-Type": "audio/webm",
      },
      body: audioBlob,
    });
    console.log(`Received response from Hugging Face with status: ${response.status}`);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Hugging Face API error response:", errorBody);
      // When the model is loading, Hugging Face returns a 503 error with an estimated time.
      if (response.status === 503) {
        const errorJson = JSON.parse(errorBody);
        throw new Error(`Model is loading, please try again in ~${Math.round(errorJson.estimated_time)} seconds.`);
      }
      throw new Error(`Hugging Face API error: ${response.statusText}`);
    }

    const result = await response.json();
    const transcription = result.text;
    console.log("Successfully transcribed audio. Text:", transcription);

    return new Response(JSON.stringify({ transcription }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = (error instanceof Error) ? error.message : String(error);
    console.error("Error in function execution:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
