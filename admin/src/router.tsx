import { Routes, Route } from 'react-router-dom'
import { Navigation } from './components/Navigation'
import Home from './components/Home'
import Links from './components/Links'
import Analytics from './components/Analytics'
import Profile from './components/Profile'
import CreateLink from './pages/CreateLink'
import QuickCreate from './pages/QuickCreate'
import QRPage from './pages/QR'
import SponsorReport from './pages/SponsorReport'
import Settings from './pages/Settings'
import ImportExport from './pages/ImportExport'

const Routes = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/links" element={<Links />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/create" element={<CreateLink />} />
          <Route path="/quick-create" element={<QuickCreate />} />
          <Route path="/qr" element={<QRPage />} />
          <Route path="/sponsors" element={<SponsorReport />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/import-export" element={<ImportExport />} />
        </Routes>
      </main>
    </div>
  )
}

export default Routes