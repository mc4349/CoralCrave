import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'
import SearchBar from './SearchBar'

const Header = () => {
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const { currentUser, userProfile, logout } = useAuth()
  const navigate = useNavigate()
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)

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

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false)
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setShowMobileMenu(false)
      }
    }

    if (showProfileMenu || showMobileMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showProfileMenu, showMobileMenu])



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
    <header className="bg-slate-800/95 backdrop-blur-sm shadow-lg border-b border-slate-700/50 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0">
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg group-hover:from-cyan-400 group-hover:to-blue-400 transition-all duration-300"></div>
              <span className="text-lg sm:text-xl font-bold text-white group-hover:text-cyan-300 transition-colors duration-300">CoralCrave</span>
            </Link>
          </div>

          {/* Desktop Search Bar - Hidden on mobile */}
          <div className="hidden lg:flex flex-1 max-w-lg mx-8">
            <SearchBar placeholder="Search streams and users..." />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-6">
            <Link to="/" className="text-slate-300 hover:text-cyan-300 font-medium transition-colors duration-200 px-3 py-2 rounded-md hover:bg-slate-700/30">
              Home
            </Link>
            <Link to="/explore" className="text-slate-300 hover:text-cyan-300 font-medium transition-colors duration-200 px-3 py-2 rounded-md hover:bg-slate-700/30">
              Explore
            </Link>
            {currentUser && (
              <>
                <Link to="/go-live" className="text-slate-300 hover:text-cyan-300 font-medium transition-colors duration-200 px-3 py-2 rounded-md hover:bg-slate-700/30">
                  Go Live
                </Link>
                <Link to="/activity" className="text-slate-300 hover:text-cyan-300 font-medium transition-colors duration-200 px-3 py-2 rounded-md hover:bg-slate-700/30">
                  Activity
                </Link>
              </>
            )}
          </nav>

          {/* Mobile Actions */}
          <div className="flex items-center space-x-2 lg:space-x-4">
            {currentUser ? (
              <>
                {/* Notifications - Mobile optimized */}
                <button
                  onClick={() => navigate('/notifications')}
                  className="p-2 text-slate-400 hover:text-cyan-300 relative transition-colors duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM10.5 3.75a6 6 0 0 1 6 6v2.25l2.25 2.25v.75H2.25v-.75L4.5 12V9.75a6 6 0 0 1 6-6z" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-pink-500 to-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Profile Menu - Mobile optimized */}
                <div className="relative" ref={profileMenuRef}>
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-slate-700/50 transition-colors duration-200 min-w-[44px] min-h-[44px]"
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
                    <div className="absolute right-0 mt-2 w-56 sm:w-64 bg-slate-800 rounded-lg shadow-2xl border border-slate-700/50 py-1 z-50 max-w-[calc(100vw-2rem)]">
                      <div className="px-4 py-3 text-sm text-slate-400 border-b border-slate-700/50">
                        <div className="font-medium text-white truncate">
                          {userProfile?.username || 'User'}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {currentUser.email}
                        </div>
                      </div>
                      {(userProfile?.role === 'seller' || userProfile?.role === 'both') && (
                        <Link
                          to="/seller-hub"
                          className="flex items-center px-4 py-3 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-cyan-300 transition-colors duration-200 min-h-[44px]"
                          onClick={() => setShowProfileMenu(false)}
                        >
                          <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          Seller Analytics
                        </Link>
                      )}
                      <Link
                        to="/account"
                        className="flex items-center px-4 py-3 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-cyan-300 transition-colors duration-200 min-h-[44px]"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Profile Settings
                      </Link>
                      <Link
                        to="/activity"
                        className="flex items-center px-4 py-3 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-cyan-300 transition-colors duration-200 min-h-[44px]"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Activity Feed
                      </Link>
                      <hr className="my-1 border-slate-700/50" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-red-400 transition-colors duration-200 min-h-[44px]"
                      >
                        <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="hidden sm:flex items-center space-x-2">
                <Link
                  to="/auth/signin"
                  className="text-slate-300 hover:text-cyan-300 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 min-h-[44px] flex items-center"
                >
                  Sign In
                </Link>
                <Link
                  to="/auth/signup"
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-cyan-500/25 min-h-[44px] flex items-center"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="lg:hidden p-2 text-slate-400 hover:text-cyan-300 transition-colors duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {showMobileMenu ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div ref={mobileMenuRef} className="md:hidden bg-slate-800/95 backdrop-blur-sm border-t border-slate-700/50">
            <div className="px-4 py-4 space-y-4">
              {/* Mobile Search */}
              <div className="mb-4">
                <SearchBar placeholder="Search streams..." />
              </div>

              {/* Mobile Navigation Links */}
              <nav className="space-y-2">
                <Link
                  to="/"
                  className="block px-4 py-3 text-slate-300 hover:bg-slate-700/50 hover:text-cyan-300 rounded-lg transition-colors duration-200 font-medium"
                  onClick={() => setShowMobileMenu(false)}
                >
                  🏠 Home
                </Link>
                <Link
                  to="/explore"
                  className="block px-4 py-3 text-slate-300 hover:bg-slate-700/50 hover:text-cyan-300 rounded-lg transition-colors duration-200 font-medium"
                  onClick={() => setShowMobileMenu(false)}
                >
                  🔍 Explore
                </Link>
                {currentUser && (
                  <>
                    <Link
                      to="/go-live"
                      className="block px-4 py-3 text-slate-300 hover:bg-slate-700/50 hover:text-cyan-300 rounded-lg transition-colors duration-200 font-medium"
                      onClick={() => setShowMobileMenu(false)}
                    >
                      🎥 Go Live
                    </Link>
                    <Link
                      to="/activity"
                      className="block px-4 py-3 text-slate-300 hover:bg-slate-700/50 hover:text-cyan-300 rounded-lg transition-colors duration-200 font-medium"
                      onClick={() => setShowMobileMenu(false)}
                    >
                      📊 Activity
                    </Link>
                    <Link
                      to="/notifications"
                      className="block px-4 py-3 text-slate-300 hover:bg-slate-700/50 hover:text-cyan-300 rounded-lg transition-colors duration-200 font-medium relative"
                      onClick={() => setShowMobileMenu(false)}
                    >
                      🔔 Notifications
                      {unreadCount > 0 && (
                        <span className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-pink-500 to-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </Link>
                  </>
                )}
              </nav>

              {/* Mobile User Actions */}
              <div className="border-t border-slate-700/50 pt-4">
                {currentUser ? (
                  <div className="space-y-2">
                    <div className="px-4 py-2 text-sm text-slate-400">
                      Signed in as {userProfile?.username || currentUser.email}
                    </div>
                    {(userProfile?.role === 'seller' || userProfile?.role === 'both') && (
                      <Link
                        to="/seller-hub"
                        className="block px-4 py-3 text-slate-300 hover:bg-slate-700/50 hover:text-cyan-300 rounded-lg transition-colors duration-200"
                        onClick={() => setShowMobileMenu(false)}
                      >
                        📈 Seller Analytics
                      </Link>
                    )}
                    <Link
                      to="/account"
                      className="block px-4 py-3 text-slate-300 hover:bg-slate-700/50 hover:text-cyan-300 rounded-lg transition-colors duration-200"
                      onClick={() => setShowMobileMenu(false)}
                    >
                      👤 Profile
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout()
                        setShowMobileMenu(false)
                      }}
                      className="block w-full text-left px-4 py-3 text-slate-300 hover:bg-slate-700/50 hover:text-red-400 rounded-lg transition-colors duration-200"
                    >
                      🚪 Logout
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Link
                      to="/auth/signin"
                      className="block px-4 py-3 text-slate-300 hover:bg-slate-700/50 hover:text-cyan-300 rounded-lg transition-colors duration-200 font-medium"
                      onClick={() => setShowMobileMenu(false)}
                    >
                      🔐 Sign In
                    </Link>
                    <Link
                      to="/auth/signup"
                      className="block px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-lg transition-all duration-300 font-medium text-center"
                      onClick={() => setShowMobileMenu(false)}
                    >
                      🌊 Join CoralCrave
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header
