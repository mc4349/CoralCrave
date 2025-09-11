import { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: { message: 'Method not allowed' },
    })
  }

  try {
    const appId = process.env.AGORA_APP_ID
    const appCertificate = process.env.AGORA_APP_CERTIFICATE
    const timestamp = Math.floor(Date.now() / 1000)

    // 🔍 HEALTH CHECK: Environment validation
    console.log('🔍 HEALTH CHECK:', {
      timestamp: new Date().toISOString(),
      appIdPresent: !!appId,
      appIdLength: appId?.length || 0,
      appCertificatePresent: !!appCertificate,
      appCertificateLength: appCertificate?.length || 0,
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development'
    })

    // Validate required environment variables
    if (!appId || !appCertificate) {
      console.error('❌ HEALTH CHECK FAILED: Missing Agora credentials')
      return res.status(500).json({
        success: false,
        status: 'unhealthy',
        timestamp,
        error: {
          message: 'Agora credentials not configured',
          details: {
            appIdPresent: !!appId,
            appCertificatePresent: !!appCertificate
          }
        }
      })
    }

    // ✅ HEALTH CHECK PASSED
    console.log('✅ HEALTH CHECK PASSED: Agora service is healthy')
    res.json({
      success: true,
      status: 'healthy',
      timestamp,
      agora: {
        appIdConfigured: true,
        appCertificateConfigured: true,
        serverTime: timestamp
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        environment: process.env.NODE_ENV || 'development'
      }
    })
  } catch (error) {
    console.error('❌ HEALTH CHECK ERROR:', error)
    res.status(500).json({
      success: false,
      status: 'error',
      timestamp: Math.floor(Date.now() / 1000),
      error: {
        message: 'Health check failed',
        details: error instanceof Error ? error.message : String(error)
      }
    })
  }
}
