import { createTheme, type PaletteMode } from "@mui/material/styles";

// Create a theme instance for each mode
const getTheme = (mode: PaletteMode) =>
  createTheme({
    palette: {
      mode,
      ...(mode === "light"
        ? {
            // Light mode colors
            primary: {
              main: "#ff4d4f",
              light: "#ff7875",
              dark: "#cf1322",
            },
            secondary: {
              main: "#722ed1",
              light: "#9254de",
              dark: "#531dab",
            },
            background: {
              default: "#f5f5f5",
              paper: "#ffffff",
            },
          }
        : {
            // Dark mode colors
            primary: {
              main: "#ff4d4f",
              light: "#ff7875",
              dark: "#cf1322",
            },
            secondary: {
              main: "#9254de",
              light: "#b37feb",
              dark: "#722ed1",
            },
            background: {
              default: "#121212",
              paper: "#1e1e1e",
            },
            text: {
              primary: "#ffffff",
              secondary: "rgba(255, 255, 255, 0.7)",
            },
          }),
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            textTransform: "none",
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          },
        },
      },
    },
  });

// Default to light theme
const theme = getTheme("light");

export { getTheme };
export default theme;
