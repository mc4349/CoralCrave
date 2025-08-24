// Auction Engine Service - Client-side interface for real-time bidding
import { doc, collection, onSnapshot, addDoc, updateDoc, serverTimestamp, query, orderBy, limit } from 'firebase/firestore'
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
  { lt: Infinity, inc: 10 }
]

export class AuctionEngine {
  private liveId: string
  private unsubscribers: (() => void)[] = []
  private onStateUpdate?: (item: AuctionItem) => void
  private onBidUpdate?: (bid: Bid) => void
  private onTimerUpdate?: (itemId: string, timeLeftMs: number) => void

  constructor(liveId: string) {
    this.liveId = liveId
  }

  // Subscribe to auction state updates
  subscribeToItem(itemId: string, callbacks: {
    onStateUpdate?: (item: AuctionItem) => void
    onBidUpdate?: (bid: Bid) => void
    onTimerUpdate?: (itemId: string, timeLeftMs: number) => void
  }) {
    this.onStateUpdate = callbacks.onStateUpdate
    this.onBidUpdate = callbacks.onBidUpdate
    this.onTimerUpdate = callbacks.onTimerUpdate

    // Subscribe to item state
    const itemRef = doc(db, 'livestreams', this.liveId, 'items', itemId)
    const unsubscribeItem = onSnapshot(itemRef, (doc) => {
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
    const bidsRef = collection(db, 'livestreams', this.liveId, 'items', itemId, 'bids')
    const bidsQuery = query(bidsRef, orderBy('timestamp', 'desc'), limit(10))
    const unsubscribeBids = onSnapshot(bidsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const bid = { id: change.doc.id, ...change.doc.data() } as Bid
          this.onBidUpdate?.(bid)
        }
      })
    })

    this.unsubscribers.push(unsubscribeItem, unsubscribeBids)
  }

  // Place a bid
  async placeBid(itemId: string, amount: number, userId: string, username: string): Promise<void> {
    try {
      const bidsRef = collection(db, 'livestreams', this.liveId, 'items', itemId, 'bids')
      await addDoc(bidsRef, {
        userId,
        username,
        amount,
        timestamp: serverTimestamp(),
        source: 'user'
      })
    } catch (error) {
      console.error('Failed to place bid:', error)
      throw error
    }
  }

  // Set maximum bid for proxy bidding
  async setMaxBid(itemId: string, maxAmount: number, userId: string): Promise<void> {
    try {
      const proxyBidRef = doc(db, 'livestreams', this.liveId, 'items', itemId, 'proxyBids', userId)
      await updateDoc(proxyBidRef, {
        maxAmount,
        updatedAt: serverTimestamp()
      })
    } catch (error) {
      console.error('Failed to set max bid:', error)
      throw error
    }
  }

  // Calculate minimum bid amount based on current price and increment rules
  calculateMinimumBid(currentPrice: number, incrementRules: IncrementRule[] = DEFAULT_INCREMENT_RULES): number {
    for (const rule of incrementRules) {
      if (currentPrice < rule.lt) {
        return currentPrice + rule.inc
      }
    }
    return currentPrice + incrementRules[incrementRules.length - 1].inc
  }

  // Validate bid amount
  validateBid(amount: number, currentPrice: number, incrementRules?: IncrementRule[]): {
    valid: boolean
    minimumBid: number
    error?: string
  } {
    const minimumBid = this.calculateMinimumBid(currentPrice, incrementRules)
    
    if (amount < minimumBid) {
      return {
        valid: false,
        minimumBid,
        error: `Minimum bid is $${minimumBid.toFixed(2)}`
      }
    }

    return { valid: true, minimumBid }
  }

  // Start timer for auction item (would typically be called by server)
  async startAuction(itemId: string, durationMs: number = 30000): Promise<void> {
    try {
      const itemRef = doc(db, 'livestreams', this.liveId, 'items', itemId)
      const endAt = new Date(Date.now() + durationMs)
      
      await updateDoc(itemRef, {
        status: 'running',
        endAt: endAt
      })
    } catch (error) {
      console.error('Failed to start auction:', error)
      throw error
    }
  }

  // End auction (would typically be called by server)
  async endAuction(itemId: string, winnerId?: string): Promise<void> {
    try {
      const itemRef = doc(db, 'livestreams', this.liveId, 'items', itemId)
      
      await updateDoc(itemRef, {
        status: winnerId ? 'sold' : 'unsold',
        winnerId,
        endAt: null
      })
    } catch (error) {
      console.error('Failed to end auction:', error)
      throw error
    }
  }

  // Clean up subscriptions
  unsubscribe() {
    this.unsubscribers.forEach(unsubscribe => unsubscribe())
    this.unsubscribers = []
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
