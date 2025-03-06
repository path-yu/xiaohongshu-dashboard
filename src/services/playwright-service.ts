/**
 * Service for controlling Playwright browser
 */
import { api } from "./api-service";

export type PlaywrightStatusType = "running" | "loading" | "stopped";

export interface PlaywrightStatusResponse {
  status: PlaywrightStatusType;
  message: string;
  error?: string;
}

export interface PlaywrightControlResponse {
  message?: string;
  error?: string;
}

/**
 * Check the status of Playwright browser
 */
export const checkPlaywrightStatus =
  async (): Promise<PlaywrightStatusResponse> => {
    try {
      return await api.get<PlaywrightStatusResponse>("api/playwright/status");
    } catch (error) {
      console.error("Failed to check Playwright status:", error);
      return {
        status: "stopped",
        message: "Failed to check Playwright status",
        error:
          "Failed to check Playwright status. Please check your connection.",
      };
    }
  };

/**
 * Start the Playwright browser
 */
export const startPlaywright = async (): Promise<PlaywrightControlResponse> => {
  try {
    return await api.post<PlaywrightControlResponse>("api/control", {
      action: "start",
    });
  } catch (error) {
    console.error("Failed to start Playwright:", error);
    return {
      error: "Failed to start Playwright. Please check your connection.",
    };
  }
};

/**
 * Stop the Playwright browser
 */
export const stopPlaywright = async (): Promise<PlaywrightControlResponse> => {
  try {
    return await api.post<PlaywrightControlResponse>("api/control", {
      action: "stop",
    });
  } catch (error) {
    console.error("Failed to stop Playwright:", error);
    return {
      error: "Failed to stop Playwright. Please check your connection.",
    };
  }
};
