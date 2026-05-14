import { Routes, Route } from 'react-router-dom'
import { Navigation } from './components/Navigation'
import Home from './components/Home'
import Links from './components/Links'
import CreateLink from './pages/CreateLink'
import QuickCreate from './pages/QuickCreate'
import Dashboard from './pages/Dashboard'
import QRPage from './pages/QR'
import Settings from './pages/Settings'

export default function AppRoutes() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/links" element={<Links />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/create" element={<CreateLink />} />
          <Route path="/quick-create" element={<QuickCreate />} />
          <Route path="/qr" element={<QRPage />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  )
}
