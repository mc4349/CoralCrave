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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please sign in to view your account</h1>
          <a href="/auth/signin" className="btn-primary">Sign In</a>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <div className="lg:w-64">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-lg font-medium text-gray-600">
                  {userProfile?.username?.charAt(0).toUpperCase() || currentUser.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">
                  {userProfile?.username || 'User'}
                </h3>
                <p className="text-sm text-gray-500">{currentUser.email}</p>
                {!currentUser.emailVerified && (
                  <p className="text-xs text-red-500">Email not verified</p>
                )}
              </div>
            </div>
            
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-left rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-coral-50 text-coral-700 border-r-2 border-coral-500'
                      : 'text-gray-700 hover:bg-gray-50'
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
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                {tabs.find(tab => tab.id === activeTab)?.name}
              </h2>
            </div>
            
            <div className="p-6">
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Username</label>
                        <p className="mt-1 text-sm text-gray-900">{userProfile?.username || 'Not set'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <p className="mt-1 text-sm text-gray-900">{currentUser.email}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Account Type</label>
                        <p className="mt-1 text-sm text-gray-900 capitalize">{userProfile?.role || 'buyer'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Referral Code</label>
                        <p className="mt-1 text-sm text-gray-900 font-mono">{userProfile?.referralCode || 'Loading...'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Bio</label>
                        <p className="mt-1 text-sm text-gray-900">{userProfile?.bio || 'No bio set'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {activeTab === 'edit' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Profile</h3>
                  <ProfileForm onSave={() => setActiveTab('profile')} />
                </div>
              )}
              
              {activeTab === 'reviews' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">My Reviews</h3>
                  <p className="text-gray-600">No reviews yet. Purchase items to leave reviews!</p>
                </div>
              )}
              
              {activeTab === 'referrals' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Referral Program</h3>
                  <div className="bg-coral-50 border border-coral-200 rounded-lg p-4 mb-6">
                    <h4 className="font-medium text-coral-900">Earn $200 Crave Credit!</h4>
                    <p className="text-sm text-coral-700 mt-1">
                      Refer 5 friends who complete their first purchase and earn $200 in site credit.
                    </p>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-coral-700">Your Referral Link</label>
                      <div className="mt-1 flex">
                        <input
                          type="text"
                          readOnly
                          value={`https://coralcrave.com/ref/${userProfile?.referralCode || 'LOADING'}`}
                          className="flex-1 px-3 py-2 border border-coral-300 rounded-l-md text-sm"
                        />
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(`https://coralcrave.com/ref/${userProfile?.referralCode}`)
                          }}
                          className="px-4 py-2 bg-coral-600 text-white rounded-r-md text-sm hover:bg-coral-700"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h5 className="font-medium text-gray-900">Available Credit</h5>
                      <p className="text-2xl font-bold text-green-600">${userProfile?.credit?.available || 0}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h5 className="font-medium text-gray-900">Pending Credit</h5>
                      <p className="text-2xl font-bold text-yellow-600">${userProfile?.credit?.pending || 0}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {activeTab === 'orders' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Order History</h3>
                  <p className="text-gray-600">No orders yet. Start bidding on live auctions!</p>
                </div>
              )}
              
              {activeTab === 'payouts' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Payouts</h3>
                  {userProfile?.kyc?.status === 'verified' ? (
                    <p className="text-gray-600">No payouts yet.</p>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="font-medium text-yellow-900">Verification Required</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        Complete seller verification to receive payouts from your sales.
                      </p>
                      <button className="mt-3 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md text-sm">
                        Start Verification
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {activeTab === 'settings' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Account Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900">Email Verification</h4>
                        <p className="text-sm text-gray-500">
                          {currentUser.emailVerified ? 'Your email is verified' : 'Please verify your email address'}
                        </p>
                      </div>
                      {!currentUser.emailVerified && (
                        <button className="bg-coral-600 hover:bg-coral-700 text-white px-4 py-2 rounded-md text-sm">
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
  )
}

export default Account
