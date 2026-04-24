<div align="center">
  <h1>🌱 AgriAssist - AI-Powered Agricultural Assistant</h1>
  <p>A modern, web-based toolkit & platform designed to provide farmers, researchers, and agriculture enthusiasts with instant access to personalized information, live market prices, and a supportive community.</p>
</div>

---

## ✨ Key Features

### 🤖 Intelligent AI & Personalization
- **Multi-Language AI Chatbot:** Get instant agricultural advice in your native language (Support for English, Hindi, Malayalam, and more).
- **Personalized Crop Suggestions:** Receive localized advice based on your specific crop choices and regional climate mapping.
- **Speech-to-Text Integration:** Easily ask questions using your voice via Hugging Face STT.
- **Image Upload Support:** Upload pictures of crops to get tailored help and diagnostics.

### 🛠️ Comprehensive Farmer Toolkit
- **Live Market Price Tracking:** Stay updated with the latest crop market prices in real-time.
- **Government Schemes Directory:** Explore and apply for agricultural schemes and subsidies.
- **Daily Task Management:** Organize farming routines and keep track of to-do lists.
- **Farming Calculators:** Use built-in tools for seed rate, fertilizer conversion, and yield estimation.

### 🌍 Dynamic Community & Forums
- **Community Posts & Discussions:** Create posts and engage with fellow farmers in real-time.
- **"My Posts" Dashboard:** Easily view and manage your own contributions and questions.
- **Interactive Chat Rooms:** Join or create topic-specific, live multiplayer chat rooms.

### 📱 Modern & Accessible
- **100% Mobile Responsive:** Designed for seamless use on smartphones, tablets, and desktops.
- **Redesigned User Profiles:** Modern, user-friendly interface for managing your farm's profile.
- **Secure Authentication:** Safe and fast Login/Signup powered by Supabase Auth (Magic Links, Biometrics, Passwordless).

---

## 🛠️ Technology Stack

**Frontend:**
- **Framework:** React + Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Routing:** React Router

**Backend:**
- **Server Environment:** Node.js + Express
- **Database:** Supabase Postgres
- **Authentication:** Supabase Auth & WebAuthn
- **Storage:** Supabase Storage (for avatars and community image uploads)

**AI & APIs:**
- **Chatbot & Brain:** Google Gemini AI Model (`gemini-2.5-flash`)
- **Speech Recognition:** Hugging Face Inference API (`distil-whisper/distil-large-v2`)
- **Weather Data:** OpenWeatherMap API

---

## 🚀 Getting Started (Local Development)

We have streamlined our local setup process! You no longer need Docker to run the backend locally. Our single `npm start` command runs both the frontend and the NodeJS backend concurrently.

### 1. Prerequisites
Ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (Version 18 or higher)
- [Git](https://git-scm.com/)

### 2. Clone and Install
```bash
git clone https://github.com/SambhavG10/ai-agriculture.git
cd ai-agriculture
npm install
```

### 3. Environment Variables Setup
To run the server, you must provide your API keys. 
1. Create a file named `.env` in the root folder of the project.
2. Copy the structure below into your `.env` file and replace the placeholder values with your actual API keys.

```env
# ✅ REQUIRED - Supabase (Database & Auth)
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-pub-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# ✅ REQUIRED - Google Gemini AI
# Used by the frontend for static AI features
VITE_GEMINI_API_KEY="your-gemini-key"
# Used by the NodeJS backend for complex chatbots
GEMINI_API_KEY="your-gemini-key"

# 🔧 OPTIONAL (But Recommended)
OPENWEATHERMAP_API_KEY="your-openweathermap-key"
HUGGINGFACE_API_KEY="your-huggingface-key"
```

### 4. Start the Application
Run the following command to spin up BOTH the Vite frontend and the Node backend server simultaneously:

```bash
npm start
```
* **Frontend:** Starts on `http://localhost:8080`
* **Backend:** Starts on `http://localhost:3000`

---

## 🌐 Deploying to Production (Render.com)

The project includes a `render.yaml` configuration for seamless deployment.

1. Create an account on [Render](https://render.com/).
2. Select **New** > **Blueprint**.
3. Connect this GitHub repository.
4. Render will automatically detect the `render.yaml` file and prompt you to input your `.env` variables in their dashboard securely.
5. Click **Apply**! Your single Render Web Service will automatically serve both the backend API and static frontend.

---

## 🚧 Challenges & Problems Faced

Building AgriAssist involved several complex challenges that required innovative solutions:
- **Deployment Architecture:** Initially, separating the frontend (Vite) and backend (Edge Functions) led to CORS issues and complicated deployment pipelines. *Solution:* We unified the deployment using a Node.js Express server that simultaneously handles API requests and serves the static React frontend. This makes platforms like Render.com able to host everything on a single Web Service.
- **Cross-Platform Compatibility:** Ensuring commands like `npm start` worked reliably across Windows, Mac, and Linux environments required swapping out OS-specific shell commands for robust cross-platform utilities (`concurrently`).
- **Express 5 Routing Constraints:** Migrating to Express 5 introduced strict routing rules (e.g., wildcard string `/*` deprecation), which we resolved by implementing safer regular expression (`/.*/`) wildcards for SPA React Router fallbacks.
- **AI API Stability:** Balancing API rate limits and strict model naming conventions required robust error handling and fallback logic in our chatbot server.

---

## 🔮 Upcoming Features (Roadmap)

We are constantly working to make AgriAssist the ultimate tool for modern farming. Here is what we are planning next:
- **Offline Mode (PWA):** Access critical farm data, tasks, and calculators even without an internet connection.
- **AI Crop Disease Diagnostics:** A computer-vision model allowing farmers to scan infected leaves using their phone camera and instantly receive treatment recommendations.
- **IoT Data Integration:** Connect AgriAssist with smart soil moisture and temperature sensors for real-time farm monitoring.
- **Hyper-Local Weather Alerts:** SMS or push notifications for incoming extreme weather events (frost, heavy rains, drought warnings) based on exact farm coordinates.
- **Market Price Trends & Forecasting:** Interactive historical graphs and AI predictions for future crop prices to help farmers decide the most profitable time to sell.
