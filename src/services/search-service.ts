/**
 * Service for searching notes
 */
import { api } from "./api-service";

export enum SearchSortType {
  GENERAL = 0, // 综合排序
  LATEST = 1, // 最新排序
  HOT = 2, // 最热排序
}

export enum SearchNoteType {
  ALL = 0, // 所有笔记
  VIDEO = 1, // 视频笔记
  IMAGE = 2, // 图文笔记
}

export interface SearchResponse {
  success: boolean;
  message: string;
  data: SearchData;
  error?: string;
}

export interface SearchData {
  cursor: string;
  has_more: boolean;
  items: SearchItem[];
}

export interface SearchItem {
  id: string;
  type: string;
  note_card: NoteCard;
}

export interface NoteCard {
  display_title: string;
  user: {
    nickname: string;
    avatar: string;
    user_id: string;
  };
  interact_info: {
    liked_count: string;
  };
  cover: {
    url: string;
    url_pre: string;
    url_default: string;
    width: number;
    height: number;
  };
}

/**
 * Search notes by keyword
 */
export const searchNotes = async (
  keyword: string,
  page = 1,
  pageSize = 20,
  sort: SearchSortType = SearchSortType.GENERAL,
  noteType: SearchNoteType = SearchNoteType.ALL
): Promise<SearchResponse> => {
  try {
    return await api.get<SearchResponse>(
      `api/search/notes?keyword=${encodeURIComponent(
        keyword
      )}&page=${page}&page_size=${pageSize}&sort=${sort}&note_type=${noteType}`
    );
  } catch (error) {
    console.error("Failed to search notes:", error);

    // Extract error message if available
    let errorMessage = "搜索笔记失败，请稍后重试";
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
      message: "搜索笔记失败",
      data: { cursor: "", has_more: false, items: [] },
      error: errorMessage,
    };
  }
};
