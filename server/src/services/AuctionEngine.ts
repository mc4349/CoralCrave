import { EventEmitter } from 'events'

import { v4 as uuidv4 } from 'uuid'

import {
  AuctionItem,
  AuctionState,
  Bid,
  ProxyBid,
  IncrementRule,
  DEFAULT_AUCTION_CONFIG,
  DEFAULT_INCREMENT_RULES,
} from '../types/auction'
import { logger } from '../utils/logger'

import { RedisService } from './RedisService'
import { FirebaseService } from './FirebaseService'

export class AuctionEngine extends EventEmitter {
  private activeAuctions = new Map<string, AuctionState>()
  private timers = new Map<string, NodeJS.Timeout>()
  private redis: RedisService
  private firebase: FirebaseService

  constructor(redis: RedisService, firebase: FirebaseService) {
    super()
    this.redis = redis
    this.firebase = firebase
    this.setupCleanupInterval()
  }

  // Start an auction for an item
  async startAuction(item: AuctionItem): Promise<void> {
    try {
      const now = Date.now()
      const timerDuration =
        item.mode === 'classic'
          ? DEFAULT_AUCTION_CONFIG.classicTimerSeconds * 1000
          : DEFAULT_AUCTION_CONFIG.speedTimerSeconds * 1000

      const auctionState: AuctionState = {
        itemId: item.id,
        liveId: item.liveId,
        status: 'running',
        currentPrice: item.startingPrice,
        timeLeftMs: timerDuration,
        endAt: now + timerDuration,
        mode: item.mode,
        bidCount: 0,
        viewerCount: 0,
        proxyBids: new Map(),
        recentBids: [],
        incrementRules: DEFAULT_INCREMENT_RULES,
      }

      this.activeAuctions.set(item.id, auctionState)
      await this.redis.setAuctionState(item.id, auctionState)

      // Start timer
      this.startTimer(item.id)

      // Update item status in Firebase
      await this.firebase.updateItemStatus(
        item.liveId,
        item.id,
        'running',
        now + timerDuration
      )

      logger.info(`Started ${item.mode} auction for item ${item.id}`)
      this.emit('auctionStarted', auctionState)
    } catch (error) {
      logger.error(`Failed to start auction for item ${item.id}:`, error)
      throw error
    }
  }

  // Place a bid
  async placeBid(
    itemId: string,
    userId: string,
    username: string,
    amount: number,
    liveId: string
  ): Promise<{ success: boolean; message?: string; newState?: AuctionState }> {
    try {
      const auction = this.activeAuctions.get(itemId)
      if (!auction) {
        return { success: false, message: 'Auction not found or not active' }
      }

      if (auction.status !== 'running') {
        return { success: false, message: 'Auction is not currently running' }
      }

      const now = Date.now()
      const graceEndTime = auction.endAt + DEFAULT_AUCTION_CONFIG.graceMs

      // Check if bid is too late (beyond grace period)
      if (now > graceEndTime) {
        return { success: false, message: 'Bid submitted too late' }
      }

      // Validate bid amount
      const minBid = this.calculateMinimumBid(
        auction.currentPrice,
        auction.incrementRules
      )
      if (amount < minBid) {
        return {
          success: false,
          message: `Minimum bid is $${minBid.toFixed(2)}`,
        }
      }

      // Check if user is already leading
      if (auction.leadingBidderId === userId) {
        return { success: false, message: 'You are already the leading bidder' }
      }

      // Create bid
      const bid: Bid = {
        id: uuidv4(),
        itemId,
        liveId,
        userId,
        username,
        amount,
        timestamp: now,
        source: 'user',
        isValid: true,
      }

      // Process the bid
      const result = await this.processBid(auction, bid)
      if (!result.success) {
        return result
      }

      // Handle timer reset for classic auctions
      if (auction.mode === 'classic') {
        const timeLeft = auction.endAt - now
        if (timeLeft < 10000) {
          // Less than 10 seconds
          auction.endAt = now + 10000 // Reset to 10 seconds
          auction.timeLeftMs = 10000
          this.restartTimer(itemId)
          logger.info(`Timer reset for classic auction ${itemId}`)
        }
      }

      // Update state
      await this.redis.setAuctionState(itemId, auction)

      // Emit events
      this.emit('bidPlaced', {
        itemId,
        bid,
        newPrice: auction.currentPrice,
        leaderId: auction.leadingBidderId,
      })

      return { success: true, newState: auction }
    } catch (error) {
      logger.error(`Failed to place bid for item ${itemId}:`, error)
      return { success: false, message: 'Internal server error' }
    }
  }

