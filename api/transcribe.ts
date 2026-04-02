import { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';

// A popular and powerful speech-to-text model on Hugging Face
const MODEL_URL = "https://api-inference.huggingface.co/models/openai/whisper-large-v3";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { audio: base64Audio, mimeType } = req.body;

  if (!base64Audio) {
    return res.status(400).json({ message: 'No audio data provided.' });
  }

  const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
  if (!HUGGINGFACE_API_KEY) {
    return res.status(500).json({ message: 'Server configuration error: Hugging Face API key not found.' });
  }

  try {
    // Convert the base64 audio data back to a binary buffer
    const audioBuffer = Buffer.from(base64Audio, 'base64');

    const response = await fetch(MODEL_URL, {
      method: 'POST',
      headers: {
        "Authorization": `Bearer ${HUGGINGFACE_API_KEY}`,
        "Content-Type": mimeType || 'audio/webm',
      },
      body: audioBuffer,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Hugging Face API Error:', errorBody);
      // The model might be loading, which can take a minute.
      if (response.status === 503) {
        return res.status(503).json({ message: 'The transcription model is currently loading, please try again in a moment.' });
      }
      return res.status(response.status).json({ message: `Transcription failed: ${response.statusText}`, details: errorBody });
    }

    const data: any = await response.json();
    
    // The response from Hugging Face is typically { "text": "..." }
    res.status(200).json({ transcription: data.text });

  } catch (error) {
    console.error('Error during transcription:', error);
    res.status(500).json({ message: 'An internal server error occurred during transcription.' });
  }
}
