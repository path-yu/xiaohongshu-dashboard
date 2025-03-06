"use client"

import type * as React from "react"
import { useState, useEffect } from "react"
import { Box, Card, CardContent, Typography, TextField, Button, Alert, Grid, Divider } from "@mui/material"
import SaveIcon from "@mui/icons-material/Save"
import { useToast } from "@/contexts/toast-context"

interface Settings {
  web_session: string
  webId: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    web_session: "",
    webId: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { showToast } = useToast()

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem("xiaohongshu_settings")
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings))
      } catch (e) {
        console.error("Failed to parse saved settings", e)
      }
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setSettings((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Save to localStorage
      localStorage.setItem("xiaohongshu_settings", JSON.stringify(settings))

      showToast("Settings saved successfully!", "success")
    } catch (err) {
      setError("Failed to save settings. Please try again.")
      console.error("Save settings error:", err)
    } finally {
      setLoading(false)
    }
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
                    <TextField
                      fullWidth
                      label="webId"
                      name="webId"
                      value={settings.webId}
                      onChange={handleChange}
                      variant="outlined"
                      required
                      helperText="Your Xiaohongshu webId value"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      startIcon={<SaveIcon />}
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
                2. Open Developer Tools (F12 or right-click and select "Inspect")
              </Typography>

              <Typography variant="body2" paragraph>
                3. Go to the "Application" tab, then "Cookies"
              </Typography>

              <Typography variant="body2" paragraph>
                4. Find and copy the values for "web_session" and "webId"
              </Typography>

              <Alert severity="warning" sx={{ mt: 2 }}>
                Keep your credentials secure and never share them with others.
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

