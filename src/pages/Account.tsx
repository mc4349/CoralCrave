import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import ProfileForm from '../components/ProfileForm'

const Account = () => {
  const { currentUser, userProfile } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')

  const tabs = [
    { id: 'profile', name: 'Profile', icon: '👤' },
    { id: 'edit', name: 'Edit Profile', icon: '✏️' },
    { id: 'reviews', name: 'Reviews', icon: '⭐' },
    { id: 'referrals', name: 'Referrals', icon: '🔗' },
    { id: 'orders', name: 'Orders', icon: '📦' },
    { id: 'payouts', name: 'Payouts', icon: '💰' },
    { id: 'settings', name: 'Settings', icon: '⚙️' },
  ]

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
        {/* Floating ocean elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-4 h-4 bg-cyan-400/20 rounded-full animate-pulse"></div>
          <div className="absolute top-40 right-20 w-6 h-6 bg-blue-400/20 rounded-full animate-bounce"></div>
          <div className="absolute bottom-40 left-1/4 w-3 h-3 bg-cyan-300/30 rounded-full animate-pulse"></div>
          <div className="absolute bottom-60 right-1/3 w-5 h-5 bg-blue-300/20 rounded-full animate-bounce"></div>
        </div>
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-100 mb-4">Please sign in to view your account</h1>
            <a href="/auth/signin" className="btn-primary">Sign In</a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      {/* Floating ocean elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-4 h-4 bg-cyan-400/20 rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-20 w-6 h-6 bg-blue-400/20 rounded-full animate-bounce"></div>
        <div className="absolute bottom-40 left-1/4 w-3 h-3 bg-cyan-300/30 rounded-full animate-pulse"></div>
        <div className="absolute bottom-60 right-1/3 w-5 h-5 bg-blue-300/20 rounded-full animate-bounce"></div>
        <div className="absolute top-1/3 left-1/2 w-2 h-2 bg-cyan-500/30 rounded-full animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-4 h-4 bg-blue-400/20 rounded-full animate-bounce"></div>
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64">
            <div className="card">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/25">
                  <span className="text-lg font-medium text-white">
                    {userProfile?.username?.charAt(0).toUpperCase() || currentUser.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="font-medium text-slate-100">
                    {userProfile?.username || 'User'}
                  </h3>
                  <p className="text-sm text-slate-400">{currentUser.email}</p>
                  {!currentUser.emailVerified && (
                    <p className="text-xs text-red-400">Email not verified</p>
                  )}
                </div>
              </div>
              
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 text-left rounded-md transition-all duration-300 ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border-r-2 border-cyan-400'
                        : 'text-slate-300 hover:bg-slate-700/50 hover:text-cyan-300'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span className="text-sm font-medium">{tab.name}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="card">
              <div className="px-6 py-4 border-b border-slate-700/50">
                <h2 className="text-lg font-medium text-slate-100">
                  {tabs.find(tab => tab.id === activeTab)?.name}
                </h2>
              </div>
              
              <div className="p-6">
                {activeTab === 'profile' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-slate-100 mb-4">Profile Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-slate-300">Username</label>
                          <p className="mt-1 text-sm text-slate-100">{userProfile?.username || 'Not set'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300">Email</label>
                          <p className="mt-1 text-sm text-slate-100">{currentUser.email}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300">Account Type</label>
                          <p className="mt-1 text-sm text-slate-100 capitalize">{userProfile?.role || 'buyer'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300">Referral Code</label>
                          <p className="mt-1 text-sm text-slate-100 font-mono">{userProfile?.referralCode || 'Loading...'}</p>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-slate-300">Bio</label>
                          <p className="mt-1 text-sm text-slate-100">{userProfile?.bio || 'No bio set'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              
                {activeTab === 'edit' && (
                  <div>
                    <h3 className="text-lg font-medium text-slate-100 mb-4">Edit Profile</h3>
                    <ProfileForm onSave={() => setActiveTab('profile')} />
                  </div>
                )}
                
                {activeTab === 'reviews' && (
                  <div>
                    <h3 className="text-lg font-medium text-slate-100 mb-4">My Reviews</h3>
                    <p className="text-slate-400">No reviews yet. Purchase items to leave reviews!</p>
                  </div>
                )}
              
                {activeTab === 'referrals' && (
                  <div>
                    <h3 className="text-lg font-medium text-slate-100 mb-4">Referral Program</h3>
                    <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg p-4 mb-6 backdrop-blur-sm">
                      <h4 className="font-medium text-cyan-300">Earn $200 Crave Credit!</h4>
                      <p className="text-sm text-slate-300 mt-1">
                        Refer 5 friends who complete their first purchase and earn $200 in site credit.
                      </p>
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-cyan-300">Your Referral Link</label>
                        <div className="mt-1 flex">
                          <input
                            type="text"
                            readOnly
                            value={`https://coralcrave.com/ref/${userProfile?.referralCode || 'LOADING'}`}
                            className="input-primary flex-1 rounded-r-none"
                          />
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(`https://coralcrave.com/ref/${userProfile?.referralCode}`)
                            }}
                            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-r-md text-sm hover:from-cyan-600 hover:to-blue-600 transition-all duration-300"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-800/50 backdrop-blur-sm p-4 rounded-lg border border-slate-700/50">
                        <h5 className="font-medium text-slate-300">Available Credit</h5>
                        <p className="text-2xl font-bold text-green-400">${userProfile?.credit?.available || 0}</p>
                      </div>
                      <div className="bg-slate-800/50 backdrop-blur-sm p-4 rounded-lg border border-slate-700/50">
                        <h5 className="font-medium text-slate-300">Pending Credit</h5>
                        <p className="text-2xl font-bold text-yellow-400">${userProfile?.credit?.pending || 0}</p>
                      </div>
                    </div>
                  </div>
                )}
              
                {activeTab === 'orders' && (
                  <div>
                    <h3 className="text-lg font-medium text-slate-100 mb-4">Order History</h3>
                    <p className="text-slate-400">No orders yet. Start bidding on live auctions!</p>
                  </div>
                )}
              
                {activeTab === 'payouts' && (
                  <div>
                    <h3 className="text-lg font-medium text-slate-100 mb-4">Payouts</h3>
                    {userProfile?.kyc?.status === 'verified' ? (
                      <p className="text-slate-400">No payouts yet.</p>
                    ) : (
                      <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-lg p-4 backdrop-blur-sm">
                        <h4 className="font-medium text-yellow-300">Verification Required</h4>
                        <p className="text-sm text-slate-300 mt-1">
                          Complete seller verification to receive payouts from your sales.
                        </p>
                        <button className="mt-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-4 py-2 rounded-md text-sm transition-all duration-300">
                          Start Verification
                        </button>
                      </div>
                    )}
                  </div>
                )}
              
                {activeTab === 'settings' && (
                  <div>
                    <h3 className="text-lg font-medium text-slate-100 mb-4">Account Settings</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border border-slate-700/50 rounded-lg bg-slate-800/30 backdrop-blur-sm">
                        <div>
                          <h4 className="font-medium text-slate-100">Email Verification</h4>
                          <p className="text-sm text-slate-400">
                            {currentUser.emailVerified ? 'Your email is verified' : 'Please verify your email address'}
                          </p>
                        </div>
                        {!currentUser.emailVerified && (
                          <button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-4 py-2 rounded-md text-sm transition-all duration-300">
                            Resend Verification
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Account
