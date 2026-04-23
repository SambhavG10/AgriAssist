# AgriAssist - AI-Powered Agricultural Assistant

AgriAssist is a modern, web-based platform designed to provide farmers, researchers, and enthusiasts with instant access to agricultural information and a supportive community. At its core is a sophisticated AI chatbot, powered by cutting-edge language models, capable of answering a wide range of farming-related questions.

## ✨ Key Features

- **Modern, Animated Landing Page:** A visually appealing and engaging introduction to the platform.
- **Responsive Dashboard:** A central hub for accessing all features, designed to work seamlessly on all devices.
- **Sophisticated AI Chatbot:** An intelligent assistant for instant agricultural advice.
  - **Text, Speech-to-Text, and Image Uploads:** Flexible input methods to suit your needs.
  - **Conversation History:** Local storage of chats for easy reference.
  - **Message Management:** Delete your own messages from the conversation.
- **Dynamic Community Forum:** A real-time space for users to connect and share knowledge.
  - **Create and Reply to Posts:** Engage in discussions with fellow farmers.
  - **"My Posts" Tab:** Easily view and manage your own contributions.
  - **Real-Time Updates:** See new posts and replies as they happen.
- **Interactive Chat Rooms:** Join or create topic-specific chat rooms for live discussions.
- **Redesigned User Profiles:** A modern, user-friendly interface for managing your profile information.
- **Secure User Authentication:** Safe and secure registration and login powered by Supabase.

## 🛠️ Technology Stack

This project leverages a modern, full-stack serverless architecture:

- **Frontend:**
  - **Framework:** [React](https://react.dev/)
  - **Build Tool:** [Vite](https://vitejs.dev/)
  - **Language:** [TypeScript](https://www.typescriptlang.org/)
  - **UI Components:** [shadcn/ui](https://ui.shadcn.com/)
  - **Styling:** [Tailwind CSS](https://tailwindcss.com/)
  - **Routing:** [React Router](https://reactrouter.com/)

- **Backend (Serverless):**
  - **Platform:** [Supabase](https://supabase.com/)
  - **Database:** Supabase Postgres
  - **Authentication:** Supabase Auth
  - **Storage:** Supabase Storage (for image uploads)
  - **Edge Functions:** Deno-based serverless functions for running backend logic.

- **AI & Machine Learning:**
  - **Chat AI Engine:** Supabase Edge Function connected to a powerful AI model.
  - **Speech-to-Text:** [Hugging Face Inference API](https://huggingface.co/inference-api) running the `distil-whisper/distil-large-v2` model.

## 🚀 Getting Started

To set up and run this project locally, you will need Node.js, npm, and the Supabase CLI installed.

1. **Clone the repository:**

   ```sh
   git clone <YOUR_GIT_URL>
   cd agriassist
   ```

2. **Install dependencies:**

   ```sh
   npm install
   ```

3. **Set up Supabase:**

   - Log in to the Supabase CLI:

     ```sh
     npx supabase login
     ```

   - Link your local repository to your Supabase project:

     ```sh
     npx supabase link --project-ref <YOUR_PROJECT_ID>
     ```

   - Start the local Supabase services (this requires Docker to be running):

     ```sh
     npx supabase start
     ```

4. **Configure Environment Variables:**

   - Create a `.env` file in the root of the project.
   - Add your Supabase and other API credentials. You can get these from your Supabase project dashboard.

     ```env
     VITE_SUPABASE_URL="https://<YOUR_PROJECT_ID>.supabase.co"
     VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
     ```

5. **Set up API Keys for Deployed Functions:**

   - For deployed functions to work, you must set the Hugging Face API key as a secret in your Supabase project:

     ```sh
     npx supabase secrets set HUGGINGFACE_API_KEY="your_hf_token_here"
     ```

6. **Run the development server:**

   ```sh
   npm run dev
   ```

   The application will be available at `http://localhost:5173`.
