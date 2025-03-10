import * as React from "react";
import {
  startPlaywright,
  stopPlaywright,
  type PlaywrightStatusType,
  type PlaywrightStatusResponse,
} from "../services/playwright-service";
import { SSEConnection } from "../services/sse-service";
import { useToast } from "./toast-context";
import { api } from "../services/api-service";

type PlaywrightStatus = PlaywrightStatusType | "checking" | "disconnected";

interface PlaywrightContextType {
  status: PlaywrightStatus;
  statusMessage: string;
  startBrowser: () => Promise<void>;
  stopBrowser: () => Promise<void>;
  reconnect: () => void;
}

const PlaywrightContext = React.createContext<
  PlaywrightContextType | undefined
>(undefined);

export function PlaywrightProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [status, setStatus] = React.useState<PlaywrightStatus>("checking");
  const [statusMessage, setStatusMessage] = React.useState<string>(
    "正在检查 Playwright 状态..."
  );
  const sseConnectionRef =
    React.useRef<SSEConnection<PlaywrightStatusResponse> | null>(null);
  const { showToast } = useToast();

  // Handle SSE status updates
  const handleStatusUpdate = React.useCallback(
    (data: PlaywrightStatusResponse) => {
      if (data.error) {
        setStatus("disconnected");
        setStatusMessage(`状态检查失败: ${data.error}`);
        return;
      }

      setStatus(data.status);
      setStatusMessage(data.message);
    },
    []
  );

  // Initialize SSE connection
  const initSSEConnection = React.useCallback(() => {
    // Close existing connection if any
    if (sseConnectionRef.current) {
      sseConnectionRef.current.close();
    }

    // Create new SSE connection
    const sseUrl = api.getApiUrl("api/playwright/status");
    const connection = new SSEConnection<PlaywrightStatusResponse>(
      sseUrl,
      handleStatusUpdate,
      {
        onOpen: () => {
          console.log("Playwright status SSE connection established");
        },
        onError: (error: any) => {
          console.error("Playwright status SSE error:", error);
          setStatus("disconnected");
          setStatusMessage("Playwright 状态监控连接断开");
        },
        reconnectDelay: 3000,
        maxReconnectAttempts: 5,
      }
    );

    connection.connect();
    sseConnectionRef.current = connection;

    return () => {
      connection.close();
    };
  }, [handleStatusUpdate]);

  // Initialize SSE on mount
  React.useEffect(() => {
    const cleanup = initSSEConnection();

    // Cleanup on unmount
    return () => {
      cleanup();
    };
  }, [initSSEConnection]);

  const reconnect = React.useCallback(() => {
    setStatus("checking");
    setStatusMessage("正在重新连接 Playwright 状态监控...");
    initSSEConnection();
  }, [initSSEConnection]);

  const startBrowser = async () => {
    if (status === "running") {
      showToast("Playwright 已经在运行中", "info");
      return;
    }

    try {
      const response = await startPlaywright();

      if (response.error) {
        showToast(response.error, "error");
      } else {
        showToast(response.message || "Playwright 启动命令已发送", "success");
      }
    } catch (error) {
      console.error("Start browser error:", error);
      showToast("启动失败，请检查网络连接", "error");
    }
  };

  const stopBrowser = async () => {
    if (status === "stopped") {
      showToast("Playwright 未启动", "info");
      return;
    }

    try {
      const response = await stopPlaywright();

      if (response.error) {
        showToast(response.error, "error");
      } else {
        showToast(response.message || "Playwright 停止命令已发送", "success");
      }
    } catch (error) {
      console.error("Stop browser error:", error);
      showToast("停止失败，请检查网络连接", "error");
    }
  };

  return (
    <PlaywrightContext.Provider
      value={{
        status,
        statusMessage,
        startBrowser,
        stopBrowser,
        reconnect,
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
