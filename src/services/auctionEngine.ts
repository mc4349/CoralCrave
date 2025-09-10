// Auction Engine Service - Client-side interface for real-time bidding
import {
  doc,
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
} from 'firebase/firestore'
import { io, Socket } from 'socket.io-client'

import { db } from '../lib/firebase'

export interface Bid {
  id: string
  userId: string
  username: string
  amount: number
  timestamp: any
  source: 'user' | 'auto'
}

export interface ProxyBid {
  userId: string
  maxAmount: number
  updatedAt: any
}

export interface AuctionItem {
  id: string
  liveId: string
  title: string
  description: string
  images: string[]
  startingPrice: number
  currentPrice: number
  status: 'queued' | 'running' | 'sold' | 'unsold'
  mode: 'classic' | 'speed'
  category: string
  leadingBidderId?: string
  winnerId?: string
  endAt?: any
  timeLeftMs?: number
  incrementSchemeId: string
}

export interface IncrementRule {
  lt: number // less than
  inc: number // increment
}

// Default increment ladder
export const DEFAULT_INCREMENT_RULES: IncrementRule[] = [
  { lt: 20, inc: 1 },
  { lt: 100, inc: 2 },
  { lt: 500, inc: 5 },
  { lt: Infinity, inc: 10 },
]

export class AuctionEngine {
  private liveId: string
  private unsubscribers: (() => void)[] = []
  private onStateUpdate?: (item: AuctionItem) => void
  private onBidUpdate?: (bid: Bid) => void
  private onTimerUpdate?: (itemId: string, timeLeftMs: number) => void
  private socket: Socket | null = null

  constructor(liveId: string) {
    this.liveId = liveId
    this.initializeSocket()
  }

  private initializeSocket() {
    // Connect to the server's socket - temporarily use local server for testing CORS fixes
    const isProduction = window.location.hostname !== 'localhost'
    const serverUrl = isProduction
      ? import.meta.env.VITE_PROD_SERVER_URL || 'http://localhost:3001' // Temporarily use local server
      : import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

    console.log('Connecting to auction server:', serverUrl)
    this.socket = io(serverUrl)

    // Set up socket event listeners
    this.socket.on('connect', () => {
      console.log('Connected to auction server')
      // Join the livestream room
      this.socket?.emit('joinLive', { liveId: this.liveId })
    })

    this.socket.on('disconnect', () => {
      console.log('Disconnected from auction server')
    })

    this.socket.on('error', (error: { message: string }) => {
      console.error('Socket error:', error.message)
    })

    // Listen for auction state updates
    this.socket.on('auctionState', (auctionState: any) => {
      // Convert server auction state to client auction item format
      const item: AuctionItem = {
        id: auctionState.itemId,
        liveId: auctionState.liveId,
        title: '', // Will be filled from Firebase
        description: '',
        images: [],
        startingPrice: 0,
        currentPrice: auctionState.currentPrice,
        status: auctionState.status,
        mode: auctionState.mode,
        category: '',
        leadingBidderId: auctionState.leadingBidderId,
        timeLeftMs: auctionState.timeLeftMs,
        incrementSchemeId: '',
      }
      this.onStateUpdate?.(item)
    })

    // Listen for bid updates
    this.socket.on(
      'bidPlaced',
      (data: {
        itemId: string
        bid: Bid
        newPrice: number
        leaderId: string
      }) => {
        this.onBidUpdate?.(data.bid)
      }
    )

    // Listen for timer updates
    this.socket.on(
      'timerUpdate',
      (data: { itemId: string; timeLeftMs: number }) => {
        this.onTimerUpdate?.(data.itemId, data.timeLeftMs)
      }
    )

    // Listen for auction closed events
    this.socket.on(
      'auctionClosed',
      (data: { itemId: string; winnerId?: string; finalPrice: number }) => {
        console.log('Auction closed:', data)
      }
    )
  }

