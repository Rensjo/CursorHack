import { useRef, useState } from "react";
import { fileToDataURL } from "../api.js";

function DropZone({ label, slot, value, onChange }) {
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
      className={`group relative cursor-pointer overflow-hidden rounded-sm border border-dashed
        ${dragging ? "border-accent bg-surface-hi" : "border-border bg-surface hover:border-border-hi"}
        aspect-square w-full transition`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {value ? (
        <>
          <img
            src={value.dataURL}
            alt={value.name}
            className="absolute inset-0 h-full w-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg/95 via-bg/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <div className="label-eyebrow text-accent">{slot}</div>
            <div className="mt-1 truncate font-mono text-xs text-text">{value.name}</div>
          </div>
        </>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-faint">
            {slot}
          </div>
          <div className="font-display text-3xl italic text-muted group-hover:text-text">
            {label}
          </div>
          <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-faint">
            Drop image · or click to browse
          </div>
        </div>
      )}
    </div>
  );
}

export default function UploadScreen({ onCompare, error }) {
  const [original, setOriginal] = useState(null);
  const [suspect, setSuspect] = useState(null);

  const canSubmit = original && suspect;

  return (
    <div className="relative z-10 mx-auto max-w-6xl px-6 py-12 md:py-20">
      <header className="mb-16 animate-fade-up">
        <div className="label-eyebrow mb-6">Sonovera · Image Theft Forensics</div>
        <h1 className="font-display text-5xl leading-[1.05] drop-shadow-[0_2px_18px_rgba(5,15,25,0.75)] md:text-7xl">
          Prove it was{" "}
          <em className="text-accent">stolen</em>.
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-muted md:text-lg">
          Upload your original artwork and the suspected copy. Get visual evidence of
          tampering, a forensic analysis written in plain language, and a takedown
          letter ready to send — in under thirty seconds.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 md:gap-8">
        <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
          <DropZone
            label="Original work"
            slot="01 / Original"
            value={original}
            onChange={setOriginal}
          />
        </div>
        <div className="animate-fade-up" style={{ animationDelay: "160ms" }}>
          <DropZone
            label="Suspected copy"
            slot="02 / Suspect"
            value={suspect}
            onChange={setSuspect}
          />
        </div>
      </div>

      <div className="mt-10 flex flex-col items-center gap-4 animate-fade-up" style={{ animationDelay: "240ms" }}>
        <button
          disabled={!canSubmit}
          onClick={() => onCompare(original, suspect)}
          className="btn-primary text-base"
        >
          Run forensic analysis →
        </button>
        {!canSubmit && (
          <div className="font-mono text-[10px] uppercase tracking-wider text-faint">
            Both images required
          </div>
        )}
        {error && (
          <div className="mt-2 max-w-md rounded-sm border border-verdict-red/40 bg-verdict-red/10 px-4 py-3 font-mono text-xs text-verdict-red">
            {error}
          </div>
        )}
      </div>

      <footer className="mt-24 border-t border-border pt-6">
        <div className="flex flex-wrap items-center justify-between gap-4 font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
          <div>SSIM diff · pHash similarity · Claude vision analysis</div>
          <div>Built for Cursor Hack Manila</div>
        </div>
      </footer>
    </div>
  );
}
