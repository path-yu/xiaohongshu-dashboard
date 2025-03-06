import { Routes, Route } from "react-router-dom"
import Layout from "./components/layout"
import Dashboard from "./pages/dashboard"
import SearchPage from "./pages/search"
import TemplatesPage from "./pages/templates"
import SettingsPage from "./pages/settings"

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}

export default App

