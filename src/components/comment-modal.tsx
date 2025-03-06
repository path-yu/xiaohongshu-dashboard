"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Checkbox,
  FormControlLabel,
  Divider,
  Grid,
  Slider,
  CircularProgress,
  Alert,
} from "@mui/material"
import { useCommentStore } from "../store/comment-store"
import { useToast } from "../contexts/toast-context"
import type { CommentTemplate } from "../types"

export default function CommentModal() {
  const { isCommentModalOpen, closeCommentModal, selectedPosts } = useCommentStore()
  const [templates, setTemplates] = useState<CommentTemplate[]>([])
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([])
  const [customComment, setCustomComment] = useState("")
  const [minDelay, setMinDelay] = useState(5)
  const [maxDelay, setMaxDelay] = useState(30)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { showToast } = useToast()

  // Load templates from localStorage
  useEffect(() => {
    const savedTemplates = localStorage.getItem("comment_templates")
    if (savedTemplates) {
      try {
        setTemplates(JSON.parse(savedTemplates))
      } catch (e) {
        console.error("Failed to parse saved templates", e)
      }
    }
  }, [])

  const handleTemplateToggle = (templateId: string) => {
    setSelectedTemplates((prev) =>
      prev.includes(templateId) ? prev.filter((id) => id !== templateId) : [...prev, templateId],
    )
  }

  const handleMinDelayChange = (_: Event, newValue: number | number[]) => {
    setMinDelay(newValue as number)
    // Ensure max delay is always >= min delay
    if (maxDelay < (newValue as number)) {
      setMaxDelay(newValue as number)
    }
  }

  const handleMaxDelayChange = (_: Event, newValue: number | number[]) => {
    setMaxDelay(newValue as number)
  }

  const handleSubmit = async () => {
    // Validate that either custom comment or at least one template is selected
    if (!customComment && selectedTemplates.length === 0) {
      setError("Please enter a custom comment or select at least one template")
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // Get the comments to post
      const commentsToPost: string[] = []

      if (customComment) {
        commentsToPost.push(customComment)
      }

      selectedTemplates.forEach((templateId) => {
        const template = templates.find((t) => t.id === templateId)
        if (template) {
          commentsToPost.push(template.content)
        }
      })

      // Simulate API calls with random delays between minDelay and maxDelay
      for (const post of selectedPosts) {
        for (const comment of commentsToPost) {
          const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay
          console.log(`Posting comment to ${post.title} with delay of ${delay}s: ${comment}`)

          // Simulate API call
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }

      showToast("Comments posted successfully!", "success")

      // Close modal after a short delay
      setTimeout(() => {
        closeCommentModal()
      }, 1000)
    } catch (err) {
      console.error("Error posting comments:", err)
      setError("Failed to post comments. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={isCommentModalOpen} onClose={!submitting ? closeCommentModal : undefined} maxWidth="md" fullWidth>
      <DialogTitle>Add Comments to {selectedPosts.length} Selected Posts</DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Custom Comment
            </Typography>

            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="Enter your custom comment here..."
              value={customComment}
              onChange={(e) => setCustomComment(e.target.value)}
              disabled={submitting}
            />

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
              Comment Templates
            </Typography>

            {templates.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No templates available. Create templates in the Templates section.
              </Typography>
            ) : (
              <Box sx={{ maxHeight: 200, overflow: "auto" }}>
                {templates.map((template) => (
                  <FormControlLabel
                    key={template.id}
                    control={
                      <Checkbox
                        checked={selectedTemplates.includes(template.id)}
                        onChange={() => handleTemplateToggle(template.id)}
                        disabled={submitting}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {template.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {template.content.length > 50 ? `${template.content.substring(0, 50)}...` : template.content}
                        </Typography>
                      </Box>
                    }
                    sx={{ display: "block", mb: 1 }}
                  />
                ))}
              </Box>
            )}
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Selected Posts ({selectedPosts.length})
            </Typography>

            <Box sx={{ maxHeight: 200, overflow: "auto", mb: 3 }}>
              {selectedPosts.map((post) => (
                <Box key={post.id} sx={{ mb: 1, p: 1, borderRadius: 1, bgcolor: "background.default" }}>
                  <Typography variant="body2" fontWeight="medium">
                    {post.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    @{post.author} • {post.category}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" gutterBottom>
              Delay Settings
            </Typography>

            <Typography variant="body2" color="text.secondary" paragraph>
              Set minimum and maximum delay between comments to avoid rate limiting
            </Typography>

            <Box sx={{ px: 2 }}>
              <Typography gutterBottom>Minimum Delay: {minDelay} seconds</Typography>
              <Slider value={minDelay} onChange={handleMinDelayChange} min={1} max={60} disabled={submitting} />

              <Typography gutterBottom sx={{ mt: 2 }}>
                Maximum Delay: {maxDelay} seconds
              </Typography>
              <Slider value={maxDelay} onChange={handleMaxDelayChange} min={minDelay} max={120} disabled={submitting} />
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Total estimated time:{" "}
              {Math.round(
                (((minDelay + maxDelay) / 2) *
                  selectedPosts.length *
                  (customComment ? 1 : 0 + selectedTemplates.length)) /
                  60,
              )}{" "}
              minutes
            </Typography>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={closeCommentModal} disabled={submitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={submitting || (!customComment && selectedTemplates.length === 0)}
        >
          {submitting ? (
            <>
              <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
              Posting Comments...
            </>
          ) : (
            "Post Comments"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

