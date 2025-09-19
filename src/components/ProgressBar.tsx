import React from "react";

type Props = {
  value: number; // 0..100
  ariaLabel?: string;
  showTicks?: boolean;
};

// Inline styles, scoped to this component
const getStyles = (clamped: string | number) => ({
  wrapper: {
    margin: "24px 0 10px",
    position: "relative" as const,
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
  },
  track: {
    height: 12,
    borderRadius: 999,
    background:
      "linear-gradient(90deg, rgba(255,255,255,.10), rgba(255,255,255,.06))",
    border: "1px solid rgba(127,137,163,.22)",
    overflow: "hidden",
    boxShadow: "inset 0 1px 2px rgba(0,0,0,.25)",
  },
  fill: {
    height: "100%",
    width: `${clamped}%`,
    // Fixed left→right gradient; does NOT animate or flip when width shrinks
    background: "linear-gradient(90deg, #7c5cff, #00e0a4)",
    transition: "width 280ms linear",
    willChange: "width" as const,
  },
  ticks: {
    display: "grid",
    gridTemplateColumns: "repeat(10, 1fr)",
    gap: 0,
    marginTop: 6,
  },
  tick: {
    height: 4,
    background: "rgba(127,137,163,.30)",
    borderRadius: 2,
  },
  label: {
    marginTop: 8,
    fontWeight: 700 as const,
    display: "flex",
    gap: 6,
    alignItems: "center",
  },
  small: { color: "rgba(166,171,189,.9)" },
  blinker: {
    animation: "wipblink 1.2s steps(2, start) infinite",
    opacity: 0.7,
  },
});

export const ProgressBar: React.FC<Props> = ({
  value,
  ariaLabel = "Build progress",
  showTicks = true,
}) => {
  const clamped = Math.max(0, Math.min(100, value));
  const styles = getStyles(clamped);

  return (
    <div style={styles.wrapper}>
      <div
        style={styles.track}
        role="progressbar"
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clamped)}
      >
        <div style={styles.fill} />
      </div>

      {showTicks && (
        <div style={styles.ticks} aria-hidden="true">
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} style={styles.tick} />
          ))}
        </div>
      )}

      <div style={styles.label}>
        {Math.round(clamped)}% complete* <span style={styles.blinker}>▮</span>
      </div>
      <small style={styles.small}>* margin of error: ±100%</small>

      {/* Local keyframes, scoped by unique data-attr to avoid global CSS */}
      <style>
        {`
          @keyframes wipblink { to { visibility: hidden; } }
        `}
      </style>
    </div>
  );
};
