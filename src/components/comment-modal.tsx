import { useState, useEffect } from "react";
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
  Slider,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Paper,
} from "@mui/material";
import { useCommentStore } from "../store/comment-store";
import { useToast } from "../contexts/toast-context";
import type { CommentTemplate } from "../types";
import { commentNote } from "../services/comment-service";
import { usePlaywright } from "../contexts/playwright-context";
import Grid from "@mui/material/Grid2";
import { useLanguage } from "../contexts/language-context"; // Import language context

export default function CommentModal() {
  const { isCommentModalOpen, closeCommentModal, selectedPosts } =
    useCommentStore();
  const [templates, setTemplates] = useState<CommentTemplate[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [customComment, setCustomComment] = useState("");
  const [minDelay, setMinDelay] = useState(5);
  const [maxDelay, setMaxDelay] = useState(30);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commentResults, setCommentResults] = useState<
    Array<{
      postId: string;
      postTitle: string;
      comment: string;
      success: boolean;
      message?: string;
    }>
  >([]);
  const [showResults, setShowResults] = useState(false);
  const { showToast } = useToast();
  const { status: playwrightStatus } = usePlaywright();
  const { translations } = useLanguage(); // Use language context

  // Load templates from localStorage
  useEffect(() => {
    const savedTemplates = localStorage.getItem("comment_templates");
    if (savedTemplates) {
      try {
        setTemplates(JSON.parse(savedTemplates));
      } catch (e) {
        console.error("Failed to parse saved templates", e);
      }
    }
  }, []);

  const handleTemplateToggle = (templateId: string) => {
    setSelectedTemplates((prev) =>
      prev.includes(templateId)
        ? prev.filter((id) => id !== templateId)
        : [...prev, templateId]
    );
  };

  const handleMinDelayChange = (_: Event, newValue: number | number[]) => {
    setMinDelay(newValue as number);
    // Ensure max delay is always >= min delay
    if (maxDelay < (newValue as number)) {
      setMaxDelay(newValue as number);
    }
  };

  const handleMaxDelayChange = (_: Event, newValue: number | number[]) => {
    setMaxDelay(newValue as number);
  };

  const handleSubmit = async () => {
    // Validate that either custom comment or at least one template is selected
    if (!customComment && selectedTemplates.length === 0) {
      setError(translations.enterCustomCommentContent as string);
      return;
    }

    setSubmitting(true);
    setError(null);
    setCommentResults([]);
    setShowResults(false);

    try {
      // If Playwright is not running, show mock results
      if (playwrightStatus !== "running") {
        // Simulate API calls with random delays between minDelay and maxDelay
        const mockResults = [];

        // Get the comments to post
        const commentsToPost: string[] = [];

        if (customComment) {
          commentsToPost.push(customComment);
        }

        selectedTemplates.forEach((templateId) => {
          const template = templates.find((t) => t.id === templateId);
          if (template) {
            commentsToPost.push(template.content);
          }
        });

        for (const post of selectedPosts) {
          for (const comment of commentsToPost) {
            const delay =
              Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
            console.log(
              `Posting comment to ${post.title} with delay of ${delay}s: ${comment}`
            );

            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // Add to results
            mockResults.push({
              postId: post.id,
              postTitle: post.title,
              comment,
              success: Math.random() > 0.2, // 80% success rate
              message:
                Math.random() > 0.2
                  ? (translations.commentSuccess as string)
                  : (translations.commentFailure as string),
            });
          }
        }

        setCommentResults(mockResults);
        setShowResults(true);
        showToast(translations.mockCommentComplete as string, "info");
        return;
      }

      // Get the comments to post
      const commentsToPost: string[] = [];

      if (customComment) {
        commentsToPost.push(customComment);
      }

      selectedTemplates.forEach((templateId) => {
        const template = templates.find((t) => t.id === templateId);
        if (template) {
          commentsToPost.push(template.content);
        }
      });

      // Track results
      const results = [];
      console.log(selectedPosts);

      // Post comments with delays
      for (const post of selectedPosts) {
        const delay =
          Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
        const comment =
          commentsToPost[Math.floor(Math.random() * commentsToPost.length)];
        // console.log(
        //   `Posting comment to ${post.title} with delay of ${delay}s: ${comment}`
        // );
        // Wait for the delay
        await new Promise((resolve) => setTimeout(resolve, delay * 1000));

        try {
          // Call the real API
          const response = await commentNote(post.id, comment);
          // Add to results
          results.push({
            postId: post.id,
            postTitle: post.title,
            comment,
            success: response.success,
            message: response.success
              ? (translations.commentSuccess as string)
              : response.error || (translations.commentFailure as string),
          });
        } catch (err) {
          console.error(`Error commenting on post ${post.id}:`, err);
          results.push({
            postId: post.id,
            postTitle: post.title,
            comment,
            success: false,
            message:
              err instanceof Error
                ? err.message
                : (translations.commentFailure as string),
          });
        }
      }

      setCommentResults(results);
      setShowResults(true);

      // Count successes
      const successCount = results.filter((r) => r.success).length;

      if (successCount === results.length) {
        showToast(translations.allCommentsSuccess as string, "success");
      } else if (successCount > 0) {
        showToast(
          `${translations.partialCommentsSuccess} (${successCount}/${results.length})`,
          "warning"
        );
      } else {
        showToast(translations.allCommentsFailure as string, "error");
      }
    } catch (err) {
      console.error("Error posting comments:", err);
      setError(translations.commentFailure as string);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;

    setShowResults(false);
    setCommentResults([]);
    closeCommentModal();
  };

  return (
    <Dialog
      open={isCommentModalOpen}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      {!showResults ? (
        <>
          <DialogTitle>
            {translations.addCommentToSelectedPosts as string}{" "}
            {selectedPosts.length} {translations.selectedPosts as string}
          </DialogTitle>

          <DialogContent dividers>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {playwrightStatus !== "running" && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {translations.playwrightNotRunning as string}
              </Alert>
            )}

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle1" gutterBottom>
                  {translations.customComment as string}
                </Typography>

                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  placeholder={translations.enterCustomCommentContent as string}
                  value={customComment}
                  onChange={(e) => setCustomComment(e.target.value)}
                  disabled={submitting}
                />

                <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
                  {translations.commentTemplates as string}
                </Typography>

                {templates.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    {
                      translations.noTemplatesAvailableCreateInTemplatePage as string
                    }
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
                            <Typography
                              sx={{ paddingLeft: "12px" }}
                              variant="body2"
                              fontWeight="medium"
                            >
                              {template.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ paddingLeft: "12px" }}
                              color="text.secondary"
                            >
                              {template.content.length > 50
                                ? `${template.content.substring(0, 50)}...`
                                : template.content}
                            </Typography>
                          </Box>
                        }
                        sx={{ display: "block", mb: 1 }}
                      />
                    ))}
                  </Box>
                )}
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle1" gutterBottom>
                  {translations.selectedPosts as string} ({selectedPosts.length}
                  )
                </Typography>

                <Box sx={{ maxHeight: 200, overflow: "auto", mb: 3 }}>
                  {selectedPosts.map((post) => (
                    <Box
                      key={post.id}
                      sx={{
                        mb: 1,
                        p: 1,
                        borderRadius: 1,
                        bgcolor: "background.default",
                      }}
                    >
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
                  {translations.delaySettings as string}
                </Typography>

                <Typography variant="body2" color="text.secondary" paragraph>
                  {translations.setCommentDelays as string}
                </Typography>

                <Box sx={{ px: 2 }}>
                  <Typography gutterBottom>
                    {(translations.minimumDelay as Function)(minDelay)}
                  </Typography>
                  <Slider
                    value={minDelay}
                    onChange={handleMinDelayChange}
                    min={1}
                    max={60}
                    disabled={submitting}
                  />

                  <Typography gutterBottom sx={{ mt: 2 }}>
                    {(translations.maximumDelay as Function)(maxDelay)}
                  </Typography>
                  <Slider
                    value={maxDelay}
                    onChange={handleMaxDelayChange}
                    min={minDelay}
                    max={120}
                    disabled={submitting}
                  />
                </Box>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 2 }}
                >
                  {(translations.estimatedTotalTime as Function)(
                    Math.round(
                      (((minDelay + maxDelay) / 2) *
                        selectedPosts.length *
                        (customComment ? 1 : 0 + selectedTemplates.length)) /
                        60
                    )
                  )}
                </Typography>
              </Grid>
            </Grid>
          </DialogContent>

          <DialogActions>
            <Button onClick={handleClose} disabled={submitting}>
              {translations.cancel as string}
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              color="primary"
              disabled={
                submitting || (!customComment && selectedTemplates.length === 0)
              }
            >
              {submitting ? (
                <>
                  <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
                  {translations.postingComments as string}
                </>
              ) : (
                (translations.postComments as string)
              )}
            </Button>
          </DialogActions>
        </>
      ) : (
        <>
          <DialogTitle>{translations.commentResults as string}</DialogTitle>

          <DialogContent dividers>
            <Typography variant="subtitle1" gutterBottom>
              {(translations.commentResultsSummary as Function)(
                commentResults.filter((r) => r.success).length,
                commentResults.length
              )}
            </Typography>

            <Paper
              variant="outlined"
              sx={{ maxHeight: 400, overflow: "auto", mt: 2 }}
            >
              <List dense>
                {commentResults.map((result, index) => (
                  <ListItem key={index} divider>
                    <ListItemText
                      primary={
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Typography variant="body2" fontWeight="medium">
                            {result.postTitle}
                          </Typography>
                          <Box
                            sx={{
                              ml: 1,
                              px: 1,
                              py: 0.5,
                              borderRadius: 1,
                              bgcolor: result.success
                                ? "success.light"
                                : "error.light",
                              color: "white",
                              fontSize: "0.75rem",
                            }}
                          >
                            {result.success
                              ? (translations.success as string)
                              : (translations.failure as string)}
                          </Box>
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography
                            variant="caption"
                            display="block"
                            color="text.secondary"
                          >
                            {translations.commentContent as string}:{" "}
                            {result.comment}
                          </Typography>
                          {!result.success && result.message && (
                            <Typography
                              variant="caption"
                              display="block"
                              color="error"
                            >
                              {translations.error as string}: {result.message}
                            </Typography>
                          )}
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </DialogContent>

          <DialogActions>
            <Button onClick={handleClose} color="primary">
              {translations.close as string}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
