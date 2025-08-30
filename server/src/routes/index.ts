import { Express, Request, Response } from 'express'
import { asyncHandler } from '../middleware/errorHandler'
import { getFirebaseService } from '../config/firebase'
import { getRedisService } from '../config/redis'
import { logger } from '../utils/logger'
import { RtcTokenBuilder, RtcRole } from 'agora-access-token'

export function setupRoutes(app: Express): void {
  // Agora token generation endpoint
  app.get('/api/agora/token', asyncHandler(async (req: Request, res: Response) => {
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
      logger.error('Agora credentials not configured')
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
      
      logger.info(`Generated Agora token for channel: ${channelNameStr}, uid: ${uidStr}, role: ${roleStr}`)
      
      res.json({
        success: true,
        token,
        uid: parseInt(uidStr),
        channelName: channelNameStr,
        expiresAt: privilegeExpiredTs
      })
    } catch (error) {
      logger.error('Error generating Agora token:', error)
      res.status(500).json({
        success: false,
        error: { message: 'Failed to generate token' }
      })
    }
  }))

  // API status endpoint
  app.get('/api/status', asyncHandler(async (req: Request, res: Response) => {
    const firebaseService = getFirebaseService()
    const redisService = getRedisService()
    
    const [firebaseHealthy, redisHealthy] = await Promise.all([
      firebaseService.healthCheck(),
      redisService.ping()
    ])
    
    res.json({
      success: true,
      status: 'operational',
      services: {
        firebase: firebaseHealthy ? 'healthy' : 'unhealthy',
        redis: redisHealthy ? 'healthy' : 'unhealthy'
      },
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    })
  }))

  // Get active livestreams
  app.get('/api/livestreams/active', asyncHandler(async (req: Request, res: Response) => {
    const firebaseService = getFirebaseService()
    const livestreams = await firebaseService.getActiveLivestreams()
    
    res.json({
      success: true,
      data: livestreams
    })
  }))

  // Get livestream details
  app.get('/api/livestreams/:liveId', asyncHandler(async (req: Request, res: Response) => {
    const { liveId } = req.params
    const firebaseService = getFirebaseService()
    
    const livestream = await firebaseService.getLivestream(liveId)
    if (!livestream) {
      return res.status(404).json({
        success: false,
        error: { message: 'Livestream not found' }
      })
    }
    
    return res.json({
      success: true,
      data: livestream
    })
  }))

  // Get livestream items
  app.get('/api/livestreams/:liveId/items', asyncHandler(async (req: Request, res: Response) => {
    const { liveId } = req.params
    const firebaseService = getFirebaseService()
    
    const items = await firebaseService.getLivestreamItems(liveId)
    
    res.json({
      success: true,
      data: items
    })
  }))

  // Get viewer count for a livestream
  app.get('/api/livestreams/:liveId/viewers', asyncHandler(async (req: Request, res: Response) => {
    const { liveId } = req.params
    const redisService = getRedisService()
    
    const count = await redisService.getViewerCount(liveId)
    
    res.json({
      success: true,
      data: { count }
    })
  }))

  // Webhook endpoint for Stripe
  app.post('/api/webhooks/stripe', asyncHandler(async (req: Request, res: Response) => {
    // This would handle Stripe webhooks
    // For now, just acknowledge receipt
    logger.info('Stripe webhook received:', req.body)
    
    res.json({ received: true })
  }))

  // Analytics endpoint
  app.get('/api/analytics/overview', asyncHandler(async (req: Request, res: Response) => {
    // This would return system-wide analytics
    const redisService = getRedisService()
    const firebaseService = getFirebaseService()
    
    // Get some basic metrics
    const activeLivestreams = await firebaseService.getActiveLivestreams()
    
    res.json({
      success: true,
      data: {
        activeLivestreams: activeLivestreams.length,
        timestamp: new Date().toISOString()
      }
    })
  }))

  // 404 handler for API routes
  app.use('/api/*', (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        message: 'API endpoint not found',
        path: req.path
      }
    })
  })

  logger.info('API routes set up successfully')
}
