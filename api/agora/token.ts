import { VercelRequest, VercelResponse } from '@vercel/node'
import { RtcTokenBuilder, RtcRole } from 'agora-access-token'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: { message: 'Method not allowed' }
    })
  }

  const { channelName, uid, role } = req.query

  // Type assertions for query parameters
  const channelNameStr = channelName as string
  const uidStr = uid as string
  const roleStr = role as string

  if (!channelNameStr || !uidStr) {
    return res.status(400).json({
      success: false,
      error: { message: 'channelName and uid are required' }
    })
  }

  const appId = process.env.AGORA_APP_ID
  const appCertificate = process.env.AGORA_APP_CERTIFICATE

  if (!appId || !appCertificate) {
    console.error('Agora credentials not configured')
    return res.status(500).json({
      success: false,
      error: { message: 'Agora credentials not configured' }
    })
  }

  const userRole = roleStr === 'host' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER
  const expirationTimeInSeconds = 3600 // 1 hour
  const currentTimestamp = Math.floor(Date.now() / 1000)
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds

  try {
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelNameStr,
      parseInt(uidStr),
      userRole,
      privilegeExpiredTs
    )

    console.log(`Generated Agora token for channel: ${channelNameStr}, uid: ${uidStr}, role: ${roleStr}`)

    res.json({
      success: true,
      token,
      uid: parseInt(uidStr),
      channelName: channelNameStr,
      expiresAt: privilegeExpiredTs,
    })
  } catch (error) {
    console.error('Error generating Agora token:', error)
    res.status(500).json({
      success: false,
      error: { message: 'Failed to generate token' }
    })
  }
}
