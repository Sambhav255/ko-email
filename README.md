# Ko Re-engagement Campaign Planner

Interactive Next.js dashboard for planning Ko re-engagement campaigns across role segments and power markets.

It includes:

- Single email generation with A/B subject variants
- Full 16-cell campaign generation (4 segments x 4 markets)
- Batch progress tracking and per-cell error visibility
- Segment funnel context panel (mock data)
- Predicted performance panel (mock data)
- Inbox preview modal and copy-to-clipboard flows

The app uses **Groq** via a server-side API route, so API keys never go to the browser.

---

## Current Feature Set

### Single Generate Mode

- Select `Segment` and `Market`
- Generate one email with JSON payload:
  - `subject_a`
  - `subject_a_angle`
  - `subject_b`
  - `subject_b_angle`
  - `body`
- Toggle between Version A / Version B
- Copy the selected version + body
- Preview email in an inbox-style modal

### Batch Campaign Mode

- `Generate Full Campaign` triggers all 16 combinations
- Concurrency-limited execution with retry/backoff for transient errors
- Live progress text: `Generating 16 emails... X/16 complete`
- 4x4 grid with subject previews
- Failed cells show error reason snippets for faster debugging
- Click a successful cell to open detail modal with full content

### Context + Performance Panels

- **Segment Overview** (mock funnel metrics):
  - Signed up
  - Never activated
  - Avg days since signup
- **Predicted performance** (mock benchmarks):
  - Predicted open rate (with 19% industry comparison)
  - Predicted click-to-Ko rate
  - Predicted 7-day return rate

---

## Prompting Rules (Implemented)

Generation is constrained by strict rules in `lib/prompts.ts`, including:

- Opening line is a standalone **bold** question
- Question must be short, specific, and data-free
- Data appears in the answer-preview paragraph
- CTA is fixed to one sentence:
  - `Ask Ko your own question on the Modo Terminal.`
- Tone is analyst-style, direct, and non-marketing
- Banned phrase list enforced in prompt instructions

---

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env template:

```bash
cp .env.example .env.local
```

3. Add your Groq key to `.env.local`:

```bash
GROQ_API_KEY=your_key_here
# optional
# GROQ_MODEL=llama-3.1-8b-instant
```

You can create keys at [Groq Console](https://console.groq.com/keys).

4. Start dev server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

If you change env values, restart `npm run dev`.

---

## Scripts

- `npm run dev` - start development server
- `npm run build` - build production bundle
- `npm run start` - run production server
- `npm run lint` - run ESLint
- `npm run qa:combinations` - print all 16 segment/market pairs

---

## Deploy (Vercel)

1. Import this folder as a Vercel project.
2. Add environment variables in Vercel settings:
   - `GROQ_API_KEY`
   - optional `GROQ_MODEL`
3. Deploy.

The app calls `POST /api/generate` server-side only.

---

## Troubleshooting

- **`Server missing GROQ_API_KEY`**  
  Env var not loaded. Check `.env.local`, then restart dev server.

- **Some batch cells show `Failed`**  
  Usually provider rate limits or transient model failures. Batch mode includes retry/backoff, but failures can still happen under heavy load.

- **JSON generation errors from provider**  
  Route includes a fallback path that retries without strict JSON mode and parses output safely.
