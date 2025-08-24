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

// Create local tracks for broadcasting
export const createLocalTracks = async () => {
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