  // Subscribe to auction state updates
  subscribeToItem(
    itemId: string,
    callbacks: {
      onStateUpdate?: (item: AuctionItem) => void
      onBidUpdate?: (bid: Bid) => void
      onTimerUpdate?: (itemId: string, timeLeftMs: number) => void
    }
  ) {
    this.onStateUpdate = callbacks.onStateUpdate
    this.onBidUpdate = callbacks.onBidUpdate
    this.onTimerUpdate = callbacks.onTimerUpdate

    // Subscribe to item state
    const itemRef = doc(db, 'livestreams', this.liveId, 'items', itemId)
    const unsubscribeItem = onSnapshot(itemRef, doc => {
      if (doc.exists()) {
        const item = { id: doc.id, ...doc.data() } as AuctionItem
        this.onStateUpdate?.(item)

        // Calculate time left if auction is running
        if (item.status === 'running' && item.endAt) {
          const timeLeft = item.endAt.toMillis() - Date.now()
          this.onTimerUpdate?.(itemId, Math.max(0, timeLeft))
        }
      }
    })

    // Subscribe to latest bids
    const bidsRef = collection(
      db,
      'livestreams',
      this.liveId,
      'items',
      itemId,
      'bids'
    )
    const bidsQuery = query(bidsRef, orderBy('timestamp', 'desc'), limit(10))
    const unsubscribeBids = onSnapshot(bidsQuery, snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const bid = { id: change.doc.id, ...change.doc.data() } as Bid
          this.onBidUpdate?.(bid)
        }
      })
    })

    this.unsubscribers.push(unsubscribeItem, unsubscribeBids)
  }

  // Place a bid using Cloud Function for atomic transactions
  async placeBid(
    itemId: string,
    amount: number,
    userId: string,
    username: string
  ): Promise<void> {
    try {
      // Use Cloud Function for atomic bidding
      const { getFunctions, httpsCallable } = await import('firebase/functions')
      const { getApp } = await import('firebase/app')

      const placeBidFn = httpsCallable(getFunctions(getApp()), 'placeBid')
      const result = await placeBidFn({
        streamId: this.liveId,
        productId: itemId,
        amount,
      })

      console.log('Bid placed successfully:', result.data)

      // The Cloud Function will update Firestore, which will trigger our listeners
      // No need to emit socket events as the real-time listeners will handle updates
    } catch (error) {
      console.error('Failed to place bid:', error)
      throw error
    }
  }

  // Set maximum bid for proxy bidding
  async setMaxBid(
    itemId: string,
    maxAmount: number,
    userId: string
  ): Promise<void> {
    try {
      if (!this.socket) {
        throw new Error('Socket not connected')
      }

      // Send max bid through socket to server
      this.socket.emit('setMaxBid', {
        liveId: this.liveId,
        itemId,
        maxAmount,
        userId,
      })
    } catch (error) {
      console.error('Failed to set max bid:', error)
      throw error
    }
  }

  // Calculate minimum bid amount based on current price and increment rules
  calculateMinimumBid(
    currentPrice: number,
    incrementRules: IncrementRule[] = DEFAULT_INCREMENT_RULES
  ): number {
    for (const rule of incrementRules) {
      if (currentPrice < rule.lt) {
        return currentPrice + rule.inc
      }
    }
    return currentPrice + incrementRules[incrementRules.length - 1].inc
  }

  // Validate bid amount
  validateBid(
    amount: number,
    currentPrice: number,
    incrementRules?: IncrementRule[]
  ): {
    valid: boolean
    minimumBid: number
    error?: string
  } {
    const minimumBid = this.calculateMinimumBid(currentPrice, incrementRules)

    if (amount < minimumBid) {
      return {
        valid: false,
        minimumBid,
        error: `Minimum bid is $${minimumBid.toFixed(2)}`,
      }
    }

    return { valid: true, minimumBid }
  }

  // Clean up subscriptions
  unsubscribe() {
    this.unsubscribers.forEach(unsubscribe => unsubscribe())
    this.unsubscribers = []

    // Disconnect socket
    if (this.socket) {
      this.socket.emit('leaveLive', { liveId: this.liveId })
      this.socket.disconnect()
      this.socket = null
    }
  }

  // Request current auction state
  requestAuctionState(itemId: string) {
    if (this.socket) {
      this.socket.emit('requestState', { liveId: this.liveId, itemId })
    }
  }

  // Start auction (host only)
  startAuction(itemId: string, userId: string): void {
    if (this.socket) {
      this.socket.emit('startAuction', { liveId: this.liveId, itemId, userId })
    }
  }

  // Stop auction (host only)
  stopAuction(itemId: string, userId: string): void {
    if (this.socket) {
      this.socket.emit('stopAuction', { liveId: this.liveId, itemId, userId })
    }
  }
}

// Utility functions for auction timing
export const formatTimeLeft = (timeLeftMs: number): string => {
  if (timeLeftMs <= 0) return '0s'

  const seconds = Math.ceil(timeLeftMs / 1000)
  if (seconds < 60) return `${seconds}s`

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export const getTimerColor = (timeLeftMs: number): string => {
  if (timeLeftMs <= 10000) return 'text-red-500' // Last 10 seconds
  if (timeLeftMs <= 30000) return 'text-orange-500' // Last 30 seconds
  return 'text-green-500' // More than 30 seconds
}
