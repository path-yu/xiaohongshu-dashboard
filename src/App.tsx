import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Layout from "./components/layout";
import Dashboard from "./pages/dashboard";
import SearchPage from "./pages/search";
import TemplatesPage from "./pages/templates";
import SettingsPage from "./pages/settings";
import AutoActionPage from "./pages/auto-action";
import { PlaywrightProvider } from "./contexts/playwright-context";
import { PostProvider } from "./contexts/post-context";
import { ThemeProvider } from "./contexts/theme-context";
import { ToastProvider } from "./contexts/toast-context";
import CssBaseline from "@mui/material/CssBaseline";

function App() {
  const location = useLocation();

  return (
    <ThemeProvider>
      <CssBaseline />
      <ToastProvider>
        <PlaywrightProvider>
          <PostProvider>
            <AnimatePresence mode="wait">
              <Routes location={location} key={location.pathname}>
                <Route path="/" element={<Layout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="search" element={<SearchPage />} />
                  <Route path="auto-action" element={<AutoActionPage />} />
                  <Route path="templates" element={<TemplatesPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>
              </Routes>
            </AnimatePresence>
          </PostProvider>
        </PlaywrightProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
