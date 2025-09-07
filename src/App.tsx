import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { StreamingProvider } from './contexts/StreamingContext'
import Header from './components/Header'

// Lazy load all page components for better performance
const Home = lazy(() => import('./pages/Home'))
const Explore = lazy(() => import('./pages/Explore'))
const GoLive = lazy(() => import('./pages/GoLive'))
const LiveViewer = lazy(() => import('./pages/LiveViewer'))
const Activity = lazy(() => import('./pages/Activity'))
const Account = lazy(() => import('./pages/Account'))
const SellerHub = lazy(() => import('./pages/SellerHub'))
const Profile = lazy(() => import('./pages/Profile'))
const Notifications = lazy(() => import('./pages/Notifications'))
const Auth = lazy(() => import('./pages/Auth'))
const SetupUsername = lazy(() => import('./pages/SetupUsername'))

// Loading component for Suspense fallback
const PageLoader = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
      <p className="text-blue-200">Loading...</p>
    </div>
  </div>
)

function App() {
  return (
    <AuthProvider>
      <StreamingProvider>
        <Router>
          <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
            <Header />
            <main>
              <Suspense fallback={<PageLoader />}>
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
              </Suspense>
            </main>
          </div>
        </Router>
      </StreamingProvider>
    </AuthProvider>
  )
}

export default App
