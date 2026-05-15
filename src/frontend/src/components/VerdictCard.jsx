const VERDICTS = {
  different: {
    label: "Different image",
    description: "No meaningful overlap detected. These are not related.",
    colorClass: "border-verdict-green/50 bg-verdict-green/10 text-verdict-green",
    code: "00",
  },
  edited: {
    label: "Edited version",
    description: "Likely a legitimate edit of the same source image.",
    colorClass: "border-verdict-yellow/50 bg-verdict-yellow/10 text-verdict-yellow",
    code: "01",
  },
  suspicious: {
    label: "Suspicious modification",
    description: "Strong similarity with signs of altered regions. Review evidence.",
    colorClass: "border-verdict-orange/50 bg-verdict-orange/10 text-verdict-orange",
    code: "02",
  },
  stolen: {
    label: "Stolen and altered",
    description: "High-confidence theft pattern: near-identical with tampered regions.",
    colorClass: "border-verdict-red/50 bg-verdict-red/10 text-verdict-red",
    code: "03",
  },
};

export default function VerdictCard({ verdict, similarity, tamperPercent }) {
  const v = VERDICTS[verdict] || VERDICTS.different;

  return (
    <div className={`panel border ${v.colorClass} p-6 md:p-8`}>
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em] opacity-70">
            <span>Verdict {v.code}</span>
            <span className="h-px flex-1 bg-current opacity-30" />
          </div>
          <h2 className="mt-3 font-display text-4xl italic md:text-5xl">{v.label}</h2>
          <p className="mt-3 max-w-md text-sm text-muted md:text-base">{v.description}</p>
        </div>

        <div className="flex gap-8 border-l border-current/20 pl-8 md:gap-12">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider opacity-60">
              Similarity
            </div>
            <div className="mt-1 font-mono text-3xl text-text">
              {similarity?.toFixed(1)}
              <span className="ml-0.5 text-sm opacity-50">%</span>
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider opacity-60">
              Tampered area
            </div>
            <div className="mt-1 font-mono text-3xl text-text">
              {tamperPercent?.toFixed(1)}
              <span className="ml-0.5 text-sm opacity-50">%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
