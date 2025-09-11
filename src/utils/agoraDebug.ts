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
    console.log('APP_ID from client:', APP_ID ? 'Present' : 'MISSING')
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

// Import APP_ID for environment check
import { APP_ID } from '../agora/client'
