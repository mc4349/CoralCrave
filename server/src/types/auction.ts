export interface AuctionItem {
  id: string
  liveId: string
  title: string
  description: string
  images: string[]
  startingPrice: number
  currentPrice: number
  shipping: number
  category: 'coral' | 'fish' | 'equipment' | 'other'
  status: 'queued' | 'running' | 'sold' | 'unsold'
  mode: 'classic' | 'speed'
  incrementSchemeId: string
  endAt: number // Unix timestamp
  leadingBidderId?: string
  winnerId?: string
  orderId?: string
  createdAt: number
  updatedAt: number
}

export interface Bid {
  id: string
  itemId: string
  liveId: string
  userId: string
  username: string
  amount: number
  timestamp: number
  source: 'user' | 'auto' // auto for proxy bids
  isValid: boolean
}

export interface ProxyBid {
  userId: string
  itemId: string
  maxAmount: number
  currentAmount: number
  isActive: boolean
  createdAt: number
  updatedAt: number
}

export interface IncrementRule {
  lt: number // less than
  inc: number // increment
}

export interface AuctionState {
  itemId: string
  liveId: string
  status: 'queued' | 'running' | 'finalizing' | 'closed'
  currentPrice: number
  leadingBidderId?: string
  leadingBidderUsername?: string
  timeLeftMs: number
  endAt: number
  mode: 'classic' | 'speed'
  bidCount: number
  viewerCount: number
  proxyBids: Map<string, ProxyBid>
  recentBids: Bid[]
  incrementRules: IncrementRule[]
}

export interface SocketEvents {
  // Client to Server
  joinLive: (data: { liveId: string; userId?: string }) => void
  leaveLive: (data: { liveId: string }) => void
  placeBid: (data: {
    liveId: string
    itemId: string
    amount: number
    userId: string
    username: string
  }) => void
  setMaxBid: (data: {
    liveId: string
    itemId: string
    maxAmount: number
    userId: string
  }) => void
  requestState: (data: { liveId: string; itemId: string }) => void

  // Server to Client
  auctionState: (data: AuctionState) => void
  bidPlaced: (data: {
    itemId: string
    bid: Bid
    newPrice: number
    leaderId?: string
  }) => void
  timerUpdate: (data: { itemId: string; timeLeftMs: number }) => void
  auctionClosed: (data: {
    itemId: string
    winnerId?: string
    finalPrice: number
  }) => void
  error: (data: { message: string; code?: string }) => void
  viewerCountUpdate: (data: { liveId: string; count: number }) => void
}

export interface AuctionConfig {
  classicTimerSeconds: number
  speedTimerSeconds: number
  graceMs: number
  minBidIncrement: number
  maxProxyBids: number
  bidHistoryLimit: number
}

export const DEFAULT_AUCTION_CONFIG: AuctionConfig = {
  classicTimerSeconds: 20,
  speedTimerSeconds: 10,
  graceMs: 400,
  minBidIncrement: 1,
  maxProxyBids: 5,
  bidHistoryLimit: 50,
}

export const DEFAULT_INCREMENT_RULES: IncrementRule[] = [
  { lt: 20, inc: 1 },
  { lt: 100, inc: 2 },
  { lt: 500, inc: 5 },
  { lt: Infinity, inc: 10 },
]
