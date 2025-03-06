"use client"

import type * as React from "react"
import { useState } from "react"
import { Box, Card, CardContent, Typography, TextField, Button, CircularProgress, InputAdornment } from "@mui/material"
import SearchIcon from "@mui/icons-material/Search"
import PostList from "@/components/post-list"
import CommentModal from "@/components/comment-modal"
import { useCommentStore } from "@/store/comment-store"
import type { Post } from "@/types"

// Mock API function to search posts
const searchPosts = async (query: string): Promise<Post[]> => {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Return mock data
  return Array(8)
    .fill(null)
    .map((_, index) => ({
      id: `search-${index}`,
      title: `${query} Result ${index + 1}`,
      content: `This is a search result for "${query}". Sample content for demonstration.`,
      author: `User${Math.floor(Math.random() * 1000)}`,
      likes: Math.floor(Math.random() * 1000),
      comments: Math.floor(Math.random() * 100),
      imageUrl: `/placeholder.svg?height=200&width=200&text=Search+${index}`,
      category: index % 2 === 0 ? "Fashion" : "Beauty",
    }))
}

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Post[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const { isCommentModalOpen } = useCommentStore()

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!searchQuery.trim()) return

    setLoading(true)
    setHasSearched(true)

    try {
      const results = await searchPosts(searchQuery)
      setSearchResults(results)
    } catch (error) {
      console.error("Search failed:", error)
      // You could add error handling UI here
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" component="div" gutterBottom>
            Search Xiaohongshu Posts
          </Typography>

          <form onSubmit={handleSearch}>
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Enter keywords to search posts..."
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
              <Button type="submit" variant="contained" color="primary" disabled={loading || !searchQuery.trim()}>
                {loading ? <CircularProgress size={24} color="inherit" /> : "Search"}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
          <CircularProgress />
        </Box>
      ) : hasSearched ? (
        searchResults.length > 0 ? (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Search Results for "{searchQuery}"
              </Typography>
              <PostList posts={searchResults} />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent>
              <Box sx={{ textAlign: "center", py: 5 }}>
                <Typography variant="h6">No results found</Typography>
                <Typography variant="body2" color="text.secondary">
                  Try different keywords or check your search terms
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )
      ) : (
        <Card>
          <CardContent>
            <Box sx={{ textAlign: "center", py: 5 }}>
              <SearchIcon sx={{ fontSize: 60, color: "text.secondary", mb: 2 }} />
              <Typography variant="h6">Search for Xiaohongshu Posts</Typography>
              <Typography variant="body2" color="text.secondary">
                Enter keywords above to find posts
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {isCommentModalOpen && <CommentModal />}
    </Box>
  )
}

