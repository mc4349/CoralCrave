import AgoraRTC, { 
  IAgoraRTCClient, 
  ICameraVideoTrack, 
  IMicrophoneAudioTrack,
  ILocalVideoTrack,
  ILocalAudioTrack,
  IRemoteVideoTrack,
  IRemoteAudioTrack
} from 'agora-rtc-sdk-ng'

// Agora configuration
export const agoraConfig = {
  appId: import.meta.env.VITE_AGORA_APP_ID,
  tokenServerUrl: import.meta.env.AGORA_TOKEN_SERVER_URL || 'http://localhost:3001/agora/token'
}

// Initialize Agora client
export const createAgoraClient = () => {
  return AgoraRTC.createClient({
    mode: 'live',
    codec: 'vp8'
  })
}

// Check camera and microphone permissions
export const checkMediaPermissions = async () => {
  try {
    // Check if getUserMedia is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Your browser does not support camera and microphone access')
    }

    // Request permissions by trying to get media stream
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    })
    
    // Stop the stream immediately as we only wanted to check permissions
    stream.getTracks().forEach(track => track.stop())
    
    return { granted: true, error: null }
  } catch (error: any) {
    console.error('Permission check failed:', error)
    
    let errorMessage = 'Failed to access camera and microphone'
    
    if (error.name === 'NotAllowedError') {
      errorMessage = 'Camera and microphone permissions denied. Please allow access in your browser settings and refresh the page.'
    } else if (error.name === 'NotFoundError') {
      errorMessage = 'No camera or microphone found. Please connect a camera and microphone.'
    } else if (error.name === 'NotReadableError') {
      errorMessage = 'Camera or microphone is already in use by another application.'
    } else if (error.name === 'OverconstrainedError') {
      errorMessage = 'Camera or microphone does not meet the required specifications.'
    }
    
    return { granted: false, error: errorMessage }
  }
}

// Create local tracks for broadcasting
export const createLocalTracks = async () => {
  // First, request permissions using native browser API to ensure popup appears
  console.log('Requesting media permissions...')
  
  try {
    // This will trigger the browser permission popup
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    })
    
    // Stop the stream immediately as we only needed it for permissions
    stream.getTracks().forEach(track => track.stop())
    console.log('Permissions granted, creating Agora tracks...')
  } catch (error: any) {
    console.error('Permission request failed:', error)
    throw error // This will be caught by the calling function
  }
  
  // Now create Agora tracks (permissions should already be granted)
  const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
    {
      // Audio config
      encoderConfig: 'music_standard',
    },
    {
      // Video config
      encoderConfig: {
        width: 1280,
        height: 720,
        frameRate: 30,
        bitrateMin: 1000,
        bitrateMax: 3000,
      },
      optimizationMode: 'motion'
    }
  )
  
  return { audioTrack, videoTrack }
}

// Get Agora token from server
export const getAgoraToken = async (channelName: string, uid: string, role: 'publisher' | 'audience' = 'publisher') => {
  try {
    const response = await fetch(`${agoraConfig.tokenServerUrl}?channelName=${channelName}&uid=${uid}&role=${role}`)
    
    if (!response.ok) {
      throw new Error('Failed to get Agora token')
    }
    
    const data = await response.json()
    return data.token
  } catch (error) {
    console.error('Error getting Agora token:', error)
    // For development, return null to use Agora without token
    return null
  }
}

// Utility functions
export const generateChannelName = (liveId: string) => {
  return `coralcrave_${liveId}`
}

export const generateUID = () => {
  return Math.floor(Math.random() * 1000000).toString()
}

// Export types for use in components
export type {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  ILocalVideoTrack,
  ILocalAudioTrack,
  IRemoteVideoTrack,
  IRemoteAudioTrack
}

export default AgoraRTC
