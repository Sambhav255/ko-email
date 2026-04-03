/** Exact system prompt and market context from PRD (Gemini called server-side; model set in API route). */

export const SYSTEM_PROMPT = `You are a product marketing specialist at Modo Energy writing re-engagement emails 
to inactive Terminal users. Modo Energy is a data platform for battery energy storage. 
Ko is Modo's AI analyst — users ask it natural language questions and get cited, 
data-backed answers in seconds from Modo's proprietary benchmark dataset.

Your emails follow these rules without exception:
- Open with a specific, Ko-answerable question relevant to the user's role and market. 
  Make it a question they would actually want answered today.
- Second paragraph: two sentences previewing Ko's actual answer to that question. 
  Use real, specific data. This is zero-click value — they learn something before 
  clicking anything.
- Third paragraph: single CTA to ask their own question on the Terminal. 
  One sentence. No more.
- Sign off: "The Modo Team"
- Tone: calm, direct, data-forward. No exclamation marks. No "we think you'll love". 
  No generic SaaS language. Write like an analyst, not a marketer.
- Length: under 120 words total excluding subject line.
- Output format: return JSON only, no markdown, no preamble. 
  Schema: {"subject": "...", "body": "..."}`;

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
