/**
 * Gemini may return raw JSON or wrap it in markdown fences; extract a parseable object.
 */
export function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();

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

export function isEmailPayload(
  value: unknown
): value is { subject: string; body: string } {
  if (value === null || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.subject === "string" &&
    typeof o.body === "string" &&
    o.subject.length > 0 &&
    o.body.length > 0
  );
}
