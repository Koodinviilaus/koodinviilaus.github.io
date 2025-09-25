import { Suspense, lazy, type JSX } from "react";
import { HashRouter } from "./router/HashRouter.tsx";
import Resume from "./pages/Home/Resume/Resume.tsx";
import NotFound from "./pages/generic/NotFound.tsx";
import Home from "./pages/Home/Home.tsx";

const devRoutes: Array<{ path: string; element: JSX.Element }> = [];

if (import.meta.env.DEV) {
  const DevOcr = lazy(() => import("./pages/Dev/OcrToGLB/OcrToGLB.tsx"));
  devRoutes.push({
    path: "#/dev/GLB",
    element: (
      <Suspense fallback={<p>Loading dev tool…</p>}>
        <DevOcr />
      </Suspense>
    ),
  });
}

export default function App() {
  return (
    <HashRouter
      routes={[
        { path: "#/", element: <Home /> },
        { path: "#/resume", element: <Resume /> },
        ...devRoutes,
      ]}
      fallback={<NotFound />}
    />
  );
}
