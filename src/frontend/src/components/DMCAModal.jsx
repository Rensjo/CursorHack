import { useState } from "react";
import { generateDMCA } from "../api.js";

export default function DMCAModal({ onClose, description, similarity }) {
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
    a.download = "dmca-takedown.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#050f18]/82 px-4 py-12 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="panel w-full max-w-3xl animate-fade-up p-6 md:p-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="label-eyebrow text-accent">DMCA Takedown Generator</div>
            <h3 className="mt-2 font-display text-3xl italic md:text-4xl">
              Draft your notice
            </h3>
          </div>
          <button onClick={onClose} className="btn-ghost">
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

            <div className="mt-8 flex items-center gap-4">
              <button
                onClick={handleGenerate}
                disabled={!canGenerate || generating}
                className="btn-primary"
              >
                {generating ? "Drafting…" : "Generate letter"}
              </button>
              {error && (
                <span className="font-mono text-xs text-verdict-red">{error}</span>
              )}
            </div>
          </>
        ) : (
          <>
            <pre className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap rounded-sm border border-border bg-bg p-5 font-mono text-xs leading-relaxed text-text">
              {letter}
            </pre>

            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={handleCopy} className="btn-primary">
                {copied ? "Copied ✓" : "Copy to clipboard"}
              </button>
              <button onClick={handleDownload} className="btn-ghost">
                Download .txt
              </button>
              <button onClick={() => setLetter("")} className="btn-ghost">
                ← Edit details
              </button>
            </div>
          </>
        )}
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
        className="mt-2 block w-full rounded-sm border border-border bg-bg px-4 py-2.5 font-sans text-sm text-text outline-none transition focus:border-accent"
      />
    </label>
  );
}
