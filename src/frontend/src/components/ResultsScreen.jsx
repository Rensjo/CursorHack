import { useMemo } from "react";
import VerdictCard from "./VerdictCard.jsx";
import ForensicFrame from "./ForensicFrame.jsx";
import { makeCaseId } from "../lib/caseId.js";

function b64PNG(src) {
  if (!src) return "";
  if (src.startsWith("data:")) return src;
  return `data:image/png;base64,${src}`;
}

function ImageTile({ label, subtitle, code, fig, src }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
        <span>
          {label}{" "}
          <span className="text-faint">· fig. {fig}</span>
        </span>
        <span className="chip-trace py-0.5 text-[8px] tracking-[0.35em]">{code}</span>
      </div>
      {subtitle && (
        <p className="font-mono text-[10px] normal-case leading-relaxed tracking-normal text-faint">
          {subtitle}
        </p>
      )}
      <ForensicFrame className="overflow-hidden rounded-sm">
        <div className="aspect-square overflow-hidden border border-border bg-bg/50">
          <img src={src} alt={label} className="h-full w-full object-cover" />
        </div>
      </ForensicFrame>
    </div>
  );
}

export default function ResultsScreen({ comparison, images, onReset }) {
  const caseId = useMemo(() => makeCaseId(), []);

  const heatmapSrc = b64PNG(comparison.heatmap_base64);
  const overlaySrc = b64PNG(comparison.overlay_base64);

  const box = comparison.tamper_box;
  const boxVerbose = box
    ? `Normalized coordinates (256×256 SSIM canvas): x ∈ [${box.x1}, ${box.x2}], y ∈ [${box.y1}, ${box.y2}]. Width ${box.x2 - box.x1}px, height ${box.y2 - box.y1}px.`
    : "No contiguous tamper island exceeded the threshold — changes may be diffuse or below the cut."

  return (
    <div className="relative z-10 mx-auto max-w-7xl px-6 py-10 md:py-14">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-6 animate-fade-up">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="label-eyebrow text-accent">Sonovera · Case file</span>
            <span className="chip-trace border-verdict-orange/40 text-verdict-orange">
              Compare pass complete
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
            <span className="text-muted">Render timestamp · {new Date().toLocaleString()}</span>
          </div>
        </div>
        <button type="button" onClick={onReset} className="btn-ghost shrink-0">
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

      <section className="mt-12 animate-fade-up" style={{ animationDelay: "120ms" }}>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div className="label-eyebrow text-accent">Exhibit matrix</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-faint">
            Four channels · original, suspect, pure heatmap, overlay
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <ImageTile
            label="Original"
            subtitle="Exhibit A — reference frame you provided."
            code="A"
            fig="1"
            src={images.original}
          />
          <ImageTile
            label="Suspect"
            subtitle="Exhibit B — image under investigation."
            code="B"
            fig="2"
            src={images.suspect}
          />
          <ImageTile
            label="Structural Δ heatmap"
            subtitle="SSIM difference map (amplified). Green ≈ unchanged structure, red ≈ local break."
            code="Δ"
            fig="3"
            src={heatmapSrc}
          />
          <ImageTile
            label="Composited overlay"
            subtitle="Heatmap blended over the resized original (~55% opacity) for judge-ready context."
            code="A+Δ"
            fig="4"
            src={overlaySrc}
          />
        </div>

        <ForensicFrame scan className="panel forensic-grid mt-6 overflow-hidden p-5 md:p-6">
          <div className="label-eyebrow mb-3 text-accent">Tamper localization</div>
          <p className="font-mono text-sm leading-relaxed text-muted">{boxVerbose}</p>
          {box && (
            <dl className="mt-4 grid gap-2 font-mono text-[11px] text-faint sm:grid-cols-2">
              <div className="flex justify-between gap-4 border-b border-border/60 py-1">
                <dt className="uppercase tracking-wider">x1, y1</dt>
                <dd className="text-text">
                  {box.x1}, {box.y1}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-border/60 py-1">
                <dt className="uppercase tracking-wider">x2, y2</dt>
                <dd className="text-text">
                  {box.x2}, {box.y2}
                </dd>
              </div>
            </dl>
          )}
        </ForensicFrame>
      </section>

      <section className="mt-14 animate-fade-up" style={{ animationDelay: "180ms" }}>
        <ForensicFrame scan className="panel forensic-grid overflow-hidden p-6 md:p-10">
          <div className="label-eyebrow text-accent">Methodology (verbose)</div>
          <ul className="mt-6 space-y-4 font-mono text-sm leading-relaxed text-muted md:text-base">
            <li>
              <span className="text-accent">Normalization.</span> Both exhibits are resized to 256×256 so
              each pixel index aligns for SSIM. pHash is computed on the full decoded RGB stills before
              that resize.
            </li>
            <li>
              <span className="text-accent">Where it changed (SSIM).</span> Grayscale structural similarity
              yields a per-pixel dissimilarity map. Values are inverted so 0 means “same structure” and 1
              means “different,” then multiplied by three and clipped for presentation contrast (RdYlGnᵣ
              colormap).
            </li>
            <li>
              <span className="text-accent">How similar overall (pHash).</span> A 64-bit perceptual hash
              summarizes global appearance. Reported similarity is{" "}
              <code className="rounded bg-bg/80 px-1 text-accent">100 × (1 − hamming / 64)</code>.
            </li>
            <li>
              <span className="text-accent">Tamper % &amp; verdict.</span> Tamper percent is the fraction of
              normalized pixels above the internal threshold on the amplified map. Verdict tiers combine
              pHash similarity and tamper area per backend rules.
            </li>
          </ul>
          <p className="mt-8 border-l-2 border-accent/40 pl-4 text-sm italic text-faint">
            Outputs are deterministic for a given pair of files — suitable for screenshots, slides, or
            an accompanying written report.
          </p>
        </ForensicFrame>
      </section>
    </div>
  );
}
