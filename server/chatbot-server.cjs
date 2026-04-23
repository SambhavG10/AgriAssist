// Simple Chatbot Server using Gemini API
// Run with: node server/chatbot-server.cjs

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Load .env manually
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) return;
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
    });
    console.log('[Server] .env loaded from:', envPath);
} else {
    console.warn('[Server] No .env file found at:', envPath);
}

const app = express();
const PORT = process.env.PORT || 10000; // Render uses 10000 by default or provides via env

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static files from the Vite build directory
const distPath = path.resolve(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    console.log('[Server] Serving static files from:', distPath);
}


// Check for fetch (Node 18+)
if (typeof fetch === 'undefined') {
    console.warn('⚠️ Warning: global "fetch" is not defined. Your Node.js version might be older than 18.');
    console.warn('Attempting to use node-fetch if available...');
    try {
        global.fetch = require('node-fetch');
        console.log('✅ node-fetch loaded successfully.');
    } catch (e) {
        console.error('❌ Error: fetch is not available. Please upgrade Node.js to version 18 or higher, or run: npm install node-fetch');
        process.exit(1);
    }
}

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Chatbot endpoint
app.post('/api/chatbot', async (req, res) => {
    const { query, language } = req.body;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey || geminiApiKey.startsWith('your-')) {
        return res.status(500).json({
            error: 'Gemini API key not configured',
            details: 'Please add GEMINI_API_KEY to your .env file'
        });
    }

    if (!query) {
        return res.status(400).json({ error: 'Query is required' });
    }

    try {
        const langName = language === 'ml-IN' ? 'Malayalam' : language === 'hi-IN' ? 'Hindi' : 'English';
        const systemPrompt = `You are AgriAssist, a highly knowledgeable and friendly agricultural assistant. You MUST always identify yourself as AgriAssist. Never mention AgriAssist or any other name. Respond in ${langName} as requested by the user.`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiApiKey}`;

        console.log(`[Chatbot] Calling Gemini API for query: "${query.slice(0, 50)}..."`);

        const googleResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: `${systemPrompt}\n\nUser Query: ${query}` }]
                }]
            })
        });

        const data = await googleResponse.json();

        if (!googleResponse.ok) {
            console.error('[Chatbot] Gemini API Error:', JSON.stringify(data));
            throw new Error(data.error?.message || 'Unknown error from Gemini');
        }

        const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!aiResponse) throw new Error('No text returned from Gemini');

        console.log('[Chatbot] Response received successfully');
        return res.status(200).json({ reply: aiResponse });

    } catch (error) {
        console.error('[Chatbot] Error:', error.message);
        return res.status(500).json({
            error: 'Failed to get response from AI',
            details: error.message
        });
    }
});

// Weather endpoint
app.get('/api/weather', async (req, res) => {
    const { location } = req.query;
    const apiKey = process.env.OPENWEATHERMAP_API_KEY;

    if (!location) {
        return res.status(400).json({ error: 'Location is required' });
    }

    if (!apiKey || apiKey.startsWith('your-')) {
        return res.status(500).json({ error: 'Weather API key is not configured' });
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}&units=metric`;

    try {
        const weatherResponse = await fetch(url);
        if (!weatherResponse.ok) {
            throw new Error(`Failed to fetch weather data: ${weatherResponse.statusText}`);
        }
        const weatherData = await weatherResponse.json();
        return res.status(200).json(weatherData);
    } catch (error) {
        console.error('[Weather] Error:', error.message);
        return res.status(500).json({ error: 'Failed to fetch weather data' });
    }
});

// Transcription (Speech-to-Text) endpoint using Gemini 1.5 Flash
app.post('/api/transcribe', async (req, res) => {
    const { audio: base64Audio, mimeType } = req.body;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!base64Audio) {
        return res.status(400).json({ message: 'No audio data provided.' });
    }

    if (!geminiApiKey || geminiApiKey.startsWith('your-')) {
        return res.status(500).json({ message: 'Gemini API key not found.' });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiApiKey}`;

    try {
        console.log(`[Transcribe] Calling Gemini for STT...`);
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { inline_data: { mime_type: mimeType || 'audio/webm', data: base64Audio } },
                        { text: "Transcribe this audio exactly. Only output the transcription text, nothing else." }
                    ]
                }]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('[Transcribe] Gemini Error:', JSON.stringify(data));
            throw new Error(data.error?.message || 'Gemini STT failed');
        }

        const transcription = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (!transcription) throw new Error('No transcription returned from Gemini');

        console.log('[Transcribe] Success');
        return res.status(200).json({ transcription });
    } catch (error) {
        console.error('[Transcribe] Error:', error.message);
        return res.status(500).json({ message: 'Transcription failed', details: error.message });
    }
});

// Alias for plural endpoint
app.post('/api/chatbots', async (req, res) => {
    // Redirect plural to singular
    req.url = '/api/chatbot';
    app.handle(req, res);
});

// Fallback for SPA routing (React Router)
if (fs.existsSync(distPath)) {
    app.get('/*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });
}

const server = app.listen(PORT, () => {
    const geminiKey = process.env.GEMINI_API_KEY;
    const weatherKey = process.env.OPENWEATHERMAP_API_KEY;
    const hfKey = process.env.HUGGINGFACE_API_KEY;

    console.log(`\n✅ AgriAssist Multi-Feature Server running on port ${PORT}`);
    console.log(`🤖 Chatbot (Gemini): ${geminiKey && !geminiKey.startsWith('your') ? '✓ Active' : '✗ Key Missing'}`);
    console.log(`☁️ Weather (OWM): ${weatherKey && !weatherKey.startsWith('your') ? '✓ Active' : '✗ Key Missing'}`);
    console.log(`🎙️ Speech (HF): ${hfKey && !hfKey.startsWith('your') ? '✓ Active' : '✗ Key Missing'}`);
    console.log(`🌐 Frontend: http://localhost:8080\n`);

    // Keep alive log
    setInterval(() => {
        if (false) console.log('[Server] Heartbeat');
    }, 60000);
});

server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Please kill the existing process.`);
    } else {
        console.error('❌ Server Error:', e);
    }
    process.exit(1);
});

process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection:', reason);
});
