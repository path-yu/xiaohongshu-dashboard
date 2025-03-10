/**
 * Service for controlling Playwright browser
 */
import { api } from "./api-service";

export type PlaywrightStatusType = "running" | "loading" | "stopped" | "idle";

export interface PlaywrightStatusResponse {
  status: PlaywrightStatusType;
  message: string;
  timestamp?: string;
  error?: string;
}

export interface PlaywrightControlResponse {
  message?: string;
  error?: string;
}

/**
 * Start the Playwright browser
 */
export const startPlaywright = async (): Promise<PlaywrightControlResponse> => {
  try {
    return await api.post<PlaywrightControlResponse>("api/playwright/start");
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
    return await api.post<PlaywrightControlResponse>("api/playwright/stop");
  } catch (error) {
    console.error("Failed to stop Playwright:", error);
    return {
      error: "Failed to stop Playwright. Please check your connection.",
    };
  }
};
