/**
 * Service for managing application settings
 */
import { api } from "./api-service";

export interface WebSessionResponse {
  web_session?: string;
  message?: string;
  error?: string;
}

/**
 * Get the current web_session from the server
 */
export const getWebSession = async (): Promise<WebSessionResponse> => {
  try {
    return await api.get<WebSessionResponse>("api/get-web-session");
  } catch (error) {
    console.error("Failed to get web_session:", error);
    return {
      error: "Failed to get web_session. Please check your connection.",
    };
  }
};

/**
 * Set a new web_session on the server
 */
export const setWebSession = async (
  web_session: string
): Promise<WebSessionResponse> => {
  try {
    return await api.post<WebSessionResponse>("api/set-web-session", {
      web_session,
    });
  } catch (error) {
    console.error("Failed to set web_session:", error);
    return {
      error: "Failed to set web_session. Please check your connection.",
    };
  }
};
