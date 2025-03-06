import { createTheme } from "@mui/material/styles"

const theme = createTheme({
  palette: {
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
    },
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
})

export default theme

