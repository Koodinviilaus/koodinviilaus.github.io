import { HashRouter } from "./router/HashRouter.tsx";
import Resume from "./pages/Home/Resume/Resume.tsx";
import NotFound from "./pages/generic/NotFound.tsx";
import Home from "./pages/Home/Home.tsx";

export default function App() {
  return (
    <HashRouter
      routes={[
        { path: "#/", element: <Home /> },
        { path: "#/resume", element: <Resume /> },
      ]}
      fallback={<NotFound />}
    />
  );
}
