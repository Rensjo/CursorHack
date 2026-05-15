import { useState } from "react";
import { generateDMCA } from "../api.js";
import ForensicFrame from "./ForensicFrame.jsx";

export default function DMCAModal({
  onClose,
  description,
  similarity,
  caseId = "SNV-RUNTIME",
}) {
  const [form, setForm] = useState({
    claimant_name: "",
    claimant_email: "",
    work_title: "",
    infringing_url: "",
  });
  const [letter, setLetter] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  const canGenerate = form.claimant_name && form.claimant_email && form.work_title;

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const result = await generateDMCA({
        description,
        ...form,
        infringing_url: form.infringing_url || null,
        similarity,
      });
      setLetter(result.letter);
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const blob = new Blob([letter], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dmca-${caseId.replace(/[^a-zA-Z0-9-_]/g, "")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#050f18]/85 px-4 py-10 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="animate-fade-up relative mt-6 w-full max-w-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <ForensicFrame
          scan
          className="panel forensic-grid overflow-hidden p-6 shadow-[0_0_80px_-18px_rgba(232,207,90,0.25)] md:p-10"
        >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="label-eyebrow text-accent">DMCA workstation</div>
              <span className="chip-trace text-[8px] tracking-[0.32em]">Case {caseId}</span>
            </div>
            <h3 className="mt-3 font-display text-3xl italic md:text-4xl">Draft legally-adjacent notice</h3>
            <p className="mt-2 max-w-lg font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
              Human review mandatory — demo output only
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost shrink-0">
            Close ×
          </button>
        </div>

        {!letter ? (
          <>
            <div className="space-y-4">
              <Field
                label="Your full name"
                value={form.claimant_name}
                onChange={(v) => setForm({ ...form, claimant_name: v })}
              />
              <Field
                label="Contact email"
                type="email"
                value={form.claimant_email}
                onChange={(v) => setForm({ ...form, claimant_email: v })}
              />
              <Field
                label="Title or description of your original work"
                value={form.work_title}
                onChange={(v) => setForm({ ...form, work_title: v })}
              />
              <Field
                label="Infringing URL (optional)"
                value={form.infringing_url}
                onChange={(v) => setForm({ ...form, infringing_url: v })}
              />
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!canGenerate || generating}
                className="btn-primary px-8"
              >
                {generating ? "Hydrating prose…" : "Generate artifact"}
              </button>
              {error && (
                <span className="font-mono text-xs text-verdict-red">{error}</span>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="relative rounded-sm border border-border bg-bg/80">
              <div
                className="pointer-events-none absolute right-6 top-5 rotate-[14deg] border-4 border-accent/40 px-5 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.5em] text-accent/65"
                aria-hidden
              >
                Draft copy
              </div>
              <pre className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap px-5 py-6 font-mono text-xs leading-relaxed text-text">
                {letter}
              </pre>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={handleCopy} className="btn-primary">
                {copied ? "Copied ✓" : "Copy to clipboard"}
              </button>
              <button type="button" onClick={handleDownload} className="btn-ghost">
                Download .txt
              </button>
              <button type="button" onClick={() => setLetter("")} className="btn-ghost">
                ← Edit details
              </button>
            </div>
          </>
        )}
        </ForensicFrame>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <label className="block">
      <span className="label-eyebrow">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 block w-full rounded-sm border border-border bg-bg/90 px-4 py-2.5 font-sans text-sm text-text outline-none transition focus:border-accent focus:shadow-[0_0_24px_-8px_rgba(232,207,90,0.35)]"
      />
    </label>
  );
}
