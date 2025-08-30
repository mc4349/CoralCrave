import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'

const Header = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const { currentUser, userProfile, logout } = useAuth()
  const navigate = useNavigate()
  const profileMenuRef = useRef<HTMLDivElement>(null)

  // Listen for unread notifications
  useEffect(() => {
    if (!currentUser) {
      setUnreadCount(0)
      return
    }

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.uid),
      where('read', '==', false),
      orderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      setUnreadCount(snapshot.size)
    })

    return () => unsubscribe()
  }, [currentUser])

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false)
      }
    }

    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showProfileMenu])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Navigate to explore page with search query
      navigate(`/explore?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      setShowProfileMenu(false)
      navigate('/')
    } catch (error) {
      console.error('Failed to log out:', error)
    }
  }

  return (
    <header className="bg-slate-800/95 backdrop-blur-sm shadow-lg border-b border-slate-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg group-hover:from-cyan-400 group-hover:to-blue-400 transition-all duration-300"></div>
              <span className="text-xl font-bold text-white group-hover:text-cyan-300 transition-colors duration-300">CoralCrave</span>
            </Link>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-lg mx-8">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Search CoralCrave"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600 text-slate-100 placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </form>
          </div>

          {/* Main Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/" className="text-slate-300 hover:text-cyan-300 font-medium transition-colors duration-200">
              Home
            </Link>
            <Link to="/explore" className="text-slate-300 hover:text-cyan-300 font-medium transition-colors duration-200">
              Explore
            </Link>
            {currentUser && (
              <>
                <Link to="/go-live" className="text-slate-300 hover:text-cyan-300 font-medium transition-colors duration-200">
                  Go Live
                </Link>
                <Link to="/activity" className="text-slate-300 hover:text-cyan-300 font-medium transition-colors duration-200">
                  Activity
                </Link>
              </>
            )}
          </nav>

          {/* User Navigation */}
          <div className="flex items-center space-x-4">
            {currentUser ? (
              <>
                {/* Notifications */}
                <button 
                  onClick={() => navigate('/notifications')}
                  className="p-2 text-slate-400 hover:text-cyan-300 relative transition-colors duration-200"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM10.5 3.75a6 6 0 0 1 6 6v2.25l2.25 2.25v.75H2.25v-.75L4.5 12V9.75a6 6 0 0 1 6-6z" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-pink-500 to-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Profile Menu */}
                <div className="relative" ref={profileMenuRef}>
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-slate-700/50 transition-colors duration-200"
                  >
                    <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-white">
                        {userProfile?.username?.charAt(0).toUpperCase() || currentUser.email?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showProfileMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-lg shadow-2xl border border-slate-700/50 py-1 z-50">
                      <div className="px-4 py-2 text-sm text-slate-400 border-b border-slate-700/50">
                        {userProfile?.username || currentUser.email}
                      </div>
                      {(userProfile?.role === 'seller' || userProfile?.role === 'both') && (
                        <Link 
                          to="/seller-hub" 
                          className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-cyan-300 transition-colors duration-200"
                          onClick={() => setShowProfileMenu(false)}
                        >
                          Seller Analytics
                        </Link>
                      )}
                      <Link 
                        to="/account" 
                        className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-cyan-300 transition-colors duration-200"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        Profile
                      </Link>
                      <Link 
                        to="/activity" 
                        className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-cyan-300 transition-colors duration-200"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        Activity
                      </Link>
                      <hr className="my-1 border-slate-700/50" />
                      <button 
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-red-400 transition-colors duration-200"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/auth/signin"
                  className="text-slate-300 hover:text-cyan-300 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  Sign In
                </Link>
                <Link
                  to="/auth/signup"
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-cyan-500/25"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
