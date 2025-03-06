"use client"

import type * as React from "react"
import { useState, useEffect } from "react"
import { Box, Card, CardContent, Typography, Grid, Tabs, Tab, CircularProgress } from "@mui/material"
import PostList from "@/components/post-list"
import CommentModal from "@/components/comment-modal"
import { useCommentStore } from "@/store/comment-store"
import type { Post } from "@/types"

// Mock API function to fetch posts by category
const fetchPostsByCategory = async (category: string): Promise<Post[]> => {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Return mock data
  return Array(10)
    .fill(null)
    .map((_, index) => ({
      id: `${category}-${index}`,
      title: `${category} Post ${index + 1}`,
      content: `This is a sample post content for ${category} category.`,
      author: `User${Math.floor(Math.random() * 1000)}`,
      likes: Math.floor(Math.random() * 1000),
      comments: Math.floor(Math.random() * 100),
      imageUrl: `/placeholder.svg?height=200&width=200&text=${category}+${index}`,
      category,
    }))
}

export default function Dashboard() {
  const [tabValue, setTabValue] = useState(0)
  const [categories, setCategories] = useState<string[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const { selectedPosts, isCommentModalOpen } = useCommentStore()

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      // Simulate API call to get categories
      await new Promise((resolve) => setTimeout(resolve, 500))
      setCategories(["Recommended", "Fashion", "Beauty", "Food", "Travel"])
      setLoading(false)
    }

    fetchCategories()
  }, [])

  // Fetch posts when tab changes
  useEffect(() => {
    if (categories.length > 0) {
      setLoading(true)
      fetchPostsByCategory(categories[tabValue]).then((data) => {
        setPosts(data)
        setLoading(false)
      })
    }
  }, [tabValue, categories])

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h5" component="div" gutterBottom>
                Xiaohongshu Posts
              </Typography>

              {loading && categories.length === 0 ? (
                <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Tabs
                  value={tabValue}
                  onChange={handleTabChange}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{ mb: 2 }}
                >
                  {categories.map((category, index) => (
                    <Tab key={index} label={category} />
                  ))}
                </Tabs>
              )}

              {loading && categories.length > 0 ? (
                <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <PostList posts={posts} />
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {isCommentModalOpen && <CommentModal />}
    </Box>
  )
}

