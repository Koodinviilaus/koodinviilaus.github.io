import { HashRouter } from "./router/HashRouter.tsx";
import Profile from "./pages/Home/Profile/Profile.tsx";
import NotFound from "./pages/generic/NotFound.tsx";
import Home from "./pages/Home/Home.tsx";

export default function App() {
  return (
    <HashRouter
      routes={[
        { path: "#/", element: <Home /> },
        { path: "#/profile", element: <Profile /> },
      ]}
      fallback={<NotFound />}
    />
  );
}
