import AgoraRTC, { IAgoraRTCClient } from 'agora-rtc-sdk-ng'
export const APP_ID = import.meta.env.VITE_AGORA_APP_ID as string

// Expose APP_ID globally for debugging purposes
if (typeof window !== 'undefined') {
  (window as any).APP_ID = APP_ID
  console.log('🔧 Agora Client: APP_ID loaded:', APP_ID ? '✅ Present' : '❌ MISSING')
  console.log('🔧 Agora Client: VITE_AGORA_APP_ID from env:', import.meta.env.VITE_AGORA_APP_ID || '❌ MISSING')
}

export function createClient(): IAgoraRTCClient {
  return AgoraRTC.createClient({ mode: 'live', codec: 'vp8' })
}

export async function fetchToken(
  channel: string,
  role: 'publisher' | 'audience' | 'subscriber' | 'host',
  uid?: number
) {
  // 🌐 PRODUCTION URL: Using relative path for production deployment
  const uidParam = uid ? `&uid=${uid}` : ''
  const endpoint = `/api/agora/token?channelName=${encodeURIComponent(channel)}&role=${role}${uidParam}`

  console.log('🌐 TOKEN FETCH:', {
    endpoint,
    channel,
    role,
    uid,
    isProduction: !window.location.hostname.includes('localhost'),
    origin: window.location.origin,
    timestamp: new Date().toISOString()
  })

  const res = await fetch(endpoint)

  if (!res.ok) {
    const errorText = await res.text()
    console.error('❌ TOKEN FETCH FAILED:', {
      status: res.status,
      statusText: res.statusText,
      errorText,
      endpoint,
      channel,
      role,
      timestamp: new Date().toISOString()
    })
    throw new Error(`Token server error ${res.status}: ${errorText}`)
  }

  const data = await res.json()

  if (!data.success) {
    console.error('❌ TOKEN GENERATION FAILED:', {
      error: data.error,
      endpoint,
      channel,
      role,
      timestamp: new Date().toISOString()
    })
    throw new Error(
      `Token generation failed: ${data.error?.message || 'Unknown error'}`
    )
  }

  // ✅ TOKEN FETCH SUCCESS
  console.log('✅ TOKEN FETCH SUCCESS:', {
    channel: data.channelName,
    uid: data.uid,
    role,
    tokenLength: data.token?.length || 0,
    expiresAt: data.expiresAt,
    timestamp: new Date().toISOString()
  })

  // Transform the response to match the expected format
  return {
    token: data.token,
    exp: data.expiresAt,
  }
}
