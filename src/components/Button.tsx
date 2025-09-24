import { type ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "solid" | "ghost";
};

export default function Button({ variant = "solid", style, ...rest }: Props) {
  const base: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 12,
    fontWeight: 600,
    cursor: "pointer",
    border: "1px solid rgba(127,137,163,.22)",
    background: variant === "solid" ? "rgba(255,255,255,.06)" : "transparent",
  };
  return <button {...rest} style={{ ...base, ...style }} />;
}
