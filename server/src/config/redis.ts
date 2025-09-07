import { RedisService } from '../services/RedisService'
import { InMemoryService } from '../services/InMemoryService'
import { logger } from '../utils/logger'

let cacheService: RedisService | InMemoryService

export async function initializeRedis(): Promise<void> {
  try {
    // Try Redis first
    const redisService = new RedisService()
    await redisService.connect()

    // Test the connection
    const isHealthy = await redisService.ping()
    if (!isHealthy) {
      throw new Error('Redis health check failed')
    }

    cacheService = redisService
    logger.info('Redis initialized successfully')
  } catch (error) {
    logger.warn(
      'Redis not available, falling back to in-memory storage:',
      error instanceof Error ? error.message : String(error)
    )

    // Fallback to in-memory service
    const inMemoryService = new InMemoryService()
    await inMemoryService.connect()

    cacheService = inMemoryService
    logger.info('In-memory cache service initialized successfully')
  }
}

export function getRedisService(): RedisService | InMemoryService {
  if (!cacheService) {
    throw new Error(
      'Cache service not initialized. Call initializeRedis() first.'
    )
  }
  return cacheService
}
