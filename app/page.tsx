"use client";

import { useState } from "react";
import { MARKETS, SEGMENTS } from "@/lib/prompts";

type Segment = (typeof SEGMENTS)[number];
type Market = (typeof MARKETS)[number];
type SubjectVersion = "A" | "B";
type Key = `${Segment}-${Market}`;
type EmailPayload = {
  subject_a: string;
  subject_a_angle: string;
  subject_b: string;
  subject_b_angle: string;
  body: string;
};

const funnelData: Record<Key, { signedUp: number; neverActivated: number; avgDays: number }> = {
  "Investor-GB": { signedUp: 428, neverActivated: 201, avgDays: 21 },
  "Investor-ERCOT": { signedUp: 334, neverActivated: 178, avgDays: 25 },
  "Investor-CAISO": { signedUp: 289, neverActivated: 155, avgDays: 22 },
  "Investor-NEM": { signedUp: 134, neverActivated: 79, avgDays: 28 },
  "Trader-GB": { signedUp: 312, neverActivated: 187, avgDays: 14 },
  "Trader-ERCOT": { signedUp: 203, neverActivated: 134, avgDays: 18 },
  "Trader-CAISO": { signedUp: 167, neverActivated: 98, avgDays: 16 },
  "Trader-NEM": { signedUp: 89, neverActivated: 61, avgDays: 19 },
  "Developer-GB": { signedUp: 156, neverActivated: 89, avgDays: 9 },
  "Developer-ERCOT": { signedUp: 144, neverActivated: 84, avgDays: 12 },
  "Developer-CAISO": { signedUp: 138, neverActivated: 80, avgDays: 11 },
  "Developer-NEM": { signedUp: 76, neverActivated: 47, avgDays: 13 },
  "Asset Manager-GB": { signedUp: 224, neverActivated: 121, avgDays: 19 },
  "Asset Manager-ERCOT": { signedUp: 176, neverActivated: 96, avgDays: 21 },
  "Asset Manager-CAISO": { signedUp: 165, neverActivated: 92, avgDays: 20 },
  "Asset Manager-NEM": { signedUp: 96, neverActivated: 57, avgDays: 23 },
};

const perfData: Record<Key, { open: string; click: string; ret: string }> = {
  "Investor-GB": { open: "36%", click: "21%", ret: "15%" },
  "Investor-ERCOT": { open: "35%", click: "20%", ret: "14%" },
  "Investor-CAISO": { open: "34%", click: "19%", ret: "13%" },
  "Investor-NEM": { open: "33%", click: "18%", ret: "12%" },
  "Trader-GB": { open: "38%", click: "22%", ret: "16%" },
  "Trader-ERCOT": { open: "37%", click: "21%", ret: "15%" },
  "Trader-CAISO": { open: "36%", click: "20%", ret: "14%" },
  "Trader-NEM": { open: "35%", click: "19%", ret: "13%" },
  "Developer-GB": { open: "32%", click: "17%", ret: "11%" },
  "Developer-ERCOT": { open: "31%", click: "16%", ret: "10%" },
  "Developer-CAISO": { open: "30%", click: "15%", ret: "9%" },
  "Developer-NEM": { open: "29%", click: "14%", ret: "8%" },
  "Asset Manager-GB": { open: "35%", click: "20%", ret: "14%" },
  "Asset Manager-ERCOT": { open: "34%", click: "19%", ret: "13%" },
  "Asset Manager-CAISO": { open: "33%", click: "18%", ret: "12%" },
  "Asset Manager-NEM": { open: "32%", click: "17%", ret: "11%" },
};

