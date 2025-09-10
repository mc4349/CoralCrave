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

function getRoom(defaultName = 'test') {
  const u = new URL(window.location.href)
  return u.searchParams.get('room') || defaultName
}

export default function Live() {
  const channel = getRoom()
  const clientRef = useRef<IAgoraRTCClient | null>(null)
  const videoRef = useRef<HTMLDivElement>(null)
  const [isConnecting, setIsConnecting] = useState(true)
  const [videoReady, setVideoReady] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [viewerCount, setViewerCount] = useState(0)
  const joinTimerRef = useRef<number | null>(null)

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
    }

    const onUserJoined = () => {
      setViewerCount(client.remoteUsers.length)
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
        const { token } = await fetchToken(channel, 'subscriber')
        await client.join(APP_ID, channel, token || null, null)

        // Subscribe to already-published users
        for (const u of client.remoteUsers) {
          if (u.hasVideo && u.videoTrack && videoRef.current) {
            await client.subscribe(u, 'video')
            u.videoTrack.play(videoRef.current)
            setVideoReady(true)
            setIsConnecting(false)
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

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-6'>
      <div className='max-w-7xl mx-auto'>
        <div className='grid grid-cols-1 lg:grid-cols-4 gap-6'>
          {/* Main Stream Area */}
          <div className='lg:col-span-3 space-y-4'>
            <div className='bg-slate-800 rounded-lg p-6'>
              <div className='flex justify-between items-center mb-4'>
                <div>
                  <h1 className='text-2xl font-bold text-white'>Live Stream</h1>
                  <p className='text-slate-300'>
                    Channel:{' '}
                    <code className='bg-slate-700 px-2 py-1 rounded'>
                      {channel}
                    </code>
                  </p>
                </div>
                <div className='flex items-center space-x-4'>
                  <div className='flex items-center space-x-2 text-slate-300'>
                    <span className='w-2 h-2 bg-red-500 rounded-full animate-pulse'></span>
                    <span className='text-sm'>LIVE</span>
                  </div>
                  <div className='flex items-center space-x-2 text-slate-300'>
                    <span className='text-lg'>👁️</span>
                    <span className='text-sm'>{viewerCount + 1} watching</span>
                  </div>
                </div>
              </div>

              {err && (
                <div className='mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg'>
                  <p className='text-red-300'>Error: {err}</p>
                </div>
              )}

              <div className='relative'>
                <div
                  ref={videoRef}
                  className='w-full h-[480px] bg-black rounded-lg overflow-hidden'
                />
                {isConnecting && !videoReady && (
                  <div className='absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg'>
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
                  <div className='absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg'>
                    <div className='text-center'>
                      <div className='w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4'>
                        <span className='text-2xl'>⏳</span>
                      </div>
                      <p className='text-white text-lg'>
                        Waiting for stream to start
                      </p>
                      <p className='text-slate-300 text-sm mt-2'>
                        The streamer hasn't gone live yet
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className='lg:col-span-1 space-y-4'>
            {/* Auction Panel */}
            <AuctionPanel
              roomId={channel}
              isHost={false}
              className='h-[400px]'
            />

            {/* Live Chat */}
            <LiveChat roomId={channel} className='h-[400px]' />
          </div>
        </div>
      </div>
    </div>
  )
}
