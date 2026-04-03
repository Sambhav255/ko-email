import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import {
  MARKET_CONTEXT,
  MARKETS,
  SEGMENTS,
  SYSTEM_PROMPT,
  buildUserMessage,
} from "@/lib/prompts";
import { extractJsonObject, isEmailPayload } from "@/lib/parse-email-json";

const FULL_SYSTEM = `${SYSTEM_PROMPT}

${MARKET_CONTEXT}`;

export const runtime = "nodejs";

export async function POST(request: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Server missing GEMINI_API_KEY" },
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

  const modelId =
    process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";

  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({
      model: modelId,
      systemInstruction: FULL_SYSTEM,
      generationConfig: {
        maxOutputTokens: 600,
      },
    });

    const userText = buildUserMessage(segment, market);
    const result = await model.generateContent(userText);
    const text = result.response.text();

    const parsed = extractJsonObject(text);
    if (!isEmailPayload(parsed)) {
      return NextResponse.json(
        { error: "Invalid email payload from model" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      subject: parsed.subject,
      body: parsed.body,
    });
  } catch (e) {
    console.error("[generate]", e);
    return NextResponse.json(
      { error: "Generation failed" },
      { status: 502 }
    );
  }
}
