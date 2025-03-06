"use client";

import * as React from "react";
import {
  startPlaywright,
  stopPlaywright,
  checkPlaywrightStatus,
  type PlaywrightStatusType,
} from "../services/playwright-service";
import { useToast } from "./toast-context";

type PlaywrightStatus = PlaywrightStatusType | "checking";

interface PlaywrightContextType {
  status: PlaywrightStatus;
  statusMessage: string;
  startBrowser: () => Promise<void>;
  stopBrowser: () => Promise<void>;
  checkStatus: () => Promise<void>;
}

const PlaywrightContext = React.createContext<
  PlaywrightContextType | undefined
>(undefined);

export function PlaywrightProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [status, setStatus] = React.useState<PlaywrightStatus>("stopped");
  const [statusMessage, setStatusMessage] =
    React.useState<string>("Playwright 未启动");
  const { showToast } = useToast();

  // Check Playwright status on mount
  React.useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setStatus("checking");

    try {
      const response = await checkPlaywrightStatus();
      if (response.error) {
        console.error("Error checking Playwright status:", response.error);
        setStatus("stopped");
        setStatusMessage("Playwright 状态检查失败");
        return;
      }

      setStatus(response.status);
      setStatusMessage(response.message);
    } catch (error) {
      console.error("Failed to check Playwright status:", error);
      setStatus("stopped");
      setStatusMessage("Playwright 状态检查失败");
    }
  };

  const startBrowser = async () => {
    if (status === "running") {
      showToast("Playwright 已经在运行中", "info");
      return;
    }

    setStatus("loading");
    setStatusMessage("正在启动 Playwright...");

    try {
      const response = await startPlaywright();

      if (response.error) {
        showToast(response.error, "error");
        // If error contains "already running", set status to running
        if (response.error.includes("已经在运行中")) {
          setStatus("running");
          setStatusMessage("Playwright 正在运行");
        } else {
          setStatus("stopped");
          setStatusMessage("Playwright 启动失败");
        }
      } else {
        showToast(response.message || "Playwright 已启动", "success");
        setStatus("running");
        setStatusMessage("Playwright 正在运行");
      }

      // // Check status after a short delay to confirm
      // setTimeout(() => checkStatus(), 2000);
    } catch (error) {
      console.error("Start browser error:", error);
      showToast("启动失败，请检查网络连接", "error");
      setStatus("stopped");
      setStatusMessage("Playwright 启动失败");
    }
  };

  const stopBrowser = async () => {
    if (status === "stopped") {
      showToast("Playwright 未启动", "info");
      return;
    }

    setStatus("loading");
    setStatusMessage("正在停止 Playwright...");

    try {
      const response = await stopPlaywright();

      if (response.error) {
        showToast(response.error, "error");
        // If error contains "not running", set status to stopped
        if (response.error.includes("未启动")) {
          setStatus("stopped");
          setStatusMessage("Playwright 已停止");
        } else {
          setStatus("running");
          setStatusMessage("Playwright 正在运行");
        }
      } else {
        showToast(response.message || "Playwright 已停止", "success");
        setStatus("stopped");
        setStatusMessage("Playwright 已停止");
      }

      // Check status after a short delay to confirm
      setTimeout(() => checkStatus(), 2000);
    } catch (error) {
      console.error("Stop browser error:", error);
      showToast("停止失败，请检查网络连接", "error");
      setStatus("running");
      setStatusMessage("Playwright 停止失败");
    }
  };

  return (
    <PlaywrightContext.Provider
      value={{
        status,
        statusMessage,
        startBrowser,
        stopBrowser,
        checkStatus,
      }}
    >
      {children}
    </PlaywrightContext.Provider>
  );
}

export function usePlaywright() {
  const context = React.useContext(PlaywrightContext);
  if (context === undefined) {
    throw new Error("usePlaywright must be used within a PlaywrightProvider");
  }
  return context;
}