function comboKey(segment: Segment, market: Market): Key {
  return `${segment}-${market}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function Home() {
  const [segment, setSegment] = useState<Segment>("Investor");
  const [market, setMarket] = useState<Market>("GB");
  const [loading, setLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchDone, setBatchDone] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [singleEmail, setSingleEmail] = useState<EmailPayload | null>(null);
  const [singleVersion, setSingleVersion] = useState<SubjectVersion>("A");
  const [batchResults, setBatchResults] = useState<
    Partial<Record<Key, { email?: EmailPayload; error?: string }>>
  >({});
  const [selectedBatch, setSelectedBatch] = useState<{
    segment: Segment;
    market: Market;
    email: EmailPayload;
  } | null>(null);
  const [batchVersion, setBatchVersion] = useState<SubjectVersion>("A");
  const [previewEmail, setPreviewEmail] = useState<{
    segment: Segment;
    market: Market;
    email: EmailPayload;
    version: SubjectVersion;
  } | null>(null);

  async function generateOne(s: Segment, m: Market): Promise<EmailPayload> {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segment: s, market: m }),
    });
    const data = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      throw new Error(typeof data.error === "string" ? data.error : "Generation failed — try again.");
    }
    if (
      typeof data.subject_a !== "string" ||
      typeof data.subject_a_angle !== "string" ||
      typeof data.subject_b !== "string" ||
      typeof data.subject_b_angle !== "string" ||
      typeof data.body !== "string"
    ) {
      throw new Error("Generation failed — try again.");
    }
    return {
      subject_a: data.subject_a,
      subject_a_angle: data.subject_a_angle,
      subject_b: data.subject_b,
      subject_b_angle: data.subject_b_angle,
      body: data.body,
    };
  }

  async function generateOneWithRetry(
    s: Segment,
    m: Market,
    attempts = 3
  ): Promise<EmailPayload> {
    let lastError: unknown;
    for (let i = 1; i <= attempts; i += 1) {
      try {
        return await generateOne(s, m);
      } catch (e) {
        lastError = e;
        const message = e instanceof Error ? e.message : String(e);
        const isRetryable =
          message.includes("429") ||
          message.includes("rate limit") ||
          message.includes("temporarily") ||
          message.includes("failed_generation") ||
          message.includes("Failed to generate JSON");
        if (!isRetryable || i === attempts) break;
        await sleep(350 * i);
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error("Generation failed — try again.");
  }

  async function handleGenerateEmail() {
    setLoading(true);
    setError(null);
    setSingleEmail(null);
    setSingleVersion("A");
    try {
      const email = await generateOne(segment, market);
      setSingleEmail(email);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed — try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateBatch() {
    setBatchLoading(true);
    setBatchDone(0);
    setError(null);
    setBatchResults({});
    setSelectedBatch(null);
    const jobs = SEGMENTS.flatMap((s) => MARKETS.map((m) => ({ s, m })));
    const concurrency = 4;
    let cursor = 0;

    async function worker() {
      while (cursor < jobs.length) {
        const idx = cursor;
        cursor += 1;
        const { s, m } = jobs[idx];
        const k = comboKey(s, m);
        try {
          const email = await generateOneWithRetry(s, m, 3);
          setBatchResults((prev) => ({ ...prev, [k]: { email } }));
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Generation failed — try again.";
          setBatchResults((prev) => ({ ...prev, [k]: { error: msg } }));
        } finally {
          setBatchDone((x) => x + 1);
        }
      }
    }

    await Promise.all(Array.from({ length: concurrency }, () => worker()));
    setBatchLoading(false);
  }

  async function copyEmail(email: EmailPayload, version: SubjectVersion) {
    const subject = version === "A" ? email.subject_a : email.subject_b;
    try {
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${email.body}`);
    } catch {
      setError("Could not copy — try again.");
    }
  }

  const key = comboKey(segment, market);
  const funnel = funnelData[key];
  const perf = perfData[key];
  const singleSubject =
    singleEmail && (singleVersion === "A" ? singleEmail.subject_a : singleEmail.subject_b);
  const singleAngle =
    singleEmail &&
    (singleVersion === "A" ? singleEmail.subject_a_angle : singleEmail.subject_b_angle);

  return (
    <div className="min-h-full flex flex-col bg-[var(--background)] text-[var(--ink)]">
      <main className="flex flex-1 flex-col items-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-6xl space-y-8">
          <header className="space-y-3">
            <p className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Modo Terminal
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight sm:text-4xl">
              Ko re-engagement email
            </h1>
            <p className="max-w-3xl text-sm leading-relaxed text-[var(--muted)]">
              Plan single sends or a full 16-cell campaign with A/B subject variants,
              funnel context, and predicted performance.
            </p>
          </header>

          <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="space-y-6">
              <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_10px_26px_rgba(15,35,32,0.05)]">
                <div className="space-y-4">
                  <label className="flex flex-col gap-1.5 text-sm font-medium">
                    Segment
                    <select
                      className="rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-[var(--ink)]"
                      value={segment}
                      onChange={(e) => setSegment(e.target.value as Segment)}
                      disabled={loading || batchLoading}
                    >
                      {SEGMENTS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium">
                    Market
                    <select
                      className="rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-[var(--ink)]"
                      value={market}
                      onChange={(e) => setMarket(e.target.value as Market)}
                      disabled={loading || batchLoading}
                    >
                      {MARKETS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleGenerateEmail}
                    disabled={loading || batchLoading}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white"
                  >
                    {loading ? "Generating…" : "Generate Email"}
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateBatch}
                    disabled={loading || batchLoading}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-5 py-2.5 text-sm font-semibold"
                  >
                    {batchLoading ? "Generating Full Campaign…" : "Generate Full Campaign"}
                  </button>
                </div>
                {batchLoading && (
                  <p className="mt-3 text-sm text-[var(--muted)]">
                    Generating 16 emails... {batchDone}/16 complete.
                  </p>
                )}
              </section>

              <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_10px_26px_rgba(15,35,32,0.05)]">
                <h2 className="text-sm font-semibold">Segment Overview</h2>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Mock funnel data for demo planning.
                </p>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-lg bg-[var(--surface-muted)] px-3 py-2">
                    <p className="text-xs text-[var(--muted)]">Signed up</p>
                    <p className="text-lg font-semibold">{funnel.signedUp}</p>
                  </div>
                  <div className="rounded-lg bg-[var(--surface-muted)] px-3 py-2">
                    <p className="text-xs text-[var(--muted)]">Never activated</p>
                    <p className="text-lg font-semibold">{funnel.neverActivated}</p>
                  </div>
                  <div className="rounded-lg bg-[var(--surface-muted)] px-3 py-2">
                    <p className="text-xs text-[var(--muted)]">Avg days since signup</p>
                    <p className="text-lg font-semibold">{funnel.avgDays}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_10px_26px_rgba(15,35,32,0.05)]">
                <h3 className="text-sm font-semibold">Predicted performance</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  <div className="rounded-lg bg-[var(--surface-muted)] px-3 py-2">
                    <p className="text-xs text-[var(--muted)]">Predicted open rate</p>
                    <p className="text-lg font-semibold">{perf.open}</p>
                    <p className="text-xs text-[var(--muted)]">
                      (vs 19% industry average for re-engagement emails)
                    </p>
                  </div>
                  <div className="rounded-lg bg-[var(--surface-muted)] px-3 py-2">
                    <p className="text-xs text-[var(--muted)]">Predicted click-to-Ko rate</p>
                    <p className="text-lg font-semibold">{perf.click}</p>
                  </div>
                  <div className="rounded-lg bg-[var(--surface-muted)] px-3 py-2">
                    <p className="text-xs text-[var(--muted)]">Predicted 7-day return rate</p>
                    <p className="text-lg font-semibold">{perf.ret}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-[var(--muted)]">
                  Estimates based on personalised opener with zero-click value and single CTA. Track actuals after send.
                </p>
              </section>
            </aside>

            <section className="space-y-6">
              {error && (
                <p className="text-sm text-red-700" role="alert" aria-live="polite">
                  {error}
                </p>
              )}

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_10px_26px_rgba(15,35,32,0.05)]">
                <h2 className="mb-3 text-sm font-semibold">Campaign grid (4x4)</h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr>
                        <th className="border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-left">
                          Segment \ Market
                        </th>
                        {MARKETS.map((m) => (
                          <th key={m} className="border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-left">
                            {m}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {SEGMENTS.map((s) => (
                        <tr key={s}>
                          <th className="border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-left font-medium">
                            {s}
                          </th>
                          {MARKETS.map((m) => {
                            const item = batchResults[comboKey(s, m)];
                            const label =
                              item?.email?.subject_a ?? (item?.error ? "Failed" : "—");
                            return (
                              <td key={`${s}-${m}`} className="border border-[var(--border)] px-2 py-2 align-top">
                                <button
                                  type="button"
                                  title={item?.error ?? ""}
                                  className="w-full rounded-lg px-2 py-2 text-left transition hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed"
                                  disabled={!item?.email}
                                  onClick={() =>
                                    item?.email &&
                                    setSelectedBatch({ segment: s, market: m, email: item.email })
                                  }
                                >
                                  <span className="line-clamp-2 text-xs">
                                    {label}
                                  </span>
                                </button>
                                {item?.error && (
                                  <p className="mt-1 line-clamp-1 text-[10px] text-red-700">
                                    {item.error}
                                  </p>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {singleEmail && (
                <section className="space-y-4">
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_10px_26px_rgba(15,35,32,0.05)]">
                    <div className="mb-4 flex items-center gap-2">
                      <button
                        className={`rounded-lg px-3 py-1 text-xs font-semibold ${singleVersion === "A" ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-muted)]"}`}
                        onClick={() => setSingleVersion("A")}
                      >
                        Version A
                      </button>
                      <button
                        className={`rounded-lg px-3 py-1 text-xs font-semibold ${singleVersion === "B" ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-muted)]"}`}
                        onClick={() => setSingleVersion("B")}
                      >
                        Version B
                      </button>
                    </div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Subject</h3>
                    <p className="rounded-lg bg-[var(--surface-muted)] px-3 py-2 font-medium">{singleSubject}</p>
                    <p className="mb-5 mt-2 text-xs text-[var(--muted)]">{singleAngle}</p>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Body</h3>
                    <pre className="whitespace-pre-wrap rounded-lg bg-[var(--surface-muted)] px-3 py-3 text-sm leading-relaxed">
                      {singleEmail.body}
                    </pre>
                    <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-[var(--border)] pt-4">
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewEmail({
                            segment,
                            market,
                            email: singleEmail,
                            version: singleVersion,
                          })
                        }
                        className="text-sm font-medium text-[var(--accent)] underline-offset-4 hover:underline"
                      >
                        Preview in inbox
                      </button>
                      <button
                        type="button"
                        onClick={() => copyEmail(singleEmail, singleVersion)}
                        className="text-sm font-medium text-[var(--accent)] underline-offset-4 hover:underline"
                      >
                        Copy to clipboard
                      </button>
                    </div>
                  </div>

                </section>
              )}
            </section>
          </div>

          {selectedBatch && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
              <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl border border-[var(--border)] bg-white p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    {selectedBatch.segment} · {selectedBatch.market}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSelectedBatch(null)}
                    className="rounded-lg bg-[var(--surface-muted)] px-3 py-1 text-sm"
                  >
                    Close
                  </button>
                </div>
                <div className="mb-4 flex items-center gap-2">
                  <button
                    className={`rounded-lg px-3 py-1 text-xs font-semibold ${batchVersion === "A" ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-muted)]"}`}
                    onClick={() => setBatchVersion("A")}
                  >
                    Version A
                  </button>
                  <button
                    className={`rounded-lg px-3 py-1 text-xs font-semibold ${batchVersion === "B" ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-muted)]"}`}
                    onClick={() => setBatchVersion("B")}
                  >
                    Version B
                  </button>
                </div>
                <p className="rounded-lg bg-[var(--surface-muted)] px-3 py-2 font-medium">
                  {batchVersion === "A" ? selectedBatch.email.subject_a : selectedBatch.email.subject_b}
                </p>
                <p className="mb-4 mt-2 text-xs text-[var(--muted)]">
                  {batchVersion === "A" ? selectedBatch.email.subject_a_angle : selectedBatch.email.subject_b_angle}
                </p>
                <pre className="whitespace-pre-wrap rounded-lg bg-[var(--surface-muted)] px-3 py-3 text-sm leading-relaxed">
                  {selectedBatch.email.body}
                </pre>
                <div className="mt-4 flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewEmail({
                        segment: selectedBatch.segment,
                        market: selectedBatch.market,
                        email: selectedBatch.email,
                        version: batchVersion,
                      })
                    }
                    className="text-sm font-medium text-[var(--accent)] underline-offset-4 hover:underline"
                  >
                    Preview in inbox
                  </button>
                  <button
                    type="button"
                    onClick={() => copyEmail(selectedBatch.email, batchVersion)}
                    className="text-sm font-medium text-[var(--accent)] underline-offset-4 hover:underline"
                  >
                    Copy to clipboard
                  </button>
                </div>
              </div>
            </div>
          )}

          {previewEmail && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
              <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl border border-[var(--border)] bg-white p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Inbox preview</h3>
                  <button
                    type="button"
                    onClick={() => setPreviewEmail(null)}
                    className="rounded-lg bg-[var(--surface-muted)] px-3 py-1 text-sm"
                  >
                    Close
                  </button>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                  <p className="text-xs text-[var(--muted)]">From: The Modo Team, noreply@modoenergy.com</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">To: Active Terminal User</p>
                  <p className="mt-3 text-sm font-semibold">
                    Subject: {previewEmail.version === "A" ? previewEmail.email.subject_a : previewEmail.email.subject_b}
                  </p>
                  <div className="mt-5 rounded-lg border border-[var(--border)] bg-white p-4">
                    <p className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--accent)]">
                      MODOENERGY
                    </p>
                    <pre className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">
                      {previewEmail.email.body}
                    </pre>
                    <p className="mt-6 border-t border-[var(--border)] pt-3 text-xs text-[var(--muted)]">
                      You are receiving this email because you signed up for Modo Terminal. Unsubscribe anytime.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
