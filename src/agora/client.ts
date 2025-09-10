import AgoraRTC, { IAgoraRTCClient } from 'agora-rtc-sdk-ng'
export const APP_ID = import.meta.env.VITE_AGORA_APP_ID as string

export function createClient(): IAgoraRTCClient {
  return AgoraRTC.createClient({ mode: 'live', codec: 'vp8' })
}

export async function fetchToken(
  channel: string,
  role: 'publisher' | 'audience' | 'subscriber',
  uid?: number
) {
  // Use the new serverless API endpoint
  const uidParam = uid ? `&uid=${uid}` : ''
  const res = await fetch(
    `/api/agora/token?channelName=${encodeURIComponent(channel)}&role=${role}${uidParam}`
  )

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Token server error ${res.status}: ${errorText}`)
  }

  const data = await res.json()

  if (!data.success) {
    throw new Error(
      `Token generation failed: ${data.error?.message || 'Unknown error'}`
    )
  }

  // Transform the response to match the expected format
  return {
    token: data.token,
    exp: data.expiresAt,
  }
}
