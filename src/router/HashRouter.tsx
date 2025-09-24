import { useEffect, useState, type JSX } from "react";

type Route = { path: string; element: JSX.Element };

export function HashRouter({
  routes,
  fallback,
}: {
  routes: Route[];
  fallback: JSX.Element;
}) {
  const [hash, setHash] = useState(() => window.location.hash || "#/");

  useEffect(() => {
    const onHash = () => setHash(window.location.hash || "#/");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const match = routes.find((r) => r.path === hash);
  return match ? match.element : fallback;
}
