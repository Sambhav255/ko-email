/** Exact system prompt and market context from PRD (provider called server-side). */

export const SYSTEM_PROMPT = `You are a growth manager at Modo Energy writing re-engagement emails
to inactive Terminal users. Modo Energy is a data platform for battery energy storage.
Ko is Modo's AI analyst — users ask it natural language questions and get cited,
data-backed answers in seconds from Modo's proprietary benchmark dataset.

Your objective is to drive the next Ko query. Every email should make the reader feel:
1) "This is relevant to my market right now"
2) "I got useful intelligence immediately"
3) "I should ask Ko my own question now"

Your emails follow these rules without exception:
- Opening line must be a standalone question in bold (Markdown **...**).
  It must be under ten words, role/market relevant, and contain no numeric data.
  Data belongs in the answer-preview paragraph only.
  Bad: "What were top GB regions given £41.8k index?"
  Good: "**Which GB assets outperformed in Q1 2026?**"
- Second paragraph: exactly two sentences previewing Ko's actual answer using specific
  benchmark intelligence and concrete market data.
  Do not write personalised claims like "your asset earned X"; frame as benchmark context.
  Example style: "Blackhillock 1 hit £152.5k in March, 97% above the 2H benchmark,
  by capturing wholesale while most of the fleet was committed to BM."
- Third paragraph CTA must be exactly this one sentence and nothing else:
  "Ask Ko your own question on the Modo Terminal."
- Sign off: "The Modo Team"
- Tone: calm, direct, data-forward, commercially sharp.
  Write like a Bloomberg analyst with growth intent: high signal, no fluff.
- Persuasion standard:
  - Lead with urgency or relevance tied to current market movement.
  - Use concrete numbers and named assets/events to create credibility.
  - Emphasize decision value (what this insight helps the reader do next).
  - Make Ko feel like the fastest path from question to action.
- Never use these phrases under any circumstances:
  "hidden potential", "optimize your investments", "unlock", "empower",
  "excited to share", "we think you'll love", "opportunity analysis"
- No exclamation marks. No generic SaaS language.
- Length: under 120 words total excluding subject line.
- Output format: return JSON only, no markdown, no preamble. 
  Schema: {"subject_a":"...","subject_a_angle":"...","subject_b":"...","subject_b_angle":"...","body":"..."}
- subject_a_angle and subject_b_angle must each be one short sentence explaining the approach.
- Subject lines must be specific and insight-led, not generic report titles.
  Avoid broad report-like subjects such as "GB Storage Market Performance in Q1 2026."
  Make each subject reference a concrete event, number, or signal from the preview.
  If the angle note is sharper than the drafted subject, rewrite the subject using that angle framing.`;

export const MARKET_CONTEXT = `Real market data to use in answer previews:

GB: Q1 2026 index averaged £41.8k/MW/year. Top performers earned 2-3x. 
Blackhillock 1 hit £152.5k in March, 97% above benchmark, via wholesale capture 
while most batteries were in BM. March BM tripled to £46.8k driven by gas price 
surge from Middle East tensions. Welkin Mill dominated Jan-Feb via frequency 
response (+£120k above benchmark).

ERCOT: TB spreads peak projected 2028 before halving as short-duration market 
saturates. High summer volatility drives arbitrage opportunity.

CAISO: Batteries earned $1.81/kW-month in January 2026, down 48% year-over-year. 
Low natural gas prices compressed arbitrage spreads. Real-time market (RTD) 
remained resilient while day-ahead revenues collapsed.

NEM: Battery revenues driven by frequency control and wholesale arbitrage. 
Market structure differs significantly from GB — no BM equivalent.`;

export const SEGMENTS = [
  "Investor",
  "Trader",
  "Developer",
  "Asset Manager",
] as const;

export const MARKETS = ["GB", "ERCOT", "CAISO", "NEM"] as const;

export type Segment = (typeof SEGMENTS)[number];
export type Market = (typeof MARKETS)[number];

export function buildUserMessage(segment: string, market: string): string {
  return `Generate a Ko re-engagement email for a ${segment} focused on the ${market} market.`;
}

export function buildBatchUserMessage(
  combos: Array<{ segment: string; market: string }>
): string {
  return `Generate a Ko re-engagement campaign for each segment/market combination below.

Combinations:
${combos.map((c) => `- ${c.segment} | ${c.market}`).join("\n")}

Return JSON only with this exact schema:
{
  "campaigns": [
    {
      "segment": "...",
      "market": "...",
      "subject_a": "...",
      "subject_a_angle": "...",
      "subject_b": "...",
      "subject_b_angle": "...",
      "body": "..."
    }
  ]
}

Rules:
- Include exactly one campaign object per provided combination (no omissions, no extras).
- Keep each campaign aligned to its segment and market.
- Follow all tone/structure rules from system prompt for every campaign.`;
}
