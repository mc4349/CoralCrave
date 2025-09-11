// Agora Debugging Utilities for Production Verification
// Run these commands in browser console to verify Agora token authentication

export const agoraDebugCommands = {
  // Test health check endpoint
  testHealthCheck: async () => {
    console.log('🔍 Testing Agora Health Check...')
    try {
      const response = await fetch('/api/agora/healthz')
      const data = await response.json()
      console.log('✅ Health Check Response:', data)
      return data
    } catch (error) {
      console.error('❌ Health Check Failed:', error)
      return null
    }
  },

  // Test token generation
  testTokenGeneration: async (channel = 'test-channel') => {
    console.log('🗝️ Testing Token Generation...')
    try {
      const response = await fetch(`/api/agora/token?channelName=${channel}&role=host`)
      const data = await response.json()
      console.log('✅ Token Generation Response:', data)
      return data
    } catch (error) {
      console.error('❌ Token Generation Failed:', error)
      return null
    }
  },

  // Verify environment variables
  checkEnvironment: () => {
    console.log('🔎 Environment Check:')
    console.log('VITE_AGORA_APP_ID:', import.meta.env.VITE_AGORA_APP_ID ? 'Present' : 'MISSING')
    console.log('APP_ID from client:', (window as any).APP_ID ? 'Present' : 'MISSING')
    console.log('Is Production:', !window.location.hostname.includes('localhost'))
    console.log('Origin:', window.location.origin)
  },

  // Run complete sanity checklist
  runSanityChecklist: async () => {
    console.log('🚀 Running Agora Sanity Checklist...')

    // 1. Environment check
    console.log('1️⃣ Environment Check:')
    agoraDebugCommands.checkEnvironment()

    // 2. Health check
    console.log('2️⃣ Health Check:')
    const healthResult = await agoraDebugCommands.testHealthCheck()

    // 3. Token generation test
    console.log('3️⃣ Token Generation Test:')
    const tokenResult = await agoraDebugCommands.testTokenGeneration()

    // 4. Summary
    console.log('4️⃣ Summary:')
    const isHealthy = healthResult?.status === 'healthy'
    const hasToken = tokenResult?.success === true

    if (isHealthy && hasToken) {
      console.log('✅ ALL CHECKS PASSED: Agora authentication should work!')
    } else {
      console.log('❌ ISSUES DETECTED:')
      if (!isHealthy) console.log('  - Health check failed')
      if (!hasToken) console.log('  - Token generation failed')
    }

    return { isHealthy, hasToken, healthResult, tokenResult }
  }
}

// Make available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).agoraDebug = agoraDebugCommands
  console.log('🔧 Agora Debug Utilities loaded! Run agoraDebug.runSanityChecklist() to test.')
}

// Browser-compatible App ID revealer
export const revealActualValues = () => {
  console.log('🔍 REVEALING ACTUAL ENVIRONMENT VALUES:')

  // Try to get App ID from various sources
  const sources = {
    'window.APP_ID': (window as any).APP_ID,
    'window.agoraDebug.APP_ID': (window as any).agoraDebug?.APP_ID,
    'document.env.VITE_AGORA_APP_ID': (document as any).env?.VITE_AGORA_APP_ID,
    'localStorage.VITE_AGORA_APP_ID': localStorage.getItem('VITE_AGORA_APP_ID'),
    'sessionStorage.VITE_AGORA_APP_ID': sessionStorage.getItem('VITE_AGORA_APP_ID')
  }

  console.log('Available App ID sources:')
  Object.entries(sources).forEach(([source, value]) => {
    if (value) {
      console.log(`✅ ${source}: ${value}`)
    } else {
      console.log(`❌ ${source}: undefined`)
    }
  })

  // Try to access via global window object if available
  if (typeof window !== 'undefined' && (window as any).getAgoraAppId) {
    try {
      const appId = (window as any).getAgoraAppId()
      console.log('✅ Via window.getAgoraAppId():', appId)
    } catch (e) {
      console.log('❌ Via window.getAgoraAppId(): failed')
    }
  }

  return sources
}

// Enhanced App ID verification function
export const verifyAppIdMatch = async () => {
  console.log('🔍 App ID Verification:')

  // Get client-side App ID from multiple sources
  let clientAppId = null

  // Try various sources for client App ID
  const getSources = () => [
    () => (window as any).APP_ID,
    () => (window as any).agoraDebug?.APP_ID,
    () => (document as any).env?.VITE_AGORA_APP_ID,
    () => localStorage.getItem('VITE_AGORA_APP_ID'),
    () => sessionStorage.getItem('VITE_AGORA_APP_ID')
  ]

  const sources = getSources()

  for (const source of sources) {
    try {
      const value = source()
      if (value && typeof value === 'string' && value.length > 10) {
        clientAppId = value
        console.log('✅ Found client App ID:', clientAppId)
        break
      }
    } catch (e) {
      // Continue to next source
    }
  }

  if (!clientAppId) {
    console.error('❌ Could not find client App ID from any source!')
    console.log('Available sources checked:', sources.length)
    return null
  }

  // Test token generation to see server-side App ID
  try {
    const response = await fetch('/api/agora/token?channelName=test-appid&role=host')
    const data = await response.json()

    if (data.success && data.token) {
      // Extract App ID from token (first 32 characters after '006')
      const tokenAppId = data.token.substring(3, 35)
      console.log('Server APP_ID (from token):', tokenAppId)

      // Compare
      const match = clientAppId === tokenAppId
      console.log('App IDs Match:', match ? '✅ YES' : '❌ NO')

      if (!match) {
        console.error('❌ APP ID MISMATCH DETECTED!')
        console.error('Client:', clientAppId)
        console.error('Server:', tokenAppId)
        console.error('This is causing the "invalid token" error!')
        console.error('🔧 SOLUTION: Ensure VITE_AGORA_APP_ID and AGORA_APP_ID are identical in Vercel')
      } else {
        console.log('✅ App IDs match - token should work!')
      }

      return { clientAppId, tokenAppId, match }
    } else {
      console.error('❌ Token generation failed:', data.error)
    }
  } catch (error) {
    console.error('❌ Failed to verify App ID:', error)
  }

  return null
}

// Add to global debug object
if (typeof window !== 'undefined') {
  (window as any).agoraDebug.revealActualValues = revealActualValues
  (window as any).agoraDebug.verifyAppIdMatch = verifyAppIdMatch
}
