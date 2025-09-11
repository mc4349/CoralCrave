import { VercelRequest, VercelResponse } from '@vercel/node'
import { RtcTokenBuilder } from 'agora-access-token'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    console.error('❌ TOKEN REQUEST FAILED: Method not allowed', { method: req.method })
    return res.status(405).json({
      success: false,
      error: { message: 'Method not allowed' },
    })
  }

  const { channelName, uid, role } = req.query

  // Type assertions for query parameters
  const channelNameStr = channelName as string
  const uidStr = uid as string
  const roleStr = role as string

  // 🗝️ TOKEN REQUEST: Initial validation
  console.log('🗝️ TOKEN REQUEST:', {
    timestamp: new Date().toISOString(),
    channelName: channelNameStr,
    uid: uidStr,
    role: roleStr,
    userAgent: req.headers['user-agent'],
    origin: req.headers.origin,
    method: req.method
  })

  if (!channelNameStr) {
    console.error('❌ TOKEN REQUEST FAILED: channelName is required')
    return res.status(400).json({
      success: false,
      error: { message: 'channelName is required' },
    })
  }

  // Auto-generate UID if not provided (0-999999 range)
  const uidNum = uidStr ? parseInt(uidStr) : Math.floor(Math.random() * 1000000)

  const appId = process.env.AGORA_APP_ID
  const appCertificate = process.env.AGORA_APP_CERTIFICATE

  // 🔐 CREDENTIALS CHECK
  console.log('🔐 CREDENTIALS CHECK:', {
    appIdPresent: !!appId,
    appIdLength: appId?.length || 0,
    appIdValue: appId ? appId.substring(0, 8) + '...' : 'MISSING',
    appCertificatePresent: !!appCertificate,
    appCertificateLength: appCertificate?.length || 0,
    environment: process.env.NODE_ENV || 'unknown',
    timestamp: new Date().toISOString()
  })

  if (!appId || !appCertificate) {
    console.error('❌ TOKEN REQUEST FAILED: Agora credentials not configured')
    return res.status(500).json({
      success: false,
      error: { message: 'Agora credentials not configured' },
    })
  }

  // 🎭 ROLE MAPPING: Proper Publisher/Subscriber roles
  let userRole: number
  if (roleStr === 'publisher' || roleStr === 'host') {
    userRole = 1 // PUBLISHER role for Go Live (streaming)
  } else if (roleStr === 'subscriber' || roleStr === 'audience') {
    userRole = 2 // SUBSCRIBER role for Watch (viewing)
  } else {
    console.error('❌ TOKEN REQUEST FAILED: Invalid role specified', { role: roleStr })
    return res.status(400).json({
      success: false,
      error: { message: 'Invalid role. Use "publisher"/"host" for streaming or "subscriber"/"audience" for viewing' },
    })
  }
  const expirationTimeInSeconds = 3600 // 1 hour
  const currentTimestamp = Math.floor(Date.now() / 1000)
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds

  // 🔑 TOKEN GENERATION: Parameters
  console.log('🔑 TOKEN GENERATION:', {
    channelName: channelNameStr,
    uid: uidNum,
    userRole,
    roleStr,
    expirationTimeInSeconds,
    currentTimestamp,
    privilegeExpiredTs,
    appIdPrefix: appId.substring(0, 8) + '...'
  })

  try {
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelNameStr,
      uidNum,
      userRole,
      privilegeExpiredTs
    )

    // ✅ TOKEN SUCCESS: Generation completed
    console.log('✅ TOKEN SUCCESS:', {
      channelName: channelNameStr,
      uid: uidNum,
      role: roleStr,
      userRole,
      tokenLength: token.length,
      expiresAt: privilegeExpiredTs,
      expiresIn: expirationTimeInSeconds,
      timestamp: new Date().toISOString()
    })

    const response = {
      success: true,
      token,
      uid: uidNum,
      channelName: channelNameStr,
      expiresAt: privilegeExpiredTs,
    }

    // 📤 TOKEN RESPONSE: Sending to client
    console.log('📤 TOKEN RESPONSE:', {
      success: true,
      uid: uidNum,
      channelName: channelNameStr,
      expiresAt: privilegeExpiredTs,
      tokenPrefix: token.substring(0, 20) + '...'
    })

    res.json(response)
  } catch (error) {
    // ❌ TOKEN ERROR: Generation failed
    console.error('❌ TOKEN ERROR:', {
      message: 'Failed to generate Agora token',
      channelName: channelNameStr,
      uid: uidNum,
      role: roleStr,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    })

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to generate token',
        details: error instanceof Error ? error.message : String(error)
      },
    })
  }
}
