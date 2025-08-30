import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { 
  createAgoraClient, 
  createLocalTracks, 
  generateChannelName, 
  generateUID,
  getAgoraToken,
  agoraConfig,
  type IAgoraRTCClient,
  type ICameraVideoTrack,
  type IMicrophoneAudioTrack,
  type IRemoteVideoTrack,
  type IRemoteAudioTrack
} from '../lib/agora'
import { useAuth } from './AuthContext'
import { doc, updateDoc, onSnapshot, serverTimestamp, getDoc, Timestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { livestreamService } from '../services/livestreamService'

interface LiveStream {
  id: string
  hostId: string
  hostUsername: string
  title: string
  status: 'offline' | 'live' | 'ended'
  viewerCount: number
  startedAt?: Date
  endedAt?: Date
  categories: string[]
  agora: {
    channel: string
    broadcasterUid: string
  }
}

interface StreamingContextType {
  // Current stream state
  currentStream: LiveStream | null
  isStreaming: boolean
  isViewing: boolean
  
  // Agora client and tracks
  client: IAgoraRTCClient | null
  localVideoTrack: ICameraVideoTrack | null
  localAudioTrack: IMicrophoneAudioTrack | null
  remoteVideoTracks: Map<string, IRemoteVideoTrack>
  remoteAudioTracks: Map<string, IRemoteAudioTrack>
  
  // Stream controls
  startStream: (title: string, categories: string[]) => Promise<void>
  stopStream: () => Promise<void>
  joinStream: (streamId: string) => Promise<void>
  leaveStream: () => Promise<void>
  initializePreview: () => Promise<void>
  
  // Media controls
  toggleMicrophone: () => Promise<void>
  toggleCamera: () => Promise<void>
  switchCamera: () => Promise<void>
  isMicrophoneEnabled: boolean
  isCameraEnabled: boolean
  
  // Stream info
  viewerCount: number
  streamDuration: number
  error: string | null
  loading: boolean
}

const StreamingContext = createContext<StreamingContextType | undefined>(undefined)

export function useStreaming() {
  const context = useContext(StreamingContext)
  if (context === undefined) {
    throw new Error('useStreaming must be used within a StreamingProvider')
  }
  return context
}

export function StreamingProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, userProfile } = useAuth()
  
  // State
  const [currentStream, setCurrentStream] = useState<LiveStream | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isViewing, setIsViewing] = useState(false)
  const [viewerCount, setViewerCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  
  // Media state
  const [isMicrophoneEnabled, setIsMicrophoneEnabled] = useState(true)
  const [isCameraEnabled, setIsCameraEnabled] = useState(true)
  
  // Agora refs
  const clientRef = useRef<IAgoraRTCClient | null>(null)
  const localVideoTrackRef = useRef<ICameraVideoTrack | null>(null)
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null)
  const remoteVideoTracksRef = useRef<Map<string, IRemoteVideoTrack>>(new Map())
  const remoteAudioTracksRef = useRef<Map<string, IRemoteAudioTrack>>(new Map())
  
  // Force re-render function for video tracks
  const [trackUpdateCounter, setTrackUpdateCounter] = useState(0)
  const triggerRerender = useCallback(() => {
    setTrackUpdateCounter(prev => prev + 1)
  }, [])
  
  // Stream timer state
  const [streamDuration, setStreamDuration] = useState(0)
  const streamTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Stream listener cleanup
  const streamUnsubscribeRef = useRef<(() => void) | null>(null)

  // Initialize video preview (for Go Live page)
  const initializePreview = async () => {
    try {
      if (localVideoTrackRef.current) {
        console.log('📹 Video preview already initialized')
        return
      }

      console.log('🎥 Initializing video preview...')
      setLoading(true)
      setError(null)
      
      const tracks = await createLocalTracks()
      
      localAudioTrackRef.current = tracks.audioTrack
      localVideoTrackRef.current = tracks.videoTrack
      
      console.log('✅ Video preview initialized successfully')
    } catch (error: any) {
      console.error('❌ Failed to initialize video preview:', error)
      setError(`Failed to access camera/microphone: ${error.message}`)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const startStream = async (title: string, categories: string[]) => {
    try {
      setLoading(true)
      setError(null)
      console.log('🚀 Starting stream process...')

      // Validate Agora App ID first
      if (!agoraConfig.appId) {
        throw new Error('Agora App ID is not configured. Please check your environment variables.')
      }

      if (!currentUser) {
        throw new Error('You must be signed in to start streaming')
      }

      // Generate consistent stream ID and channel
      const streamId = `${currentUser.uid}_${Date.now()}`
      const channelName = generateChannelName(streamId)
      const uid = generateUID()

      console.log('📋 Stream details:', { streamId, uid, channelName, appId: agoraConfig.appId })

      // Step 1: Create Agora client FIRST and set role
      console.log('🔧 Creating Agora client...')
      const client = createAgoraClient()
      clientRef.current = client

      // Step 2: Set client role to host BEFORE creating tracks - CRITICAL FIX
      console.log('👑 Setting client role to host...')
      try {
        await client.setClientRole('host')
        console.log('✅ Client role set successfully')
      } catch (roleError: any) {
        console.error('❌ Failed to set client role:', roleError)
        throw new Error(`Failed to set broadcaster role: ${roleError.message}`)
      }

      // Step 3: CRITICAL FIX - Create fresh tracks for streaming (not preview tracks)
      console.log('🎥 Creating fresh local tracks for streaming...')
      
      // Clean up any existing tracks first
      if (localAudioTrackRef.current) {
        try {
          localAudioTrackRef.current.close()
        } catch (e) { console.warn('Error closing existing audio track:', e) }
        localAudioTrackRef.current = null
      }
      if (localVideoTrackRef.current) {
        try {
          localVideoTrackRef.current.close()
        } catch (e) { console.warn('Error closing existing video track:', e) }
        localVideoTrackRef.current = null
      }

      let audioTrack: IMicrophoneAudioTrack
      let videoTrack: ICameraVideoTrack
      
      try {
        const trackPromise = createLocalTracks()
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Track creation timed out after 30 seconds')), 30000)
        })
        
        const tracks = await Promise.race([trackPromise, timeoutPromise]) as { audioTrack: IMicrophoneAudioTrack, videoTrack: ICameraVideoTrack }
        audioTrack = tracks.audioTrack
        videoTrack = tracks.videoTrack
        console.log('✅ Fresh local tracks created successfully')
        console.log('🎤 Audio track:', audioTrack.getTrackLabel())
        console.log('📹 Video track:', videoTrack.getTrackLabel())
      } catch (trackError: any) {
        console.error('❌ Failed to create local tracks:', trackError)
        
        let errorMessage = 'Failed to access camera and microphone'
        if (trackError.message.includes('Permission denied') || trackError.message.includes('NotAllowedError')) {
          errorMessage = 'Camera and microphone permissions were denied. Please allow access and try again.'
        } else if (trackError.message.includes('NotFoundError') || trackError.message.includes('No device found')) {
          errorMessage = 'No camera or microphone found. Please connect your devices and try again.'
        } else if (trackError.message.includes('NotReadableError') || trackError.message.includes('in use')) {
          errorMessage = 'Camera or microphone is already in use. Please close other applications and try again.'
        } else if (trackError.message.includes('timeout')) {
          errorMessage = 'Track creation timed out. Please refresh the page and try again.'
        }
        
        throw new Error(errorMessage)
      }

      // Store tracks in refs
      localAudioTrackRef.current = audioTrack
      localVideoTrackRef.current = videoTrack

      // Step 4: CRITICAL FIX - Ensure tracks are fully ready and enabled
      console.log('⏳ Ensuring tracks are fully ready...')
      
      // Wait for tracks to be fully initialized
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Verify and enable tracks
      if (!audioTrack.enabled) {
        console.log('🎤 Enabling audio track...')
        await audioTrack.setEnabled(true)
      }
      if (!videoTrack.enabled) {
        console.log('📹 Enabling video track...')
        await videoTrack.setEnabled(true)
      }
      
      // Verify tracks are actually working
      console.log('🔍 Track status verification:')
      console.log('🎤 Audio enabled:', audioTrack.enabled, 'Label:', audioTrack.getTrackLabel())
      console.log('📹 Video enabled:', videoTrack.enabled, 'Label:', videoTrack.getTrackLabel())

      // Step 5: Get Agora token for host
      console.log('🔑 Getting Agora token for host...')
      let token: string
      try {
        token = await getAgoraToken(channelName, uid.toString(), 'publisher')
        console.log('✅ Agora token received successfully')
      } catch (tokenError: any) {
        console.error('❌ Failed to get Agora token:', tokenError)
        throw new Error(`Failed to get streaming token: ${tokenError.message}`)
      }

      // Step 6: Join channel with token
      console.log('🌐 Joining Agora channel with token...')
      try {
        await client.join(agoraConfig.appId, channelName, token, uid)
        console.log('✅ Successfully joined Agora channel')
      } catch (joinError: any) {
        console.error('❌ Failed to join Agora channel:', joinError)
        throw new Error(`Failed to join streaming channel: ${joinError.message}`)
      }

      // Step 7: CRITICAL FIX - Publish tracks with enhanced retry logic and verification
      console.log('📡 Publishing tracks with retry logic...')
      let publishAttempts = 0
      const maxPublishAttempts = 5
      let publishSuccess = false

      while (publishAttempts < maxPublishAttempts && !publishSuccess) {
        try {
          publishAttempts++
          console.log(`📡 Publish attempt ${publishAttempts}/${maxPublishAttempts}...`)
          
          // Additional wait before each attempt
          if (publishAttempts > 1) {
            await new Promise(resolve => setTimeout(resolve, 2000))
          }
          
          // Verify tracks are still valid before publishing
          if (!audioTrack.enabled || !videoTrack.enabled) {
            console.log('🔧 Re-enabling tracks before publish...')
            await audioTrack.setEnabled(true)
            await videoTrack.setEnabled(true)
          }
          
          // Attempt to publish
          await client.publish([audioTrack, videoTrack])
          
          // Verify publish was successful
          await new Promise(resolve => setTimeout(resolve, 1000))
          const publishedTracks = client.localTracks
          const audioPublished = publishedTracks.some(track => track.trackMediaType === 'audio')
          const videoPublished = publishedTracks.some(track => track.trackMediaType === 'video')
          
          console.log('📊 Publish verification:', {
            audioPublished,
            videoPublished,
            totalTracks: publishedTracks.length,
            attempt: publishAttempts
          })
          
          if (audioPublished && videoPublished) {
            publishSuccess = true
            console.log('✅ Tracks published and verified successfully!')
          } else {
            throw new Error('Tracks published but verification failed')
          }
          
        } catch (publishError: any) {
          console.error(`❌ Publish attempt ${publishAttempts} failed:`, publishError)
          
          if (publishAttempts >= maxPublishAttempts) {
            throw new Error(`Failed to publish tracks after ${maxPublishAttempts} attempts: ${publishError.message}`)
          }
          
          // Wait before retry
          console.log(`⏳ Waiting before retry attempt ${publishAttempts + 1}...`)
        }
      }

      if (!publishSuccess) {
        throw new Error('Failed to publish tracks - all retry attempts exhausted')
      }

      // Step 8: Create stream document with CONSISTENT channel name
      console.log('💾 Saving stream to Firestore...')
      
      const createdStreamId = await livestreamService.createLivestream({
        hostId: currentUser.uid,
        hostUsername: userProfile?.username || currentUser.email || 'Unknown User',
        title,
        status: 'live',
        viewerCount: 0,
        categories,
        agora: {
          channel: channelName,
          broadcasterUid: uid.toString()
        },
        startedAt: serverTimestamp() as Timestamp
      })
      
      console.log('✅ Stream created successfully:', createdStreamId)
      
      // Step 9: Set up stream state
      const streamData: LiveStream = {
        id: createdStreamId,
        hostId: currentUser.uid,
        hostUsername: userProfile?.username || currentUser.email || 'Unknown User',
        title,
        status: 'live',
        viewerCount: 0,
        startedAt: new Date(),
        categories,
        agora: {
          channel: channelName,
          broadcasterUid: uid.toString()
        }
      }

      setCurrentStream(streamData)
      setIsStreaming(true)
      
      // Start stream timer
      setStreamDuration(0)
      streamTimerRef.current = setInterval(() => {
        setStreamDuration(prev => prev + 1)
      }, 1000)

      // Step 10: Set up viewer count listener
      try {
        const unsubscribe = onSnapshot(doc(db, 'livestreams', createdStreamId), (doc) => {
          if (doc.exists()) {
            const data = doc.data() as LiveStream
            setViewerCount(data.viewerCount || 0)
          }
        }, (error) => {
          console.warn('Error listening to stream updates (offline mode):', error)
        })
        streamUnsubscribeRef.current = unsubscribe
      } catch (listenerError) {
        console.warn('Stream listener unavailable (offline mode):', listenerError)
      }

      console.log('🎉 Stream started successfully with video publishing!')

    } catch (error: any) {
      console.error('💥 Stream start failed:', error)
      
      // Clean up any partial state
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.close()
        localAudioTrackRef.current = null
      }
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.close()
        localVideoTrackRef.current = null
      }
      if (clientRef.current) {
        try {
          await clientRef.current.leave()
        } catch (leaveError) {
          console.warn('Error during cleanup:', leaveError)
        }
        clientRef.current = null
      }
      
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const stopStream = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('🛑 Stopping stream process...')

      // Step 1: Update stream status in Firestore
      if (currentStream) {
        try {
          console.log('💾 Updating stream status in Firestore...')
          
          const firestoreTimeout = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Firestore operation timed out')), 5000)
          })
          
          const firestoreOperation = updateDoc(doc(db, 'livestreams', currentStream.id), {
            status: 'ended',
            endedAt: serverTimestamp()
          })
          
          await Promise.race([firestoreOperation, firestoreTimeout])
          console.log('✅ Stream status updated in Firestore successfully')
        } catch (firestoreError: any) {
          console.warn('⚠️ Firestore unavailable, continuing with offline stream ending:', firestoreError.message)
        }
      }

      // Step 2: Clean up Agora resources
      console.log('🧹 Cleaning up Agora resources...')
      
      if (localAudioTrackRef.current) {
        try {
          localAudioTrackRef.current.close()
          localAudioTrackRef.current = null
          console.log('✅ Audio track closed successfully')
        } catch (audioError) {
          console.warn('⚠️ Error closing audio track:', audioError)
        }
      }
      
      if (localVideoTrackRef.current) {
        try {
          localVideoTrackRef.current.close()
          localVideoTrackRef.current = null
          console.log('✅ Video track closed successfully')
        } catch (videoError) {
          console.warn('⚠️ Error closing video track:', videoError)
        }
      }

      // Step 3: Leave Agora channel
      if (clientRef.current) {
        try {
          console.log('🚪 Leaving Agora channel...')
          await clientRef.current.leave()
          clientRef.current = null
          console.log('✅ Successfully left Agora channel')
        } catch (leaveError) {
          console.warn('⚠️ Error leaving Agora channel:', leaveError)
        }
      }

      // Step 4: Clean up listeners
      if (streamUnsubscribeRef.current) {
        try {
          streamUnsubscribeRef.current()
          streamUnsubscribeRef.current = null
          console.log('✅ Stream listeners cleaned up successfully')
        } catch (listenerError) {
          console.warn('⚠️ Error cleaning up listeners:', listenerError)
        }
      }

      // Step 5: Stop timer and reset state
      if (streamTimerRef.current) {
        clearInterval(streamTimerRef.current)
        streamTimerRef.current = null
      }
      setStreamDuration(0)
      setCurrentStream(null)
      setIsStreaming(false)
      setViewerCount(0)

      console.log('🎉 Stream stopped successfully!')

    } catch (error: any) {
      console.error('💥 Stream stop failed:', error)
      setError('Failed to stop stream: ' + error.message)
      
      // Force cleanup even if there were errors
      try {
        if (localAudioTrackRef.current) {
          localAudioTrackRef.current.close()
          localAudioTrackRef.current = null
        }
        if (localVideoTrackRef.current) {
          localVideoTrackRef.current.close()
          localVideoTrackRef.current = null
        }
        if (clientRef.current) {
          await clientRef.current.leave()
          clientRef.current = null
        }
        if (streamUnsubscribeRef.current) {
          streamUnsubscribeRef.current()
          streamUnsubscribeRef.current = null
        }
        setCurrentStream(null)
        setIsStreaming(false)
        setViewerCount(0)
        console.log('🔧 Forced cleanup completed')
      } catch (cleanupError) {
        console.warn('⚠️ Error during forced cleanup:', cleanupError)
      }
    } finally {
      setLoading(false)
    }
  }

  const joinStream = useCallback(async (streamId: string) => {
    try {
      setLoading(true)
      setError(null)
      console.log('🔗 Starting to join stream:', streamId)

      // Get stream info from Firestore
      const streamDoc = await getDoc(doc(db, 'livestreams', streamId))
      
      if (!streamDoc.exists()) {
        throw new Error('Stream not found')
      }

      const streamData = streamDoc.data() as LiveStream
      console.log('📋 Stream data retrieved:', streamData)
      
      if (streamData.status !== 'live') {
        throw new Error('Stream is not live')
      }

      // Set initial stream state BEFORE joining Agora
      setCurrentStream(streamData)
      setViewerCount(streamData.viewerCount || 0)

      // Create Agora client for viewing
      const client = createAgoraClient()
      clientRef.current = client

      // Set client role to audience
      await client.setClientRole('audience')
      console.log('👥 Client role set to audience')

      // Get Agora token for viewer
      const uid = generateUID()
      console.log('🔑 Getting Agora token for viewer...', {
        channel: streamData.agora.channel,
        uid: uid.toString(),
        role: 'audience'
      })
      
      let token: string
      try {
        token = await getAgoraToken(streamData.agora.channel, uid.toString(), 'audience')
        console.log('✅ Agora token received successfully')
      } catch (tokenError: any) {
        console.error('❌ Failed to get Agora token:', tokenError)
        throw new Error(`Failed to get viewer token: ${tokenError.message}`)
      }

      // Join channel with token
      console.log('🌐 Joining Agora channel:', streamData.agora.channel)
      await client.join(agoraConfig.appId, streamData.agora.channel, token, uid)
      console.log('✅ Successfully joined Agora channel')

      // Set viewing state AFTER successful join
      setIsViewing(true)

      // Handle remote users with better error handling
      const handleUserPublished = async (user: any, mediaType: 'video' | 'audio') => {
        try {
          console.log('🎥 Remote user published:', {
            uid: user.uid,
            mediaType,
            hasVideoTrack: !!user.videoTrack,
            hasAudioTrack: !!user.audioTrack
          })
          
          // Subscribe with timeout
          const subscribePromise = client.subscribe(user, mediaType)
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Subscribe timeout')), 10000)
          })
          
          await Promise.race([subscribePromise, timeoutPromise])
          console.log('✅ Successfully subscribed to user media')
          
          if (mediaType === 'video' && user.videoTrack) {
            console.log('📹 Processing remote video track...')
            
            // Clear existing track
            const existingTrack = remoteVideoTracksRef.current.get(user.uid.toString())
            if (existingTrack) {
              console.log('🧹 Clearing existing video track')
              try {
                if (existingTrack.stop) existingTrack.stop()
              } catch (e) { console.warn('Error stopping track:', e) }
              remoteVideoTracksRef.current.delete(user.uid.toString())
            }
            
            // Store new track
            remoteVideoTracksRef.current.set(user.uid.toString(), user.videoTrack)
            console.log('💾 Video track stored, total tracks:', remoteVideoTracksRef.current.size)
            
            // Trigger re-render
            triggerRerender()
            
            console.log('✅ Remote video track processed successfully')
          }
          
          if (mediaType === 'audio' && user.audioTrack) {
            console.log('🔊 Processing remote audio track...')
            
            // Clear existing audio track
            const existingAudioTrack = remoteAudioTracksRef.current.get(user.uid.toString())
            if (existingAudioTrack) {
              try {
                if (existingAudioTrack.stop) existingAudioTrack.stop()
              } catch (e) { console.warn('Error stopping audio:', e) }
              remoteAudioTracksRef.current.delete(user.uid.toString())
            }
            
            remoteAudioTracksRef.current.set(user.uid.toString(), user.audioTrack)
            
            // Play audio
            try {
              await user.audioTrack.play()
              console.log('✅ Remote audio playing')
            } catch (audioError: any) {
              console.error('❌ Audio play failed:', audioError)
              setTimeout(async () => {
                try {
                  await user.audioTrack.play()
                  console.log('✅ Audio retry successful')
                } catch (retryError) {
                  console.error('❌ Audio retry failed:', retryError)
                  setError('Audio connection issue - video continues without sound')
                }
              }, 1000)
            }
          }
          
        } catch (subscribeError: any) {
          console.error('❌ Subscribe error:', subscribeError)
          setError(`Failed to connect to ${mediaType} stream: ${subscribeError.message}`)
        }
      }

      const handleUserUnpublished = (user: any, mediaType: 'video' | 'audio') => {
        console.log('🎥 Remote user unpublished:', user.uid, mediaType)
        
        if (mediaType === 'video') {
          remoteVideoTracksRef.current.delete(user.uid.toString())
          triggerRerender()
        }
        
        if (mediaType === 'audio') {
          remoteAudioTracksRef.current.delete(user.uid.toString())
        }
      }

      // Set up event listeners
      client.on('user-published', handleUserPublished)
      client.on('user-unpublished', handleUserUnpublished)

      client.on('connection-state-change', (curState, revState) => {
        console.log('🔗 Connection state:', revState, '->', curState)
        if (curState === 'DISCONNECTED') {
          setError('Connection lost. Please refresh and try again.')
        }
      })

      client.on('user-joined', (user) => {
        console.log('👤 User joined:', user.uid)
      })

      client.on('user-left', (user) => {
        console.log('👤 User left:', user.uid)
        remoteVideoTracksRef.current.delete(user.uid.toString())
        remoteAudioTracksRef.current.delete(user.uid.toString())
        triggerRerender()
      })

      // Set up stream updates listener
      try {
        const unsubscribe = onSnapshot(
          doc(db, 'livestreams', streamId), 
          (doc) => {
            if (doc.exists()) {
              const data = doc.data() as LiveStream
              console.log('📊 Stream update:', data.viewerCount)
              
              setCurrentStream(data)
              setViewerCount(data.viewerCount || 0)
              
              if (data.status === 'ended') {
                console.log('🛑 Stream ended')
                leaveStream()
              }
            }
          },
          (error) => {
            console.warn('⚠️ Stream listener error:', error)
          }
        )
        streamUnsubscribeRef.current = unsubscribe
      } catch (listenerError) {
        console.warn('⚠️ Could not set up stream listener:', listenerError)
      }

      console.log('🎉 Successfully joined stream as viewer')

    } catch (error: any) {
      console.error('💥 Failed to join stream:', error)
      setError('Failed to join stream: ' + error.message)
      
      // Clean up on error
      if (clientRef.current) {
        try {
          await clientRef.current.leave()
          clientRef.current = null
        } catch (cleanupError) {
          console.warn('Error during cleanup:', cleanupError)
        }
      }
      
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const leaveStream = useCallback(async () => {
    try {
      if (clientRef.current) {
        await clientRef.current.leave()
        clientRef.current = null
      }

      if (streamUnsubscribeRef.current) {
        streamUnsubscribeRef.current()
        streamUnsubscribeRef.current = null
      }

      remoteVideoTracksRef.current.clear()
      remoteAudioTracksRef.current.clear()
      
      // Trigger re-render to clear tracks
      triggerRerender()

      setCurrentStream(null)
      setIsViewing(false)
      setViewerCount(0)

    } catch (error: any) {
      setError('Failed to leave stream: ' + error.message)
    }
  }, [])

  const toggleMicrophone = async () => {
    if (localAudioTrackRef.current) {
      await localAudioTrackRef.current.setEnabled(!isMicrophoneEnabled)
      setIsMicrophoneEnabled(!isMicrophoneEnabled)
    }
  }

  const toggleCamera = async () => {
    if (localVideoTrackRef.current) {
      await localVideoTrackRef.current.setEnabled(!isCameraEnabled)
      setIsCameraEnabled(!isCameraEnabled)
    }
  }

  const switchCamera = async () => {
    if (localVideoTrackRef.current) {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')
      
      if (videoDevices.length > 1) {
        console.log('Camera switching not fully implemented yet')
      }
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isStreaming) {
        stopStream()
      } else if (isViewing) {
        leaveStream()
      }
    }
  }, [])

  const value: StreamingContextType = {
    currentStream,
    isStreaming,
    isViewing,
    client: clientRef.current,
    localVideoTrack: localVideoTrackRef.current,
    localAudioTrack: localAudioTrackRef.current,
    remoteVideoTracks: remoteVideoTracksRef.current,
    remoteAudioTracks: remoteAudioTracksRef.current,
    startStream,
    stopStream,
    joinStream,
    leaveStream,
    initializePreview,
    toggleMicrophone,
    toggleCamera,
    switchCamera,
    isMicrophoneEnabled,
    isCameraEnabled,
    viewerCount,
    streamDuration,
    error,
    loading
  }

  return (
    <StreamingContext.Provider value={value}>
      {children}
    </StreamingContext.Provider>
  )
}
