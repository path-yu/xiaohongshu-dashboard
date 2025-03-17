import { useState, useEffect, useCallback } from "react";
import {
  Box,
  CardContent,
  Typography,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Button,
  Skeleton,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import PostList from "../components/post-list";
import CommentModal from "../components/comment-modal";
import { useCommentStore } from "../store/comment-store";
import type { Post } from "../types";
import {
  getHomeFeed,
  getCategories,
  type Category,
} from "../services/homefeed-service";
import { FeedType, type HomeFeedItem } from "../types/homefeed";
import { usePlaywright } from "../contexts/playwright-context";
import { useToast } from "../contexts/toast-context";
import { usePostContext } from "../contexts/post-context";
import AnimatedCard from "../components/animated-card";
import { useLanguage } from "../contexts/language-context"; // Import language context
import Grid from "@mui/material/Grid2";
export default function Dashboard() {
  const [tabValue, setTabValue] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isCommentModalOpen } = useCommentStore();
  const { status: playwrightStatus } = usePlaywright();
  const { showToast } = useToast();
  const { setCurrentPosts } = usePostContext();
  const { translations } = useLanguage(); // Use language context

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);

    try {
      // If Playwright is not running, use default categories
      if (playwrightStatus !== "running") {
        setCategories([
          { id: "recommend", name: "推荐" },
          { id: "follow", name: "关注" },
        ]);
        setLoadingCategories(false);
        return;
      }

      // Get categories from API
      const response = await getCategories();

      if (!response.success) {
        console.error("Failed to fetch categories:", response.error);
        // Fall back to default categories
        setCategories([
          { id: "recommend", name: "推荐" },
          { id: "follow", name: "关注" },
        ]);
      } else if (!response.data || response.data.length === 0) {
        // If no categories returned, use defaults
        setCategories([
          { id: "recommend", name: "推荐" },
          { id: "follow", name: "关注" },
        ]);
      } else {
        // Process API categories to ensure 推荐 is first
        let apiCategories = [...response.data];

        // Find if 推荐 exists in the categories
        const recommendIndex = apiCategories.findIndex(
          (cat) => cat.name === "推荐"
        );

        if (recommendIndex === -1) {
          // If 推荐 doesn't exist, add it at the beginning
          apiCategories = [{ id: "recommend", name: "推荐" }, ...apiCategories];
        } else if (recommendIndex > 0) {
          // If 推荐 exists but is not first, move it to the beginning
          const recommendCategory = apiCategories.splice(recommendIndex, 1)[0];
          apiCategories = [recommendCategory, ...apiCategories];
        }

        setCategories(apiCategories);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      // Fall back to default categories
      setCategories([
        { id: "recommend", name: "推荐" },
        { id: "follow", name: "关注" },
      ]);
    } finally {
      setLoadingCategories(false);
    }
  }, [playwrightStatus]);
  // Fetch categories on mount and when Playwright status changes
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Fetch posts when tab changes or when Playwright status changes
  const fetchPosts = useCallback(async () => {
    if (categories.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      // If Playwright is not running, show mock data
      if (playwrightStatus !== "running") {
        // Mock data for demonstration
        const mockPosts = Array(10)
          .fill(null)
          .map((_, index) => ({
            id: `mock-${index}`,
            title: `${categories[tabValue]?.name || "示例"} 示例帖子 ${
              index + 1
            }`,
            content: `这是一个示例帖子内容，请先启动 Playwright 以获取真实数据。`,
            author: `用户${Math.floor(Math.random() * 1000)}`,
            likes: Math.floor(Math.random() * 1000),
            comments: Math.floor(Math.random() * 100),
            imageUrl: `https://via.placeholder.com/200x200?text=${
              categories[tabValue]?.name || "示例"
            }+${index}`,
            category: categories[tabValue]?.name || "示例",
          }));

        setPosts(mockPosts);
        setCurrentPosts(mockPosts);
        setLoading(false);
        return;
      }

      // Get real data from API
      // Use the category ID if available, otherwise fallback to enum
      const feedType =
        categories[tabValue]?.id ||
        (tabValue === 0 ? FeedType.RECOMMEND : FeedType.FOLLOW);
      const response = await getHomeFeed(feedType as FeedType);

      if (!response.success) {
        // Extract the specific error message from the API response
        const errorMessage =
          response.error || response.message || "获取帖子失败，请稍后重试";
        throw new Error(errorMessage);
      }

      // Check if items array exists and is not empty
      if (!response.data?.items || response.data.items.length === 0) {
        throw new Error("没有获取到帖子数据，请稍后重试");
      }

      // Convert API response to Post format
      const apiPosts = response.data.items.map((item: HomeFeedItem) => ({
        id: item.id,
        title: item.note_card.display_title || "无标题",
        content: item.note_card.display_title || "无内容", // Use title as content since we don't have content in the API
        author: item.note_card.user?.nickname || "未知用户",
        likes: Number.parseInt(item.note_card.interact_info?.liked_count) || 0,
        comments: Math.floor(Math.random() * 100), // Random comments count since we don't have it in the API
        imageUrl:
          item.note_card.cover?.url_default ||
          item.note_card.cover?.url_pre ||
          "https://via.placeholder.com/200x200?text=No+Image",
        category: categories[tabValue]?.name || "未分类",
      }));

      setPosts(apiPosts);
      setCurrentPosts(apiPosts);
    } catch (err) {
      console.error("Error fetching posts:", err);
      // Use the specific error message if available
      const errorMessage =
        err instanceof Error
          ? err.message
          : "获取帖子失败，请检查网络连接或确保 Playwright 已启动";
      setError(errorMessage);

      // Show toast with error message
      showToast(errorMessage, "error");

      // Set mock data for error state
      const mockErrorPosts = Array(6)
        .fill(null)
        .map((_, index) => ({
          id: `mock-error-${index}`,
          title: `示例帖子 ${index + 1}`,
          content: `这是一个示例帖子内容，API 请求失败时显示。`,
          author: `用户${Math.floor(Math.random() * 1000)}`,
          likes: Math.floor(Math.random() * 1000),
          comments: Math.floor(Math.random() * 100),
          imageUrl: `https://via.placeholder.com/200x200?text=Error+${index}`,
          category: categories[tabValue]?.name || "未分类",
        }));

      setCurrentPosts(mockErrorPosts);
    } finally {
      setLoading(false);
    }
  }, [tabValue, categories]);

  // Fetch posts when tab changes, categories change, or when Playwright status changes
  useEffect(() => {
    if (categories.length > 0 && !loadingCategories) {
      fetchPosts();
    }
  }, [fetchPosts, categories, loadingCategories]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleRefresh = () => {
    fetchPosts();
    if (categories.length === 2) {
      fetchCategories();
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <AnimatedCard>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography variant="h5" component="div">
                  {translations.xiaohongshuPosts as string}
                </Typography>

                <Box sx={{ display: "flex", alignItems: "center" }}>
                  {playwrightStatus !== "running" && (
                    <Alert severity="warning" sx={{ mr: 2 }}>
                      {translations.playwrightNotRunning as string}
                    </Alert>
                  )}

                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<RefreshIcon />}
                    onClick={handleRefresh}
                    disabled={loading || loadingCategories}
                  >
                    {translations.refresh as string}
                  </Button>
                </Box>
              </Box>

              {loadingCategories ? (
                <Skeleton
                  variant="rectangular"
                  height={48}
                  sx={{ borderRadius: 1, mb: 2 }}
                />
              ) : (
                <Tabs
                  value={tabValue}
                  onChange={handleTabChange}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{ mb: 2 }}
                >
                  {categories.map((category, index) => (
                    <Tab key={category.id || index} label={category.name} />
                  ))}
                </Tabs>
              )}

              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : error ? (
                <Box>
                  <Alert
                    severity="error"
                    sx={{ mb: 2 }}
                    action={
                      <Button
                        color="inherit"
                        size="small"
                        onClick={handleRefresh}
                      >
                        {translations.retry as string}
                      </Button>
                    }
                  >
                    {error}
                  </Alert>

                  {/* Show mock data even when there's an error */}
                  <Typography variant="subtitle1" sx={{ mb: 2, mt: 4 }}>
                    {translations.mockData as string}
                  </Typography>
                  <PostList
                    posts={Array(6)
                      .fill(null)
                      .map((_, index) => ({
                        id: `mock-error-${index}`,
                        title: `${translations.mockPost} ${index + 1}`,
                        content: translations.mockPostContent as string,
                        author: `${translations.user}${Math.floor(
                          Math.random() * 1000
                        )}`,
                        likes: Math.floor(Math.random() * 1000),
                        comments: Math.floor(Math.random() * 100),
                        imageUrl: `https://via.placeholder.com/200x200?text=Error+${index}`,
                        category:
                          (categories[tabValue]?.name as string) ||
                          (translations.uncategorized as string),
                      }))}
                  />
                </Box>
              ) : (
                <PostList posts={posts} />
              )}
            </CardContent>
          </AnimatedCard>
        </Grid>
      </Grid>

      {isCommentModalOpen && <CommentModal />}
    </Box>
  );
}
