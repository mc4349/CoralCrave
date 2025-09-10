import { useEffect, useRef, useState } from 'react'
import type {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  IRemoteVideoTrack,
  IRemoteAudioTrack,
} from 'agora-rtc-sdk-ng'

import { APP_ID, createClient, fetchToken } from '../agora/client'
import LiveChat from '../components/LiveChat'
import AuctionPanel from '../components/AuctionPanel'
import { useAuth } from '../contexts/AuthContext'

function getRoom(defaultName = 'main') {
  const u = new URL(window.location.href)
  return u.searchParams.get('room') || defaultName
}

export default function LiveViewer() {
  const channel = getRoom()
  const clientRef = useRef<IAgoraRTCClient | null>(null)
  const videoRef = useRef<HTMLDivElement>(null)
  const [isConnecting, setIsConnecting] = useState(true)
  const [videoReady, setVideoReady] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [viewerCount, setViewerCount] = useState(0)
  const [streamInfo, setStreamInfo] = useState<{
    hostName?: string
    isLive: boolean
  }>({ isLive: false })
  const joinTimerRef = useRef<number | null>(null)
  const { currentUser, userProfile } = useAuth()

  useEffect(() => {
    const client = createClient()
    clientRef.current = client

    const onUserPublished = async (
      user: IAgoraRTCRemoteUser,
      type: 'video' | 'audio'
    ) => {
      try {
        await client.subscribe(user, type)
        if (type === 'video' && user.videoTrack && videoRef.current) {
          ;(user.videoTrack as IRemoteVideoTrack).play(videoRef.current)
          setVideoReady(true)
          setIsConnecting(false)
          setStreamInfo(prev => ({ ...prev, isLive: true }))
        }
        if (type === 'audio' && user.audioTrack)
          (user.audioTrack as IRemoteAudioTrack).play()
      } catch (e: any) {
        console.error(e)
        setErr(e?.message || String(e))
      }
    }

    const onUserUnpublished = () => {
      setVideoReady(false)
      setIsConnecting(true)
      setStreamInfo(prev => ({ ...prev, isLive: false }))
    }

    const onUserJoined = (user: IAgoraRTCRemoteUser) => {
      setViewerCount(client.remoteUsers.length)
      // Assume the first user is the host
      if (client.remoteUsers.length === 1) {
        setStreamInfo(prev => ({ ...prev, hostName: `User ${user.uid}` }))
      }
    }

    const onUserLeft = () => {
      setViewerCount(client.remoteUsers.length)
    }

    client.on('user-published', onUserPublished)
    client.on('user-unpublished', onUserUnpublished)
    client.on('user-joined', onUserJoined)
    client.on('user-left', onUserLeft)
    ;(async () => {
      try {
        setErr(null)
        await client.setClientRole('audience')

        // Fetch token for audience role
        const tokenData = await fetchToken(channel, 'audience')
        await client.join(APP_ID, channel, tokenData.token, null)

        // Subscribe to already-published users
        for (const u of client.remoteUsers) {
          if (u.hasVideo && u.videoTrack && videoRef.current) {
            await client.subscribe(u, 'video')
            u.videoTrack.play(videoRef.current)
            setVideoReady(true)
            setIsConnecting(false)
            setStreamInfo(prev => ({ ...prev, isLive: true }))
          }
          if (u.hasAudio && u.audioTrack) u.audioTrack.play()
        }

        setViewerCount(client.remoteUsers.length)

        // Safety: hide overlay after 4s even if events are slow (but video should show)
        if (joinTimerRef.current) window.clearTimeout(joinTimerRef.current)
        joinTimerRef.current = window.setTimeout(() => {
          if (isConnecting && !videoReady) setIsConnecting(false)
        }, 4000)
      } catch (e: any) {
        console.error(e)
        setErr(e?.message || String(e))
        setIsConnecting(false)
      }
    })()

    return () => {
      client.off('user-published', onUserPublished)
      client.off('user-unpublished', onUserUnpublished)
      client.off('user-joined', onUserJoined)
      client.off('user-left', onUserLeft)
      ;(async () => {
        try {
          await clientRef.current?.leave()
        } catch {}
      })()
      if (joinTimerRef.current) window.clearTimeout(joinTimerRef.current)
      joinTimerRef.current = null
    }
  }, [channel])

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
            Please sign in to watch the livestream
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
            Live Auction Stream
          </h1>
          <p className='text-slate-300'>
            Welcome, {userProfile?.username || currentUser.email}!
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
                  {streamInfo.hostName && (
                    <p className='text-slate-400 text-sm mt-1'>
                      Hosted by:{' '}
                      <span className='text-cyan-400'>
                        {streamInfo.hostName}
                      </span>
                    </p>
                  )}
                </div>
                <div className='flex items-center space-x-4'>
                  <div className='flex items-center space-x-2 text-slate-300'>
                    {streamInfo.isLive ? (
                      <>
                        <span className='w-2 h-2 bg-red-500 rounded-full animate-pulse'></span>
                        <span className='text-sm font-semibold text-red-400'>
                          LIVE
                        </span>
                      </>
                    ) : (
                      <>
                        <span className='w-2 h-2 bg-gray-500 rounded-full'></span>
                        <span className='text-sm'>Waiting for stream</span>
                      </>
                    )}
                  </div>
                  <div className='flex items-center space-x-2 text-slate-300'>
                    <span className='text-lg'>👁️</span>
                    <span className='text-sm'>{viewerCount + 1} watching</span>
                  </div>
                </div>
              </div>

              {err && (
                <div className='mb-4 p-4 bg-red-900/50 border border-red-700 rounded-lg'>
                  <p className='text-red-300 font-semibold'>
                    Connection Error:
                  </p>
                  <p className='text-red-200 mt-1'>{err}</p>
                </div>
              )}

              <div className='relative'>
                <div
                  ref={videoRef}
                  className='w-full h-[500px] bg-black rounded-lg overflow-hidden shadow-2xl'
                />
                {isConnecting && !videoReady && (
                  <div className='absolute inset-0 flex items-center justify-center bg-black/70 rounded-lg'>
                    <div className='text-center'>
                      <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4'></div>
                      <p className='text-white text-lg'>
                        Connecting to stream...
                      </p>
                      <p className='text-slate-300 text-sm mt-2'>
                        Please wait while we establish the connection
                      </p>
                    </div>
                  </div>
                )}
                {!isConnecting && !videoReady && (
                  <div className='absolute inset-0 flex items-center justify-center bg-black/70 rounded-lg'>
                    <div className='text-center'>
                      <div className='w-20 h-20 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg'>
                        <span className='text-4xl'>⏳</span>
                      </div>
                      <h3 className='text-2xl font-bold text-white mb-2'>
                        Waiting for Stream
                      </h3>
                      <p className='text-slate-300 text-lg mb-6'>
                        The auction stream hasn't started yet
                      </p>
                      <div className='space-y-2 text-slate-400'>
                        <p className='text-sm'>
                          • Make sure you're in the correct room
                        </p>
                        <p className='text-sm'>
                          • The streamer needs to click "Go Live"
                        </p>
                        <p className='text-sm'>
                          • Try refreshing the page if the stream doesn't appear
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {streamInfo.isLive && (
                <div className='mt-4 p-4 bg-green-900/30 border border-green-700 rounded-lg'>
                  <div className='flex items-center space-x-3'>
                    <div className='w-3 h-3 bg-green-500 rounded-full animate-pulse'></div>
                    <div>
                      <p className='text-green-300 font-semibold'>
                        Stream Active
                      </p>
                      <p className='text-green-200 text-sm'>
                        Enjoy the live auction!
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
              isHost={false}
              className='h-[450px]'
            />

            {/* Live Chat */}
            <LiveChat roomId={channel} className='h-[350px]' />

            {/* Stream Info */}
            <div className='bg-slate-800 rounded-lg p-4'>
              <h3 className='text-white font-semibold mb-3'>Stream Info</h3>
              <div className='space-y-2 text-sm'>
                <div className='flex justify-between'>
                  <span className='text-slate-400'>Channel:</span>
                  <span className='text-cyan-400'>{channel}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-slate-400'>Viewers:</span>
                  <span className='text-green-400'>{viewerCount + 1}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-slate-400'>Status:</span>
                  <span
                    className={
                      streamInfo.isLive ? 'text-green-400' : 'text-yellow-400'
                    }
                  >
                    {streamInfo.isLive ? 'Live' : 'Waiting'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className='mt-8 bg-slate-800 rounded-lg p-6'>
          <h3 className='text-xl font-bold text-white mb-4'>
            How to Participate
          </h3>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            <div className='text-center'>
              <div className='w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3'>
                <span className='text-xl'>💬</span>
              </div>
              <h4 className='text-white font-semibold mb-2'>Chat</h4>
              <p className='text-slate-300 text-sm'>
                Join the conversation with other viewers
              </p>
            </div>
            <div className='text-center'>
              <div className='w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-3'>
                <span className='text-xl'>💰</span>
              </div>
              <h4 className='text-white font-semibold mb-2'>Bid</h4>
              <p className='text-slate-300 text-sm'>
                Place bids on live auction items
              </p>
            </div>
            <div className='text-center'>
              <div className='w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-3'>
                <span className='text-xl'>🛒</span>
              </div>
              <h4 className='text-white font-semibold mb-2'>Win</h4>
              <p className='text-slate-300 text-sm'>
                Won items go to your cart automatically
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
