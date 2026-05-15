import { useRef, useState } from "react";
import { fileToDataURL } from "../api.js";
import ForensicFrame from "./ForensicFrame.jsx";

const MARQUEE =
  " SSIM structural diff  ·  perceptual hash distance  ·  tamper heatmap (Δ)  ·  Claude vision narrative  ·  one-click DMCA draft  · ";

function DropZone({ label, slot, exhibit, value, onChange }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  async function handleFile(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5MB.");
      return;
    }
    const dataURL = await fileToDataURL(file);
    onChange({ dataURL, name: file.name });
  }

  return (
    <div className="animate-fade-up">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
        <span className="text-accent/90">{exhibit}</span>
        <span className="text-faint">{slot}</span>
      </div>
      <ForensicFrame
        className={`group overflow-hidden rounded-sm transition ${
          dragging ? "shadow-[0_0_42px_-8px_rgba(232,207,90,0.55)] ring-2 ring-accent/55" : ""
        }`}
      >
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          className={`relative aspect-square w-full cursor-pointer border border-dashed
            ${
              dragging
                ? "border-accent bg-surface-hi"
                : "border-border bg-surface/90 hover:border-border-hi hover:bg-surface-hi/90"
            }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          {/* Sight cross — empty state only */}
          {!value && (
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-px w-[55%] -translate-x-1/2 -translate-y-1/2 bg-border/50"
              aria-hidden
            />
          )}
          {!value && (
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[55%] w-px -translate-x-1/2 -translate-y-1/2 bg-border/50"
              aria-hidden
            />
          )}

          {value ? (
            <>
              <img
                src={value.dataURL}
                alt={value.name}
                className="absolute inset-0 h-full w-full object-cover opacity-95"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-bg/95 via-bg/25 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <div className="chip-trace mb-2 w-fit">Secured for analysis</div>
                <div className="truncate font-mono text-xs text-text">{value.name}</div>
              </div>
            </>
          ) : (
            <div className="relative z-[1] flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-faint">
                Drop zone
              </div>
              <div className="font-display text-3xl italic text-muted transition group-hover:text-text md:text-4xl">
                {label}
              </div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-faint">
                JPEG / PNG / WebP · max 5MB
              </div>
            </div>
          )}
        </div>
      </ForensicFrame>
    </div>
  );
}

export default function UploadScreen({ onCompare, error }) {
  const [original, setOriginal] = useState(null);
  const [suspect, setSuspect] = useState(null);

  const canSubmit = original && suspect;

  return (
    <div className="relative z-10">
      {/* Signal bar — hackathon “we shipped the whole stack” */}
      <div className="border-b border-border/70 bg-[#050f18]/75 backdrop-blur-md">
        <div className="relative overflow-hidden py-2.5">
          <div className="flex w-max animate-marquee font-mono text-[10px] uppercase tracking-[0.42em] text-accent/85">
            <span className="px-6">{MARQUEE}</span>
            <span className="px-6" aria-hidden>
              {MARQUEE}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-10 md:py-16">
        <ForensicFrame scan className="panel forensic-grid overflow-hidden p-6 shadow-[0_0_80px_-24px_rgba(100,160,220,0.35)] md:p-10">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl animate-fade-up">
              <div className="flex flex-wrap items-center gap-3">
                <span className="chip-trace animate-glow-pulse">Live forensic pipeline</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-faint">
                  Demo-grade · Manila build
                </span>
              </div>
              <h1 className="mt-6 font-display text-5xl leading-[0.98] tracking-tight drop-shadow-[0_4px_28px_rgba(5,15,25,0.85)] md:text-8xl md:leading-[0.95]">
                Turn theft into{" "}
                <em className="bg-gradient-to-r from-accent via-[#fdeaa7] to-accent bg-clip-text italic text-transparent">
                  proof.
                </em>
              </h1>
              <p className="mt-8 max-w-2xl border-l-2 border-accent/50 pl-5 text-lg leading-relaxed text-muted md:text-xl">
                Drop two images — we quantify overlap (SSIM + pHash), paint a tamper heatmap,
                narrate findings with vision AI, then generate a DMCA you can ship. Built to win
                the room and survive the judging table.
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                {[
                  "256× normalize",
                  "Δ hotspot map",
                  "Chain-of-thought viz",
                  "Claude forensic write-up",
                  "DMCA in one tap",
                ].map((t) => (
                  <span key={t} className="chip-trace border-border/70 bg-bg/30 text-muted">
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div className="animate-fade-up font-mono text-right text-[10px] uppercase leading-relaxed tracking-[0.25em] text-faint">
              <div className="text-accent/90">Sonovera</div>
              <div className="mt-2 text-muted">Image theft forensics</div>
              <div className="mt-4 border border-border/80 bg-bg/40 px-3 py-2 text-left tracking-[0.2em] text-text shadow-[inset_0_0_0_1px_rgba(253,234,167,0.06)]">
                <div className="text-faint">Status</div>
                <div className="mt-1 text-accent">Acquire → Diff → Narrate → Act</div>
              </div>
            </div>
          </div>
        </ForensicFrame>

        <div className="mt-12 grid gap-8 md:grid-cols-2 md:gap-10">
          <div style={{ animationDelay: "80ms" }}>
            <DropZone
              exhibit="Exhibit A"
              label="Your original work"
              slot="Evidence channel 01"
              value={original}
              onChange={setOriginal}
            />
          </div>
          <div style={{ animationDelay: "160ms" }}>
            <DropZone
              exhibit="Exhibit B"
              label="Suspected copy"
              slot="Evidence channel 02"
              value={suspect}
              onChange={setSuspect}
            />
          </div>
        </div>

        <div
          className="mt-12 flex flex-col items-center gap-5 animate-fade-up"
          style={{ animationDelay: "220ms" }}
        >
          <button
            disabled={!canSubmit}
            onClick={() => onCompare(original, suspect)}
            className="btn-primary px-12 py-4 text-base tracking-[0.18em] shadow-[0_0_56px_-6px_rgba(245,224,136,0.5)] md:px-14 md:text-lg md:tracking-[0.22em]"
          >
            Execute forensic pass →
          </button>
          <div className="text-center font-mono text-[10px] uppercase leading-relaxed tracking-[0.3em] text-faint">
            {canSubmit ? (
              <>
                Estimated runtime · under <span className="text-accent/90">30 seconds</span> · results
                are presentation-ready
              </>
            ) : (
              <>Awaiting both exhibits to arm the comparator</>
            )}
          </div>
          {error && (
            <div className="max-w-xl rounded-sm border border-verdict-red/45 bg-verdict-red/15 px-5 py-3 text-center font-mono text-xs text-verdict-red shadow-[0_0_36px_-10px_rgba(224,112,120,0.45)]">
              {error}
            </div>
          )}
        </div>

        <footer className="mt-20 border-t border-border/80 pt-8">
          <div className="flex flex-wrap items-center justify-between gap-5 font-mono text-[10px] uppercase tracking-[0.26em] text-faint">
            <div className="max-w-xl text-muted">
              Forensic stack · SSIM + pHash + heatmap Δ + Claude vision — tuned for courtroom-style
              clarity, not vibes.
            </div>
            <div className="text-right text-accent/80">
              Cursor Hack Manila
              <span className="block text-faint">Champion-grade UI</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
