import { AuctionState } from '../types/auction'
import { logger } from '../utils/logger'

export class InMemoryService {
  private auctionStates = new Map<string, AuctionState>()
  private viewers = new Map<string, Set<string>>()
  private rateLimits = new Map<string, { count: number; resetTime: number }>()
  private cache = new Map<string, { value: string; expiry?: number }>()

  constructor() {
    // Clean up expired entries every minute
    setInterval(() => {
      this.cleanup()
    }, 60000)
  }

  // Auction state management
  async setAuctionState(itemId: string, state: AuctionState): Promise<void> {
    try {
      this.auctionStates.set(itemId, {
        ...state,
        proxyBids: new Map(state.proxyBids), // Clone the Map
      })
      logger.debug(`Saved auction state for item ${itemId} (in-memory)`)
    } catch (error) {
      logger.error(`Failed to save auction state for item ${itemId}:`, error)
      throw error
    }
  }

  async getAuctionState(itemId: string): Promise<AuctionState | null> {
    try {
      const state = this.auctionStates.get(itemId)
      if (!state) return null

      return {
        ...state,
        proxyBids: new Map(state.proxyBids), // Clone the Map
      }
    } catch (error) {
      logger.error(`Failed to get auction state for item ${itemId}:`, error)
      return null
    }
  }

  async deleteAuctionState(itemId: string): Promise<void> {
    try {
      this.auctionStates.delete(itemId)
      logger.debug(`Deleted auction state for item ${itemId} (in-memory)`)
    } catch (error) {
      logger.error(`Failed to delete auction state for item ${itemId}:`, error)
    }
  }

  async getAllAuctionStates(): Promise<AuctionState[]> {
    try {
      return Array.from(this.auctionStates.values()).map(state => ({
        ...state,
        proxyBids: new Map(state.proxyBids),
      }))
    } catch (error) {
      logger.error('Failed to get all auction states:', error)
      return []
    }
  }

  // Live stream viewer tracking
  async addViewer(liveId: string, userId: string): Promise<number> {
    try {
      if (!this.viewers.has(liveId)) {
        this.viewers.set(liveId, new Set())
      }
      this.viewers.get(liveId)!.add(userId)
      return this.viewers.get(liveId)!.size
    } catch (error) {
      logger.error(`Failed to add viewer ${userId} to live ${liveId}:`, error)
      return 0
    }
  }

  async removeViewer(liveId: string, userId: string): Promise<number> {
    try {
      const viewerSet = this.viewers.get(liveId)
      if (viewerSet) {
        viewerSet.delete(userId)
        if (viewerSet.size === 0) {
          this.viewers.delete(liveId)
        }
        return viewerSet.size
      }
      return 0
    } catch (error) {
      logger.error(
        `Failed to remove viewer ${userId} from live ${liveId}:`,
        error
      )
      return 0
    }
  }

  async getViewerCount(liveId: string): Promise<number> {
    try {
      return this.viewers.get(liveId)?.size || 0
    } catch (error) {
      logger.error(`Failed to get viewer count for live ${liveId}:`, error)
      return 0
    }
  }

  async getViewers(liveId: string): Promise<string[]> {
    try {
      return Array.from(this.viewers.get(liveId) || [])
    } catch (error) {
      logger.error(`Failed to get viewers for live ${liveId}:`, error)
      return []
    }
  }

  // Rate limiting
  async checkRateLimit(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<{ allowed: boolean; remaining: number }> {
    try {
      const now = Date.now()
      const rateLimitData = this.rateLimits.get(key)

      if (!rateLimitData || now > rateLimitData.resetTime) {
        // Reset or create new rate limit window
        this.rateLimits.set(key, { count: 1, resetTime: now + windowMs })
        return { allowed: true, remaining: limit - 1 }
      }

      if (rateLimitData.count >= limit) {
        return { allowed: false, remaining: 0 }
      }

      rateLimitData.count++
      return { allowed: true, remaining: limit - rateLimitData.count }
    } catch (error) {
      logger.error(`Failed to check rate limit for key ${key}:`, error)
      // Allow request on error to avoid blocking legitimate traffic
      return { allowed: true, remaining: limit - 1 }
    }
  }

  // Cache management
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined
      this.cache.set(key, { value, expiry })
    } catch (error) {
      logger.error(`Failed to set cache key ${key}:`, error)
      throw error
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      const cached = this.cache.get(key)
      if (!cached) return null

      if (cached.expiry && Date.now() > cached.expiry) {
        this.cache.delete(key)
        return null
      }

      return cached.value
    } catch (error) {
      logger.error(`Failed to get cache key ${key}:`, error)
      return null
    }
  }

  async del(key: string): Promise<void> {
    try {
      this.cache.delete(key)
    } catch (error) {
      logger.error(`Failed to delete cache key ${key}:`, error)
    }
  }

  // Health check
  async ping(): Promise<boolean> {
    return true
  }

  // Pub/Sub for real-time events (simplified for in-memory)
  async publish(channel: string, message: string): Promise<void> {
    // In-memory implementation doesn't need pub/sub since everything is in the same process
    logger.debug(`Published to channel ${channel}: ${message}`)
  }

  // Get connection status
  isReady(): boolean {
    return true
  }

  // Cleanup expired keys
  async cleanup(): Promise<void> {
    try {
      const now = Date.now()

      // Clean up expired cache entries
      for (const [key, cached] of this.cache.entries()) {
        if (cached.expiry && now > cached.expiry) {
          this.cache.delete(key)
        }
      }

      // Clean up expired rate limits
      for (const [key, rateLimitData] of this.rateLimits.entries()) {
        if (now > rateLimitData.resetTime) {
          this.rateLimits.delete(key)
        }
      }

      logger.debug('In-memory cleanup completed')
    } catch (error) {
      logger.error('In-memory cleanup failed:', error)
    }
  }

  // Connection methods for compatibility
  async connect(): Promise<void> {
    logger.info('In-memory service initialized')
  }

  async disconnect(): Promise<void> {
    this.auctionStates.clear()
    this.viewers.clear()
    this.rateLimits.clear()
    this.cache.clear()
    logger.info('In-memory service cleared')
  }
}
