/**
 * Gemini may return raw JSON or wrap it in markdown fences; extract a parseable object.
 */
export function extractJsonObject(raw: string): unknown {
  const trimmed = raw.replace(/^\uFEFF/, "").trim();

  const tryParse = (s: string) => {
    const t = s.trim();
    return JSON.parse(t) as unknown;
  };

  try {
    return tryParse(trimmed);
  } catch {
    // try fenced block
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced?.[1]) {
      return tryParse(fenced[1]);
    }
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return tryParse(trimmed.slice(start, end + 1));
    }
    throw new Error("No JSON object found in model output");
  }
}

export type CampaignEmailPayload = {
  subject_a: string;
  subject_a_angle: string;
  subject_b: string;
  subject_b_angle: string;
  body: string;
};

export function isCampaignEmailPayload(
  value: unknown
): value is CampaignEmailPayload {
  if (value === null || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.subject_a === "string" &&
    typeof o.subject_a_angle === "string" &&
    typeof o.subject_b === "string" &&
    typeof o.subject_b_angle === "string" &&
    typeof o.body === "string" &&
    o.subject_a.trim().length > 0 &&
    o.subject_b.trim().length > 0 &&
    o.body.trim().length > 0
  );
}
