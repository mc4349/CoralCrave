import { createClient, RedisClientType } from 'redis'
import { AuctionState } from '../types/auction'
import { logger } from '../utils/logger'

export class RedisService {
  private client: RedisClientType
  private isConnected = false

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: false // Disable auto-reconnect for fallback to work
      }
    })

    this.client.on('error', (err: any) => {
      logger.error('Redis Client Error:', err)
    })

    this.client.on('connect', () => {
      logger.info('Redis client connected')
      this.isConnected = true
    })

    this.client.on('disconnect', () => {
      logger.warn('Redis client disconnected')
      this.isConnected = false
    })
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect()
      logger.info('Connected to Redis')
    } catch (error) {
      logger.error('Failed to connect to Redis:', error)
      throw error
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.disconnect()
      logger.info('Disconnected from Redis')
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error)
    }
  }

  // Auction state management
  async setAuctionState(itemId: string, state: AuctionState): Promise<void> {
    try {
      const key = `auction:${itemId}`
      const serializedState = JSON.stringify({
        ...state,
        proxyBids: Array.from(state.proxyBids.entries()) // Convert Map to array for serialization
      })
      
      await this.client.setEx(key, 3600, serializedState) // 1 hour TTL
      logger.debug(`Saved auction state for item ${itemId}`)
    } catch (error) {
      logger.error(`Failed to save auction state for item ${itemId}:`, error)
      throw error
    }
  }

  async getAuctionState(itemId: string): Promise<AuctionState | null> {
    try {
      const key = `auction:${itemId}`
      const serializedState = await this.client.get(key)
      
      if (!serializedState) {
        return null
      }

      const parsedState = JSON.parse(serializedState)
      
      // Convert proxy bids array back to Map
      const proxyBids = new Map(parsedState.proxyBids || [])
      
      return {
        ...parsedState,
        proxyBids
      }
    } catch (error) {
      logger.error(`Failed to get auction state for item ${itemId}:`, error)
      return null
    }
  }

  async deleteAuctionState(itemId: string): Promise<void> {
    try {
      const key = `auction:${itemId}`
      await this.client.del(key)
      logger.debug(`Deleted auction state for item ${itemId}`)
    } catch (error) {
      logger.error(`Failed to delete auction state for item ${itemId}:`, error)
    }
  }

  async getAllAuctionStates(): Promise<AuctionState[]> {
    try {
      const keys = await this.client.keys('auction:*')
      const states: AuctionState[] = []

      for (const key of keys) {
        const serializedState = await this.client.get(key)
        if (serializedState) {
          try {
            const parsedState = JSON.parse(serializedState)
            const proxyBids = new Map(parsedState.proxyBids || [])
            states.push({
              ...parsedState,
              proxyBids
            })
          } catch (parseError) {
            logger.error(`Failed to parse auction state for key ${key}:`, parseError)
          }
        }
      }

      return states
    } catch (error) {
      logger.error('Failed to get all auction states:', error)
      return []
    }
  }

  // Live stream viewer tracking
  async addViewer(liveId: string, userId: string): Promise<number> {
    try {
      const key = `viewers:${liveId}`
      await this.client.sAdd(key, userId)
      await this.client.expire(key, 7200) // 2 hours TTL
      
      const count = await this.client.sCard(key)
      return count
    } catch (error) {
      logger.error(`Failed to add viewer ${userId} to live ${liveId}:`, error)
      return 0
    }
  }

  async removeViewer(liveId: string, userId: string): Promise<number> {
    try {
      const key = `viewers:${liveId}`
      await this.client.sRem(key, userId)
      
      const count = await this.client.sCard(key)
      return count
    } catch (error) {
      logger.error(`Failed to remove viewer ${userId} from live ${liveId}:`, error)
      return 0
    }
  }

  async getViewerCount(liveId: string): Promise<number> {
    try {
      const key = `viewers:${liveId}`
      return await this.client.sCard(key)
    } catch (error) {
      logger.error(`Failed to get viewer count for live ${liveId}:`, error)
      return 0
    }
  }

  async getViewers(liveId: string): Promise<string[]> {
    try {
      const key = `viewers:${liveId}`
      return await this.client.sMembers(key)
    } catch (error) {
      logger.error(`Failed to get viewers for live ${liveId}:`, error)
      return []
    }
  }

  // Rate limiting
  async checkRateLimit(key: string, limit: number, windowMs: number): Promise<{ allowed: boolean; remaining: number }> {
    try {
      const now = Date.now()
      const windowStart = now - windowMs
      
      // Remove old entries
      await this.client.zRemRangeByScore(key, 0, windowStart)
      
      // Count current requests
      const current = await this.client.zCard(key)
      
      if (current >= limit) {
        return { allowed: false, remaining: 0 }
      }
      
      // Add current request
      await this.client.zAdd(key, { score: now, value: `${now}-${Math.random()}` })
      await this.client.expire(key, Math.ceil(windowMs / 1000))
      
      return { allowed: true, remaining: limit - current - 1 }
    } catch (error) {
      logger.error(`Failed to check rate limit for key ${key}:`, error)
      // Allow request on error to avoid blocking legitimate traffic
      return { allowed: true, remaining: limit - 1 }
    }
  }

  // Cache management
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, value)
      } else {
        await this.client.set(key, value)
      }
    } catch (error) {
      logger.error(`Failed to set cache key ${key}:`, error)
      throw error
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key)
    } catch (error) {
      logger.error(`Failed to get cache key ${key}:`, error)
      return null
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key)
    } catch (error) {
      logger.error(`Failed to delete cache key ${key}:`, error)
    }
  }

  // Health check
  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping()
      return result === 'PONG'
    } catch (error) {
      logger.error('Redis ping failed:', error)
      return false
    }
  }

  // Pub/Sub for real-time events
  async publish(channel: string, message: string): Promise<void> {
    try {
      await this.client.publish(channel, message)
    } catch (error) {
      logger.error(`Failed to publish to channel ${channel}:`, error)
    }
  }

  // Get connection status
  isReady(): boolean {
    return this.isConnected && this.client.isReady
  }

  // Cleanup expired keys
  async cleanup(): Promise<void> {
    try {
      // Clean up expired viewer sets
      const viewerKeys = await this.client.keys('viewers:*')
      for (const key of viewerKeys) {
        const ttl = await this.client.ttl(key)
        if (ttl === -1) { // No expiration set
          await this.client.expire(key, 7200) // Set 2 hour expiration
        }
      }

      // Clean up old rate limit keys
      const rateLimitKeys = await this.client.keys('rate_limit:*')
      for (const key of rateLimitKeys) {
        const ttl = await this.client.ttl(key)
        if (ttl === -1) {
          await this.client.del(key) // Delete keys without expiration
        }
      }

      logger.debug('Redis cleanup completed')
    } catch (error) {
      logger.error('Redis cleanup failed:', error)
    }
  }
}
