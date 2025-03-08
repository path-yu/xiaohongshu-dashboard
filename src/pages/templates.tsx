"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Chip,
  Grid,
  Paper,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import type { CommentTemplate } from "../types";
import { useToast } from "../contexts/toast-context";
import FileUploadIcon from "@mui/icons-material/FileUpload";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<CommentTemplate[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentTemplate, setCurrentTemplate] =
    useState<CommentTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const { showToast } = useToast();

  // Form state
  const [templateName, setTemplateName] = useState("");
  const [templateContent, setTemplateContent] = useState("");

  // Update the state for parsed templates and add a single title field
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [bulkImportText, setBulkImportText] = useState("");
  const [parsedTemplates, setParsedTemplates] = useState<string[]>([]);
  const [bulkTemplateTitle, setBulkTemplateTitle] = useState("");

  // Load templates from localStorage on component mount
  useEffect(() => {
    const savedTemplates = localStorage.getItem("comment_templates");
    if (savedTemplates) {
      try {
        setTemplates(JSON.parse(savedTemplates));
      } catch (e) {
        console.error("Failed to parse saved templates", e);
      }
    } else {
      // Set some default templates if none exist
      const defaultTemplates: CommentTemplate[] = [
        {
          id: "1",
          name: "General Praise",
          content: "太棒了！我非常喜欢这个内容，谢谢分享！👏",
        },
        {
          id: "2",
          name: "Question",
          content: "请问这个在哪里可以买到呢？看起来很不错！",
        },
        {
          id: "3",
          name: "Detailed Comment",
          content:
            "内容很有深度，我学到了很多。特别是关于第二点的分析非常到位，期待更多类似的分享！",
        },
      ];
      setTemplates(defaultTemplates);
      localStorage.setItem(
        "comment_templates",
        JSON.stringify(defaultTemplates)
      );
    }
  }, []);

  // Save templates to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("comment_templates", JSON.stringify(templates));
  }, [templates]);

  const handleAddTemplate = () => {
    setCurrentTemplate(null);
    setTemplateName("");
    setTemplateContent("");
    setDialogOpen(true);
  };

  const handleEditTemplate = (template: CommentTemplate) => {
    setCurrentTemplate(template);
    setTemplateName(template.name);
    setTemplateContent(template.content);
    setDialogOpen(true);
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplateToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteTemplate = () => {
    if (templateToDelete) {
      const templateToRemove = templates.find((t) => t.id === templateToDelete);
      setTemplates(templates.filter((t) => t.id !== templateToDelete));
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);

      if (templateToRemove) {
        showToast(`Template "${templateToRemove.name}" deleted`, "info");
      }
    }
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim() || !templateContent.trim()) return;

    if (currentTemplate) {
      // Edit existing template
      setTemplates(
        templates.map((t) =>
          t.id === currentTemplate.id
            ? { ...t, name: templateName, content: templateContent }
            : t
        )
      );
      showToast(`Template "${templateName}" updated successfully`, "success");
    } else {
      // Add new template
      const newTemplate: CommentTemplate = {
        id: Date.now().toString(),
        name: templateName,
        content: templateContent,
      };
      setTemplates([...templates, newTemplate]);
      showToast(`Template "${templateName}" created successfully`, "success");
    }

    setDialogOpen(false);
  };

  // Update the parse function to just store the content strings
  const handleParseBulkImport = () => {
    if (!bulkImportText.trim()) {
      showToast("请输入要导入的评论内容", "error");
      return;
    }

    // Split by "/" and filter out empty strings
    const comments = bulkImportText
      .split("/")
      .map((comment) => comment.trim())
      .filter((comment) => comment.length > 0);

    if (comments.length === 0) {
      showToast("未找到有效的评论内容", "error");
      return;
    }

    setParsedTemplates(comments);
  };

  // Update the save function to use the single title
  const handleSaveParsedTemplates = () => {
    // Check if title is provided
    if (!bulkTemplateTitle.trim()) {
      showToast("请输入模板标题", "error");
      return;
    }

    // Create new templates with numbered titles
    const newTemplates = parsedTemplates.map((content, index) => {
      const name =
        parsedTemplates.length > 1
          ? `${bulkTemplateTitle} ${index + 1}`
          : bulkTemplateTitle;

      return {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
        name,
        content,
      };
    });

    // Add to existing templates
    setTemplates([...templates, ...newTemplates]);

    // Close dialog and reset state
    setImportDialogOpen(false);
    setBulkImportText("");
    setParsedTemplates([]);
    setBulkTemplateTitle("");

    showToast(`成功导入 ${newTemplates.length} 个模板`, "success");
  };

  // Remove the function to update individual template names since we no longer need it
  // Delete: const handleUpdateParsedTemplateName = ...

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 3,
            }}
          >
            <Typography variant="h5">Comment Templates</Typography>
            <Box>
              <Button
                variant="outlined"
                startIcon={<FileUploadIcon />}
                onClick={() => setImportDialogOpen(true)}
                sx={{ mr: 2 }}
              >
                批量导入
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleAddTemplate}
              >
                Add Template
              </Button>
            </Box>
          </Box>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Template List
              </Typography>

              {templates.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <Typography color="text.secondary">
                    No templates yet. Click "Add Template" to create one.
                  </Typography>
                </Box>
              ) : (
                <List>
                  {templates.map((template) => (
                    <React.Fragment key={template.id}>
                      <ListItem>
                        <ListItemText
                          primary={template.name}
                          secondary={
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                              }}
                            >
                              {template.content}
                            </Typography>
                          }
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            onClick={() => handleEditTemplate(template)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            edge="end"
                            onClick={() => handleDeleteTemplate(template.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                      <Divider component="li" />
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Tips for Effective Comments
              </Typography>

              <Typography variant="body2" paragraph>
                Creating effective comment templates can help you engage with
                posts more efficiently.
              </Typography>

              <Typography variant="subtitle2" gutterBottom>
                Best Practices:
              </Typography>

              <Box component="ul" sx={{ pl: 2 }}>
                <li>
                  <Typography variant="body2">
                    Keep comments relevant to the post content
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2">
                    Use emojis to add personality
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2">
                    Ask thoughtful questions to encourage engagement
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2">
                    Avoid generic comments that look automated
                  </Typography>
                </li>
              </Box>

              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Template Variables:
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  <Chip label="{author}" size="small" />
                  <Chip label="{title}" size="small" />
                  <Chip label="{category}" size="small" />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Add/Edit Template Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {currentTemplate ? "Edit Template" : "Add New Template"}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Template Name"
            fullWidth
            variant="outlined"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Comment Content"
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            value={templateContent}
            onChange={(e) => setTemplateContent(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSaveTemplate}
            variant="contained"
            color="primary"
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>批量导入评论模板</DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph sx={{ mt: 1 }}>
            请输入多个评论内容，使用 / 符号分隔不同的评论。
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={8}
            variant="outlined"
            placeholder="例如：这个太棒了！/请问在哪里可以买到？/非常喜欢这个内容"
            value={bulkImportText}
            onChange={(e) => setBulkImportText(e.target.value)}
            sx={{ mb: 3 }}
          />

          {parsedTemplates.length > 0 && (
            <>
              <TextField
                fullWidth
                label="模板标题"
                value={bulkTemplateTitle}
                onChange={(e) => setBulkTemplateTitle(e.target.value)}
                sx={{ mb: 2 }}
                required
                error={!bulkTemplateTitle.trim()}
                helperText={
                  !bulkTemplateTitle.trim()
                    ? "请输入模板标题"
                    : parsedTemplates.length > 1
                    ? `将自动生成: ${bulkTemplateTitle} 1, ${bulkTemplateTitle} 2, ...`
                    : ""
                }
              />

              <Typography variant="subtitle2" gutterBottom>
                已解析 {parsedTemplates.length} 条评论:
              </Typography>

              <Box sx={{ maxHeight: "250px", overflow: "auto", mb: 2 }}>
                {parsedTemplates.map((content, index) => (
                  <Paper
                    key={index}
                    variant="outlined"
                    sx={{ p: 2, mb: 1, bgcolor: "background.default" }}
                  >
                    <Typography variant="body2">{content}</Typography>
                  </Paper>
                ))}
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setImportDialogOpen(false);
              setBulkImportText("");
              setParsedTemplates([]);
              setBulkTemplateTitle("");
            }}
          >
            取消
          </Button>
          {parsedTemplates.length === 0 ? (
            <Button
              onClick={handleParseBulkImport}
              variant="contained"
              color="primary"
            >
              解析评论
            </Button>
          ) : (
            <Button
              onClick={handleSaveParsedTemplates}
              variant="contained"
              color="primary"
              disabled={!bulkTemplateTitle.trim()}
            >
              保存全部模板
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Template</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this template? This action cannot be
            undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDeleteTemplate} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
