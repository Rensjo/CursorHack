import { useMemo, useState } from "react";
import VerdictCard from "./VerdictCard.jsx";
import DMCAModal from "./DMCAModal.jsx";
import ForensicFrame from "./ForensicFrame.jsx";
import { makeCaseId } from "../lib/caseId.js";

function ImageTile({ label, code, fig, src }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
        <span>
          {label}{" "}
          <span className="text-faint">
            · fig. {fig}
          </span>
        </span>
        <span className="chip-trace py-0.5 text-[8px] tracking-[0.35em]">{code}</span>
      </div>
      <ForensicFrame className="overflow-hidden rounded-sm">
        <div className="aspect-square overflow-hidden border border-border bg-bg/50">
          <img src={src} alt={label} className="h-full w-full object-cover" />
        </div>
      </ForensicFrame>
    </div>
  );
}

export default function ResultsScreen({
  comparison,
  description,
  descriptionLoading,
  descriptionError,
  images,
  onReset,
}) {
  const [showDMCA, setShowDMCA] = useState(false);
  const caseId = useMemo(() => makeCaseId(), []);

  const overlaySrc = `data:image/png;base64,${comparison.overlay_base64}`;

  return (
    <div className="relative z-10 mx-auto max-w-7xl px-6 py-10 md:py-14">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-6 animate-fade-up">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="label-eyebrow text-accent">Sonovera · Case file</span>
            <span className="chip-trace border-verdict-orange/40 text-verdict-orange">
              Sealed output
            </span>
          </div>
          <h1 className="mt-4 font-display text-4xl italic drop-shadow-[0_3px_22px_rgba(5,15,25,0.8)] md:text-6xl">
            Forensic report
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.28em] text-faint">
            <span className="text-text">Case ID</span>
            <span className="rounded-sm border border-border bg-bg/50 px-2 py-1 tracking-[0.22em] text-accent">
              {caseId}
            </span>
            <span className="hidden sm:inline">·</span>
            <span className="text-muted">Render timestamp {new Date().toLocaleString()}</span>
          </div>
        </div>
        <button onClick={onReset} className="btn-ghost shrink-0">
          ← New acquisition
        </button>
      </header>

      <div className="animate-fade-up" style={{ animationDelay: "60ms" }}>
        <VerdictCard
          verdict={comparison.verdict}
          similarity={comparison.similarity}
          tamperPercent={comparison.tamper_percent}
        />
      </div>

      <section className="mt-12 animate-fade-up" style={{ animationDelay: "120ms" }}>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div className="label-eyebrow text-accent">Exhibit matrix</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-faint">
            Side-by-side · tamper channel highlighted
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <ImageTile label="Original" code="A" fig="1" src={images.original} />
          <ImageTile label="Suspect" code="B" fig="2" src={images.suspect} />
          <ImageTile label="Tamper map" code="Δ" fig="3" src={overlaySrc} />
        </div>
        {comparison.tamper_box && (
          <div className="mt-4 rounded-sm border border-border/80 bg-bg/35 px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-muted backdrop-blur-sm">
            Bounding box hypothesis · ({comparison.tamper_box.x1},{comparison.tamper_box.y1}) → (
            {comparison.tamper_box.x2},{comparison.tamper_box.y2}) — pixels in normalized canvas
          </div>
        )}
      </section>

      <section className="mt-14 animate-fade-up" style={{ animationDelay: "180ms" }}>
        <ForensicFrame scan className="panel forensic-grid overflow-hidden p-6 md:p-10">
          <div className="flex flex-wrap items-center gap-3">
            <div className="label-eyebrow text-accent">Narrative forensics</div>
            <span className="chip-trace">Claude vision</span>
            <span className="font-mono text-[10px] text-faint">Plain-language examiner notes</span>
          </div>

          <div className="mt-6">
            {descriptionLoading ? (
              <div className="flex items-center gap-3 font-mono text-sm text-muted">
                <span className="h-2 w-2 animate-pulse-soft rounded-full bg-accent shadow-[0_0_14px_rgba(232,207,90,0.7)]" />
                <span className="animate-pulse-soft">Diffing perceptual cues and drafting language…</span>
              </div>
            ) : descriptionError ? (
              <div className="font-mono text-sm text-verdict-red">{descriptionError}</div>
            ) : (
              <p className="font-display text-2xl leading-snug text-text md:text-3xl md:leading-snug">
                {description || "No description available."}
              </p>
            )}
          </div>
        </ForensicFrame>
      </section>

      <section
        className="mt-12 flex flex-wrap items-center gap-5 animate-fade-up"
        style={{ animationDelay: "240ms" }}
      >
        <button
          onClick={() => setShowDMCA(true)}
          disabled={descriptionLoading || !description}
          className="btn-primary px-10 py-4 text-base tracking-[0.16em] md:text-lg"
        >
          Generate DMCA brief →
        </button>
        <span className="max-w-xs font-mono text-[10px] uppercase leading-relaxed tracking-[0.28em] text-faint">
          Legal-adjacent draft with your metrics baked in — edit before you send.
        </span>
      </section>

      {showDMCA && (
        <DMCAModal
          onClose={() => setShowDMCA(false)}
          description={description || ""}
          similarity={comparison.similarity}
          caseId={caseId}
        />
      )}
    </div>
  );
}
