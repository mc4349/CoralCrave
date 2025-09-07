import { useState, useEffect, useRef } from 'react'
import { useStreaming } from '../contexts/StreamingContext'
import LiveChat from '../components/LiveChat'
import { validateStreamTitle, sanitizeInput } from '../lib/validation'



export default function GoLive() {
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
    viewerCount,
    error,
    initializePreview
  } = useStreaming()
  
  const [title, setTitle] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['coral'])

  
  const videoRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isStreaming) {
      initializePreview()
    }
  }, [initializePreview, isStreaming])

  useEffect(() => {
    const renderLocalVideo = async () => {
      if (!videoRef.current) return

      if (localVideoTrack) {
        try {
          const existingVideo = videoRef.current.querySelector('video')
          if (existingVideo) existingVideo.remove()

          await localVideoTrack.play(videoRef.current)
          await new Promise(resolve => setTimeout(resolve, 300))
          
          let videoElement = videoRef.current.querySelector('video')
          let retryCount = 0
          
          while (!videoElement && retryCount < 10) {
            await new Promise(resolve => setTimeout(resolve, 100))
            videoElement = videoRef.current.querySelector('video')
            retryCount++
          }
          
          if (videoElement) {
            videoElement.style.width = '100%'
            videoElement.style.height = '100%'
            videoElement.style.objectFit = 'cover'
            videoElement.style.backgroundColor = '#000'
            videoElement.style.borderRadius = '8px'
            videoElement.setAttribute('playsinline', 'true')
            videoElement.setAttribute('autoplay', 'true')
            videoElement.muted = true
            
            if (videoElement.paused) {
              await videoElement.play()
            }
          } else {
            videoRef.current.innerHTML = '<div style="color: white; text-align: center; padding: 20px;"><div>⚠️ Camera Preview Issue</div></div>'
          }
        } catch (error: any) {
          if (videoRef.current) {
            videoRef.current.innerHTML = '<div style="color: white; text-align: center; padding: 20px;"><div>⚠️ Camera Access Issue</div></div>'
          }
        }
      } else {
        if (videoRef.current) {
          videoRef.current.innerHTML = '<div style="color: white; text-align: center; padding: 40px;"><div>📹 Camera Preview</div><div>Click "Start Stream" to initialize camera</div></div>'
        }
      }
    }

    renderLocalVideo().catch(console.error)
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
      prev.includes(categoryId) ? prev.filter(id => id !== categoryId) : [...prev, categoryId]
    )
  }





  const handleStartStream = async () => {
    // Validate stream title
    const titleValidation = validateStreamTitle(title)
    if (!titleValidation.isValid) {
      alert(titleValidation.message)
      return
    }

    if (selectedCategories.length === 0) {
      alert('Please select at least one category')
      return
    }

    try {
      // Sanitize input before sending
      const sanitizedTitle = sanitizeInput(title.trim())
      await startStream(sanitizedTitle, selectedCategories)
    } catch (error: any) {
      console.error('Failed to start stream:', error)
      alert(error.message || 'Failed to start stream. Please try again.')
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
        <div className="flex-1 flex flex-col">
          <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-4 flex-shrink-0 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse shadow-lg"></div>
                <span className="font-bold">LIVE</span>
                <span className="text-red-100">|</span>
                <span className="font-medium">{currentStream?.title}</span>
                <span className="text-red-100">|</span>
                <span className="font-bold">{viewerCount} viewers</span>
              </div>
              <button
                onClick={handleStopStream}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
              >
                {loading ? 'Stopping...' : 'End Stream'}
              </button>
            </div>
          </div>

          <div className="flex-1 flex">
            <div className="flex-1 bg-black relative">
              <div ref={videoRef} className="w-full h-full"></div>
              
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                <div className="flex items-center space-x-4 bg-slate-900/80 backdrop-blur-sm rounded-lg px-4 py-2">
                  <button
                    onClick={toggleMicrophone}
                    className={`p-2 rounded-full ${isMicrophoneEnabled ? 'bg-slate-600 text-cyan-300' : 'bg-red-600 text-white'}`}
                  >
                    🎤
                  </button>
                  
                  <button
                    onClick={toggleCamera}
                    className={`p-2 rounded-full ${isCameraEnabled ? 'bg-slate-600 text-cyan-300' : 'bg-red-600 text-white'}`}
                  >
                    📹
                  </button>
                </div>
              </div>


            </div>

            <div className="w-80 bg-slate-800 border-l border-slate-700">
              <LiveChat liveId={currentStream?.id || ''} isHost={true} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      <div className="relative max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-slate-100 mb-8 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Go Live</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="card overflow-hidden shadow-xl">
              <div className="relative bg-gradient-to-br from-slate-800 to-slate-900" style={{ aspectRatio: '16/9' }}>
                <div ref={videoRef} className="w-full h-full"></div>
                
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                  <div className="flex items-center space-x-4 bg-slate-900/80 rounded-lg px-4 py-2">
                    <button
                      onClick={toggleMicrophone}
                      className={`p-2 rounded-full ${isMicrophoneEnabled ? 'bg-slate-600 text-cyan-300' : 'bg-red-600 text-white'}`}
                    >
                      🎤
                    </button>
                    
                    <button
                      onClick={toggleCamera}
                      className={`p-2 rounded-full ${isCameraEnabled ? 'bg-slate-600 text-cyan-300' : 'bg-red-600 text-white'}`}
                    >
                      📹
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="card shadow-xl">
              <h2 className="text-xl font-semibold text-slate-100 mb-6">Stream Setup</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Stream Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter your stream title..."
                    className="input-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">Categories</label>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => handleCategoryToggle(category.id)}
                        className={`p-3 rounded-lg border-2 transition-all duration-300 text-left ${
                          selectedCategories.includes(category.id)
                            ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
                            : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{category.emoji}</span>
                          <span className="text-sm font-medium">{category.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="bg-red-900/20 border border-red-500/50 text-red-300 p-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleStartStream}
                  disabled={loading || !title.trim() || selectedCategories.length === 0}
                  className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Starting Stream...' : 'Start Stream'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
