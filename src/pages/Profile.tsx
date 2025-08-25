import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { livestreamService } from '../services/livestreamService'
import { userService } from '../services/userService'
import { useAuth } from '../contexts/AuthContext'

interface UserProfile {
  id: string
  username: string
  photoURL?: string
  bio?: string
  location?: string
  rating?: number
  totalSales?: number
  joinedAt?: Date
  followers?: number
  following?: number
}

interface LivestreamData {
  id: string
  title: string
  status: 'offline' | 'live' | 'ended'
  startedAt?: Date
  endedAt?: Date
  categories: string[]
  viewerCount: number
}

interface UserListItem {
  id: string
  username: string
  photoURL?: string
}

export default function Profile() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { currentUser, userProfile } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [pastStreams, setPastStreams] = useState<LivestreamData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [showFollowers, setShowFollowers] = useState(false)
  const [showFollowing, setShowFollowing] = useState(false)
  const [followersList, setFollowersList] = useState<UserListItem[]>([])
  const [followingList, setFollowingList] = useState<UserListItem[]>([])
  const [listsLoading, setListsLoading] = useState(false)

  useEffect(() => {
    if (userId) {
      loadProfile()
      loadPastStreams()
      checkFollowStatus()
    }
  }, [userId, userProfile])

  const checkFollowStatus = async () => {
    if (!currentUser || !userId || currentUser.uid === userId) return
    
    try {
      const currentUserProfile = await userService.getUserProfile(currentUser.uid)
      if (currentUserProfile) {
        setIsFollowing(currentUserProfile.follows.includes(userId))
      }
    } catch (err) {
      console.error('Error checking follow status:', err)
    }
  }

  const handleFollowToggle = async () => {
    if (!currentUser || !userId || currentUser.uid === userId) return
    
    setFollowLoading(true)
    try {
      if (isFollowing) {
        await userService.unfollowUser(currentUser.uid, userId)
        setIsFollowing(false)
        // Update follower count in profile
        if (profile) {
          setProfile({ ...profile, followers: (profile.followers || 0) - 1 })
        }
      } else {
        await userService.followUser(currentUser.uid, userId)
        setIsFollowing(true)
        // Update follower count in profile
        if (profile) {
          setProfile({ ...profile, followers: (profile.followers || 0) + 1 })
        }
      }
    } catch (err) {
      console.error('Error toggling follow:', err)
      alert('Failed to update follow status. Please try again.')
    } finally {
      setFollowLoading(false)
    }
  }

  const loadFollowersList = async () => {
    if (!userId) return
    
    setListsLoading(true)
    try {
      // Get users who follow this user
      const followersQuery = query(
        collection(db, 'users'),
        where('follows', 'array-contains', userId)
      )
      const followersSnapshot = await getDocs(followersQuery)
      const followers = followersSnapshot.docs.map(doc => ({
        id: doc.id,
        username: doc.data().username || 'Unknown User',
        photoURL: doc.data().photoURL
      }))
      setFollowersList(followers)
    } catch (err) {
      console.error('Error loading followers:', err)
    } finally {
      setListsLoading(false)
    }
  }

  const loadFollowingList = async () => {
    if (!userId) return
    
    setListsLoading(true)
    try {
      const userDoc = await getDoc(doc(db, 'users', userId))
      if (userDoc.exists()) {
        const userData = userDoc.data()
        const followingIds = userData.follows || []
        
        // Get user details for each followed user
        const followingPromises = followingIds.map(async (followedId: string) => {
          const followedDoc = await getDoc(doc(db, 'users', followedId))
          if (followedDoc.exists()) {
            const followedData = followedDoc.data()
            return {
              id: followedId,
              username: followedData.username || 'Unknown User',
              photoURL: followedData.photoURL
            }
          }
          return null
        })
        
        const following = (await Promise.all(followingPromises)).filter(Boolean) as UserListItem[]
        setFollowingList(following)
      }
    } catch (err) {
      console.error('Error loading following:', err)
    } finally {
      setListsLoading(false)
    }
  }

  const handleShowFollowers = () => {
    setShowFollowers(true)
    loadFollowersList()
  }

  const handleShowFollowing = () => {
    setShowFollowing(true)
    loadFollowingList()
  }

  const loadProfile = async () => {
    try {
      if (!userId) return
      
      const userDoc = await getDoc(doc(db, 'users', userId))
      if (userDoc.exists()) {
        const userData = userDoc.data()
        setProfile({
          id: userId,
          username: userData.username || 'Unknown User',
          photoURL: userData.photoURL,
          bio: userData.bio,
          location: userData.location,
          rating: userData.rating || 0,
          totalSales: userData.totalSales || 0,
          joinedAt: userData.createdAt?.toDate(),
          followers: userData.followers?.length || 0,
          following: userData.follows?.length || 0
        })
      } else {
        setError('User not found')
      }
    } catch (err) {
      console.error('Error loading profile:', err)
      setError('Failed to load profile')
    }
  }

  const loadPastStreams = async () => {
    try {
      if (!userId) return
      
      const streams = await livestreamService.getUserLivestreams(userId, 10)
      setPastStreams(streams.map(stream => ({
        id: stream.id!,
        title: stream.title,
        status: stream.status,
        startedAt: stream.startedAt?.toDate(),
        endedAt: stream.endedAt?.toDate(),
        categories: stream.categories,
        viewerCount: stream.viewerCount
      })))
    } catch (err) {
      console.error('Error loading past streams:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'Unknown'
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDuration = (startedAt: Date | undefined, endedAt: Date | undefined) => {
    if (!startedAt || !endedAt) return 'Unknown duration'
    const duration = endedAt.getTime() - startedAt.getTime()
    const minutes = Math.floor(duration / (1000 * 60))
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    }
    return `${minutes}m`
  }

  const renderStars = (rating: number) => {
    const stars: JSX.Element[] = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 !== 0
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <svg key={i} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      )
    }
    
    if (hasHalfStar) {
      stars.push(
        <svg key="half" className="w-5 h-5 text-yellow-400" viewBox="0 0 20 20">
          <defs>
            <linearGradient id="half">
              <stop offset="50%" stopColor="currentColor" />
              <stop offset="50%" stopColor="transparent" />
            </linearGradient>
          </defs>
          <path fill="url(#half)" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      )
    }
    
    const emptyStars = 5 - Math.ceil(rating)
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <svg key={`empty-${i}`} className="w-5 h-5 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      )
    }
    
    return stars
  }

  const UserListModal = ({ 
    isOpen, 
    onClose, 
    title, 
    users, 
    loading 
  }: { 
    isOpen: boolean
    onClose: () => void
    title: string
    users: UserListItem[]
    loading: boolean
  }) => {
    if (!isOpen) return null

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="card p-6 w-full max-w-md max-h-96 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="overflow-y-auto max-h-64">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p>No {title.toLowerCase()} found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((user) => (
                  <div 
                    key={user.id} 
                    className="flex items-center space-x-3 p-2 hover:bg-slate-700/50 rounded-lg cursor-pointer transition-colors"
                    onClick={() => {
                      navigate(`/profile/${user.id}`)
                      onClose()
                    }}
                  >
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.username}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center">
                        <span className="text-white font-medium">
                          {user.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-slate-100">{user.username}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 relative overflow-hidden">
        {/* Floating background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute top-40 right-20 w-24 h-24 bg-blue-400/10 rounded-full blur-lg animate-bounce"></div>
          <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-teal-400/10 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-20 right-1/3 w-28 h-28 bg-cyan-400/10 rounded-full blur-xl animate-bounce"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="flex items-center space-x-4 mb-8">
              <div className="w-24 h-24 bg-slate-700 rounded-full"></div>
              <div className="space-y-2">
                <div className="h-8 bg-slate-700 rounded w-48"></div>
                <div className="h-4 bg-slate-700 rounded w-32"></div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="h-32 bg-slate-700 rounded"></div>
              <div className="h-32 bg-slate-700 rounded"></div>
              <div className="h-32 bg-slate-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 relative overflow-hidden">
        {/* Floating background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute top-40 right-20 w-24 h-24 bg-blue-400/10 rounded-full blur-lg animate-bounce"></div>
          <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-teal-400/10 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-20 right-1/3 w-28 h-28 bg-cyan-400/10 rounded-full blur-xl animate-bounce"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-4">Profile Not Found</h1>
            <p className="text-slate-300">{error || 'The requested profile could not be found.'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 relative overflow-hidden">
      {/* Floating background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-blue-400/10 rounded-full blur-lg animate-bounce"></div>
        <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-teal-400/10 rounded-full blur-2xl animate-pulse"></div>
        <div className="absolute bottom-20 right-1/3 w-28 h-28 bg-cyan-400/10 rounded-full blur-xl animate-bounce"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="card p-6 mb-8">
          <div className="flex items-start space-x-6">
            <div className="flex-shrink-0">
              {profile.photoURL ? (
                <img
                  src={profile.photoURL}
                  alt={profile.username}
                  className="w-24 h-24 rounded-full object-cover border-2 border-cyan-500/30"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {profile.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center space-x-4 mb-2">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">{profile.username}</h1>
                {currentUser && currentUser.uid !== userId && (
                  <button
                    onClick={handleFollowToggle}
                    disabled={followLoading}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      isFollowing
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        : 'btn-primary'
                    } ${followLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {followLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        <span>{isFollowing ? 'Unfollowing...' : 'Following...'}</span>
                      </div>
                    ) : (
                      isFollowing ? 'Following' : 'Follow'
                    )}
                  </button>
                )}
              </div>
              
              {profile.bio && (
                <p className="text-slate-300 mb-4">{profile.bio}</p>
              )}
              
              <div className="flex items-center space-x-6 text-sm text-slate-400">
                {profile.location && (
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <span>{profile.location}</span>
                  </div>
                )}
                
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                  <span>Joined {formatDate(profile.joinedAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card p-6 text-center">
            <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-1">{profile.totalSales || 0}</div>
            <div className="text-sm text-slate-400">Total Sales</div>
          </div>
          
          <div className="card p-6 text-center">
            <div className="flex items-center justify-center space-x-1 mb-1">
              {renderStars(profile.rating || 0)}
            </div>
            <div className="text-sm text-slate-400">
              {profile.rating ? `${profile.rating.toFixed(1)} Rating` : 'No Rating'}
            </div>
          </div>
          
          <button 
            onClick={handleShowFollowers}
            className="card p-6 text-center hover:bg-slate-700/50 transition-colors"
          >
            <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-1">{profile.followers}</div>
            <div className="text-sm text-slate-400">Followers</div>
          </button>
          
          <button 
            onClick={handleShowFollowing}
            className="card p-6 text-center hover:bg-slate-700/50 transition-colors"
          >
            <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-1">{profile.following}</div>
            <div className="text-sm text-slate-400">Following</div>
          </button>
        </div>

        {/* Past Streams */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-6">Recent Streams</h2>
          
          {pastStreams.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p>No past streams found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pastStreams.map((stream) => (
                <div key={stream.id} className="border border-slate-700 rounded-lg p-4 hover:bg-slate-700/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-slate-100 mb-1">{stream.title}</h3>
                      <div className="flex items-center space-x-4 text-sm text-slate-400">
                        <span>{formatDate(stream.startedAt)}</span>
                        <span>•</span>
                        <span>{formatDuration(stream.startedAt, stream.endedAt)}</span>
                        <span>•</span>
                        <span>{stream.viewerCount} viewers</span>
                      </div>
                      <div className="flex items-center space-x-2 mt-2">
                        {stream.categories.map((category) => (
                          <span
                            key={category}
                            className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded-full"
                          >
                            {category}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        stream.status === 'live' ? 'bg-red-500/20 text-red-400' :
                        stream.status === 'ended' ? 'bg-slate-700 text-slate-300' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {stream.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modals */}
        <UserListModal
          isOpen={showFollowers}
          onClose={() => setShowFollowers(false)}
          title="Followers"
          users={followersList}
          loading={listsLoading}
        />

        <UserListModal
          isOpen={showFollowing}
          onClose={() => setShowFollowing(false)}
          title="Following"
          users={followingList}
          loading={listsLoading}
        />
      </div>
    </div>
  )
}
