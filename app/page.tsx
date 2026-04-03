"use client";

import { useState } from "react";
import { MARKETS, SEGMENTS } from "@/lib/prompts";

type Segment = (typeof SEGMENTS)[number];
type Market = (typeof MARKETS)[number];

export default function Home() {
  const [segment, setSegment] = useState<Segment>("Investor");
  const [market, setMarket] = useState<Market>("GB");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState<string | null>(null);
  const [body, setBody] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setSubject(null);
    setBody(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segment, market }),
      });
      const data: unknown = await res.json();
      if (!res.ok || !data || typeof data !== "object") {
        throw new Error("bad response");
      }
      const o = data as Record<string, unknown>;
      if (typeof o.subject !== "string" || typeof o.body !== "string") {
        throw new Error("invalid payload");
      }
      setSubject(o.subject);
      setBody(o.body);
    } catch {
      setError("Generation failed — try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard() {
    if (subject === null || body === null) return;
    const text = `Subject: ${subject}\n\n${body}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setError("Could not copy — try again.");
    }
  }

  const showCard = subject !== null && body !== null;

  return (
    <div className="min-h-full flex flex-col bg-[var(--surface)] text-[var(--ink)]">
      <main className="flex flex-1 flex-col items-center px-4 py-12 sm:py-16">
        <div className="w-full max-w-xl space-y-10">
          <header className="space-y-2 text-center sm:text-left">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
              Modo Terminal
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--ink)] sm:text-3xl">
              Ko re-engagement email
            </h1>
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              Pick a segment and market, then generate a ready-to-send email with a
              Ko-answerable opener and a two-sentence answer preview.
            </p>
          </header>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium text-[var(--ink)]">
              Segment
              <select
                className="rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
                value={segment}
                onChange={(e) => setSegment(e.target.value as Segment)}
                disabled={loading}
              >
                {SEGMENTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium text-[var(--ink)]">
              Market
              <select
                className="rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
                value={market}
                onChange={(e) => setMarket(e.target.value as Market)}
                disabled={loading}
              >
                {MARKETS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                    aria-hidden
                  />
                  Generating…
                </span>
              ) : (
                "Generate Email"
              )}
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          {showCard && (
            <section className="space-y-4">
              <div className="rounded-xl border border-[var(--border)] bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Subject
                </h2>
                <p className="mb-6 font-medium text-[var(--ink)]">{subject}</p>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Body
                </h2>
                <pre className="whitespace-pre-wrap font-[family-name:var(--font-body)] text-sm leading-relaxed text-[var(--ink)]">
                  {body}
                </pre>
                <div className="mt-6 flex justify-end border-t border-[var(--border)] pt-4">
                  <button
                    type="button"
                    onClick={copyToClipboard}
                    className="text-sm font-medium text-[var(--accent)] underline-offset-4 hover:underline"
                  >
                    Copy to clipboard
                  </button>
                </div>
              </div>
              <p className="text-center text-xs text-[var(--track)] sm:text-left">
                Track: open rate / click-to-Ko rate / 7-day return rate
              </p>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
