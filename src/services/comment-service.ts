/**
 * Service for commenting on notes
 */
import { api } from "./api-service";

export interface CommentResponse {
  success: boolean;
  message: string;
  data: any;
  error?: string;
}

/**
 * Comment on a note
 */
export const commentNote = async (
  noteId: string,
  content: string
): Promise<CommentResponse> => {
  try {
    return await api.post<CommentResponse>("api/comment/note", {
      note_id: noteId,
      content,
    });
  } catch (error) {
    console.error("Failed to comment on note:", error);

    // Extract error message if available
    let errorMessage = "评论失败，请稍后重试";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === "string") {
      errorMessage = error;
    } else if (typeof error === "object" && error !== null) {
      // @ts-ignore
      errorMessage = error.message || error.error || errorMessage;
    }

    return {
      success: false,
      message: "评论失败",
      data: null,
      error: errorMessage,
    };
  }
};
