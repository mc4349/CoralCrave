import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useStreaming } from '../contexts/StreamingContext'
import { useAuth } from '../contexts/AuthContext'
import AuctionPanel from '../components/AuctionPanel'
import LiveChat from '../components/LiveChat'
import { AuctionItem } from '../services/auctionEngine'

const LiveViewer = () => {
  const { id } = useParams()
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
          <div className="absolute top-4 left-4 text-white">
            <h2 className="text-lg font-semibold">
              {currentStream?.hostUsername || 'Coral Seller'}
            </h2>
            <p className="text-sm opacity-75">
              {viewerCount} viewer{viewerCount !== 1 ? 's' : ''}
            </p>
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
