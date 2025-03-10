import AppBar from "@mui/material/AppBar";
import React from "react";

import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Badge from "@mui/material/Badge";
import MenuIcon from "@mui/icons-material/Menu";
import NotificationsIcon from "@mui/icons-material/Notifications";
import AccountCircle from "@mui/icons-material/AccountCircle";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import {
  Box,
  Button,
  ButtonGroup,
  CircularProgress,
  Tooltip,
  Chip,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import CommentIcon from "@mui/icons-material/Comment";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import SyncIcon from "@mui/icons-material/Sync";
import { useCommentStore } from "../store/comment-store";
import { useLocation } from "react-router-dom";
import { usePlaywright } from "../contexts/playwright-context";
import { usePostContext } from "../contexts/post-context";
import { useTheme } from "../contexts/theme-context";

export default function Navbar() {
  const location = useLocation();
  const { selectedPosts, openCommentModal, selectAllPosts, deselectAllPosts } =
    useCommentStore();
  const {
    status: playwrightStatus,
    statusMessage,
    startBrowser,
    stopBrowser,
    reconnect,
  } = usePlaywright();
  const { currentPosts } = usePostContext();
  const { mode, toggleTheme } = useTheme();

  // Determine if all current posts are selected
  const allSelected = React.useMemo(() => {
    if (!currentPosts || currentPosts.length === 0) return false;
    return currentPosts.every((post) =>
      selectedPosts.some((selected) => selected.id === post.id)
    );
  }, [currentPosts, selectedPosts]);

  // Handle select all checkbox change
  const handleSelectAllChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (event.target.checked) {
      selectAllPosts(currentPosts);
    } else {
      deselectAllPosts();
    }
  };

  // Get page title based on current path
  const getPageTitle = () => {
    switch (location.pathname) {
      case "/":
        return "Dashboard";
      case "/settings":
        return "Settings";
      case "/templates":
        return "Comment Templates";
      case "/search":
        return "Search Posts";
      case "/auto-action":
        return "Auto Action";
      default:
        return "Dashboard";
    }
  };

  // Get status color
  const getStatusColor = () => {
    switch (playwrightStatus) {
      case "running":
        return "success";
      case "loading":
      case "checking":
        return "warning";
      case "stopped":
        return "error";
      case "disconnected":
        return "default";
      default:
        return "default";
    }
  };

  return (
    <AppBar
      position="fixed"
      sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
    >
      <Toolbar>
        <IconButton
          edge="start"
          color="inherit"
          aria-label="menu"
          sx={{ mr: 2, display: { sm: "none" } }}
        >
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {getPageTitle()}
        </Typography>

        {/* Select All Checkbox - Only show on Dashboard and Search pages */}
        {(location.pathname === "/" || location.pathname === "/search") &&
          currentPosts &&
          currentPosts.length > 0 && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={allSelected}
                  onChange={handleSelectAllChange}
                  color="default"
                  sx={{
                    color: "white",
                    "&.Mui-checked": {
                      color: "white",
                    },
                  }}
                />
              }
              label={
                <Typography variant="body2" color="white">
                  {allSelected ? "取消全选" : "全选"}
                </Typography>
              }
              sx={{ mr: 2 }}
            />
          )}

        {/* Theme Toggle Button */}
        <Tooltip
          title={
            mode === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"
          }
        >
          <IconButton color="inherit" onClick={toggleTheme} sx={{ mr: 1 }}>
            {mode === "light" ? <DarkModeIcon /> : <LightModeIcon />}
          </IconButton>
        </Tooltip>

        {/* Playwright Status */}
        <Tooltip title={statusMessage}>
          <Chip
            label={statusMessage}
            color={getStatusColor()}
            size="small"
            sx={{ mr: 2 }}
          />
        </Tooltip>

        {/* Playwright Control */}
        <ButtonGroup
          variant="contained"
          color="secondary"
          size="small"
          sx={{ mr: 2, height: 36 }}
        >
          <Button
            startIcon={
              playwrightStatus === "loading" ||
              playwrightStatus === "checking" ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <PlayArrowIcon />
              )
            }
            onClick={startBrowser}
            disabled={
              playwrightStatus === "running" ||
              playwrightStatus === "loading" ||
              playwrightStatus === "checking"
            }
          >
            启动
          </Button>
          <Button
            startIcon={<StopIcon />}
            onClick={stopBrowser}
            disabled={
              playwrightStatus === "stopped" ||
              playwrightStatus === "loading" ||
              playwrightStatus === "checking"
            }
            color="error"
          >
            停止
          </Button>
          <Tooltip title="重新连接状态监控">
            <Button
              onClick={reconnect}
              disabled={
                playwrightStatus === "loading" ||
                playwrightStatus === "checking"
              }
            >
              <SyncIcon fontSize="small" />
            </Button>
          </Tooltip>
        </ButtonGroup>

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
  );
}
