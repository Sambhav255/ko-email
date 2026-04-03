import { NextResponse } from "next/server";
import {
  MARKET_CONTEXT,
  MARKETS,
  SEGMENTS,
  SYSTEM_PROMPT,
  buildBatchUserMessage,
  buildUserMessage,
} from "@/lib/prompts";
import {
  extractJsonObject,
  isBatchCampaignPayload,
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

type Combo = { segment: string; market: string };

function comboId(c: Combo): string {
  return `${c.segment}||${c.market}`;
}

function normalizeCampaign(
  item: unknown
): (Combo & {
  subject_a: string;
  subject_a_angle: string;
  subject_b: string;
  subject_b_angle: string;
  body: string;
}) | null {
  if (item === null || typeof item !== "object") return null;
  const c = item as Record<string, unknown>;
  if (
    typeof c.segment !== "string" ||
    typeof c.market !== "string" ||
    typeof c.subject_a !== "string" ||
    typeof c.subject_a_angle !== "string" ||
    typeof c.subject_b !== "string" ||
    typeof c.subject_b_angle !== "string" ||
    typeof c.body !== "string"
  ) {
    return null;
  }
  return {
    segment: c.segment,
    market: c.market,
    subject_a: c.subject_a,
    subject_a_angle: c.subject_a_angle,
    subject_b: c.subject_b,
    subject_b_angle: c.subject_b_angle,
    body: c.body,
  };
}

async function callGroq(
  key: string,
  modelId: string,
  systemText: string,
  userText: string,
  forceTextMode = false,
  maxTokens = 600
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
      max_tokens: maxTokens,
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

  const mode =
    typeof body === "object" && body !== null && "mode" in body
      ? (body as { mode: unknown }).mode
      : "single";
  const segment =
    typeof body === "object" && body !== null && "segment" in body
      ? (body as { segment: unknown }).segment
      : undefined;
  const market =
    typeof body === "object" && body !== null && "market" in body
      ? (body as { market: unknown }).market
      : undefined;

  const combinations =
    typeof body === "object" && body !== null && "combinations" in body
      ? (body as { combinations: unknown }).combinations
      : undefined;

  if (mode !== "single" && mode !== "batch") {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  if (mode === "single") {
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
  }

  if (mode === "batch") {
    if (!Array.isArray(combinations) || combinations.length === 0) {
      return NextResponse.json(
        { error: "Invalid combinations array" },
        { status: 400 }
      );
    }
    const invalid = combinations.some((c) => {
      if (c === null || typeof c !== "object") return true;
      const item = c as { segment?: unknown; market?: unknown };
      return (
        typeof item.segment !== "string" ||
        typeof item.market !== "string" ||
        !SEGMENTS.includes(item.segment as (typeof SEGMENTS)[number]) ||
        !MARKETS.includes(item.market as (typeof MARKETS)[number])
      );
    });
    if (invalid) {
      return NextResponse.json(
        { error: "Invalid combinations payload" },
        { status: 400 }
      );
    }
  }

  const modelId = process.env.GROQ_MODEL?.trim() || "llama-3.1-8b-instant";

  try {
    const requestedCombos =
      mode === "batch"
        ? (combinations as Array<{ segment: string; market: string }>).map((c) => ({
            segment: c.segment,
            market: c.market,
          }))
        : [];
    const userText =
      mode === "batch"
        ? buildBatchUserMessage(requestedCombos)
        : buildUserMessage(segment as string, market as string);
    const maxTokens = mode === "batch" ? 2400 : 600;
    let result = await callGroq(
      key,
      modelId,
      FULL_SYSTEM,
      userText,
      false,
      maxTokens
    );
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
        result = await callGroq(
          key,
          modelId,
          retrySystem,
          userText,
          true,
          maxTokens
        );
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
    if (mode === "batch") {
      if (!isBatchCampaignPayload(parsed)) {
        return NextResponse.json(
          { error: "Invalid batch payload from model" },
          { status: 502 }
        );
      }
      const byCombo = new Map<
        string,
        Combo & {
          subject_a: string;
          subject_a_angle: string;
          subject_b: string;
          subject_b_angle: string;
          body: string;
        }
      >();
      for (const item of parsed.campaigns) {
        const n = normalizeCampaign(item);
        if (!n) continue;
        byCombo.set(comboId(n), n);
      }

      const missing = requestedCombos.filter((c) => !byCombo.has(comboId(c)));

      // One client request should yield complete grid. If model omits items, auto-repair.
      if (missing.length > 0) {
        const repairSystem = `${FULL_SYSTEM}

You are repairing missing campaign rows. Return only missing combinations.
Do not repeat already generated combinations.`;
        const repairPrompt = buildBatchUserMessage(missing);
        let repair = await callGroq(
          key,
          modelId,
          repairSystem,
          repairPrompt,
          false,
          Math.max(1000, missing.length * 260)
        );
        if (!repair.ok) {
          repair = await callGroq(
            key,
            modelId,
            `${repairSystem}
IMPORTANT: Return only valid JSON.`,
            repairPrompt,
            true,
            Math.max(1000, missing.length * 260)
          );
        }
        if (repair.ok) {
          const repairText = repair.payload.choices?.[0]?.message?.content?.trim() || "";
          if (repairText) {
            const repairParsed = extractJsonObject(repairText);
            if (isBatchCampaignPayload(repairParsed)) {
              for (const item of repairParsed.campaigns) {
                const n = normalizeCampaign(item);
                if (!n) continue;
                byCombo.set(comboId(n), n);
              }
            }
          }
        }
      }

      const campaigns = requestedCombos
        .map((c) => byCombo.get(comboId(c)))
        .filter((x): x is NonNullable<typeof x> => Boolean(x));

      return NextResponse.json({ campaigns });
    }

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
