import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useStreaming } from '../contexts/StreamingContext'
import LiveChat from '../components/LiveChat'

interface QueueItem {
  id: string
  title: string
  startingPrice: number
  duration: number
  status: 'queued' | 'active' | 'sold' | 'unsold'
}

export default function GoLive() {
  const { currentUser } = useAuth()
  const { 
    startStream, 
    stopStream, 
    isStreaming, 
    localVideoTrack, 
    toggleMicrophone, 
    toggleCamera, 
    isMicrophoneEnabled, 
    isCameraEnabled,
    loading,
    currentStream,
    viewerCount
  } = useStreaming()
  
  const navigate = useNavigate()
  
  // Form state
  const [title, setTitle] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['coral'])
  
  // Stream queue state
  const [queueItems, setQueueItems] = useState<QueueItem[]>([])
  const [activeItem, setActiveItem] = useState<QueueItem | null>(null)
  const [showAddItem, setShowAddItem] = useState(false)
  const [newItem, setNewItem] = useState({
    title: '',
    startingPrice: 0,
    duration: 20
  })
  
  // Video preview ref
  const videoRef = useRef<HTMLDivElement>(null)
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!currentUser) {
      navigate('/auth/signin')
    }
  }, [currentUser, navigate])

  if (!currentUser) {
    return null
  }

  // Play local video track in preview
  useEffect(() => {
    if (localVideoTrack && videoRef.current) {
      localVideoTrack.play(videoRef.current)
    }
  }, [localVideoTrack])

  const categories = [
    { id: 'coral', name: 'Coral', emoji: '🪸' },
    { id: 'fish', name: 'Fish', emoji: '🐠' },
    { id: 'equipment', name: 'Equipment', emoji: '⚙️' },
    { id: 'plants', name: 'Plants', emoji: '🌱' },
    { id: 'other', name: 'Other', emoji: '🌊' }
  ]

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const handleAddItem = () => {
    if (!newItem.title.trim() || newItem.startingPrice <= 0) {
      alert('Please fill in all required fields')
      return
    }

    const item: QueueItem = {
      id: Date.now().toString(),
      title: newItem.title,
      startingPrice: newItem.startingPrice,
      duration: newItem.duration,
      status: 'queued'
    }

    setQueueItems([...queueItems, item])
    setNewItem({
      title: '',
      startingPrice: 0,
      duration: 20
    })
    setShowAddItem(false)
  }

  const handleRemoveItem = (itemId: string) => {
    setQueueItems(queueItems.filter(item => item.id !== itemId))
  }

  const handleStartAuction = (itemId: string) => {
    // End current auction if any
    if (activeItem) {
      setQueueItems(prev => prev.map(item => 
        item.id === activeItem.id 
          ? { ...item, status: 'unsold' }
          : item
      ))
    }

    // Start new auction
    const item = queueItems.find(item => item.id === itemId)
    if (item) {
      setActiveItem(item)
      setQueueItems(prev => prev.map(item => 
        item.id === itemId 
          ? { ...item, status: 'active' }
          : item
      ))
    }
  }

  const handleEndAuction = () => {
    if (activeItem) {
      setQueueItems(prev => prev.map(item => 
        item.id === activeItem.id 
          ? { ...item, status: 'unsold' }
          : item
      ))
      setActiveItem(null)
    }
  }

  const handleStartStream = async () => {
    if (!title.trim()) {
      alert('Please enter a stream title')
      return
    }

    if (selectedCategories.length === 0) {
      alert('Please select at least one category')
      return
    }

    try {
      await startStream(title, selectedCategories)
    } catch (error: any) {
      console.error('Failed to start stream:', error)
      
      let errorMessage = 'Failed to start stream. Please try again.'
      
      if (error.message.includes('permission') || error.message.includes('Permission')) {
        errorMessage = 'Camera and microphone permissions are required. Please allow access in your browser and try again.'
      } else if (error.message.includes('device') || error.message.includes('Device')) {
        errorMessage = 'No camera or microphone found. Please connect your devices and try again.'
      } else if (error.message.includes('use') || error.message.includes('busy')) {
        errorMessage = 'Camera or microphone is already in use. Please close other applications and try again.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      alert(errorMessage)
    }
  }

  const handleStopStream = async () => {
    try {
      await stopStream()
    } catch (error) {
      console.error('Failed to stop stream:', error)
    }
  }

  if (isStreaming) {
    return (
      <div className="h-screen flex bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-4 flex-shrink-0 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse shadow-lg"></div>
                <span className="font-bold">LIVE</span>
                <span className="text-red-100">|</span>
                <span className="font-medium">{currentStream?.title}</span>
                <span className="text-red-100">|</span>
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                  </svg>
                  <span className="font-bold">{viewerCount}</span>
                  <span className="text-red-100">viewers</span>
                </div>
              </div>
              <button
                onClick={handleStopStream}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg text-sm font-bold disabled:opacity-50 shadow-lg transition-all duration-300 hover:shadow-xl"
              >
                {loading ? 'Stopping...' : 'End Stream'}
              </button>
            </div>
          </div>

          {/* Video and Chat Layout */}
          <div className="flex-1 flex">
            {/* Video Area */}
            <div className="flex-1 bg-black relative">
              <div ref={videoRef} className="w-full h-full"></div>
              
              {/* Controls Overlay */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                <div className="flex items-center space-x-4 bg-slate-900/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-slate-700">
                  <button
                    onClick={toggleMicrophone}
                    className={`p-2 rounded-full transition-all duration-300 ${
                      isMicrophoneEnabled 
                        ? 'bg-slate-600 hover:bg-slate-500 text-cyan-300' 
                        : 'bg-red-600 hover:bg-red-500 text-white'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      {isMicrophoneEnabled ? (
                        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                      ) : (
                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v4a1 1 0 01-1.707.707L6.586 7H4a1 1 0 010-2h2.586l1.707-1.707A1 1 0 019.383 3.076zM12 5a1 1 0 011 1v4a1 1 0 11-2 0V6a1 1 0 011-1z" clipRule="evenodd" />
                      )}
                    </svg>
                  </button>
                  
                  <button
                    onClick={toggleCamera}
                    className={`p-2 rounded-full transition-all duration-300 ${
                      isCameraEnabled 
                        ? 'bg-slate-600 hover:bg-slate-500 text-cyan-300' 
                        : 'bg-red-600 hover:bg-red-500 text-white'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      {isCameraEnabled ? (
                        <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586l-.707-.707A1 1 0 0013 4H7a1 1 0 00-.707.293L5.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                      ) : (
                        <path fillRule="evenodd" d="M1.293 1.293a1 1 0 011.414 0l16 16a1 1 0 01-1.414 1.414l-3.736-3.736A2 2 0 0112 16H4a2 2 0 01-2-2V6a2 2 0 012-2h.586l.707-.707A1 1 0 016 3h2a1 1 0 01.707.293L9.414 4H12a2 2 0 011.732 1.004l2.975-2.975z" clipRule="evenodd" />
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              {/* Current Auction Overlay */}
              {activeItem && (
                <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-sm text-white p-4 rounded-lg max-w-sm border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-lg text-cyan-300">Current Auction</h3>
                  </div>
                  <h4 className="font-medium mb-1 text-slate-100">{activeItem.title}</h4>
                  <p className="text-sm text-cyan-400 mb-3">${activeItem.startingPrice.toFixed(2)} starting</p>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleEndAuction}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-sm transition-all duration-300"
                    >
                      End Auction
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Area */}
            <div className="w-80 bg-slate-800 border-l border-slate-700">
              <LiveChat liveId={currentStream?.id || ''} isHost={true} />
            </div>
          </div>
        </div>

        {/* Right Sidebar - Queue Management */}
        <div className="w-80 bg-slate-800/95 backdrop-blur-sm border-l border-slate-700 flex flex-col">
          <div className="p-4 border-b border-slate-700 bg-slate-800/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-100">Stream Queue</h3>
              <button
                onClick={() => setShowAddItem(true)}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-all duration-300 shadow-lg"
              >
                Add Item
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-3">
              {queueItems.map((item, index) => (
                <div key={item.id} className={`rounded-lg p-3 border-2 transition-all duration-300 ${
                  item.status === 'active' ? 'border-green-500 bg-green-900/20' :
                  item.status === 'sold' ? 'border-blue-500 bg-blue-900/20' :
                  item.status === 'unsold' ? 'border-slate-500 bg-slate-800/50' :
                  'border-slate-600 bg-slate-800/30'
                }`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs bg-slate-600/50 text-slate-300 px-2 py-1 rounded">
                          #{index + 1}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded font-medium ${
                          item.status === 'active' ? 'bg-green-500/20 text-green-300' :
                          item.status === 'sold' ? 'bg-blue-500/20 text-blue-300' :
                          item.status === 'unsold' ? 'bg-slate-500/20 text-slate-300' :
                          'bg-cyan-500/20 text-cyan-300'
                        }`}>
                          {item.status.toUpperCase()}
                        </span>
                      </div>
                      <h4 className="font-medium text-slate-100 text-sm">{item.title}</h4>
                      <p className="text-xs text-cyan-400">${item.startingPrice.toFixed(2)} starting</p>
                      <p className="text-xs text-slate-400">{item.duration}s duration</p>
                    </div>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-red-400 hover:text-red-300 p-1 transition-colors duration-300"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                  
                  {item.status === 'queued' && (
                    <button
                      onClick={() => handleStartAuction(item.id)}
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 shadow-lg"
                    >
                      Start Auction
                    </button>
                  )}
                </div>
              ))}
              
              {queueItems.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <p className="text-sm">No items in queue</p>
                  <p className="text-xs">Add items to auction during your stream</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add Item Modal */}
        {showAddItem && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="card w-full max-w-md mx-4 shadow-2xl shadow-cyan-500/20">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">Add Item to Queue</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Item Title *
                  </label>
                  <input
                    type="text"
                    value={newItem.title}
                    onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                    placeholder="Enter item title..."
                    className="input-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Starting Price *
                  </label>
                  <input
                    type="number"
                    value={newItem.startingPrice}
                    onChange={(e) => setNewItem({ ...newItem, startingPrice: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="input-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Duration
                  </label>
                  <select
                    value={newItem.duration}
                    onChange={(e) => setNewItem({ ...newItem, duration: parseInt(e.target.value) })}
                    className="select-primary"
                  >
                    <option value={20}>20 seconds</option>
                    <option value={40}>40 seconds</option>
                    <option value={60}>1 minute</option>
                  </select>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setShowAddItem(false)}
                    className="flex-1 btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddItem}
                    className="flex-1 btn-primary"
                  >
                    Add Item
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
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
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-slate-100 mb-8 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Go Live</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Video Preview */}
          <div className="lg:col-span-2">
            <div className="card overflow-hidden shadow-xl shadow-cyan-500/10">
              <div className="relative bg-gradient-to-br from-slate-800 to-slate-900" style={{ aspectRatio: '16/9' }}>
                <div ref={videoRef} className="w-full h-full"></div>
                
                {/* Animated water effect overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-blue-900/20 to-transparent pointer-events-none"></div>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent animate-pulse pointer-events-none"></div>
                
                {/* Controls Overlay */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                  <div className="flex items-center space-x-4 bg-slate-900/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-slate-700">
                    <button
                      onClick={toggleMicrophone}
                      className={`p-2 rounded-full transition-all duration-300 ${
                        isMicrophoneEnabled 
                          ? 'bg-slate-600 hover:bg-slate-500 text-cyan-300' 
                          : 'bg-red-600 hover:bg-red-500 text-white'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        {isMicrophoneEnabled ? (
                          <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                        ) : (
                          <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v4a1 1 0 01-1.707.707L6.586 7H4a1 1 0 010-2h2.586l1.707-1.707A1 1 0 019.383 3.076zM12 5a1 1 0 011 1v4a1 1 0 11-2 0V6a1 1 0 011-1z" clipRule="evenodd" />
                        )}
                      </svg>
                    </button>
                    
                    <button
                      onClick={toggleCamera}
                      className={`p-2 rounded-full transition-all duration-300 ${
                        isCameraEnabled 
                          ? 'bg-slate-600 hover:bg-slate-500 text-cyan-300' 
                          : 'bg-red-600 hover:bg-red-500 text-white'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        {isCameraEnabled ? (
                          <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586l-.707-.707A1 1 0 0013 4H7a1 1 0 00-.707.293L5.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                        ) : (
                          <path fillRule="evenodd" d="M1.293 1.293a1 1 0 011.414 0l16 16a1 1 0 01-1.414 1.414l-3.736-3.736A2 2 0 0112 16H4a2 2 0 01-2-2V6a2 2 0 012-2h.586l.707-.707A1 1 0 016 3h2a1 1 0 01.707.293L9.414 4H12a2 2 0 011.732 1.004l2.975-2.975z" clipRule="evenodd" />
                        )}
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stream Settings & Queue */}
          <div className="space-y-6">
            {/* Stream Settings */}
            <div className="card shadow-xl shadow-cyan-500/10">
              <h2 className="text-xl font-semibold text-slate-100 mb-4">Stream Settings</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Stream Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter your stream title..."
                    className="input-primary"
                    autoComplete="off"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Categories
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => handleCategoryToggle(category.id)}
                        className={`px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                          selectedCategories.includes(category.id)
                            ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25'
                            : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-cyan-300 border border-slate-600'
                        }`}
                      >
                        {category.emoji} {category.name}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleStartStream}
                  disabled={loading || !title.trim()}
                  className="w-full btn-primary disabled:opacity-50"
                >
                  {loading ? 'Starting...' : 'Start Stream'}
                </button>
              </div>
            </div>

            {/* Stream Queue */}
            <div className="card shadow-xl shadow-cyan-500/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-100">Stream Queue</h2>
                <button
                  onClick={() => setShowAddItem(true)}
                  className="btn-secondary text-sm"
                >
                  Add Item
                </button>
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {queueItems.map((item, index) => (
                  <div key={item.id} className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-xs bg-slate-600/50 text-slate-300 px-2 py-1 rounded">
                            #{index + 1}
                          </span>
                        </div>
                        <h4 className="font-medium text-slate-100 text-sm">{item.title}</h4>
                        <p className="text-xs text-cyan-400">${item.startingPrice.toFixed(2)} starting</p>
                        <p className="text-xs text-slate-400">{item.duration}s duration</p>
                      </div>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-red-400 hover:text-red-300 p-1 transition-colors duration-300"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                    
                    {item.status === 'queued' && (
                      <button
                        onClick={() => handleStartAuction(item.id)}
                        className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-2 px-3 rounded-lg text-sm font-medium mt-2 transition-all duration-300 shadow-lg"
                      >
                        Start Auction
                      </button>
                    )}
                  </div>
                ))}
                
                {queueItems.length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    <p className="text-sm">No items in queue</p>
                    <p className="text-xs">Add items to auction during your stream</p>
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
