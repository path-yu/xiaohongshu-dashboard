"use client"

import * as React from "react"
import { useState, useEffect } from "react"
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
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import EditIcon from "@mui/icons-material/Edit"
import DeleteIcon from "@mui/icons-material/Delete"
import type { CommentTemplate } from "@/types"
import { useToast } from "@/contexts/toast-context"

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<CommentTemplate[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [currentTemplate, setCurrentTemplate] = useState<CommentTemplate | null>(null)
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null)
  const { showToast } = useToast()

  // Form state
  const [templateName, setTemplateName] = useState("")
  const [templateContent, setTemplateContent] = useState("")

  // Load templates from localStorage on component mount
  useEffect(() => {
    const savedTemplates = localStorage.getItem("comment_templates")
    if (savedTemplates) {
      try {
        setTemplates(JSON.parse(savedTemplates))
      } catch (e) {
        console.error("Failed to parse saved templates", e)
      }
    } else {
      // Set some default templates if none exist
      const defaultTemplates: CommentTemplate[] = [
        { id: "1", name: "General Praise", content: "太棒了！我非常喜欢这个内容，谢谢分享！👏" },
        { id: "2", name: "Question", content: "请问这个在哪里可以买到呢？看起来很不错！" },
        {
          id: "3",
          name: "Detailed Comment",
          content: "内容很有深度，我学到了很多。特别是关于第二点的分析非常到位，期待更多类似的分享！",
        },
      ]
      setTemplates(defaultTemplates)
      localStorage.setItem("comment_templates", JSON.stringify(defaultTemplates))
    }
  }, [])

  // Save templates to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("comment_templates", JSON.stringify(templates))
  }, [templates])

  const handleAddTemplate = () => {
    setCurrentTemplate(null)
    setTemplateName("")
    setTemplateContent("")
    setDialogOpen(true)
  }

  const handleEditTemplate = (template: CommentTemplate) => {
    setCurrentTemplate(template)
    setTemplateName(template.name)
    setTemplateContent(template.content)
    setDialogOpen(true)
  }

  const handleDeleteTemplate = (id: string) => {
    setTemplateToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteTemplate = () => {
    if (templateToDelete) {
      const templateToRemove = templates.find((t) => t.id === templateToDelete)
      setTemplates(templates.filter((t) => t.id !== templateToDelete))
      setDeleteDialogOpen(false)
      setTemplateToDelete(null)

      if (templateToRemove) {
        showToast(`Template "${templateToRemove.name}" deleted`, "info")
      }
    }
  }

  const handleSaveTemplate = () => {
    if (!templateName.trim() || !templateContent.trim()) return

    if (currentTemplate) {
      // Edit existing template
      setTemplates(
        templates.map((t) =>
          t.id === currentTemplate.id ? { ...t, name: templateName, content: templateContent } : t,
        ),
      )
    } else {
      // Add new template
      const newTemplate: CommentTemplate = {
        id: Date.now().toString(),
        name: templateName,
        content: templateContent,
      }
      setTemplates([...templates, newTemplate])
    }

    setDialogOpen(false)
    showToast(
      currentTemplate
        ? `Template "${templateName}" updated successfully`
        : `Template "${templateName}" created successfully`,
      "success",
    )
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
            <Typography variant="h5">Comment Templates</Typography>
            <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={handleAddTemplate}>
              Add Template
            </Button>
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
                  <Typography color="text.secondary">No templates yet. Click "Add Template" to create one.</Typography>
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
                          <IconButton edge="end" onClick={() => handleEditTemplate(template)}>
                            <EditIcon />
                          </IconButton>
                          <IconButton edge="end" onClick={() => handleDeleteTemplate(template.id)}>
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
                Creating effective comment templates can help you engage with posts more efficiently.
              </Typography>

              <Typography variant="subtitle2" gutterBottom>
                Best Practices:
              </Typography>

              <Box component="ul" sx={{ pl: 2 }}>
                <li>
                  <Typography variant="body2">Keep comments relevant to the post content</Typography>
                </li>
                <li>
                  <Typography variant="body2">Use emojis to add personality</Typography>
                </li>
                <li>
                  <Typography variant="body2">Ask thoughtful questions to encourage engagement</Typography>
                </li>
                <li>
                  <Typography variant="body2">Avoid generic comments that look automated</Typography>
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
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{currentTemplate ? "Edit Template" : "Add New Template"}</DialogTitle>
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
          <Button onClick={handleSaveTemplate} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Template</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this template? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDeleteTemplate} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

