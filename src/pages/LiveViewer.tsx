import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStreaming } from '../contexts/StreamingContext'
import { useAuth } from '../contexts/AuthContext'
import AuctionPanel from '../components/AuctionPanel'
import LiveChat from '../components/LiveChat'
import { AuctionItem } from '../services/auctionEngine'

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

  const handleItemChange = (item: AuctionItem) => {
    setCurrentItem(item)
  }

  const handleSellerClick = () => {
    if (currentStream?.hostId) {
      navigate(`/profile/${currentStream.hostId}`)
    }
  }

  return (
    <div className="h-screen flex">
      {/* Main Video Area */}
      <div className="flex-1 flex flex-col">
        {/* Video */}
        <div className="flex-1 bg-gray-900 relative">
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
            <div className="bg-black bg-opacity-50 rounded-lg p-3 text-white">
              <button
                onClick={handleSellerClick}
                className="text-left hover:bg-white hover:bg-opacity-10 rounded p-1 -m-1 transition-colors"
              >
                <h2 className="text-lg font-semibold hover:text-coral-400 transition-colors">
                  {currentStream?.hostUsername || 'Coral Seller'}
                </h2>
                <div className="flex items-center space-x-2 text-sm opacity-75">
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
            </div>
          </div>

          {/* Live indicator */}
          {currentStream?.status === 'live' && (
            <div className="absolute top-4 right-4">
              <div className="flex items-center space-x-2 bg-red-600 text-white px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">LIVE</span>
              </div>
            </div>
          )}
        </div>

        {/* Chat */}
        <div className="h-64">
          <LiveChat liveId={id || ''} />
        </div>
      </div>

      {/* Auction Panel */}
      <div className="w-80">
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
