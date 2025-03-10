import * as React from "react";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import type { PaletteMode } from "@mui/material";
import { getTheme } from "../theme";

type ThemeContextType = {
  mode: PaletteMode;
  toggleTheme: () => void;
  setThemeMode: (mode: PaletteMode) => void;
};

const ThemeContext = React.createContext<ThemeContextType | undefined>(
  undefined
);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Try to get the saved theme from localStorage, default to 'light'
  const [mode, setMode] = React.useState<PaletteMode>("light");

  // Initialize theme from localStorage on mount
  React.useEffect(() => {
    const savedTheme = localStorage.getItem("theme_mode");
    if (savedTheme && (savedTheme === "light" || savedTheme === "dark")) {
      setMode(savedTheme);
    }
  }, []);

  // Generate the theme based on the current mode
  const theme = React.useMemo(() => getTheme(mode), [mode]);

  // Toggle between light and dark modes
  const toggleTheme = React.useCallback(() => {
    setMode((prevMode) => {
      const newMode = prevMode === "light" ? "dark" : "light";
      localStorage.setItem("theme_mode", newMode);
      return newMode;
    });
  }, []);

  // Set a specific theme mode
  const setThemeMode = React.useCallback((newMode: PaletteMode) => {
    setMode(newMode);
    localStorage.setItem("theme_mode", newMode);
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme, setThemeMode }}>
      <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
