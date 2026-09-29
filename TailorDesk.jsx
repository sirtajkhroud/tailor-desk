import React, { useState, useMemo } from "react";

// ── palette (inline styles so custom hex renders regardless of Tailwind JIT) ──
const C = {
  ink: "#11162A",
  panel: "#1A2040",
  panelSoft: "#222A50",
  line: "#2E3766",
  paper: "#F5F7FC",
  muted: "#8B93B8",
  match: "#19B8A6",
  matchDim: "#14342F",
  gap: "#E79A3C",
  gapDim: "#3A2C15",
  accent: "#6C7BFF",
};

const mono = { fontFamily: "ui-monospace, 'SF Mono', 'Cascadia Code', Menlo, monospace" };

function Chip({ label, tone }) {
  const bg = tone === "match" ? C.matchDim : C.gapDim;
  const fg = tone === "match" ? C.match : C.gap;
  return (
    <span
      className="inline-block rounded-md px-2.5 py-1 text-xs"
      style={{ ...mono, background: bg, color: fg, border: `1px solid ${fg}33` }}
    >
      {label}
    </span>
  );
}

function CopyBtn({ text, small }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1400);
    } catch (e) {
      setDone(false);
    }
  };
  return (
    <button
      onClick={copy}
      className={`rounded-md ${small ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm"} transition`}
      style={{
        ...mono,
        background: done ? C.matchDim : "transparent",
        color: done ? C.match : C.muted,
        border: `1px solid ${C.line}`,
      }}
    >
      {done ? "copied" : "copy"}
    </button>
  );
}

