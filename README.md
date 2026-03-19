# AI Resume Interview Simulator

A full-stack application that simulates 1-on-1 technical/behavioral interviews and Group Discussions using AI.

## Features
- **Authentication**: Powered by Supabase.
- **Resume Upload & Parsing**: Extract text from PDF resumes using `pdf-parse`.
- **Dynamic Interview Modes**: Technical Round, Behavioral Round, and simulated Group Discussions.
- **Voice Capabilities**: Live transcriber implemented using Web Speech API; adaptable configuration for OpenAI Whisper/Edge TTS.
- **Group Discussion**: Real-time mock discussions powered by Socket.io and multiple simulated AI candidate personas.
- **Beautiful UI**: Modern, dark-mode, animated interface built with Tailwind CSS, Lucide icons, and Framer Motion.

---

## 🚀 Quick Setup Instructions

Follow these steps exactly to get the project running locally.

### 1. Prerequisite Accounts
You will need API keys/configurations from the following services:
- **Supabase**: Create a free project at [supabase.com](https://supabase.com). Enable Authentication (Email/Password).
- **OpenRouter OR OpenAI**: Used for generating AI interview responses. Create an API key.
- **Groq OR OpenAI**: Used for Whisper STT (optional if relying purely on Web Speech API).

### 2. Configure Environment Variables

#### Backend Server
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Open `backend/.env` and replace the placeholder values with your actual keys:
   - `SUPABASE_URL` and `SUPABASE_ANON_KEY` (from Supabase Project Settings -> API)
   - `LLM_API_KEY` (from OpenRouter or OpenAI)
   - `WHISPER_API_KEY` (from Groq or OpenAI)

#### Frontend Website
1. Navigate to the frontend folder:
   ```bash
   cd ../frontend
   ```
2. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Open `frontend/.env` and configure:
   - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Same as backend)
   - `VITE_API_URL=http://localhost:5000` (Defaults to your local backend)

### 3. Install Dependencies

You must install dependencies for both frontend and backend. 
From the root project directory:

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 4. Start the Application

Open two separate terminal windows.

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
```
*Your backend will start at http://localhost:5000*

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```
*Your frontend will start at http://localhost:5173* (or similar port Vite assigns).

---

## Using the Application
1. Open the frontend URL in your browser.
2. Sign up for a new account using the Supabase Auth integration.
3. Once logged in, upload a PDF resume on the Setup page.
4. Select your desired Job Role, Target Company, and Interview Mode (Technical, HR, or Group Discussion).
5. Click **Launch AI Interview** to begin!

## Tech Stack Overview
- **Frontend**: React (Vite), Tailwind CSS, Zustand, Framer Motion, Axios, Socket.io-client.
- **Backend**: Node.js, Express, Socket.io, Multer, `pdf-parse`, internal connections to OpenRouter/Whisper and Supabase.
- **Database**: Supabase.
