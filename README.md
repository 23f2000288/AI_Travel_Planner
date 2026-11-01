# Roam — AI Travel Planner

A responsive React + Vite travel planner backed by FastAPI. Create day-by-day itineraries, get a suggested trip budget, save plans in your browser, share or print an itinerary, and optionally add AI writing, destination research, and flight data with API keys.

## Run locally

Requirements: Python 3.10+ and Node.js 20+.

1. Copy `.env.example` to `.env`. Add provider keys for AI itineraries and live results. The app still runs without keys and shows a clearly labelled starter itinerary.
2. Install and start the API:

   ```powershell
   py -m venv venv
   .\venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   uvicorn app:app --reload
   ```

3. In a second terminal, start the React development server:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

   Open the URL printed by Vite (usually `http://localhost:5173`). Vite proxies `/api` requests to FastAPI on port 8000.

## Optional API keys

Set these in your local `.env` or in your hosting provider's environment settings—never put them in React code:

| Variable | Enables | Where to get it |
| --- | --- | --- |
| `GROQ_API_KEY` | AI-generated day-by-day itineraries | [console.groq.com](https://console.groq.com/) |
| `TAVILY_API_KEY` | Destination research and linked sources | [app.tavily.com](https://app.tavily.com/) |
| `AVIATIONSTACK_API_KEY` | Flight search when 3-letter IATA airport codes are supplied | [aviationstack.com](https://aviationstack.com/) |
| `GROQ_MODEL` | Optional Groq model override | Defaults to `llama-3.3-70b-versatile` |
| `VITE_API_URL` | API base URL when building a frontend hosted separately; leave unset for the included one-service deployment | Set in the frontend build environment |
| `CORS_ORIGINS` | Comma-separated browser origins allowed by the API when using a separate frontend host | Defaults to local Vite origins |

`GET /api/health` reports whether optional integrations are configured without exposing credentials. `POST /api/plan` validates trip details and returns a structured itinerary, a budget breakdown, optional flights and sources, and any integration warnings. The budget breakdown is an editable planning guide, not a live quote.

## Deploy online with Render

This repository includes a Render Blueprint in `render.yaml`. Push the project to GitHub, create a new Blueprint in Render, and connect the repository. Render will install Python requirements, build the React app, and run FastAPI to serve both the API and the built frontend. Add your provider keys in Render's environment settings; they are marked as secret, unsynchronized values in the Blueprint. The site works without paid API keys, using a labelled starter itinerary.

The React app and API share one origin in production, so no separate frontend host or public API URL is required. Do not commit `.env` or put provider keys in `frontend/`.