  // Set maximum bid (proxy bidding)
  async setMaxBid(
    itemId: string,
    userId: string,
    maxAmount: number
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const auction = this.activeAuctions.get(itemId)
      if (!auction) {
        return { success: false, message: 'Auction not found or not active' }
      }

      if (auction.status !== 'running') {
        return { success: false, message: 'Auction is not currently running' }
      }

      // Validate max bid amount
      const minBid = this.calculateMinimumBid(
        auction.currentPrice,
        auction.incrementRules
      )
      if (maxAmount < minBid) {
        return {
          success: false,
          message: `Maximum bid must be at least $${minBid.toFixed(2)}`,
        }
      }

      // Check proxy bid limit
      if (auction.proxyBids.size >= DEFAULT_AUCTION_CONFIG.maxProxyBids) {
        const existingProxyBid = auction.proxyBids.get(userId)
        if (!existingProxyBid) {
          return {
            success: false,
            message: 'Maximum number of proxy bidders reached',
          }
        }
      }

      // Set or update proxy bid
      const proxyBid: ProxyBid = {
        userId,
        itemId,
        maxAmount,
        currentAmount: Math.max(auction.currentPrice, minBid),
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      auction.proxyBids.set(userId, proxyBid)

      // Process proxy bidding logic
      await this.processProxyBids(auction)

      // Update state
      await this.redis.setAuctionState(itemId, auction)

      logger.info(
        `Set max bid of $${maxAmount} for user ${userId} on item ${itemId}`
      )
      return { success: true }
    } catch (error) {
      logger.error(`Failed to set max bid for item ${itemId}:`, error)
      return { success: false, message: 'Internal server error' }
    }
  }

  // Get auction state
  getAuctionState(itemId: string): AuctionState | null {
    return this.activeAuctions.get(itemId) || null
  }

  // Stop an auction
  async stopAuction(itemId: string): Promise<void> {
    try {
      const auction = this.activeAuctions.get(itemId)
      if (!auction) {
        logger.warn(`Attempted to stop non-existent auction: ${itemId}`)
        return
      }

      // Clear timer
      const timer = this.timers.get(itemId)
      if (timer) {
        clearTimeout(timer)
        this.timers.delete(itemId)
      }

      // Finalize auction
      await this.finalizeAuction(auction)
    } catch (error) {
      logger.error(`Failed to stop auction ${itemId}:`, error)
      throw error
    }
  }

  // Private methods

  private async processBid(
    auction: AuctionState,
    bid: Bid
  ): Promise<{ success: boolean; message?: string }> {
    // Update auction state
    auction.currentPrice = bid.amount
    auction.leadingBidderId = bid.userId
    auction.leadingBidderUsername = bid.username
    auction.bidCount++
    auction.recentBids.unshift(bid)

    // Limit bid history
    if (auction.recentBids.length > DEFAULT_AUCTION_CONFIG.bidHistoryLimit) {
      auction.recentBids = auction.recentBids.slice(
        0,
        DEFAULT_AUCTION_CONFIG.bidHistoryLimit
      )
    }

    // Deactivate outbid proxy bids
    for (const [userId, proxyBid] of auction.proxyBids) {
      if (userId !== bid.userId && proxyBid.maxAmount <= bid.amount) {
        proxyBid.isActive = false
      }
    }

    // Save bid to Firebase
    await this.firebase.saveBid(bid)

    return { success: true }
  }

  private async processProxyBids(auction: AuctionState): Promise<void> {
    const sortedProxyBids = Array.from(auction.proxyBids.values())
      .filter(pb => pb.isActive)
      .sort((a, b) => b.maxAmount - a.maxAmount) // Highest max bid first

    if (sortedProxyBids.length === 0) return

    const highestProxyBid = sortedProxyBids[0]
    const secondHighestMax =
      sortedProxyBids[1]?.maxAmount || auction.currentPrice

    // Calculate the winning bid amount
    const increment = this.getIncrement(
      secondHighestMax,
      auction.incrementRules
    )
    const newBidAmount = Math.min(
      highestProxyBid.maxAmount,
      secondHighestMax + increment
    )

    if (newBidAmount > auction.currentPrice) {
      // Create auto bid
      const autoBid: Bid = {
        id: uuidv4(),
        itemId: auction.itemId,
        liveId: auction.liveId,
        userId: highestProxyBid.userId,
        username: 'Auto Bid', // We'd need to get the actual username
        amount: newBidAmount,
        timestamp: Date.now(),
        source: 'auto',
        isValid: true,
      }

      await this.processBid(auction, autoBid)

      // Update proxy bid current amount
      highestProxyBid.currentAmount = newBidAmount
      highestProxyBid.updatedAt = Date.now()

      this.emit('bidPlaced', {
        itemId: auction.itemId,
        bid: autoBid,
        newPrice: auction.currentPrice,
        leaderId: auction.leadingBidderId,
      })
    }
  }

