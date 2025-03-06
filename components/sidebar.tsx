"use client"
import Box from "@mui/material/Box"
import Drawer from "@mui/material/Drawer"
import Toolbar from "@mui/material/Toolbar"
import List from "@mui/material/List"
import Divider from "@mui/material/Divider"
import ListItem from "@mui/material/ListItem"
import ListItemButton from "@mui/material/ListItemButton"
import ListItemIcon from "@mui/material/ListItemIcon"
import ListItemText from "@mui/material/ListItemText"
import DashboardIcon from "@mui/icons-material/Dashboard"
import SearchIcon from "@mui/icons-material/Search"
import SettingsIcon from "@mui/icons-material/Settings"
import CommentIcon from "@mui/icons-material/Comment"
import Link from "next/link"
import { usePathname } from "next/navigation"

const drawerWidth = 240

export default function Sidebar() {
  const pathname = usePathname()

  const menuItems = [
    { text: "Dashboard", icon: <DashboardIcon />, path: "/" },
    { text: "Search Posts", icon: <SearchIcon />, path: "/search" },
    { text: "Comment Templates", icon: <CommentIcon />, path: "/templates" },
    { text: "Settings", icon: <SettingsIcon />, path: "/settings" },
  ]

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: drawerWidth,
          boxSizing: "border-box",
          borderRight: "1px solid rgba(0, 0, 0, 0.12)",
        },
      }}
    >
      <Toolbar />
      <Box sx={{ overflow: "auto", mt: 2 }}>
        <List>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <Link href={item.path} style={{ textDecoration: "none", width: "100%", color: "inherit" }}>
                <ListItemButton selected={pathname === item.path}>
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </Link>
            </ListItem>
          ))}
        </List>
        <Divider sx={{ mt: 2, mb: 2 }} />
        <Box sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Xiaohongshu Dashboard
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Version 1.0.0
          </Typography>
        </Box>
      </Box>
    </Drawer>
  )
}

// Add Typography import
import Typography from "@mui/material/Typography"

