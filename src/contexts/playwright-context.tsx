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
import { useLanguage } from "./language-context"; // Import language context

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
  const { translations } = useLanguage(); // Use language context
  const [status, setStatus] = React.useState<PlaywrightStatus>("checking");
  const [statusMessage, setStatusMessage] = React.useState<string>(
    translations.checkingPlaywrightStatus as string
  );
  const sseConnectionRef =
    React.useRef<SSEConnection<PlaywrightStatusResponse> | null>(null);
  const { showToast } = useToast();

  // Handle SSE status updates
  const handleStatusUpdate = React.useCallback(
    (data: PlaywrightStatusResponse) => {
      if (data.error) {
        setStatus("disconnected");
        setStatusMessage(
          `${translations.statusCheckFailed as string}: ${data.error}`
        );
        return;
      }

      setStatus(data.status);
      setStatusMessage(data.message);
    },
    [translations]
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
          setStatusMessage(translations.playwrightStatusDisconnected as string);
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
  }, [handleStatusUpdate, translations]);

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
    setStatusMessage(translations.reconnectingPlaywrightStatus as string);
    initSSEConnection();
  }, [initSSEConnection, translations]);

  const startBrowser = async () => {
    if (status === "running") {
      showToast(translations.playwrightAlreadyRunning as string, "info");
      return;
    }

    try {
      const response = await startPlaywright();

      if (response.error) {
        showToast(response.error, "error");
      } else {
        showToast(
          response.message ||
            (translations.playwrightStartCommandSent as string),
          "success"
        );
      }
    } catch (error) {
      console.error("Start browser error:", error);
      showToast(translations.startFailedCheckNetwork as string, "error");
    }
  };

  const stopBrowser = async () => {
    if (status === "stopped") {
      showToast(translations.playwrightNotStarted as string, "info");
      return;
    }

    try {
      const response = await stopPlaywright();

      if (response.error) {
        showToast(response.error, "error");
      } else {
        showToast(
          response.message ||
            (translations.playwrightStopCommandSent as string),
          "success"
        );
      }
    } catch (error) {
      console.error("Stop browser error:", error);
      showToast(translations.stopFailedCheckNetwork as string, "error");
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
