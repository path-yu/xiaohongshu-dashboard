"use client"
import AppBar from "@mui/material/AppBar"
import Toolbar from "@mui/material/Toolbar"
import Typography from "@mui/material/Typography"
import IconButton from "@mui/material/IconButton"
import Badge from "@mui/material/Badge"
import MenuIcon from "@mui/icons-material/Menu"
import NotificationsIcon from "@mui/icons-material/Notifications"
import AccountCircle from "@mui/icons-material/AccountCircle"
import { usePathname } from "next/navigation"
import { Box, Button } from "@mui/material"
import CommentIcon from "@mui/icons-material/Comment"
import { useCommentStore } from "@/store/comment-store"

export default function Navbar() {
  const pathname = usePathname()
  const { openCommentModal, selectedPosts } = useCommentStore()

  // Get page title based on current path
  const getPageTitle = () => {
    switch (pathname) {
      case "/":
        return "Dashboard"
      case "/settings":
        return "Settings"
      case "/templates":
        return "Comment Templates"
      case "/search":
        return "Search Posts"
      default:
        return "Dashboard"
    }
  }

  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        <IconButton edge="start" color="inherit" aria-label="menu" sx={{ mr: 2, display: { sm: "none" } }}>
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {getPageTitle()}
        </Typography>

        {selectedPosts.length > 0 && (
          <Button
            variant="contained"
            color="secondary"
            startIcon={<CommentIcon />}
            onClick={openCommentModal}
            sx={{ mr: 2 }}
          >
            Add Comment ({selectedPosts.length})
          </Button>
        )}

        <Box sx={{ display: "flex" }}>
          <IconButton color="inherit">
            <Badge badgeContent={4} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          <IconButton color="inherit">
            <AccountCircle />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  )
}

