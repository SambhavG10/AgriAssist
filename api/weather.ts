import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method === 'OPTIONS') {
    response.status(200).end();
    return;
  }

  const { location } = request.query;
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;

  if (!location) {
    return response.status(400).json({ error: 'Location is required' });
  }

  if (!apiKey) {
    return response.status(500).json({ error: 'Weather API key is not configured' });
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}&units=metric`;

  try {
    const weatherResponse = await fetch(url);
    if (!weatherResponse.ok) {
      throw new Error(`Failed to fetch weather data: ${weatherResponse.statusText}`);
    }
    const weatherData = await weatherResponse.json();
    response.status(200).json(weatherData);
  } catch (error) {
    console.error('Error fetching weather:', error);
    response.status(500).json({ error: 'Failed to fetch weather data' });
  }
}
