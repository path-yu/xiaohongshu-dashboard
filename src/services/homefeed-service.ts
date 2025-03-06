/**
 * Service for fetching homepage feed data
 */
import { api } from "./api-service";
import { type HomeFeedResponse, FeedType } from "../types/homefeed";

/**
 * Get homepage feed data
 */
export const getHomeFeed = async (
  feedType: FeedType = FeedType.RECOMMEND
): Promise<HomeFeedResponse> => {
  try {
    return await api.get<HomeFeedResponse>(
      `api/homefeed/recommend?feed_type=${feedType}`
    );
  } catch (error) {
    console.error("Failed to fetch homepage feed:", error);

    // Extract error message if available
    let errorMessage = "获取首页数据失败，请稍后重试";
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
      message: "获取首页数据失败",
      data: { cursor_score: "", items: [] },
      error: errorMessage,
    };
  }
};

/**
 * Interface for category response
 */
export interface CategoryResponse {
  success: boolean;
  message: string;
  data: Category[];
  error?: string;
}

export interface Category {
  id: string;
  name: string;
  type?: string;
}

/**
 * Get homepage categories
 */
export const getCategories = async (): Promise<CategoryResponse> => {
  try {
    return await api.get<CategoryResponse>("api/homefeed/categories");
  } catch (error) {
    console.error("Failed to fetch categories:", error);

    // Extract error message if available
    let errorMessage = "获取分类数据失败，请稍后重试";
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
      message: "获取分类数据失败",
      data: [],
      error: errorMessage,
    };
  }
};
