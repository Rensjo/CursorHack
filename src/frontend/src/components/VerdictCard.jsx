const VERDICTS = {
  different: {
    label: "Different image",
    description: "No meaningful overlap detected. These are not related.",
    colorClass:
      "border-verdict-green/55 bg-verdict-green/[0.09] text-verdict-green shadow-[0_0_48px_-16px_rgba(107,196,168,0.35)]",
    code: "00",
    bar: "bg-verdict-green",
  },
  edited: {
    label: "Edited version",
    description: "Likely a legitimate edit of the same source image.",
    colorClass:
      "border-verdict-yellow/55 bg-verdict-yellow/[0.09] text-verdict-yellow shadow-[0_0_42px_-18px_rgba(224,200,106,0.28)]",
    code: "01",
    bar: "bg-verdict-yellow",
  },
  suspicious: {
    label: "Suspicious modification",
    description: "Strong similarity with signs of altered regions. Review evidence.",
    colorClass:
      "border-verdict-orange/55 bg-verdict-orange/[0.1] text-verdict-orange shadow-[0_0_52px_-12px_rgba(232,160,106,0.35)]",
    code: "02",
    bar: "bg-verdict-orange",
  },
  stolen: {
    label: "Stolen & altered",
    description: "High-confidence theft pattern: near-identical with tampered regions.",
    colorClass:
      "border-verdict-red/55 bg-verdict-red/[0.12] text-verdict-red shadow-[0_0_64px_-10px_rgba(224,112,120,0.45)]",
    code: "03",
    bar: "bg-verdict-red",
  },
};

function MetricBar({ label, value, max, toneClass }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.22em] opacity-70">
        <span>{label}</span>
        <span className="text-text opacity-90">
          {value?.toFixed(1)}
          <span className="ml-0.5 opacity-50">%</span>
        </span>
      </div>
      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-sm border border-current/20 bg-bg/40">
        <div
          className={`h-full rounded-sm ${toneClass} shadow-[0_0_18px_rgba(255,255,255,0.12)] transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function VerdictCard({ verdict, similarity, tamperPercent }) {
  const v = VERDICTS[verdict] || VERDICTS.different;
  const sim = similarity ?? 0;
  const tam = tamperPercent ?? 0;

  return (
    <div className={`panel forensic-grid relative overflow-hidden border-2 p-6 md:p-10 ${v.colorClass}`}>
      <div className="pointer-events-none absolute right-6 top-5 hidden rotate-[-8deg] border-2 border-current/35 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.45em] text-current/55 md:block">
        Forensic
      </div>

      <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-xl flex-1">
          <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.28em] opacity-75">
            <span className="chip-trace border-current/40 bg-bg/35 text-current">
              Verdict cluster {v.code}
            </span>
            <span className="h-px flex-1 min-w-[2rem] bg-current opacity-25" />
            <span className="text-faint">Confidence surface</span>
          </div>
          <h2 className="mt-5 font-display text-4xl italic leading-none md:text-6xl">{v.label}</h2>
          <p className="mt-5 text-base leading-relaxed text-muted md:text-lg">{v.description}</p>
        </div>

        <div className="flex w-full flex-col gap-6 border-t border-current/15 pt-8 font-mono text-text lg:w-[340px] lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
          <div className="grid gap-8">
            <div>
              <div className="text-[10px] uppercase tracking-wider opacity-60">Structural overlap</div>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-5xl leading-none md:text-6xl">{sim.toFixed(1)}</span>
                <span className="mb-1.5 text-lg opacity-45">%</span>
              </div>
              <div className="mt-4">
                <MetricBar label="Similarity index (vs 100)" value={sim} max={100} toneClass={v.bar} />
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider opacity-60">Tampered canvas</div>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-5xl leading-none md:text-6xl">{tam.toFixed(1)}</span>
                <span className="mb-1.5 text-lg opacity-45">%</span>
              </div>
              <div className="mt-4">
                <MetricBar label="Heatmap-integrated area" value={tam} max={100} toneClass={v.bar} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
