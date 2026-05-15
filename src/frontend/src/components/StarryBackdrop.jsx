/** Decorative layers evoking swirling night sky, stars, moon, and a dark horizon — no interaction. */

const STARFIELD = Array.from({ length: 52 }, (_, i) => ({
  top: ((i * 29 + i * i) % 78) + 6,
  left: ((i * 41 + i * i * 2) % 88) + 4,
  size: 1 + (i % 3),
  blur: i % 5 === 0 ? 2 : 0,
  delay: `${(i * 0.37) % 5}s`,
  duration: `${3.2 + (i % 4) * 0.6}s`,
}));

export default function StarryBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {/* Base sky */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 95% 55% at 50% -8%, rgba(74, 124, 168, 0.45) 0%, transparent 58%),
            radial-gradient(ellipse 45% 35% at 88% 12%, rgba(253, 234, 167, 0.22) 0%, transparent 52%),
            radial-gradient(ellipse 70% 50% at 12% 22%, rgba(30, 90, 140, 0.35) 0%, transparent 55%),
            linear-gradient(165deg, #102a47 0%, #0b1f35 38%, #071525 72%, #050f18 100%)
          `,
        }}
      />

      {/* Slow counter-rotating swirls */}
      <div
        className="animate-sky-spin-ccw absolute left-1/2 top-[20%] h-[220vmax] w-[220vmax] -translate-x-1/2 -translate-y-1/2 opacity-[0.14]"
        style={{
          background: `conic-gradient(
            from 200deg at 50% 50%,
            transparent 0deg,
            rgba(100, 160, 210, 0.5) 55deg,
            transparent 110deg,
            rgba(40, 90, 140, 0.45) 180deg,
            transparent 240deg,
            rgba(180, 200, 230, 0.12) 300deg,
            transparent 360deg
          )`,
        }}
      />
      <div
        className="animate-sky-spin absolute left-[45%] top-[35%] h-[180vmax] w-[180vmax] -translate-x-1/2 -translate-y-1/2 opacity-[0.1]"
        style={{
          background: `conic-gradient(
            from 80deg at 50% 50%,
            transparent 0deg,
            rgba(60, 120, 180, 0.4) 70deg,
            transparent 140deg,
            rgba(120, 180, 220, 0.15) 220deg,
            transparent 300deg
          )`,
        }}
      />

      {/* Cypress / hill mass — bottom weight like the painting */}
      <div
        className="absolute inset-x-0 bottom-0 h-[min(42vh,320px)] opacity-90"
        style={{
          background: `
            radial-gradient(ellipse 55% 120% at 18% 100%, rgba(15, 55, 58, 0.95) 0%, transparent 65%),
            radial-gradient(ellipse 40% 100% at 52% 110%, rgba(12, 42, 48, 0.88) 0%, transparent 60%),
            radial-gradient(ellipse 50% 90% at 82% 100%, rgba(18, 62, 58, 0.9) 0%, transparent 62%),
            linear-gradient(to top, #050c12 0%, rgba(5, 12, 18, 0.55) 45%, transparent 100%)
          `,
        }}
      />

      {/* Moon glow */}
      <div
        className="absolute right-[6%] top-[5%] h-28 w-28 rounded-full md:h-36 md:w-36"
        style={{
          background:
            "radial-gradient(circle at 35% 35%, #fff9e6 0%, #fdeaa7 28%, rgba(253, 234, 167, 0.35) 52%, transparent 72%)",
          boxShadow:
            "0 0 80px 24px rgba(253, 234, 167, 0.25), 0 0 120px 40px rgba(100, 160, 220, 0.08)",
        }}
      />

      {/* Stars */}
      {STARFIELD.map((s, i) => (
        <span
          key={i}
          className="animate-star-twinkle absolute rounded-full"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: s.size,
            height: s.size,
            boxShadow: `0 0 ${4 + s.blur}px ${1 + s.blur * 0.5}px rgba(253, 234, 167, 0.85)`,
            background: i % 7 === 0 ? "#fff9e6" : "#f4d03f",
            animationDelay: s.delay,
            animationDuration: s.duration,
            filter: s.blur ? `blur(${s.blur * 0.35}px)` : undefined,
          }}
        />
      ))}

      {/* Canvas-like impasto grain */}
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
