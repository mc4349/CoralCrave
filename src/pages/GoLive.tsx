import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useStreaming } from '../contexts/StreamingContext'
import { checkMediaPermissions } from '../lib/agora'
import LiveChat from '../components/LiveChat'

interface QueueItem {
  id: string
  title: string
  description: string
  startingPrice: number
  images: string[]
  category: string
  mode: 'classic' | 'speed'
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
  const [selectedMode, setSelectedMode] = useState<'classic' | 'speed'>('classic')
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['coral'])
  
  // Stream queue state
  const [queueItems, setQueueItems] = useState<QueueItem[]>([])
  const [activeItem, setActiveItem] = useState<QueueItem | null>(null)
  const [showAddItem, setShowAddItem] = useState(false)
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    startingPrice: 0,
    category: 'coral',
    mode: 'classic' as 'classic' | 'speed'
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
      description: newItem.description,
      startingPrice: newItem.startingPrice,
      images: [],
      category: newItem.category,
      mode: newItem.mode,
      status: 'queued'
    }

    setQueueItems([...queueItems, item])
    setNewItem({
      title: '',
      description: '',
      startingPrice: 0,
      category: 'coral',
      mode: 'classic'
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

  const handleEndAuction = (sold: boolean = false) => {
    if (activeItem) {
      setQueueItems(prev => prev.map(item => 
        item.id === activeItem.id 
          ? { ...item, status: sold ? 'sold' : 'unsold' }
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
      // Start the stream - this will trigger the browser permission popup
      await startStream(title, selectedCategories)
    } catch (error: any) {
      console.error('Failed to start stream:', error)
      
      // Provide specific error messages
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
      <div className="h-screen flex bg-gray-100">
        {/* Main Content Area - Whatnot Style Layout */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-red-500 text-white px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                <span className="font-medium">LIVE</span>
                <span className="text-red-100">|</span>
                <span>{currentStream?.title}</span>
                <span className="text-red-100">|</span>
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                  </svg>
                  <span className="font-medium">{viewerCount}</span>
                  <span className="text-red-100">viewers</span>
                </div>
              </div>
              <button
                onClick={handleStopStream}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
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
                <div className="flex items-center space-x-4 bg-black bg-opacity-50 rounded-lg px-4 py-2">
                  <button
                    onClick={toggleMicrophone}
                    className={`p-2 rounded-full ${
                      isMicrophoneEnabled 
                        ? 'bg-gray-600 hover:bg-gray-700' 
                        : 'bg-red-600 hover:bg-red-700'
                    } text-white`}
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
                    className={`p-2 rounded-full ${
                      isCameraEnabled 
                        ? 'bg-gray-600 hover:bg-gray-700' 
                        : 'bg-red-600 hover:bg-red-700'
                    } text-white`}
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
                <div className="absolute top-4 left-4 bg-black bg-opacity-75 text-white p-4 rounded-lg max-w-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-lg">Current Auction</h3>
                    <span className={`px-2 py-1 rounded text-xs ${
                      activeItem.mode === 'classic' ? 'bg-blue-500' : 'bg-orange-500'
                    }`}>
                      {activeItem.mode.toUpperCase()}
                    </span>
                  </div>
                  <h4 className="font-medium mb-1">{activeItem.title}</h4>
                  <p className="text-sm text-gray-300 mb-3">${activeItem.startingPrice.toFixed(2)} starting</p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEndAuction(true)}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                    >
                      Mark Sold
                    </button>
                    <button
                      onClick={() => handleEndAuction(false)}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
                    >
                      End Auction
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Area */}
            <div className="w-80 bg-white border-l">
              <LiveChat liveId={currentStream?.id || ''} isHost={true} />
            </div>
          </div>
        </div>

        {/* Right Sidebar - Queue Management */}
        <div className="w-80 bg-white border-l flex flex-col">
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Stream Queue</h3>
              <button
                onClick={() => setShowAddItem(true)}
                className="bg-coral-500 hover:bg-coral-600 text-white px-3 py-1 rounded text-sm"
              >
                Add Item
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-3">
              {queueItems.map((item, index) => (
                <div key={item.id} className={`rounded-lg p-3 border-2 ${
                  item.status === 'active' ? 'border-green-500 bg-green-50' :
                  item.status === 'sold' ? 'border-blue-500 bg-blue-50' :
                  item.status === 'unsold' ? 'border-gray-400 bg-gray-50' :
                  'border-gray-200 bg-white'
                }`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                          #{index + 1}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          item.mode === 'classic' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {item.mode}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded font-medium ${
                          item.status === 'active' ? 'bg-green-100 text-green-700' :
                          item.status === 'sold' ? 'bg-blue-100 text-blue-700' :
                          item.status === 'unsold' ? 'bg-gray-100 text-gray-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {item.status.toUpperCase()}
                        </span>
                      </div>
                      <h4 className="font-medium text-gray-900 text-sm">{item.title}</h4>
                      <p className="text-xs text-gray-600">${item.startingPrice.toFixed(2)} starting</p>
                    </div>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                  
                  {item.status === 'queued' && (
                    <button
                      onClick={() => handleStartAuction(item.id)}
                      className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-3 rounded text-sm font-medium"
                    >
                      Start Auction
                    </button>
                  )}
                </div>
              ))}
              
              {queueItems.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No items in queue</p>
                  <p className="text-xs">Add items to auction during your stream</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add Item Modal */}
        {showAddItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Item to Queue</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Title *
                  </label>
                  <input
                    type="text"
                    value={newItem.title}
                    onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                    placeholder="Enter item title..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    placeholder="Enter item description..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Starting Price *
                  </label>
                  <input
                    type="number"
                    value={newItem.startingPrice}
                    onChange={(e) => setNewItem({ ...newItem, startingPrice: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500"
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.emoji} {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Auction Mode
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="classic"
                        checked={newItem.mode === 'classic'}
                        onChange={(e) => setNewItem({ ...newItem, mode: e.target.value as 'classic' | 'speed' })}
                        className="mr-2"
                      />
                      <span className="text-sm">Classic</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="speed"
                        checked={newItem.mode === 'speed'}
                        onChange={(e) => setNewItem({ ...newItem, mode: e.target.value as 'classic' | 'speed' })}
                        className="mr-2"
                      />
                      <span className="text-sm">Speed</span>
                    </label>
                  </div>
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Go Live</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Video Preview */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="relative bg-black" style={{ aspectRatio: '16/9' }}>
              <div ref={videoRef} className="w-full h-full"></div>
              
              {/* Controls Overlay */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                <div className="flex items-center space-x-4 bg-black bg-opacity-50 rounded-lg px-4 py-2">
                  <button
                    onClick={toggleMicrophone}
                    className={`p-2 rounded-full ${
                      isMicrophoneEnabled 
                        ? 'bg-gray-600 hover:bg-gray-700' 
                        : 'bg-red-600 hover:bg-red-700'
                    } text-white`}
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
                    className={`p-2 rounded-full ${
                      isCameraEnabled 
                        ? 'bg-gray-600 hover:bg-gray-700' 
                        : 'bg-red-600 hover:bg-red-700'
                    } text-white`}
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
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Stream Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stream Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter your stream title..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Auction Mode
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="classic"
                      checked={selectedMode === 'classic'}
                      onChange={(e) => setSelectedMode(e.target.value as 'classic' | 'speed')}
                      className="mr-2"
                    />
                    <span className="text-sm">Classic (timer resets)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="speed"
                      checked={selectedMode === 'speed'}
                      onChange={(e) => setSelectedMode(e.target.value as 'classic' | 'speed')}
                      className="mr-2"
                    />
                    <span className="text-sm">Speed (fixed timer)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categories
                </label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => handleCategoryToggle(category.id)}
                      className={`px-3 py-1 rounded-full text-sm ${
                        selectedCategories.includes(category.id)
                          ? 'bg-coral-500 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Stream Queue</h2>
              <button
                onClick={() => setShowAddItem(true)}
                className="btn-secondary text-sm"
              >
                Add Item
              </button>
            </div>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {queueItems.map((item, index) => (
                <div key={item.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                          #{index + 1}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          item.mode === 'classic' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {item.mode}
                        </span>
                      </div>
                      <h4 className="font-medium text-gray-900 text-sm">{item.title}</h4>
                      <p className="text-xs text-gray-600">${item.startingPrice.toFixed(2)} starting</p>
                    </div>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                  
                  {item.status === 'queued' && (
                    <button
                      onClick={() => handleStartAuction(item.id)}
                      className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-3 rounded text-sm font-medium"
                    >
                      Start Auction
                    </button>
                  )}
                </div>
              ))}
              
              {queueItems.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No items in queue</p>
                  <p className="text-xs">Add items to auction during your stream</p>
                </div>
              )}
            </div>
          </div>

          {/* Add Item Modal */}
          {showAddItem && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Item to Queue</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Item Title *
                    </label>
                    <input
                      type="text"
                      value={newItem.title}
                      onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                      placeholder="Enter item title..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={newItem.description}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      placeholder="Enter item description..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Starting Price *
                    </label>
                    <input
                      type="number"
                      value={newItem.startingPrice}
                      onChange={(e) => setNewItem({ ...newItem, startingPrice: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      value={newItem.category}
                      onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500"
                    >
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.emoji} {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Auction Mode
                    </label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="classic"
                          checked={newItem.mode === 'classic'}
                          onChange={(e) => setNewItem({ ...newItem, mode: e.target.value as 'classic' | 'speed' })}
                          className="mr-2"
                        />
                        <span className="text-sm">Classic</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="speed"
                          checked={newItem.mode === 'speed'}
                          onChange={(e) => setNewItem({ ...newItem, mode: e.target.value as 'classic' | 'speed' })}
                          className="mr-2"
                        />
                        <span className="text-sm">Speed</span>
                      </label>
                    </div>
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
      </div>
    </div>
  )
}
