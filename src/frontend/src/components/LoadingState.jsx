import { useEffect, useState } from "react";

const STAGES = [
  "Normalizing images to 256×256",
  "Running SSIM structural comparison",
  "Computing perceptual hash distance",
  "Generating heatmap overlay",
  "Forensic analysis by Claude vision",
];

export default function LoadingState() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStage((s) => Math.min(s + 1, STAGES.length - 1));
    }, 1400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative z-10 flex min-h-[80vh] flex-col items-center justify-center px-6">
      <div className="label-eyebrow mb-6 text-accent">Analysis in progress</div>

      <h2 className="font-display text-4xl italic text-text md:text-5xl">
        Examining evidence…
      </h2>

      <div className="mt-12 w-full max-w-md space-y-3">
        {STAGES.map((label, i) => (
          <div
            key={i}
            className={`flex items-center gap-4 font-mono text-xs transition ${
              i < stage
                ? "text-muted"
                : i === stage
                ? "text-text"
                : "text-faint opacity-40"
            }`}
          >
            <span className="w-6 text-right">
              {i < stage ? "✓" : i === stage ? "›" : " "}
            </span>
            <span className={i === stage ? "animate-pulse-soft" : ""}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
