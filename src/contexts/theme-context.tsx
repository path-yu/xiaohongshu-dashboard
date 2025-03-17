import * as React from "react";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import type { PaletteMode } from "@mui/material";
import { getTheme } from "../theme";

export type ThemeMode = "system" | "dark" | "light";

type ThemeContextType = {
  mode: PaletteMode; // 实际应用的主题
  themeMode: ThemeMode; // 用户选择的模式
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
};

const ThemeContext = React.createContext<ThemeContextType | undefined>(
  undefined
);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = React.useState<PaletteMode>("light"); // 实际主题
  const [themeMode, setLocalThemeMode] = React.useState<ThemeMode>("system"); // 用户选择的模式

  // 初始化主题，从 localStorage 加载或使用系统默认值
  React.useEffect(() => {
    const savedTheme = localStorage.getItem("theme_mode") as ThemeMode | null;
    if (savedTheme && ["light", "dark", "system"].includes(savedTheme)) {
      setLocalThemeMode(savedTheme);
      if (savedTheme !== "system") {
        setMode(savedTheme);
      }
    } else {
      // 默认使用系统主题
      setLocalThemeMode("system");
    }
  }, []);

  // 当 themeMode 为 "system" 时，监听系统主题变化
  React.useEffect(() => {
    if (themeMode !== "system") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      console.log("change");

      setMode(e.matches ? "dark" : "light");
    };

    // 初始设置
    setMode(mediaQuery.matches ? "dark" : "light");

    // 添加监听器
    mediaQuery.addEventListener("change", handleChange);

    // 清理监听器
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [themeMode]); // 依赖 themeMode，确保切换时更新

  // 生成 MUI 主题
  const theme = React.useMemo(() => getTheme(mode), [mode]);

  // 切换主题（仅在 light 和 dark 之间切换）
  const toggleTheme = React.useCallback(() => {
    setMode((prevMode) => {
      const newMode = prevMode === "light" ? "dark" : "light";
      setLocalThemeMode(newMode); // 更新用户选择
      localStorage.setItem("theme_mode", newMode);
      return newMode;
    });
  }, []);

  // 设置特定的主题模式
  const setThemeMode = React.useCallback((newMode: ThemeMode) => {
    setLocalThemeMode(newMode); // 更新用户选择
    localStorage.setItem("theme_mode", newMode);

    if (newMode !== "system") {
      setMode(newMode); // 如果不是 "system"，直接设置 mode
    } else {
      // 如果是 "system"，由 useEffect 处理
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setMode(isDark ? "dark" : "light");
    }
  }, []);

  return (
    <ThemeContext.Provider
      value={{ mode, themeMode, toggleTheme, setThemeMode }}
    >
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
