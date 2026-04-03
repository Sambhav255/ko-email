import { NextResponse } from "next/server";
import {
  MARKET_CONTEXT,
  MARKETS,
  SEGMENTS,
  SYSTEM_PROMPT,
  buildUserMessage,
} from "@/lib/prompts";
import {
  extractJsonObject,
  isCampaignEmailPayload,
} from "@/lib/parse-email-json";

const FULL_SYSTEM = `${SYSTEM_PROMPT}

${MARKET_CONTEXT}`;

export const runtime = "nodejs";

type GroqPayload = {
  code?: string;
  error?: { message?: string } | string;
  message?: string;
  choices?: Array<{ message?: { content?: string | null } }>;
};

async function callGroq(
  key: string,
  modelId: string,
  systemText: string,
  userText: string,
  forceTextMode = false
): Promise<{ ok: boolean; payload: GroqPayload; status: number }> {
  const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: "system", content: systemText },
        { role: "user", content: userText },
      ],
      max_tokens: 600,
      ...(forceTextMode ? {} : { response_format: { type: "json_object" } }),
    }),
  });
  const payload = (await resp.json()) as GroqPayload;
  return { ok: resp.ok, payload, status: resp.status };
}

export async function POST(request: Request) {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Server missing GROQ_API_KEY" },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const segment =
    typeof body === "object" && body !== null && "segment" in body
      ? (body as { segment: unknown }).segment
      : undefined;
  const market =
    typeof body === "object" && body !== null && "market" in body
      ? (body as { market: unknown }).market
      : undefined;

  if (
    typeof segment !== "string" ||
    !SEGMENTS.includes(segment as (typeof SEGMENTS)[number])
  ) {
    return NextResponse.json({ error: "Invalid segment" }, { status: 400 });
  }
  if (
    typeof market !== "string" ||
    !MARKETS.includes(market as (typeof MARKETS)[number])
  ) {
    return NextResponse.json({ error: "Invalid market" }, { status: 400 });
  }

  const modelId = process.env.GROQ_MODEL?.trim() || "llama-3.1-8b-instant";

  try {
    const userText = buildUserMessage(segment, market);
    let result = await callGroq(key, modelId, FULL_SYSTEM, userText, false);
    if (!result.ok) {
      const firstMsg =
        (typeof result.payload.error === "string" && result.payload.error.trim()) ||
        (typeof result.payload.error === "object" &&
          result.payload.error !== null &&
          typeof result.payload.error.message === "string" &&
          result.payload.error.message.trim()) ||
        (typeof result.payload.message === "string" && result.payload.message.trim()) ||
        "";

      // Some Groq models fail strict JSON mode ("failed_generation"). Retry text mode.
      if (
        result.status === 400 &&
        (firstMsg.includes("Failed to generate JSON") ||
          firstMsg.includes("failed_generation"))
      ) {
        const retrySystem = `${FULL_SYSTEM}

IMPORTANT: Return ONLY a valid JSON object with this exact schema:
{"subject_a":"...","subject_a_angle":"...","subject_b":"...","subject_b_angle":"...","body":"..."}
No markdown, no code fences, no extra keys, no commentary.`;
        result = await callGroq(key, modelId, retrySystem, userText, true);
      }
    }

    const payload = result.payload;
    if (!result.ok) {
      const msg =
        (typeof payload.error === "string" && payload.error.trim()) ||
        (typeof payload.error === "object" &&
          payload.error !== null &&
          typeof payload.error.message === "string" &&
          payload.error.message.trim()) ||
        (typeof payload.message === "string" && payload.message.trim()) ||
        "Groq API request failed";
      return NextResponse.json({ error: `Groq: ${msg}` }, { status: 502 });
    }

    const text = payload.choices?.[0]?.message?.content?.trim() || "";
    if (!text) {
      return NextResponse.json(
        { error: "Empty model response" },
        { status: 502 }
      );
    }

    const parsed = extractJsonObject(text);
    if (!isCampaignEmailPayload(parsed)) {
      return NextResponse.json(
        { error: "Invalid email payload from model" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      subject_a: parsed.subject_a,
      subject_a_angle: parsed.subject_a_angle,
      subject_b: parsed.subject_b,
      subject_b_angle: parsed.subject_b_angle,
      body: parsed.body,
    });
  } catch (e) {
    console.error("[generate]", e);
    const raw =
      e instanceof Error
        ? e.message
        : typeof e === "object" && e !== null && "message" in e
          ? String((e as { message: unknown }).message)
          : String(e);
    const safe =
      raw.length > 280 ? `${raw.slice(0, 280)}…` : raw;
    return NextResponse.json(
      {
        error:
          safe.length > 0
            ? `Groq: ${safe}`
            : "Generation failed — try again.",
      },
      { status: 502 }
    );
  }
}
