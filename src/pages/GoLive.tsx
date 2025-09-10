import React, { useEffect, useRef, useState } from 'react'
import AgoraRTC, {
  IAgoraRTCClient,
  ILocalAudioTrack,
  ILocalVideoTrack,
} from 'agora-rtc-sdk-ng'

import { APP_ID, createClient, fetchToken } from '../agora/client'
import LiveChat from '../components/LiveChat'
import AuctionPanel from '../components/AuctionPanel'
import { useAuth } from '../contexts/AuthContext'

function getRoom(defaultName = 'main') {
  const u = new URL(window.location.href)
  return u.searchParams.get('room') || defaultName
}

export default function GoLive() {
  const channel = getRoom()
  const clientRef = useRef<IAgoraRTCClient | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const localRef = useRef<HTMLDivElement>(null)
  const tracksRef = useRef<{ mic?: ILocalAudioTrack; cam?: ILocalVideoTrack }>(
    {}
  )
  const [isHost, setIsHost] = useState(false)
  const [showSetup, setShowSetup] = useState(true)
  const [streamTitle, setStreamTitle] = useState('')
  const [streamDescription, setStreamDescription] = useState('')
  const [streamCategory, setStreamCategory] = useState('General')
  const { currentUser, userProfile } = useAuth()

  useEffect(() => {
    clientRef.current = createClient()
    return () => {
      ;(async () => {
        try {
          await clientRef.current?.unpublish().catch(() => {})
          await clientRef.current?.leave().catch(() => {})
        } finally {
          tracksRef.current.cam?.stop()
          tracksRef.current.cam?.close()
          tracksRef.current.mic?.stop()
          tracksRef.current.mic?.close()
        }
      })()
    }
  }, [])

  const startStream = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!streamTitle.trim()) {
      setErr('Stream title is required')
      return
    }

    try {
      setErr(null)
      setShowSetup(false)

      const client = clientRef.current!
      await client.setClientRole('host')

      // Fetch token for publisher role (host)
      const tokenData = await fetchToken(channel, 'publisher')
      await client.join(APP_ID, channel, tokenData.token, null)

      const [mic, cam] = await AgoraRTC.createMicrophoneAndCameraTracks()
      tracksRef.current.mic = mic
      tracksRef.current.cam = cam
      if (localRef.current) cam.play(localRef.current)
      await client.publish([mic, cam])
      setPublishing(true)
      setIsHost(true)
    } catch (e: any) {
      console.error(e)
      setErr(e?.message || String(e))
      setShowSetup(true)
    }
  }

  const stop = async () => {
    try {
      const client = clientRef.current!
      await client.unpublish().catch(() => {})
      await client.leave().catch(() => {})
    } finally {
      tracksRef.current.cam?.stop()
      tracksRef.current.cam?.close()
      tracksRef.current.cam = undefined
      tracksRef.current.mic?.stop()
      tracksRef.current.mic?.close()
      tracksRef.current.mic = undefined
      setPublishing(false)
      setIsHost(false)
    }
  }

  if (!currentUser) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center'>
        <div className='text-center'>
          <div className='w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4'>
            <span className='text-2xl'>🔐</span>
          </div>
          <h2 className='text-2xl font-bold text-white mb-2'>
            Authentication Required
          </h2>
          <p className='text-slate-300 mb-6'>
            Please sign in to access the livestream
          </p>
          <a
            href='/auth'
            className='bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors'
          >
            Sign In
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800'>
      <div className='max-w-7xl mx-auto p-6'>
        <div className='mb-6'>
          <h1 className='text-3xl font-bold text-white mb-2'>
            Go Live - CoralCrave Auctions
          </h1>
          <p className='text-slate-300'>
            Welcome back, {userProfile?.username || currentUser.email}!
          </p>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-4 gap-6'>
          {/* Main Stream Area */}
          <div className='lg:col-span-3 space-y-4'>
            <div className='bg-slate-800 rounded-lg p-6'>
              <div className='flex justify-between items-center mb-4'>
                <div>
                  <h2 className='text-2xl font-bold text-white'>Live Stream</h2>
                  <p className='text-slate-300'>
                    Channel:{' '}
                    <code className='bg-slate-700 px-2 py-1 rounded'>
                      {channel}
                    </code>
                  </p>
                  <p className='text-slate-400 text-sm mt-1'>
                    {publishing ? '🔴 You are live!' : '⚫ Ready to go live'}
                  </p>
                </div>
                <div className='flex space-x-3'>
                  {!publishing ? (
                    <button
                      onClick={() => setShowSetup(true)}
                      className='px-8 py-4 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-lg transition-all transform hover:scale-105 shadow-lg'
                    >
                      🚀 GO LIVE
                    </button>
                  ) : (
                    <button
                      onClick={stop}
                      className='px-8 py-4 rounded-lg bg-gray-600 hover:bg-gray-700 text-white font-bold text-lg transition-all shadow-lg'
                    >
                      ⏹️ END STREAM
                    </button>
                  )}
                </div>
              </div>

              {err && (
                <div className='mb-4 p-4 bg-red-900/50 border border-red-700 rounded-lg'>
                  <p className='text-red-300 font-semibold'>Stream Error:</p>
                  <p className='text-red-200 mt-1'>{err}</p>
                </div>
              )}

              <div className='relative'>
                <div
                  ref={localRef}
                  className='w-full h-[500px] bg-black rounded-lg overflow-hidden shadow-2xl'
                />
                {!publishing && (
                  <div className='absolute inset-0 flex items-center justify-center bg-black/70 rounded-lg'>
                    <div className='text-center'>
                      <div className='w-20 h-20 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg'>
                        <span className='text-4xl'>📹</span>
                      </div>
                      <h3 className='text-2xl font-bold text-white mb-2'>
                        Ready to Go Live?
                      </h3>
                      <p className='text-slate-300 text-lg mb-6'>
                        Click "GO LIVE" to start your auction stream
                      </p>
                      <div className='flex items-center justify-center space-x-4 text-slate-400'>
                        <div className='flex items-center space-x-2'>
                          <span className='w-3 h-3 bg-green-500 rounded-full'></span>
                          <span>HD Video</span>
                        </div>
                        <div className='flex items-center space-x-2'>
                          <span className='w-3 h-3 bg-blue-500 rounded-full'></span>
                          <span>Live Chat</span>
                        </div>
                        <div className='flex items-center space-x-2'>
                          <span className='w-3 h-3 bg-purple-500 rounded-full'></span>
                          <span>Real-time Auctions</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {publishing && (
                  <div className='absolute top-4 left-4 bg-red-600 text-white px-4 py-2 rounded-full text-sm font-bold animate-pulse shadow-lg'>
                    🔴 LIVE - Broadcasting
                  </div>
                )}
              </div>

              {publishing && (
                <div className='mt-4 p-4 bg-green-900/30 border border-green-700 rounded-lg'>
                  <div className='flex items-center space-x-3'>
                    <div className='w-3 h-3 bg-green-500 rounded-full animate-pulse'></div>
                    <div>
                      <p className='text-green-300 font-semibold'>
                        Stream Active
                      </p>
                      <p className='text-green-200 text-sm'>
                        Your auction stream is live and viewers can join!
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className='lg:col-span-1 space-y-4'>
            {/* Auction Panel */}
            <AuctionPanel
              roomId={channel}
              isHost={isHost}
              className='h-[450px]'
            />

            {/* Live Chat */}
            <LiveChat roomId={channel} className='h-[350px]' />

            {/* Stream Stats */}
            {publishing && (
              <div className='bg-slate-800 rounded-lg p-4'>
                <h3 className='text-white font-semibold mb-3'>Stream Stats</h3>
                <div className='space-y-2 text-sm'>
                  <div className='flex justify-between'>
                    <span className='text-slate-400'>Status:</span>
                    <span className='text-green-400 font-semibold'>Active</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-slate-400'>Channel:</span>
                    <span className='text-cyan-400'>{channel}</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-slate-400'>Quality:</span>
                    <span className='text-green-400'>HD</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stream Setup Modal */}
        {showSetup && !publishing && (
          <div className='fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4'>
            <div className='bg-slate-800 rounded-lg p-6 w-full max-w-md'>
              <h3 className='text-xl font-bold text-white mb-4'>
                Set Up Your Stream
              </h3>

              <form onSubmit={startStream} className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-slate-300 mb-2'>
                    Stream Title *
                  </label>
                  <input
                    type='text'
                    value={streamTitle}
                    onChange={e => setStreamTitle(e.target.value)}
                    placeholder='Enter your stream title...'
                    className='w-full bg-slate-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500'
                    required
                    maxLength={100}
                  />
                  <p className='text-xs text-slate-400 mt-1'>
                    This title will help viewers find your stream
                  </p>
                </div>

                <div>
                  <label className='block text-sm font-medium text-slate-300 mb-2'>
                    Description (Optional)
                  </label>
                  <textarea
                    value={streamDescription}
                    onChange={e => setStreamDescription(e.target.value)}
                    placeholder='Describe your auction stream...'
                    className='w-full bg-slate-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 h-20 resize-none'
                    maxLength={500}
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-slate-300 mb-2'>
                    Category
                  </label>
                  <select
                    value={streamCategory}
                    onChange={e => setStreamCategory(e.target.value)}
                    className='w-full bg-slate-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500'
                  >
                    <option value='General'>General</option>
                    <option value='Art'>Art</option>
                    <option value='Collectibles'>Collectibles</option>
                    <option value='Electronics'>Electronics</option>
                    <option value='Fashion'>Fashion</option>
                    <option value='Home'>Home & Garden</option>
                    <option value='Sports'>Sports</option>
                    <option value='Vehicles'>Vehicles</option>
                  </select>
                </div>

                <div className='flex space-x-3 pt-4'>
                  <button
                    type='button'
                    onClick={() => setShowSetup(false)}
                    className='flex-1 bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded font-semibold transition-colors'
                  >
                    Cancel
                  </button>
                  <button
                    type='submit'
                    disabled={!streamTitle.trim()}
                    className='flex-1 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 text-white px-4 py-2 rounded font-semibold transition-colors disabled:cursor-not-allowed'
                  >
                    🚀 Start Streaming
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!publishing && !showSetup && (
          <div className='mt-8 bg-slate-800 rounded-lg p-6'>
            <h3 className='text-xl font-bold text-white mb-4'>
              How to Start Your Auction Stream
            </h3>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
              <div className='text-center'>
                <div className='w-12 h-12 bg-cyan-600 rounded-full flex items-center justify-center mx-auto mb-3'>
                  <span className='text-xl'>1️⃣</span>
                </div>
                <h4 className='text-white font-semibold mb-2'>Go Live</h4>
                <p className='text-slate-300 text-sm'>
                  Click the "GO LIVE" button to start your video stream
                </p>
              </div>
              <div className='text-center'>
                <div className='w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-3'>
                  <span className='text-xl'>2️⃣</span>
                </div>
                <h4 className='text-white font-semibold mb-2'>
                  Create Auctions
                </h4>
                <p className='text-slate-300 text-sm'>
                  Use the auction panel to create and manage live auctions
                </p>
              </div>
              <div className='text-center'>
                <div className='w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-3'>
                  <span className='text-xl'>3️⃣</span>
                </div>
                <h4 className='text-white font-semibold mb-2'>
                  Engage Viewers
                </h4>
                <p className='text-slate-300 text-sm'>
                  Chat with viewers and manage bids in real-time
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
