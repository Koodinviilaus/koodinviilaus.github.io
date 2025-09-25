import { useEffect } from "react";
import "../../App.css";
import { useWipProgress } from "../../hooks/useWipProgress.ts";
import { ProgressBar } from "../../components/ProgressBar.tsx";

function useTitleTicker(base = "WIP — Personal Site") {
  useEffect(() => {
    const frames = ["⏳", "🛠️", "🚧", "✨"];
    let i = 0;
    const id = setInterval(() => {
      document.title = `${frames[i % frames.length]} ${base}`;
      i++;
    }, 800);
    return () => clearInterval(id);
  }, [base]);
}

// zero-dep confetti burst (canvas) — simple + lightweight
function burstConfetti(durationMs = 900, count = 120) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.style.position = "fixed";
  canvas.style.inset = "0";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "9999";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  const colors = ["#7c5cff", "#00e0a4", "#ffd166", "#ff6b6b", "#4dabf7"];
  const particles = Array.from({ length: count }).map(() => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 5;
    return {
      x: canvas.width / 2,
      y: canvas.height / 3,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2, // slight upward bias
      g: 0.12 + Math.random() * 0.08,
      size: 2 + Math.random() * 4,
      color: colors[(Math.random() * colors.length) | 0],
      life: durationMs,
    };
  });

  let start = 0;
  function frame(ts: number) {
    if (!ctx) return;
    if (!start) start = ts;
    const dt = ts - start;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((p) => {
      p.vy += p.g;
      p.x += p.vx;
      p.y += p.vy;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });

    if (dt < durationMs) {
      requestAnimationFrame(frame);
    } else {
      canvas.remove();
    }
  }
  requestAnimationFrame(frame);
}

export default function WIP() {
  useTitleTicker();
  const progress = useWipProgress({ minFloor: 65 });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ".") burstConfetti();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <main className="wip">
      <div className="bg-ornament" aria-hidden="true" />

      <section className="card" role="region" aria-label="Work in progress">
        <header className="hero">
          <span className="badge">WIP</span>
          <h1>
            Building <span className="gradient">my new home on the web</span>
          </h1>
          <p className="tagline">
            The paint’s drying, the pixels are stretching, and the deploy gnomes
            are unionizing.
          </p>
        </header>

        <ProgressBar value={progress} />

        <ul className="shiplog">
          <li>🔧 TypeScript + React scaffolding alive</li>
          <li>📦 CI/CD: rituals to appease RNG gods</li>
          <li>🧪 Tests: coming once the confetti stops</li>
        </ul>

        <nav className="links">
          <a
            href="https://github.com/Koodinviilaus"
            className="btn"
            target="_blank"
            rel="noreferrer"
          >
            ⛳ GitHub
          </a>
          {/* <a href="#/profile" className="btn ghost">
            👀 Sneak peek →
          </a> */}
        </nav>
      </section>

      <button
        className="easter"
        onClick={() => burstConfetti()}
        aria-label="Trigger confetti"
      >
        Press <kbd>.</kbd> for confetti
      </button>
    </main>
  );
}
