import type * as React from "react"
import { Inter } from "next/font/google"
import { AppRouterCacheProvider } from "@mui/material-nextjs/v14-appRouter"
import { ThemeProvider } from "@mui/material/styles"
import CssBaseline from "@mui/material/CssBaseline"
import theme from "@/theme"
import Navbar from "@/components/navbar"
import Sidebar from "@/components/sidebar"
import Box from "@mui/material/Box"
import { ToastProvider } from "@/contexts/toast-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Xiaohongshu Dashboard",
  description: "Dashboard for managing Xiaohongshu comments",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AppRouterCacheProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <ToastProvider>
              <Box sx={{ display: "flex" }}>
                <Navbar />
                <Sidebar />
                <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8, ml: { sm: 30 } }}>
                  {children}
                </Box>
              </Box>
            </ToastProvider>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  )
}



import './globals.css'