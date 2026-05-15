import { useEffect, useState } from "react";
import ForensicFrame from "./ForensicFrame.jsx";

const STAGES = [
  "Normalizing images to 256×256",
  "Running SSIM structural comparison",
  "Computing perceptual hash (pHash)",
  "Rendering heatmap & overlay PNGs",
  "Aggregating tamper metrics & verdict",
];

export default function LoadingState() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStage((s) => Math.min(s + 1, STAGES.length - 1));
    }, 1400);
    return () => clearInterval(interval);
  }, []);

  const progress = ((stage + 1) / STAGES.length) * 100;

  return (
    <div className="relative z-10 flex min-h-[85vh] flex-col items-center justify-center px-6 py-16">
      <ForensicFrame
        scan
        className="panel forensic-grid relative max-w-lg px-8 py-12 text-center shadow-[0_0_72px_-20px_rgba(100,160,220,0.4)] md:px-14 md:py-16"
      >
        <div className="label-eyebrow mb-4 text-accent">Live acquisition</div>

        <div className="relative mx-auto mb-10 h-36 w-36 md:h-44 md:w-44">
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-dashed border-accent/35 [animation-duration:14s]" />
          <div className="absolute inset-3 rounded-full border border-border/80" />
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(from -90deg, rgba(232,207,90,0.95) ${progress}%, rgba(40,90,140,0.15) 0)`,
              mask: "radial-gradient(farthest-side, transparent calc(100% - 5px), #fff 0)",
              WebkitMask:
                "radial-gradient(farthest-side, transparent calc(100% - 5px), #fff 0)",
            }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-faint">Pass</span>
            <span className="font-mono text-3xl tabular-nums text-accent md:text-4xl">
              {progress.toFixed(0)}
              <span className="text-lg text-muted">%</span>
            </span>
          </div>
        </div>

        <h2 className="font-display text-3xl italic text-text drop-shadow-[0_2px_18px_rgba(5,15,25,0.7)] md:text-5xl">
          Forensic run in motion
        </h2>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.35em] text-faint">
          Hold — do not navigate away
        </p>

        <div className="mt-12 w-full max-w-md space-y-4 text-left">
          {STAGES.map((label, i) => (
            <div
              key={label}
              className={`flex items-start gap-4 border-l-2 pl-4 font-mono text-xs transition md:text-sm ${
                i < stage
                  ? "border-accent/40 text-muted"
                  : i === stage
                  ? "border-accent text-text shadow-[0_0_24px_-8px_rgba(232,207,90,0.25)]"
                  : "border-border/60 text-faint opacity-35"
              }`}
            >
              <span className="mt-0.5 w-6 shrink-0 text-right">
                {i < stage ? "✓" : i === stage ? "›" : "○"}
              </span>
              <span className={i === stage ? "animate-pulse-soft" : ""}>{label}</span>
            </div>
          ))}
        </div>
      </ForensicFrame>
    </div>
  );
}
