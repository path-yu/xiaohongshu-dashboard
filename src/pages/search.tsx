"use client";

import type * as React from "react";
import { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  CircularProgress,
  InputAdornment,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  type SelectChangeEvent,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PostList from "../components/post-list";
import CommentModal from "../components/comment-modal";
import { useCommentStore } from "../store/comment-store";
import type { Post } from "../types";
import { usePostContext } from "../contexts/post-context";
import {
  searchNotes,
  SearchSortType,
  SearchNoteType,
} from "../services/search-service";
import { usePlaywright } from "../contexts/playwright.context";

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortType, setSortType] = useState<SearchSortType>(
    SearchSortType.GENERAL
  );
  const [noteType, setNoteType] = useState<SearchNoteType>(SearchNoteType.ALL);
  const { isCommentModalOpen } = useCommentStore();
  const { setCurrentPosts } = usePostContext();
  const { status: playwrightStatus } = usePlaywright();

  // Update current posts when search results change
  useEffect(() => {
    setCurrentPosts(searchResults);
  }, [searchResults, setCurrentPosts]);

  const handleSortChange = (event: SelectChangeEvent<number>) => {
    setSortType(event.target.value as SearchSortType);
  };

  const handleNoteTypeChange = (event: SelectChangeEvent<number>) => {
    setNoteType(event.target.value as SearchNoteType);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchQuery.trim()) return;

    setLoading(true);
    setHasSearched(true);
    setError(null);

    try {
      // If Playwright is not running, show mock data
      if (playwrightStatus !== "running") {
        // Mock data for demonstration
        const mockResults = Array(8)
          .fill(null)
          .map((_, index) => ({
            id: `search-${index}`,
            title: `${searchQuery} 搜索结果 ${index + 1}`,
            content: `这是"${searchQuery}"的搜索结果示例。请先启动 Playwright 以获取真实数据。`,
            author: `用户${Math.floor(Math.random() * 1000)}`,
            likes: Math.floor(Math.random() * 1000),
            comments: Math.floor(Math.random() * 100),
            imageUrl: `https://via.placeholder.com/200x200?text=Search+${index}`,
            category: index % 2 === 0 ? "时尚" : "美妆",
          }));

        setSearchResults(mockResults);
        setLoading(false);
        return;
      }

      // Call the real API
      const response = await searchNotes(
        searchQuery,
        1,
        20,
        sortType,
        noteType
      );

      if (!response.success) {
        throw new Error(
          response.error || response.message || "搜索失败，请稍后重试"
        );
      }

      if (!response.data.items || response.data.items.length === 0) {
        setSearchResults([]);
        return;
      }

      // Convert API response to Post format
      const apiResults = response.data.items.map((item) => ({
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
        category: "搜索结果",
      }));

      setSearchResults(apiResults);
    } catch (error) {
      console.error("Search failed:", error);
      setError(error instanceof Error ? error.message : "搜索失败，请稍后重试");
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" component="div" gutterBottom>
            搜索小红书笔记
          </Typography>

          <form onSubmit={handleSearch}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="输入关键词搜索笔记..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel id="sort-type-label">排序方式</InputLabel>
                  <Select
                    labelId="sort-type-label"
                    value={sortType}
                    label="排序方式"
                    onChange={handleSortChange}
                  >
                    <MenuItem value={SearchSortType.GENERAL}>综合排序</MenuItem>
                    <MenuItem value={SearchSortType.LATEST}>最新排序</MenuItem>
                    <MenuItem value={SearchSortType.HOT}>最热排序</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel id="note-type-label">笔记类型</InputLabel>
                  <Select
                    labelId="note-type-label"
                    value={noteType}
                    label="笔记类型"
                    onChange={handleNoteTypeChange}
                  >
                    <MenuItem value={SearchNoteType.ALL}>所有笔记</MenuItem>
                    <MenuItem value={SearchNoteType.VIDEO}>视频笔记</MenuItem>
                    <MenuItem value={SearchNoteType.IMAGE}>图文笔记</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={2}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                  sx={{ height: "100%" }}
                  disabled={loading || !searchQuery.trim()}
                >
                  {loading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    "搜索"
                  )}
                </Button>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : hasSearched ? (
        searchResults.length > 0 ? (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                "{searchQuery}" 的搜索结果
              </Typography>
              <PostList posts={searchResults} />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent>
              <Box sx={{ textAlign: "center", py: 5 }}>
                <Typography variant="h6">未找到结果</Typography>
                <Typography variant="body2" color="text.secondary">
                  尝试不同的关键词或检查搜索条件
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )
      ) : (
        <Card>
          <CardContent>
            <Box sx={{ textAlign: "center", py: 5 }}>
              <SearchIcon
                sx={{ fontSize: 60, color: "text.secondary", mb: 2 }}
              />
              <Typography variant="h6">搜索小红书笔记</Typography>
              <Typography variant="body2" color="text.secondary">
                在上方输入关键词以查找笔记
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {isCommentModalOpen && <CommentModal />}
    </Box>
  );
}
