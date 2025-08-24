import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { 
  createAgoraClient, 
  createLocalTracks, 
  getAgoraToken, 
  generateChannelName, 
  generateUID,
  agoraConfig,
  type IAgoraRTCClient,
  type ICameraVideoTrack,
  type IMicrophoneAudioTrack,
  type IRemoteVideoTrack,
  type IRemoteAudioTrack
} from '../lib/agora'
import { useAuth } from './AuthContext'
import { doc, updateDoc, onSnapshot, serverTimestamp, getDoc } from 'firebase/firestore'
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
  
  // Media controls
  toggleMicrophone: () => Promise<void>
  toggleCamera: () => Promise<void>
  switchCamera: () => Promise<void>
  isMicrophoneEnabled: boolean
  isCameraEnabled: boolean
  
  // Stream info
  viewerCount: number
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
  
  // Stream listener cleanup
  const streamUnsubscribeRef = useRef<(() => void) | null>(null)

  const startStream = async (title: string, categories: string[]) => {
    if (!currentUser || !userProfile) {
      throw new Error('Must be authenticated to start streaming')
    }

    try {
      setLoading(true)
      setError(null)

      // Generate stream ID and channel
      const streamId = `${currentUser.uid}_${Date.now()}`
      const channelName = generateChannelName(streamId)
      const uid = generateUID()

      // Create Agora client
      const client = createAgoraClient()
      clientRef.current = client

      // Get token (optional for development)
      const token = await getAgoraToken(channelName, uid, 'publisher')

      // Create local tracks
      const { audioTrack, videoTrack } = await createLocalTracks()
      localAudioTrackRef.current = audioTrack
      localVideoTrackRef.current = videoTrack

      // Set client role to host
      await client.setClientRole('host')

      // Join channel
      await client.join(agoraConfig.appId, channelName, token, uid)

      // Publish tracks
      await client.publish([audioTrack, videoTrack])

      // Create stream document using livestreamService
      const createdStreamId = await livestreamService.createLivestream({
        hostId: currentUser.uid,
        hostUsername: userProfile.username,
        title,
        status: 'live',
        viewerCount: 0,
        categories,
        agora: {
          channel: channelName,
          broadcasterUid: uid
        }
      })

      const streamData: LiveStream = {
        id: createdStreamId,
        hostId: currentUser.uid,
        hostUsername: userProfile.username,
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

      // Listen for viewer count updates
      const unsubscribe = onSnapshot(doc(db, 'livestreams', streamId), (doc) => {
        if (doc.exists()) {
          const data = doc.data() as LiveStream
          setViewerCount(data.viewerCount || 0)
        }
      })
      streamUnsubscribeRef.current = unsubscribe

    } catch (error: any) {
      setError('Failed to start stream: ' + error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const stopStream = async () => {
    try {
      setLoading(true)

      if (currentStream) {
        // Update stream status in Firestore
        await updateDoc(doc(db, 'livestreams', currentStream.id), {
          status: 'ended',
          endedAt: serverTimestamp()
        })
      }

      // Clean up Agora resources
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

      // Clean up listeners
      if (streamUnsubscribeRef.current) {
        streamUnsubscribeRef.current()
        streamUnsubscribeRef.current = null
      }

      setCurrentStream(null)
      setIsStreaming(false)
      setViewerCount(0)

    } catch (error: any) {
      setError('Failed to stop stream: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const joinStream = async (streamId: string) => {
    try {
      setLoading(true)
      setError(null)

      // Get stream info from Firestore
      const streamDoc = await getDoc(doc(db, 'livestreams', streamId))
      
      if (!streamDoc.exists()) {
        throw new Error('Stream not found')
      }

      const streamData = streamDoc.data() as LiveStream
      
      if (streamData.status !== 'live') {
        throw new Error('Stream is not live')
      }

      // Create Agora client for viewing
      const client = createAgoraClient()
      clientRef.current = client

      // Set client role to audience
      await client.setClientRole('audience')

      // Get token
      const uid = generateUID()
      const token = await getAgoraToken(streamData.agora.channel, uid, 'audience')

      // Join channel
      await client.join(agoraConfig.appId, streamData.agora.channel, token, uid)

      setCurrentStream(streamData)
      setIsViewing(true)

      // Handle remote users (broadcaster)
      client.on('user-published', async (user, mediaType) => {
        await client.subscribe(user, mediaType)
        
        if (mediaType === 'video') {
          remoteVideoTracksRef.current.set(user.uid.toString(), user.videoTrack!)
        }
        if (mediaType === 'audio') {
          remoteAudioTracksRef.current.set(user.uid.toString(), user.audioTrack!)
          user.audioTrack!.play()
        }
      })

      client.on('user-unpublished', (user) => {
        remoteVideoTracksRef.current.delete(user.uid.toString())
        remoteAudioTracksRef.current.delete(user.uid.toString())
      })

      // Listen for stream updates
      const unsubscribe = onSnapshot(doc(db, 'livestreams', streamId), (doc) => {
        if (doc.exists()) {
          const data = doc.data() as LiveStream
          setCurrentStream(data)
          setViewerCount(data.viewerCount || 0)
          
          if (data.status === 'ended') {
            leaveStream()
          }
        }
      })
      streamUnsubscribeRef.current = unsubscribe

    } catch (error: any) {
      setError('Failed to join stream: ' + error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const leaveStream = async () => {
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

      setCurrentStream(null)
      setIsViewing(false)
      setViewerCount(0)

    } catch (error: any) {
      setError('Failed to leave stream: ' + error.message)
    }
  }

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
      // Get available cameras and switch to the next one
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')
      
      if (videoDevices.length > 1) {
        // For now, just recreate the track with a different device
        // This is a simplified implementation
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
    toggleMicrophone,
    toggleCamera,
    switchCamera,
    isMicrophoneEnabled,
    isCameraEnabled,
    viewerCount,
    error,
    loading
  }

  return (
    <StreamingContext.Provider value={value}>
      {children}
    </StreamingContext.Provider>
  )
}
