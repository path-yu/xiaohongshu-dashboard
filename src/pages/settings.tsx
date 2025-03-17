import type * as React from "react";
import { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Divider,
  Switch,
  FormControlLabel,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  useMediaQuery,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import { useToast } from "../contexts/toast-context";
import { usePlaywright } from "../contexts/playwright-context";
import { getWebSession, setWebSession } from "../services/settings-service";
import { ThemeMode, useTheme } from "../contexts/theme-context";
import { useLanguage } from "../contexts/language-context";
import Grid from "@mui/material/Grid2";

interface Settings {
  web_session: string;
  autoStartPlaywright: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    web_session: "",
    autoStartPlaywright: false,
  });
  const [loading, setLoading] = useState(false);
  const [fetchingSession, setFetchingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { showToast } = useToast();
  const { startBrowser, status: playwrightStatus } = usePlaywright();
  const { themeMode, setThemeMode } = useTheme();
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const { language, setLanguage, translations } = useLanguage();

  // Load settings from localStorage and API
  useEffect(() => {
    const loadSettings = async () => {
      setFetchingSession(true);
      try {
        let response = await getWebSession();
        response = JSON.parse(response.web_session!);
        console.log(response);

        if (!response.error) {
          setSettings({
            web_session: response.web_session || "",
            autoStartPlaywright:
              localStorage.getItem("autoStartPlaywright") === "true",
          });
        } else {
          console.error("Failed to fetch web_session:", response.error);
          setSettings({
            web_session: "",
            autoStartPlaywright:
              localStorage.getItem("autoStartPlaywright") === "true",
          });
        }
      } catch (error) {
        console.error("Error fetching web_session:", error);
      } finally {
        setFetchingSession(false);
      }
    };

    loadSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSwitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { checked } = e.target;
    setSettings((prev) => ({
      ...prev,
      autoStartPlaywright: checked,
    }));
    localStorage.setItem("autoStartPlaywright", checked.toString());
  };

  const handleThemeChange = (
    _: React.MouseEvent<HTMLElement>,
    newThemeMode: string | null
  ) => {
    if (!newThemeMode) return;
    setThemeMode(newThemeMode as ThemeMode);
  };

  const handleLanguageChange = (
    _: React.MouseEvent<HTMLElement>,
    newLanguage: string | null
  ) => {
    if (newLanguage) {
      setLanguage(newLanguage as "en" | "zh");
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await setWebSession(settings.web_session);

      if (!response.error) {
        showToast(
          response.message || "Settings saved successfully!",
          "success"
        );

        if (settings.autoStartPlaywright && playwrightStatus === "idle") {
          await startBrowser();
        }
      } else {
        setError(response.error || "Failed to save web_session");
      }
    } catch (err) {
      setError("Failed to save settings. Please try again.");
      console.error("Save settings error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (fetchingSession) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "50vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Grid sx={{ flexGrow: 1, width: "60vw" }} container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h5" component="div" gutterBottom>
                {translations.accountSettings as string}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {translations.configureAccount as string}
              </Typography>

              <Divider sx={{ my: 3 }} />

              <form onSubmit={handleSaveSettings}>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="web_session"
                      name="web_session"
                      value={settings.web_session}
                      onChange={handleChange}
                      variant="outlined"
                      required
                      helperText={translations.webSessionHelper as string}
                    />
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.autoStartPlaywright}
                          onChange={handleSwitchChange}
                          name="autoStartPlaywright"
                          color="primary"
                        />
                      }
                      label={translations.autoStartPlaywright as string}
                    />
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      startIcon={
                        loading ? <CircularProgress size={24} /> : <SaveIcon />
                      }
                      disabled={loading}
                      sx={{ mt: 2 }}
                    >
                      {loading
                        ? (translations.saving as string)
                        : (translations.saveSettings as string)}
                    </Button>
                  </Grid>
                </Grid>
              </form>

              {error && (
                <Alert severity="error" sx={{ mt: 3 }}>
                  {error}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {translations.findCredentials as string}
              </Typography>

              <Typography variant="body2">
                {translations.step1 as string}
              </Typography>

              <Typography variant="body2">
                {translations.step2 as string}
              </Typography>

              <Typography variant="body2">
                {translations.step3 as string}
              </Typography>

              <Typography variant="body2">
                {translations.step4 as string}
              </Typography>

              <Alert severity="warning" sx={{ mt: 2 }}>
                {translations.keepCredentialsSecure as string}
              </Alert>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {translations.appearanceSettings as string}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  {translations.themeMode as string}
                </Typography>
                <ToggleButtonGroup
                  value={themeMode}
                  exclusive
                  onChange={handleThemeChange}
                  aria-label="theme mode"
                  sx={{ width: "100%" }}
                >
                  <ToggleButton
                    value="light"
                    aria-label="light mode"
                    sx={{ flex: 1 }}
                  >
                    <LightModeIcon sx={{ mr: 1 }} />
                    {translations.light as string}
                  </ToggleButton>
                  <ToggleButton
                    value="dark"
                    aria-label="dark mode"
                    sx={{ flex: 1 }}
                  >
                    <DarkModeIcon sx={{ mr: 1 }} />
                    {translations.dark as string}
                  </ToggleButton>
                  <ToggleButton
                    value="system"
                    aria-label="system mode"
                    sx={{ flex: 1 }}
                  >
                    {translations.system as string}
                  </ToggleButton>
                </ToggleButtonGroup>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  {translations.currentTheme as string}:{" "}
                  {themeMode === "light"
                    ? (translations.lightMode as string)
                    : themeMode === "dark"
                    ? (translations.darkMode as string)
                    : (translations.system as string)}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  {translations.systemPreference as string}:{" "}
                  {prefersDarkMode
                    ? (translations.darkMode as string)
                    : (translations.lightMode as string)}
                </Typography>
              </Box>

              <Alert severity="info" sx={{ mt: 2 }}>
                {translations.themeSettingsInfo as string}
              </Alert>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {translations.languageSettings as string}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  {translations.language as string}
                </Typography>
                <ToggleButtonGroup
                  value={language}
                  exclusive
                  onChange={handleLanguageChange}
                  aria-label="language"
                  sx={{ width: "100%" }}
                >
                  <ToggleButton
                    value="en"
                    aria-label="English"
                    sx={{ flex: 1 }}
                  >
                    English
                  </ToggleButton>
                  <ToggleButton
                    value="zh"
                    aria-label="Chinese"
                    sx={{ flex: 1 }}
                  >
                    中文
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </div>
  );
}
