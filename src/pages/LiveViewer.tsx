import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStreaming } from '../contexts/StreamingContext'
import { useAuth } from '../contexts/AuthContext'
import AuctionPanel from '../components/AuctionPanel'
import LiveChat from '../components/LiveChat'
import { AuctionItem } from '../services/auctionEngine'
import { userService } from '../services/userService'

const LiveViewer = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { 
    isViewing, 
    remoteVideoTracks, 
    joinStream, 
    leaveStream,
    viewerCount,
    currentStream
  } = useStreaming()
  
  const [currentItem, setCurrentItem] = useState<AuctionItem | undefined>(undefined)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const videoRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (id && currentUser) {
      // Join the stream as a viewer
      joinStream(id)
    }

    return () => {
      leaveStream()
    }
  }, [id, currentUser, joinStream, leaveStream])

  useEffect(() => {
    // Play remote video track when available
    const remoteVideoTrack = Array.from(remoteVideoTracks.values())[0]
    if (remoteVideoTrack && videoRef.current) {
      remoteVideoTrack.play(videoRef.current)
    }
  }, [remoteVideoTracks])

  useEffect(() => {
    // Check follow status when stream loads
    if (currentUser && currentStream?.hostId && currentUser.uid !== currentStream.hostId) {
      checkFollowStatus()
    }
  }, [currentUser, currentStream])

  const checkFollowStatus = async () => {
    if (!currentUser || !currentStream?.hostId) return
    
    try {
      const currentUserProfile = await userService.getUserProfile(currentUser.uid)
      if (currentUserProfile) {
        setIsFollowing(currentUserProfile.follows.includes(currentStream.hostId))
      }
    } catch (err) {
      console.error('Error checking follow status:', err)
    }
  }

  const handleFollowToggle = async () => {
    if (!currentUser || !currentStream?.hostId || currentUser.uid === currentStream.hostId) return
    
    setFollowLoading(true)
    try {
      if (isFollowing) {
        await userService.unfollowUser(currentUser.uid, currentStream.hostId)
        setIsFollowing(false)
      } else {
        await userService.followUser(currentUser.uid, currentStream.hostId)
        setIsFollowing(true)
      }
    } catch (err) {
      console.error('Error toggling follow:', err)
      alert('Failed to update follow status. Please try again.')
    } finally {
      setFollowLoading(false)
    }
  }

  const handleItemChange = (item: AuctionItem) => {
    setCurrentItem(item)
  }

  const handleSellerClick = () => {
    if (currentStream?.hostId) {
      navigate(`/profile/${currentStream.hostId}`)
    }
  }

  return (
    <div className="h-screen flex bg-gradient-to-b from-slate-900 via-blue-900 to-slate-800">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 opacity-5 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-blue-400 rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-teal-400 rounded-full animate-bounce"></div>
        <div className="absolute bottom-20 left-1/4 w-20 h-20 bg-cyan-400 rounded-full animate-pulse"></div>
        <div className="absolute bottom-40 right-1/3 w-28 h-28 bg-blue-300 rounded-full animate-bounce"></div>
      </div>

      {/* Main Video Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Video */}
        <div className="flex-1 bg-slate-900 relative rounded-lg m-2 overflow-hidden border border-slate-700/50">
          {/* Video container */}
          <div 
            ref={videoRef}
            className="absolute inset-0 w-full h-full"
            style={{ background: '#000' }}
          />
          
          {/* Overlay when no video */}
          {remoteVideoTracks.size === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-white text-xl">
              {isViewing ? 'Waiting for stream...' : `Live Stream #${id}`}
            </div>
          )}
          
          {/* Stream info overlay */}
          <div className="absolute top-4 left-4">
            <div className="bg-slate-800/80 backdrop-blur-sm rounded-lg p-3 text-white border border-slate-700/50">
              <div className="flex items-start justify-between space-x-4">
                <button
                  onClick={handleSellerClick}
                  className="text-left hover:bg-slate-700/50 rounded p-1 -m-1 transition-colors flex-1"
                >
                  <h2 className="text-lg font-semibold hover:text-cyan-300 transition-colors">
                    {currentStream?.hostUsername || 'Coral Seller'}
                  </h2>
                  <div className="flex items-center space-x-2 text-sm text-slate-300">
                    <div className="flex items-center space-x-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                      </svg>
                      <span>{viewerCount} viewer{viewerCount !== 1 ? 's' : ''}</span>
                    </div>
                    <span>•</span>
                    <span>Click to view profile</span>
                  </div>
                </button>
                
                {/* Follow Button */}
                {currentUser && currentStream?.hostId && currentUser.uid !== currentStream.hostId && (
                  <button
                    onClick={handleFollowToggle}
                    disabled={followLoading}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      isFollowing
                        ? 'bg-slate-700/50 text-slate-100 hover:bg-slate-600/50'
                        : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600'
                    } ${followLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {followLoading ? (
                      <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        <span>{isFollowing ? 'Unfollowing' : 'Following'}</span>
                      </div>
                    ) : (
                      isFollowing ? 'Following' : 'Follow'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Live indicator */}
          {currentStream?.status === 'live' && (
            <div className="absolute top-4 right-4">
              <div className="flex items-center space-x-2 bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1 rounded-full shadow-lg">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">LIVE</span>
              </div>
            </div>
          )}
        </div>

        {/* Chat */}
        <div className="h-64 m-2 mt-0">
          <LiveChat liveId={id || ''} />
        </div>
      </div>

      {/* Auction Panel */}
      <div className="w-80 m-2 ml-0">
        <AuctionPanel 
          liveId={id || ''}
          currentItem={currentItem}
          onItemChange={handleItemChange}
        />
      </div>
    </div>
  )
}

export default LiveViewer
