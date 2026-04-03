# Ko re-engagement email generator

Single-page Next.js app that generates personalised Ko re-engagement emails for inactive Terminal users. Uses the **Gemini API** on the server so your API key stays private.

## Setup

1. Copy environment variables:

   ```bash
   cp .env.example .env.local
   ```

2. Add your Gemini API key to `.env.local` as `GEMINI_API_KEY`. Create a key in [Google AI Studio](https://aistudio.google.com/apikey).

3. Install and run:

   ```bash
   npm install
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

## Deploy on Vercel

1. Push this folder to a Git repository and import the project in [Vercel](https://vercel.com).

2. In the project **Settings → Environment Variables**, add:

   - `GEMINI_API_KEY` — your Gemini API key (Production, Preview, and Development as needed).

3. Optionally set `GEMINI_MODEL` (defaults to `gemini-2.0-flash`).

4. Deploy. The app calls `POST /api/generate` on the server; no key is sent to the browser.

## Manual QA

Test all **16** combinations (4 segments × 4 markets): Investor, Trader, Developer, Asset Manager × GB, ERCOT, CAISO, NEM. Each run should return JSON with `subject` and `body`, and the UI should show the card and tracking line.

## Scripts

- `npm run dev` — development server  
- `npm run build` — production build  
- `npm run start` — production server (after build)  
- `npm run lint` — ESLint  
