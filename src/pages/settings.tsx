"use client";

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
  Grid,
  Divider,
  Switch,
  FormControlLabel,
  CircularProgress,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import { useToast } from "../contexts/toast-context";
import { usePlaywright } from "../contexts/playwright.context";
import { getWebSession, setWebSession } from "../services/settings-service";

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

  // Load settings from localStorage and API
  useEffect(() => {
    const loadSettings = async () => {
      setFetchingSession(true);
      // Load web_session from API
      try {
        const response = await getWebSession();
        const data = JSON.parse(response.web_session!);
        if (!response.error) {
          setSettings({
            web_session: data.web_session || "",
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

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Save web_session to API
      const response = await setWebSession(settings.web_session);

      if (!response.error) {
        showToast(
          response.message || "Settings saved successfully!",
          "success"
        );

        // Auto-start Playwright if enabled
        if (settings.autoStartPlaywright && playwrightStatus === "stopped") {
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
    <Box sx={{ flexGrow: 1 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" component="div" gutterBottom>
                Account Settings
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Configure your Xiaohongshu account credentials for API access
              </Typography>

              <Divider sx={{ my: 3 }} />

              <form onSubmit={handleSaveSettings}>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="web_session"
                      name="web_session"
                      value={settings.web_session}
                      onChange={handleChange}
                      variant="outlined"
                      required
                      helperText="Your Xiaohongshu web_session cookie value"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.autoStartPlaywright}
                          onChange={handleSwitchChange}
                          name="autoStartPlaywright"
                          color="primary"
                        />
                      }
                      label="保存后自动启动 Playwright"
                    />
                  </Grid>

                  <Grid item xs={12}>
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
                      {loading ? "Saving..." : "Save Settings"}
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

        <Grid item xs={12} md={4} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                How to find your credentials
              </Typography>

              <Typography variant="body2" paragraph>
                1. Log in to Xiaohongshu in your browser
              </Typography>

              <Typography variant="body2" paragraph>
                2. Open Developer Tools (F12 or right-click and select
                "Inspect")
              </Typography>

              <Typography variant="body2" paragraph>
                3. Go to the "Application" tab, then "Cookies"
              </Typography>

              <Typography variant="body2" paragraph>
                4. Find and copy the values for "web_session"
              </Typography>

              <Alert severity="warning" sx={{ mt: 2 }}>
                Keep your credentials secure and never share them with others.
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
