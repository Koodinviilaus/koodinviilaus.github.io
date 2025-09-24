import { HashRouter } from "./router/HashRouter.tsx";
import Profile from "./app/Home/Profile/Profile.tsx";
import NotFound from "./app/generic/NotFound.tsx";
import Home from "./app/Home/Home.tsx";

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