function Gauge({ score }) {
  const s = Math.max(0, Math.min(100, score || 0));
  const r = 52;
  const circ = 2 * Math.PI * r;
  const off = circ * (1 - s / 100);
  const color = s >= 75 ? C.match : s >= 50 ? C.gap : "#E5646E";
  return (
    <div className="relative" style={{ width: 132, height: 132 }}>
      <svg width="132" height="132" viewBox="0 0 132 132">
        <circle cx="66" cy="66" r={r} fill="none" stroke={C.line} strokeWidth="10" />
        <circle
          cx="66"
          cy="66"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={off}
          transform="rotate(-90 66 66)"
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(.2,.8,.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span style={{ ...mono, color: C.paper, fontSize: 30, fontWeight: 600 }}>{s}</span>
        <span style={{ ...mono, color: C.muted, fontSize: 10, letterSpacing: 1 }}>FIT / 100</span>
      </div>
    </div>
  );
}

export default function TailorDesk() {
  const [resume, setResume] = useState("");
  const [jd, setJd] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [out, setOut] = useState(null);

  const canRun = resume.trim().length > 40 && jd.trim().length > 40 && !loading;

  const resumeText = useMemo(() => {
    if (!out) return "";
    const bl = (out.bullets || []).map((b) => `• ${b.text}`).join("\n");
    return `${out.summary || ""}\n\n${bl}`.trim();
  }, [out]);

  async function run() {
    setLoading(true);
    setErr("");
    setOut(null);
    const prompt = `TARGET ROLE/COMPANY: ${role || "(not specified — infer from the job description)"}

=== BASE RESUME ===
${resume}

=== JOB DESCRIPTION ===
${jd}

Tailor this candidate's application to this specific job. Rules:
- Only make claims supported by the base resume. Never invent experience, tools, or metrics.
- For skills the job wants that the resume does NOT support, list them under missingKeywords as honest gaps, do not slip them into bullets.
- Rewrite bullets to lead with impact and mirror the job's real language where it's truthful.
- Keep everything tight; this must fit in the token budget.

Respond with ONLY valid JSON (no markdown, no prose, no code fences) in exactly this shape:
{
  "fitScore": <int 0-100>,
  "verdict": "<one short line>",
  "matchedKeywords": ["<max 10 terms the resume genuinely supports that the JD wants>"],
  "missingKeywords": ["<max 8 terms the JD wants that the resume does not support>"],
  "summary": "<2-3 sentence tailored professional summary>",
  "bullets": [ {"text": "<tailored resume bullet>", "why": "<3-6 word reason>"} ],
  "coverBlurb": "<3-4 sentence opening for a cover note, specific to this role>",
  "notes": ["<honest gap or thing to shore up before applying>"]
}
Provide 5 to 7 bullets.`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system:
            "You are a sharp technical recruiter and resume editor. You are honest about fit and never fabricate credentials. You output only raw JSON when asked.",
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message || "API error");
      const text = (data.content || [])
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .replace(/```json|```/g, "")
        .trim();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        const m = text.match(/\{[\s\S]*\}/);
        if (!m) throw new Error("The model returned an unreadable response. Try again.");
        parsed = JSON.parse(m[0]);
      }
      setOut(parsed);
    } catch (e) {
      setErr(e.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ background: C.ink, minHeight: "100%", color: C.paper }} className="w-full">
      <div className="mx-auto max-w-6xl px-5 py-8">
        {/* header */}
        <div className="mb-7">
          <div style={{ ...mono, color: C.accent, fontSize: 11, letterSpacing: 3 }}>
            APPLICATION WORKBENCH
          </div>
          <h1 className="mt-1 text-3xl font-semibold" style={{ color: C.paper }}>
            Tailor Desk
          </h1>
          <p className="mt-1 text-sm" style={{ color: C.muted }}>
            Paste your base resume and a job description. Get a fit score, a keyword match map, and
            resume + cover copy rewritten for the role — no fabrication.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* inputs */}
          <div className="flex flex-col gap-4">
            <div>
              <label style={{ ...mono, color: C.muted, fontSize: 11, letterSpacing: 1.5 }}>
                TARGET ROLE / COMPANY <span style={{ color: C.line }}>· optional</span>
              </label>
              <input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. New Grad SWE · Shopify"
                className="mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                style={{ background: C.panel, color: C.paper, border: `1px solid ${C.line}` }}
              />
            </div>
            <div>
              <label style={{ ...mono, color: C.muted, fontSize: 11, letterSpacing: 1.5 }}>
                BASE RESUME
              </label>
              <textarea
                value={resume}
                onChange={(e) => setResume(e.target.value)}
                placeholder="Paste your full resume as plain text…"
                rows={11}
                className="mt-1.5 w-full resize-y rounded-lg px-3 py-2.5 text-sm outline-none"
                style={{ background: C.panel, color: C.paper, border: `1px solid ${C.line}` }}
              />
            </div>
            <div>
              <label style={{ ...mono, color: C.muted, fontSize: 11, letterSpacing: 1.5 }}>
                JOB DESCRIPTION
              </label>
              <textarea
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder="Paste the full job posting…"
                rows={11}
                className="mt-1.5 w-full resize-y rounded-lg px-3 py-2.5 text-sm outline-none"
                style={{ background: C.panel, color: C.paper, border: `1px solid ${C.line}` }}
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={run}
                disabled={!canRun}
                className="rounded-lg px-5 py-2.5 text-sm font-medium transition"
                style={{
                  background: canRun ? C.accent : C.panelSoft,
                  color: canRun ? "#0B0E1F" : C.muted,
                  cursor: canRun ? "pointer" : "not-allowed",
                }}
              >
                {loading ? "Tailoring…" : "Tailor my application"}
              </button>
              {(resume || jd) && (
                <button
                  onClick={() => {
                    setResume("");
                    setJd("");
                    setRole("");
                    setOut(null);
                    setErr("");
                  }}
                  className="rounded-lg px-3 py-2.5 text-sm"
                  style={{ ...mono, color: C.muted, border: `1px solid ${C.line}` }}
                >
                  clear
                </button>
              )}
            </div>
          </div>

          {/* output */}
          <div
            className="rounded-xl p-5"
            style={{ background: C.panel, border: `1px solid ${C.line}`, minHeight: 300 }}
          >
            {!out && !loading && !err && (
              <div className="flex h-full min-h-64 flex-col items-center justify-center text-center">
                <div style={{ ...mono, color: C.line, fontSize: 40 }}>◇</div>
                <p className="mt-3 text-sm" style={{ color: C.muted }}>
                  Your tailored application appears here.
                </p>
              </div>
            )}

            {loading && (
              <div className="flex h-full min-h-64 items-center justify-center">
                <span style={{ ...mono, color: C.accent, fontSize: 13 }}>
                  reading the posting · matching · rewriting…
                </span>
              </div>
            )}

            {err && (
              <div
                className="rounded-lg p-4 text-sm"
                style={{ background: C.gapDim, color: C.gap, border: `1px solid ${C.gap}44` }}
              >
                {err}
              </div>
            )}

            {out && !loading && (
              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-4">
                  <Gauge score={out.fitScore} />
                  <div className="flex-1">
                    <div style={{ ...mono, color: C.muted, fontSize: 11, letterSpacing: 1.5 }}>
                      VERDICT
                    </div>
                    <p className="mt-1 text-sm" style={{ color: C.paper }}>
                      {out.verdict}
                    </p>
                  </div>
                </div>

                {out.matchedKeywords?.length > 0 && (
                  <div>
                    <div style={{ ...mono, color: C.match, fontSize: 11, letterSpacing: 1.5 }}>
                      MATCHES · you already show these
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {out.matchedKeywords.map((k, i) => (
                        <Chip key={i} label={k} tone="match" />
                      ))}
                    </div>
                  </div>
                )}

                {out.missingKeywords?.length > 0 && (
                  <div>
                    <div style={{ ...mono, color: C.gap, fontSize: 11, letterSpacing: 1.5 }}>
                      GAPS · the posting wants these, add only if true
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {out.missingKeywords.map((k, i) => (
                        <Chip key={i} label={k} tone="gap" />
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ borderTop: `1px solid ${C.line}` }} />

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span style={{ ...mono, color: C.muted, fontSize: 11, letterSpacing: 1.5 }}>
                      TAILORED RESUME
                    </span>
                    <CopyBtn text={resumeText} small />
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: C.paper }}>
                    {out.summary}
                  </p>
                  <ul className="mt-3 flex flex-col gap-2">
                    {(out.bullets || []).map((b, i) => (
                      <li key={i} className="text-sm leading-relaxed" style={{ color: C.paper }}>
                        <span style={{ color: C.accent }}>▹ </span>
                        {b.text}
                        {b.why && (
                          <span style={{ ...mono, color: C.muted, fontSize: 11 }}> — {b.why}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                <div style={{ borderTop: `1px solid ${C.line}` }} />

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span style={{ ...mono, color: C.muted, fontSize: 11, letterSpacing: 1.5 }}>
                      COVER NOTE OPENING
                    </span>
                    <CopyBtn text={out.coverBlurb || ""} small />
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: C.paper }}>
                    {out.coverBlurb}
                  </p>
                </div>

                {out.notes?.length > 0 && (
                  <div
                    className="rounded-lg p-3"
                    style={{ background: C.panelSoft, border: `1px solid ${C.line}` }}
                  >
                    <div style={{ ...mono, color: C.gap, fontSize: 11, letterSpacing: 1.5 }}>
                      BEFORE YOU SEND
                    </div>
                    <ul className="mt-1.5 flex flex-col gap-1">
                      {out.notes.map((n, i) => (
                        <li key={i} className="text-sm" style={{ color: C.muted }}>
                          — {n}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <p className="mt-6 text-center" style={{ ...mono, color: C.line, fontSize: 11 }}>
          nothing is saved · your resume stays in this session only
        </p>
      </div>
    </div>
  );
}
