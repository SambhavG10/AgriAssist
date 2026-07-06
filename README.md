# 🌱 AgriAssist – AI-Powered Agricultural Assistant

An intelligent full-stack web platform that empowers farmers with AI-driven crop guidance, weather insights, live market prices, government schemes, and a collaborative farming community.

Built using **React, Vite, TypeScript, Node.js, Express, Supabase, Tailwind CSS**, and powered by **Google Gemini AI** to deliver a modern and accessible digital farming experience.

---

## 🌐 Live Demo

**🔗 Live Application:** https://agriassist-frontend-u9gr.onrender.com

---

# ✨ Key Features

## 🤖 AI-Powered Agricultural Assistant

* Multi-language AI chatbot powered by **Google Gemini AI**
* Personalized crop guidance based on user inputs
* Speech-to-Text support using **Hugging Face Whisper**
* Image upload support for crop-related queries
* Context-aware agricultural recommendations

---

## 🌦 Weather Insights

* Real-time weather forecasts
* Location-based weather information
* Farming recommendations based on weather conditions
* Early awareness for adverse weather situations

---

## 📈 Live Market Prices

* Real-time agricultural commodity prices
* Easy access to crop market information
* Supports better selling and planning decisions

---

## 🌾 Farmer Productivity Toolkit

* Daily farming task manager
* Crop planning assistance
* Seed rate calculator
* Fertilizer conversion calculator
* Yield estimation tools

---

## 🏛 Government Schemes

* Browse agricultural schemes
* Explore farmer subsidies
* Access government welfare initiatives

---

## 🌍 Community Platform

* Create and share community posts
* Participate in farming discussions
* "My Posts" dashboard
* Real-time chat rooms
* Knowledge sharing among farmers

---

## 🔐 Secure Authentication

* Supabase Authentication
* Passwordless login
* Magic Link Authentication
* WebAuthn / Biometric Authentication
* Secure user profile management

---

## 📱 Responsive Design

* Mobile-first interface
* Optimized for desktop, tablet, and smartphones
* Clean UI built using Tailwind CSS and shadcn/ui

---

# 🛠️ Technology Stack

### Frontend

* React
* Vite
* TypeScript
* Tailwind CSS
* shadcn/ui
* React Router

### Backend

* Node.js
* Express.js

### Database & Backend Services

* Supabase PostgreSQL
* Supabase Authentication
* Supabase Storage
* Supabase Realtime

### AI & External APIs

* Google Gemini AI (gemini-2.5-flash)
* Hugging Face Whisper API
* OpenWeatherMap API

---

# 🏗️ System Overview

```text
                           User
                             │
                             ▼
                   React + Vite Frontend
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
     Express API        Google Gemini       Supabase
          │                  │                  │
          │                  │                  ├── Authentication
          │                  │                  ├── PostgreSQL Database
          │                  │                  ├── Storage
          │                  │                  └── Realtime Services
          ▼
 OpenWeatherMap API • Hugging Face Whisper • Market Data
```

---

# 🚀 Getting Started

## Prerequisites

* Node.js (v18 or above)
* Git

---

## Clone the Repository

```bash
git clone https://github.com/sanjay-dtu/AgriAssist.git

cd AgriAssist

npm install
```

---

## Environment Variables

Create a `.env` file in the project root.

```env
# Supabase Configuration
VITE_SUPABASE_URL=

VITE_SUPABASE_PUBLISHABLE_KEY=

SUPABASE_SERVICE_ROLE_KEY=

# Google Gemini AI
VITE_GEMINI_API_KEY=

GEMINI_API_KEY=

# Weather API
OPENWEATHERMAP_API_KEY=

# Speech-to-Text
HUGGINGFACE_API_KEY=
```

---

## Run Locally

```bash
npm start
```

Frontend

```text
http://localhost:8080
```

Backend

```text
http://localhost:3000
```

---

# ☁️ Deployment

The application is deployed on **Render** using a unified deployment architecture where the Express server serves both the backend APIs and the React frontend.

**Live URL**

https://agriassist-frontend-u9gr.onrender.com

---

# 🚧 Challenges Faced

Developing **AgriAssist** involved solving several practical challenges that are common in modern AI-powered full-stack applications.

### 🔄 Frontend & Backend Integration

Coordinating communication between the React frontend and Express backend required careful API design, routing, and asynchronous request handling. Ensuring smooth data flow across multiple modules while maintaining responsiveness was one of the key development challenges.

---

### 🌐 Production Deployment

Deploying the application was significantly different from running it locally. Configuring the project for Render, defining appropriate build and start commands, managing environment variables securely, and ensuring both frontend and backend worked together in production required multiple deployment iterations before achieving a stable setup.

---

### 🔐 Secure API Key Management

The platform integrates multiple third-party services including Google Gemini AI, Supabase, OpenWeatherMap, and Hugging Face. Keeping API keys secure while allowing seamless communication required moving sensitive operations to the backend and using environment variables instead of exposing credentials on the client side.

---

### 🤖 AI Response Reliability

AI-generated responses can sometimes be delayed or return unexpected results. Proper validation, error handling, and fallback mechanisms were implemented to improve reliability and provide users with meaningful feedback even when external AI services encounter issues.

---

### 🗄 Managing Real-Time Features

Building community discussions and chat rooms required synchronizing user-generated content across multiple clients in real time. Implementing these features using Supabase Realtime while maintaining consistency and performance presented an important architectural challenge.

---

### 📱 Responsive User Experience

Creating a seamless experience across desktops, tablets, and smartphones involved extensive UI optimization and testing. The interface was carefully designed to remain intuitive and accessible regardless of screen size.

---

### ⚙ Cross-Platform Development

The project was developed with compatibility in mind, ensuring that development and execution worked reliably across Windows, macOS, and Linux by avoiding operating system-specific dependencies and adopting cross-platform tooling.

---

### 📈 Scalability & Maintainability

As features such as AI assistance, weather forecasting, market prices, calculators, authentication, and community modules were integrated, maintaining a modular architecture became essential. Reusable components, organized folder structures, and well-defined backend services were adopted to simplify future development and maintenance.

---

# 🔮 Upcoming Features (Roadmap)

We are constantly working to make AgriAssist the ultimate tool for modern farming. Here is what we are planning next:

* **Offline Mode (PWA):** Access critical farm data, tasks, and calculators even without an internet connection.
* **AI Crop Disease Diagnostics:** A computer-vision model allowing farmers to scan infected leaves using their phone camera and instantly receive treatment recommendations.
* **IoT Data Integration:** Connect AgriAssist with smart soil moisture and temperature sensors for real-time farm monitoring.
* **Hyper-Local Weather Alerts:** SMS or push notifications for incoming extreme weather events (frost, heavy rains, drought warnings) based on exact farm coordinates.
* **Market Price Trends & Forecasting:** Interactive historical graphs and AI predictions for future crop prices to help farmers decide the most profitable time to sell.
