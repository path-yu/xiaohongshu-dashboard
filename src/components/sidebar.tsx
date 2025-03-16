import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import Toolbar from "@mui/material/Toolbar";
import List from "@mui/material/List";
import Divider from "@mui/material/Divider";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import DashboardIcon from "@mui/icons-material/Dashboard";
import SearchIcon from "@mui/icons-material/Search";
import SettingsIcon from "@mui/icons-material/Settings";
import CommentIcon from "@mui/icons-material/Comment";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import Typography from "@mui/material/Typography";
import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "../contexts/language-context"; // Import language context

const drawerWidth = 240;

export default function Sidebar() {
  const location = useLocation();
  const { translations } = useLanguage(); // Use language context

  const menuItems = [
    {
      text: translations.dashboard as string,
      icon: <DashboardIcon />,
      path: "/",
    },
    {
      text: translations.searchPosts as string,
      icon: <SearchIcon />,
      path: "/search",
    },
    {
      text: translations.autoAction as string,
      icon: <AutoAwesomeIcon />,
      path: "/auto-action",
    },
    {
      text: translations.commentTemplates as string,
      icon: <CommentIcon />,
      path: "/templates",
    },
    {
      text: translations.settings as string,
      icon: <SettingsIcon />,
      path: "/settings",
    },
  ];

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
              <ListItemButton
                component={Link}
                to={item.path}
                selected={location.pathname === item.path}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
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
  );
}
