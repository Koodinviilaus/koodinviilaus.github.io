import { useEffect, useState } from "react";
import "./App.css";
import { ProgressBar } from "./components/ProgressBar";
import { useWipProgress } from "./hooks/useWipProgress";

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

export default function App() {
  useTitleTicker();
  const progress = useWipProgress({ minFloor: 65 }); // tweak timings in the hook config if you want

  const [showDots, setShowDots] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ".") setShowDots((s) => !s);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <main className={`wip ${showDots ? "debug" : ""}`}>
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
        </nav>
      </section>

      <button
        className="easter"
        onClick={() => setShowDots((s) => !s)}
        aria-pressed={showDots}
      >
        Press <kbd>.</kbd> for grid
      </button>
    </main>
  );
}
