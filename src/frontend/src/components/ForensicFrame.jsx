/**
 * Corner brackets + optional scan line — reads as “evidence viewport” on stage.
 */
export default function ForensicFrame({ children, className = "", scan = false }) {
  return (
    <div className={`relative ${scan ? "forensic-scan" : ""} ${className}`}>
      <span
        className="pointer-events-none absolute left-0 top-0 z-10 h-5 w-5 border-l-2 border-t-2 border-accent/80 shadow-[0_0_12px_rgba(232,207,90,0.25)]"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute right-0 top-0 z-10 h-5 w-5 border-r-2 border-t-2 border-accent/80 shadow-[0_0_12px_rgba(232,207,90,0.25)]"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute bottom-0 left-0 z-10 h-5 w-5 border-b-2 border-l-2 border-accent/80 shadow-[0_0_12px_rgba(232,207,90,0.25)]"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute bottom-0 right-0 z-10 h-5 w-5 border-b-2 border-r-2 border-accent/80 shadow-[0_0_12px_rgba(232,207,90,0.25)]"
        aria-hidden
      />
      {children}
    </div>
  );
}
