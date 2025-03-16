import { Outlet } from "react-router-dom";
import Box from "@mui/material/Box";
import Navbar from "./navbar";
import Sidebar from "./sidebar";
import PageTransition from "./page-transition";
import { AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";

export default function Layout() {
  const location = useLocation();

  return (
    <Box sx={{ display: "flex" }}>
      <Navbar />
      <Sidebar />
      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8, padding: "40px" }}>
        <AnimatePresence mode="wait">
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </AnimatePresence>
      </Box>
    </Box>
  );
}
