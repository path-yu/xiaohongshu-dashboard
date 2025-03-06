import { Routes, Route } from "react-router-dom";
import Layout from "./components/layout";
import Dashboard from "./pages/dashboard";
import SearchPage from "./pages/search";
import TemplatesPage from "./pages/templates";
import SettingsPage from "./pages/settings";
import { PlaywrightProvider } from "./contexts/playwright.context";
import { PostProvider } from "./contexts/post-context";

function App() {
  return (
    <PlaywrightProvider>
      <PostProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="templates" element={<TemplatesPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </PostProvider>
    </PlaywrightProvider>
  );
}

export default App;
