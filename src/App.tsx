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
import { KeepAlive, AliveScope } from "react-activation";
import { LanguageProvider } from "./contexts/language-context"; //
function App() {
  const location = useLocation();

  return (
    <ThemeProvider>
      <CssBaseline />
      <LanguageProvider>
        <ToastProvider>
          <PlaywrightProvider>
            <PostProvider>
              <AliveScope>
                <AnimatePresence mode="wait">
                  <Routes location={location} key={location.pathname}>
                    <Route path="/" element={<Layout />}>
                      <Route
                        index
                        element={
                          <KeepAlive>
                            <Dashboard />
                          </KeepAlive>
                        }
                      />
                      <Route
                        path="search"
                        element={
                          <KeepAlive>
                            <SearchPage />
                          </KeepAlive>
                        }
                      />
                      <Route
                        path="auto-action"
                        element={
                          <KeepAlive>
                            <AutoActionPage />
                          </KeepAlive>
                        }
                      />
                      <Route
                        path="templates"
                        element={
                          <KeepAlive>
                            <TemplatesPage />
                          </KeepAlive>
                        }
                      />
                      <Route
                        path="settings"
                        element={
                          <KeepAlive>
                            <SettingsPage />
                          </KeepAlive>
                        }
                      />
                    </Route>
                  </Routes>
                </AnimatePresence>
              </AliveScope>
            </PostProvider>
          </PlaywrightProvider>
        </ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