  private calculateMinimumBid(
    currentPrice: number,
    incrementRules: IncrementRule[]
  ): number {
    const increment = this.getIncrement(currentPrice, incrementRules)
    return currentPrice + increment
  }

  private getIncrement(price: number, incrementRules: IncrementRule[]): number {
    for (const rule of incrementRules) {
      if (price < rule.lt) {
        return rule.inc
      }
    }
    return incrementRules[incrementRules.length - 1].inc
  }

  private startTimer(itemId: string): void {
    const auction = this.activeAuctions.get(itemId)
    if (!auction) return

    const updateInterval = 100 // Update every 100ms for smooth countdown

    const timer = setInterval(() => {
      const now = Date.now()
      auction.timeLeftMs = Math.max(0, auction.endAt - now)

      // Emit timer update
      this.emit('timerUpdate', {
        itemId,
        timeLeftMs: auction.timeLeftMs,
      })

      // Check if auction should end
      if (now >= auction.endAt + DEFAULT_AUCTION_CONFIG.graceMs) {
        clearInterval(timer)
        this.timers.delete(itemId)
        this.finalizeAuction(auction)
      }
    }, updateInterval)

    this.timers.set(itemId, timer)
  }

  private restartTimer(itemId: string): void {
    // Clear existing timer
    const existingTimer = this.timers.get(itemId)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Start new timer
    this.startTimer(itemId)
  }

  private async finalizeAuction(auction: AuctionState): Promise<void> {
    try {
      auction.status = 'finalizing'

      logger.info(`Finalizing auction for item ${auction.itemId}`)

      // Determine winner
      const winnerId = auction.leadingBidderId
      const finalPrice = auction.currentPrice

      // Update auction status
      auction.status = 'closed'
      await this.redis.setAuctionState(auction.itemId, auction)

      // Update item in Firebase
      await this.firebase.updateItemStatus(
        auction.liveId,
        auction.itemId,
        winnerId ? 'sold' : 'unsold',
        Date.now(),
        winnerId,
        finalPrice
      )

      // Create order if there's a winner
      if (winnerId && finalPrice > 0) {
        await this.firebase.createOrder(
          auction.itemId,
          auction.liveId,
          winnerId,
          finalPrice
        )
      }

      // Clean up
      this.activeAuctions.delete(auction.itemId)
      await this.redis.deleteAuctionState(auction.itemId)

      // Emit auction closed event
      this.emit('auctionClosed', {
        itemId: auction.itemId,
        winnerId,
        finalPrice,
      })

      logger.info(
        `Auction finalized for item ${auction.itemId}. Winner: ${winnerId || 'none'}, Price: $${finalPrice}`
      )
    } catch (error) {
      logger.error(`Failed to finalize auction ${auction.itemId}:`, error)
      // Set status to closed anyway to prevent hanging auctions
      auction.status = 'closed'
      this.activeAuctions.delete(auction.itemId)
    }
  }

  private setupCleanupInterval(): void {
    // Clean up expired auctions every minute
    setInterval(() => {
      const now = Date.now()
      for (const [itemId, auction] of this.activeAuctions) {
        if (
          auction.status === 'running' &&
          now > auction.endAt + DEFAULT_AUCTION_CONFIG.graceMs + 60000
        ) {
          logger.warn(`Force closing expired auction: ${itemId}`)
          this.finalizeAuction(auction)
        }
      }
    }, 60000)
  }

  // Public methods for external access
  getActiveAuctionCount(): number {
    return this.activeAuctions.size
  }

  getActiveAuctions(): AuctionState[] {
    return Array.from(this.activeAuctions.values())
  }

  async recoverAuctionsFromRedis(): Promise<void> {
    try {
      const auctionStates = await this.redis.getAllAuctionStates()
      for (const state of auctionStates) {
        if (state.status === 'running') {
          this.activeAuctions.set(state.itemId, state)

          // Restart timer if auction is still valid
          const now = Date.now()
          if (now < state.endAt + DEFAULT_AUCTION_CONFIG.graceMs) {
            this.startTimer(state.itemId)
            logger.info(`Recovered running auction: ${state.itemId}`)
          } else {
            // Finalize expired auction
            await this.finalizeAuction(state)
          }
        }
      }
      logger.info(`Recovered ${auctionStates.length} auction states from Redis`)
    } catch (error) {
      logger.error('Failed to recover auctions from Redis:', error)
    }
  }
}
