import { Request, Response, NextFunction } from 'express'
import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible'
import { getRedisService } from '../config/redis'
import { logger } from '../utils/logger'

// Create rate limiter instance
let rateLimiter: RateLimiterRedis

export function initializeRateLimiter(): void {
  try {
    const redisService = getRedisService()
    
    rateLimiter = new RateLimiterRedis({
      storeClient: redisService as any, // Type assertion for compatibility
      keyPrefix: 'rl_api',
      points: 100, // Number of requests
      duration: 60, // Per 60 seconds
      blockDuration: 60, // Block for 60 seconds if limit exceeded
      execEvenly: true // Spread requests evenly across duration
    })
    
    logger.info('Rate limiter initialized')
  } catch (error) {
    logger.error('Failed to initialize rate limiter:', error)
    // Create a fallback in-memory rate limiter
    rateLimiter = new RateLimiterMemory({
      points: 100,
      duration: 60,
      blockDuration: 60
    }) as any // Type assertion for compatibility
  }
}

export async function rateLimiterMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Use IP address as the key, but could also use user ID if authenticated
    const key = req.ip || req.connection.remoteAddress || 'unknown'
    
    if (!rateLimiter) {
      initializeRateLimiter()
    }
    
    await rateLimiter.consume(key)
    next()
  } catch (rejRes: any) {
    // Rate limit exceeded
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1
    
    res.set('Retry-After', String(secs))
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many requests',
        retryAfter: secs
      }
    })
    
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`)
  }
}

// Export the middleware as default
export default rateLimiterMiddleware

// Specific rate limiters for different endpoints
export function createBidRateLimiter() {
  return new RateLimiterRedis({
    storeClient: getRedisService() as any,
    keyPrefix: 'rl_bid',
    points: 10, // 10 bids
    duration: 60, // Per minute
    blockDuration: 30 // Block for 30 seconds
  })
}

export function createAuthRateLimiter() {
  return new RateLimiterRedis({
    storeClient: getRedisService() as any,
    keyPrefix: 'rl_auth',
    points: 5, // 5 attempts
    duration: 900, // Per 15 minutes
    blockDuration: 900 // Block for 15 minutes
  })
}
