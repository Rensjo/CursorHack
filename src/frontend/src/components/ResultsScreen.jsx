import { useState } from "react";
import VerdictCard from "./VerdictCard.jsx";
import DMCAModal from "./DMCAModal.jsx";

function ImageTile({ label, code, src }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
        <span>{label}</span>
        <span className="text-faint">{code}</span>
      </div>
      <div className="aspect-square overflow-hidden rounded-sm border border-border bg-surface">
        <img src={src} alt={label} className="h-full w-full object-cover" />
      </div>
    </div>
  );
}

export default function ResultsScreen({ comparison, description, descriptionLoading, descriptionError, images, onReset }) {
  const [showDMCA, setShowDMCA] = useState(false);

  const overlaySrc = `data:image/png;base64,${comparison.overlay_base64}`;

  return (
    <div className="relative z-10 mx-auto max-w-7xl px-6 py-12 md:py-16">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4 animate-fade-up">
        <div>
          <div className="label-eyebrow text-accent">Sonovera · Case file</div>
          <h1 className="mt-3 font-display text-4xl italic drop-shadow-[0_2px_16px_rgba(5,15,25,0.7)] md:text-5xl">
            Forensic report
          </h1>
        </div>
        <button onClick={onReset} className="btn-ghost">
          ← New comparison
        </button>
      </header>

      <div className="animate-fade-up" style={{ animationDelay: "60ms" }}>
        <VerdictCard
          verdict={comparison.verdict}
          similarity={comparison.similarity}
          tamperPercent={comparison.tamper_percent}
        />
      </div>

      <section className="mt-10 animate-fade-up" style={{ animationDelay: "120ms" }}>
        <div className="label-eyebrow mb-4">Visual evidence</div>
        <div className="grid gap-4 md:grid-cols-3">
          <ImageTile label="Original" code="A" src={images.original} />
          <ImageTile label="Suspect" code="B" src={images.suspect} />
          <ImageTile label="Tamper map" code="Δ" src={overlaySrc} />
        </div>
        {comparison.tamper_box && (
          <div className="mt-3 font-mono text-[10px] uppercase tracking-wider text-faint">
            Tampered region · ({comparison.tamper_box.x1},{comparison.tamper_box.y1}) →
            ({comparison.tamper_box.x2},{comparison.tamper_box.y2})
          </div>
        )}
      </section>

      <section className="mt-12 animate-fade-up" style={{ animationDelay: "180ms" }}>
        <div className="panel p-6 md:p-8">
          <div className="flex items-center gap-3">
            <div className="label-eyebrow text-accent">Forensic analysis</div>
            <span className="font-mono text-[10px] text-faint">— Claude vision</span>
          </div>

          <div className="mt-4">
            {descriptionLoading ? (
              <div className="flex items-center gap-3 font-mono text-sm text-muted">
                <span className="animate-pulse-soft">Analyzing imagery…</span>
              </div>
            ) : descriptionError ? (
              <div className="font-mono text-sm text-verdict-red">
                {descriptionError}
              </div>
            ) : (
              <p className="font-display text-2xl leading-snug text-text md:text-3xl">
                {description || "No description available."}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="mt-10 flex flex-wrap items-center gap-4 animate-fade-up" style={{ animationDelay: "240ms" }}>
        <button
          onClick={() => setShowDMCA(true)}
          disabled={descriptionLoading || !description}
          className="btn-primary text-base"
        >
          Generate DMCA takedown letter →
        </button>
        <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
          Pre-filled with the forensic finding
        </span>
      </section>

      {showDMCA && (
        <DMCAModal
          onClose={() => setShowDMCA(false)}
          description={description || ""}
          similarity={comparison.similarity}
        />
      )}
    </div>
  );
}
