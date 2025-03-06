import { Outlet } from "react-router-dom"
import Box from "@mui/material/Box"
import Navbar from "./navbar"
import Sidebar from "./sidebar"

export default function Layout() {
  return (
    <Box sx={{ display: "flex" }}>
      <Navbar />
      <Sidebar />
      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8, ml: { sm: 30 } }}>
        <Outlet />
      </Box>
    </Box>
  )
}

