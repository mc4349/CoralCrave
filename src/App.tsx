import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { StreamingProvider } from './contexts/StreamingContext'
import Header from './components/Header'
import Home from './pages/Home'
import Explore from './pages/Explore'
import GoLive from './pages/GoLive'
import LiveViewer from './pages/LiveViewer'
import Activity from './pages/Activity'
import Account from './pages/Account'
import SellerHub from './pages/SellerHub'
import Profile from './pages/Profile'
import Notifications from './pages/Notifications'
import Auth from './pages/Auth'
import SetupUsername from './pages/SetupUsername'

function App() {
  return (
    <AuthProvider>
      <StreamingProvider>
        <Router>
          <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
            <Header />
            <main>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/explore" element={<Explore />} />
                <Route path="/go-live" element={<GoLive />} />
                <Route path="/live/:id" element={<LiveViewer />} />
                <Route path="/activity" element={<Activity />} />
                <Route path="/account" element={<Account />} />
                <Route path="/seller-hub" element={<SellerHub />} />
                <Route path="/profile/:userId" element={<Profile />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/auth/setup-username" element={<SetupUsername />} />
                <Route path="/auth/*" element={<Auth />} />
              </Routes>
            </main>
          </div>
        </Router>
      </StreamingProvider>
    </AuthProvider>
  )
}

export default App
