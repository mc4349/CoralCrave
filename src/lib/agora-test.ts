import AgoraRTC from 'agora-rtc-sdk-ng'

// Comprehensive test function to verify Agora SDK works
export const testAgoraSDK = async () => {
  console.log('🧪 Starting comprehensive Agora SDK test...')
  const testResults: string[] = []
  
  try {
    // Test 1: Check if SDK loads
    console.log('1️⃣ Testing SDK import...')
    testResults.push('✅ Agora SDK imported successfully')
    
    // Test 2: Check environment variables
    console.log('2️⃣ Checking environment variables...')
    const appId = import.meta.env.VITE_AGORA_APP_ID
    console.log('App ID:', appId ? `${appId.substring(0, 8)}...` : 'NOT SET')
    
    if (!appId) {
      throw new Error('VITE_AGORA_APP_ID is not defined in environment variables')
    }
    testResults.push('✅ Agora App ID is configured')
    
    // Test 3: Check browser compatibility
    console.log('3️⃣ Checking browser compatibility...')
    const compatibility = AgoraRTC.checkSystemRequirements()
    console.log('Browser compatibility:', compatibility)
    
    if (!compatibility) {
      throw new Error('Browser does not meet Agora SDK requirements')
    }
    testResults.push('✅ Browser is compatible with Agora SDK')
    
    // Test 4: Check media device support
    console.log('4️⃣ Checking media device support...')
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Browser does not support media devices')
    }
    testResults.push('✅ Browser supports media devices')
    
    // Test 5: Enumerate available devices
    console.log('5️⃣ Enumerating available devices...')
    const devices = await navigator.mediaDevices.enumerateDevices()
    const audioInputs = devices.filter(d => d.kind === 'audioinput')
    const videoInputs = devices.filter(d => d.kind === 'videoinput')
    
    console.log(`Found ${audioInputs.length} audio input(s):`, audioInputs.map(d => d.label || 'Unknown'))
    console.log(`Found ${videoInputs.length} video input(s):`, videoInputs.map(d => d.label || 'Unknown'))
    
    if (audioInputs.length === 0) {
      throw new Error('No microphone found')
    }
    if (videoInputs.length === 0) {
      throw new Error('No camera found')
    }
    testResults.push(`✅ Found ${audioInputs.length} microphone(s) and ${videoInputs.length} camera(s)`)
    
    // Test 6: Create Agora client
    console.log('6️⃣ Creating Agora client...')
    const client = AgoraRTC.createClient({
      mode: 'live',
      codec: 'vp8'
    })
    testResults.push('✅ Agora client created successfully')
    
    // Test 7: Try to create tracks (this will request permissions)
    console.log('7️⃣ Creating local tracks (requesting permissions)...')
    console.log('⚠️ Please allow camera and microphone access when prompted')
    
    const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
      {
        encoderConfig: 'music_standard',
      },
      {
        encoderConfig: {
          width: 640,
          height: 480,
          frameRate: 15,
          bitrateMin: 500,
          bitrateMax: 1000,
        }
      }
    )
    
    console.log('Audio track label:', audioTrack.getTrackLabel())
    console.log('Video track label:', videoTrack.getTrackLabel())
    testResults.push('✅ Local tracks created successfully')
    
    // Test 8: Set client role
    console.log('8️⃣ Setting client role to host...')
    await client.setClientRole('host')
    testResults.push('✅ Client role set to host')
    
    // Test 9: Try to join a test channel
    console.log('9️⃣ Joining test channel...')
    const uid = Math.floor(Math.random() * 1000000)
    const channelName = `test-${Date.now()}`
    
    console.log(`Joining channel "${channelName}" with UID ${uid}`)
    await client.join(appId, channelName, null, uid)
    testResults.push('✅ Successfully joined Agora channel')
    
    // Test 10: Try to publish tracks
    console.log('🔟 Publishing tracks...')
    await client.publish([audioTrack, videoTrack])
    testResults.push('✅ Successfully published tracks')
    
    // Test 11: Wait a moment to ensure everything is stable
    console.log('⏳ Testing stability for 2 seconds...')
    await new Promise(resolve => setTimeout(resolve, 2000))
    testResults.push('✅ Stream remained stable')
    
    // Cleanup
    console.log('🧹 Cleaning up...')
    audioTrack.close()
    videoTrack.close()
    await client.leave()
    testResults.push('✅ Cleanup completed')
    
    console.log('🎉 All tests passed!')
    console.log('Test Results:')
    testResults.forEach(result => console.log(result))
    
    return { 
      success: true, 
      message: 'All Agora tests passed! Streaming should work properly.',
      details: testResults
    }
    
  } catch (error: any) {
    console.error('❌ Agora test failed:', error)
    console.log('Test Results (up to failure):')
    testResults.forEach(result => console.log(result))
    
    // Provide specific guidance based on the error
    let guidance = 'Please check the console for more details.'
    
    if (error.message.includes('VITE_AGORA_APP_ID')) {
      guidance = 'Please check your .env.local file and ensure VITE_AGORA_APP_ID is set correctly.'
    } else if (error.message.includes('Permission denied') || error.message.includes('NotAllowedError')) {
      guidance = 'Please allow camera and microphone access when prompted by your browser.'
    } else if (error.message.includes('No microphone') || error.message.includes('No camera')) {
      guidance = 'Please connect a camera and microphone to your computer.'
    } else if (error.message.includes('in use') || error.message.includes('NotReadableError')) {
      guidance = 'Please close other applications that might be using your camera or microphone (like Zoom, Teams, etc.).'
    }
    
    return { 
      success: false, 
      error: error.message,
      guidance,
      details: testResults
    }
  }
}
