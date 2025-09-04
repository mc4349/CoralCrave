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
  tokenServerUrl: import.meta.env.AGORA_TOKEN_SERVER_URL || 'http://localhost:3001'
}

// Validate Agora configuration
export const validateAgoraConfig = () => {
  const issues: string[] = []
  
  if (!agoraConfig.appId) {
    issues.push('VITE_AGORA_APP_ID is not configured in environment variables')
  } else if (agoraConfig.appId.length !== 32) {
    issues.push('VITE_AGORA_APP_ID appears to be invalid (should be 32 characters)')
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    config: agoraConfig
  }
}

// Initialize Agora client with validation
export const createAgoraClient = () => {
  const validation = validateAgoraConfig()
  if (!validation.isValid) {
    console.error('❌ Agora configuration issues:', validation.issues)
    throw new Error(`Agora configuration invalid: ${validation.issues.join(', ')}`)
  }
  
  console.log('✅ Agora configuration validated successfully')
  console.log('📋 App ID:', agoraConfig.appId)
  
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
  console.log('🎥 Creating Agora tracks (this will request permissions)...')
  
  try {
    // First check if browser supports getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Your browser does not support camera and microphone access. Please use a modern browser like Chrome, Firefox, or Safari.')
    }

    // Check Agora App ID
    if (!agoraConfig.appId) {
      throw new Error('Agora App ID is not configured. Please check your environment variables.')
    }

    console.log('📱 Browser supports media devices, requesting permissions...')
    
    // Let Agora handle the permission request directly with better error handling
    const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
      {
        // Audio config - more compatible settings
        encoderConfig: 'music_standard',
        AEC: true, // Acoustic Echo Cancellation
        AGC: true, // Automatic Gain Control
        ANS: true, // Automatic Noise Suppression
      },
      {
        // Video config - more compatible settings
        encoderConfig: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 30 },
          bitrateMin: 500,
          bitrateMax: 2000,
        },
        optimizationMode: 'motion',
        facingMode: 'user' // Front camera by default
      }
    )
    
    console.log('✅ Agora tracks created successfully')
    console.log('📊 Audio track:', audioTrack.getTrackLabel())
    console.log('📹 Video track:', videoTrack.getTrackLabel())
    
    return { audioTrack, videoTrack }
    
  } catch (error: any) {
    console.error('❌ Failed to create Agora tracks:', error)
    
    // Provide more specific error messages
    let errorMessage = 'Failed to access camera and microphone'
    
    if (error.code === 'PERMISSION_DENIED' || error.name === 'NotAllowedError') {
      errorMessage = 'Camera and microphone permissions were denied. Please click "Allow" when prompted and try again.'
    } else if (error.code === 'DEVICE_NOT_FOUND' || error.name === 'NotFoundError') {
      errorMessage = 'No camera or microphone found. Please connect your devices and refresh the page.'
    } else if (error.code === 'DEVICE_BUSY' || error.name === 'NotReadableError') {
      errorMessage = 'Camera or microphone is already in use. Please close other applications (like Zoom, Teams, etc.) and try again.'
    } else if (error.code === 'CONSTRAINT_NOT_SATISFIED' || error.name === 'OverconstrainedError') {
      errorMessage = 'Your camera or microphone does not meet the required specifications. Please try with different devices.'
    } else if (error.message && error.message.includes('App ID')) {
      errorMessage = error.message
    } else if (error.message) {
      errorMessage = `Media access failed: ${error.message}`
    }
    
    throw new Error(errorMessage)
  }
}

// Get Agora token from server with better error handling
export const getAgoraToken = async (channelName: string, uid: string, role: 'publisher' | 'audience' = 'publisher') => {
  try {
    console.log('🔑 Requesting Agora token...', { channelName, uid, role })

    // CRITICAL FIX: Map 'audience' to 'subscriber' for server compatibility
    const serverRole = role === 'audience' ? 'subscriber' : role
    console.log('🔄 Role mapping:', role, '->', serverRole)

    const response = await fetch(`${agoraConfig.tokenServerUrl}/api/agora/token?channelName=${channelName}&uid=${uid}&role=${serverRole}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(5000)
    })

    if (!response.ok) {
      throw new Error(`Token server responded with ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    console.log('✅ Agora token received successfully from server')
    console.log('🔑 Token expires at:', new Date(data.expiresAt * 1000).toLocaleString())
    return data.token
  } catch (error: any) {
    console.error('❌ Token server error:', error.message)
    console.log('🔧 Cannot proceed without token - App Certificate is enabled')

    // With App Certificate enabled, we MUST have a token
    throw new Error(`Token required but unavailable: ${error.message}`)
  }
}

// Get available media devices
export const getAvailableDevices = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    
    const audioInputs = devices.filter(device => device.kind === 'audioinput')
    const videoInputs = devices.filter(device => device.kind === 'videoinput')
    
    console.log('📱 Available devices:')
    console.log(`🎤 Audio inputs (${audioInputs.length}):`, audioInputs.map(d => d.label || 'Unknown Device'))
    console.log(`📹 Video inputs (${videoInputs.length}):`, videoInputs.map(d => d.label || 'Unknown Device'))
    
    return {
      audioInputs,
      videoInputs,
      totalDevices: devices.length
    }
  } catch (error) {
    console.error('Failed to enumerate devices:', error)
    return {
      audioInputs: [],
      videoInputs: [],
      totalDevices: 0
    }
  }
}

// Create local tracks with specific device IDs (optional)
export const createLocalTracksWithDevices = async (audioDeviceId?: string, videoDeviceId?: string) => {
  console.log('🎥 Creating Agora tracks with specific devices...')
  
  try {
    const audioConfig = {
      encoderConfig: 'music_standard' as const,
      AEC: true,
      AGC: true,
      ANS: true,
      ...(audioDeviceId && { microphoneId: audioDeviceId })
    }
    
    const videoConfig = {
      encoderConfig: {
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 30, max: 30 },
        bitrateMin: 500,
        bitrateMax: 2000,
      },
      optimizationMode: 'motion' as const,
      facingMode: 'user' as const,
      ...(videoDeviceId && { cameraId: videoDeviceId })
    }
    
    const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(audioConfig, videoConfig)
    
    console.log('✅ Agora tracks created with specific devices')
    console.log('📊 Audio track:', audioTrack.getTrackLabel())
    console.log('📹 Video track:', videoTrack.getTrackLabel())
    
    return { audioTrack, videoTrack }
    
  } catch (error: any) {
    console.error('❌ Failed to create tracks with specific devices:', error)
    // Fallback to default device selection
    return createLocalTracks()
  }
}

// Utility functions
export const generateChannelName = (liveId: string) => {
  return `coralcrave_${liveId}`
}

export const generateUID = () => {
  return Math.floor(Math.random() * 1000000)
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
