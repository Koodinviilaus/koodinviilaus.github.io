import { type ReactNode } from "react";

type Props = { children: ReactNode };
export default function Page({ children }: Props) {
  return (
    <div style={{ maxWidth: 920, margin: "0 auto", padding: "24px" }}>
      {children}
    </div>
  );
}
