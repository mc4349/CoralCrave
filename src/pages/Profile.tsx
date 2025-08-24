import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { livestreamService } from '../services/livestreamService'

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

export default function Profile() {
  const { userId } = useParams()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [pastStreams, setPastStreams] = useState<LivestreamData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (userId) {
      loadProfile()
      loadPastStreams()
    }
  }, [userId])

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
          following: userData.following?.length || 0
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
    const stars = []
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
        <svg key={`empty-${i}`} className="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      )
    }
    
    return stars
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-24 h-24 bg-gray-300 rounded-full"></div>
            <div className="space-y-2">
              <div className="h-8 bg-gray-300 rounded w-48"></div>
              <div className="h-4 bg-gray-300 rounded w-32"></div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-32 bg-gray-300 rounded"></div>
            <div className="h-32 bg-gray-300 rounded"></div>
            <div className="h-32 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Profile Not Found</h1>
          <p className="text-gray-600">{error || 'The requested profile could not be found.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <div className="flex items-start space-x-6">
          <div className="flex-shrink-0">
            {profile.photoURL ? (
              <img
                src={profile.photoURL}
                alt={profile.username}
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-coral-500 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {profile.username.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{profile.username}</h1>
            
            {profile.bio && (
              <p className="text-gray-600 mb-4">{profile.bio}</p>
            )}
            
            <div className="flex items-center space-x-6 text-sm text-gray-500">
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
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="text-2xl font-bold text-coral-600 mb-1">{profile.totalSales || 0}</div>
          <div className="text-sm text-gray-600">Total Sales</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="flex items-center justify-center space-x-1 mb-1">
            {renderStars(profile.rating || 0)}
          </div>
          <div className="text-sm text-gray-600">
            {profile.rating ? `${profile.rating.toFixed(1)} Rating` : 'No Rating'}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="text-2xl font-bold text-coral-600 mb-1">{profile.followers}</div>
          <div className="text-sm text-gray-600">Followers</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="text-2xl font-bold text-coral-600 mb-1">{pastStreams.length}</div>
          <div className="text-sm text-gray-600">Past Streams</div>
        </div>
      </div>

      {/* Past Streams */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Streams</h2>
        
        {pastStreams.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No past streams found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pastStreams.map((stream) => (
              <div key={stream.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-1">{stream.title}</h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
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
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      stream.status === 'live' ? 'bg-red-100 text-red-700' :
                      stream.status === 'ended' ? 'bg-gray-100 text-gray-700' :
                      'bg-yellow-100 text-yellow-700'
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
    </div>
  )
}
