import { useState, useEffect, useRef } from 'react'

import { useAuth } from '../contexts/AuthContext'
import {
  AuctionEngine,
  AuctionItem,
  Bid,
  formatTimeLeft,
  getTimerColor,
} from '../services/auctionEngine'

interface AuctionPanelProps {
  liveId: string
  currentItem?: AuctionItem
  onItemChange?: (item: AuctionItem) => void
}

export default function AuctionPanel({
  liveId,
  currentItem,
  onItemChange,
}: AuctionPanelProps) {
  const { currentUser } = useAuth()
  const [bidAmount, setBidAmount] = useState('')
  const [maxBidAmount, setMaxBidAmount] = useState('')
  const [recentBids, setRecentBids] = useState<Bid[]>([])
  const [timeLeft, setTimeLeft] = useState(0)
  const recentBidsRef = useRef<Bid[]>([])
  const timeLeftRef = useRef(0)
  const [isPlacingBid, setIsPlacingBid] = useState(false)
  const [bidError, setBidError] = useState('')
  const [showMaxBid, setShowMaxBid] = useState(false)

  const auctionEngineRef = useRef<AuctionEngine>()
  const timerRef = useRef<NodeJS.Timeout>()

  // Initialize auction engine
  useEffect(() => {
    if (liveId) {
      auctionEngineRef.current = new AuctionEngine(liveId)
    }

    return () => {
      auctionEngineRef.current?.unsubscribe()
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [liveId])

  // Subscribe to current item updates
  useEffect(() => {
    if (!currentItem?.id || !auctionEngineRef.current) return

    auctionEngineRef.current.subscribeToItem(currentItem.id, {
      onStateUpdate: item => {
        onItemChange?.(item)
        // Update minimum bid amount
        if (auctionEngineRef.current) {
          const minBid = auctionEngineRef.current.calculateMinimumBid(
            item.currentPrice
          )
          setBidAmount(minBid.toFixed(2))
        }
      },
      onBidUpdate: bid => {
        const newBids = [bid, ...recentBidsRef.current.slice(0, 9)]
        recentBidsRef.current = newBids
        setRecentBids(newBids)
      },
      onTimerUpdate: (_, timeLeftMs) => {
        timeLeftRef.current = timeLeftMs
        setTimeLeft(timeLeftMs)
      },
    })

    // Start local timer for smooth countdown
    if (currentItem.status === 'running') {
      timerRef.current = setInterval(() => {
        const newTime = Math.max(0, timeLeftRef.current - 1000)
        timeLeftRef.current = newTime
        setTimeLeft(newTime)
      }, 1000)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [currentItem?.id, onItemChange])

  const handlePlaceBid = async () => {
    if (!currentUser || !currentItem || !auctionEngineRef.current) return

    const amount = parseFloat(bidAmount)
    if (isNaN(amount)) {
      setBidError('Please enter a valid bid amount')
      return
    }

    const validation = auctionEngineRef.current.validateBid(
      amount,
      currentItem.currentPrice
    )
    if (!validation.valid) {
      setBidError(validation.error || 'Invalid bid amount')
      return
    }

    setIsPlacingBid(true)
    setBidError('')

    try {
      await auctionEngineRef.current.placeBid(
        currentItem.id,
        amount,
        currentUser.uid,
        currentUser.displayName || 'Anonymous'
      )

      // Update bid amount to next minimum
      const nextMinBid = auctionEngineRef.current.calculateMinimumBid(amount)
      setBidAmount(nextMinBid.toFixed(2))
    } catch (error) {
      setBidError('Failed to place bid. Please try again.')
      console.error('Bid error:', error)
    } finally {
      setIsPlacingBid(false)
    }
  }

  const handleSetMaxBid = async () => {
    if (!currentUser || !currentItem || !auctionEngineRef.current) return

    const amount = parseFloat(maxBidAmount)
    if (isNaN(amount)) {
      setBidError('Please enter a valid maximum bid amount')
      return
    }

    if (amount <= currentItem.currentPrice) {
      setBidError('Maximum bid must be higher than current price')
      return
    }

    try {
      await auctionEngineRef.current.setMaxBid(
        currentItem.id,
        amount,
        currentUser.uid
      )
      setMaxBidAmount('')
      setShowMaxBid(false)
    } catch (error) {
      setBidError('Failed to set maximum bid. Please try again.')
      console.error('Max bid error:', error)
    }
  }

  if (!currentItem) {
    return (
      <div className='bg-white rounded-lg shadow-lg p-6'>
        <div className='text-center py-8 text-gray-500'>
          <h3 className='text-lg font-medium mb-2'>No Active Auction</h3>
          <p className='text-sm'>Waiting for the next item...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='bg-white rounded-lg shadow-lg overflow-hidden'>
      {/* Item Header */}
      <div className='bg-gradient-to-r from-coral-500 to-ocean-500 text-white p-4'>
        <div className='flex items-center justify-between'>
          <div>
            <h3 className='font-semibold text-lg'>{currentItem.title}</h3>
            <p className='text-sm opacity-90'>{currentItem.category}</p>
          </div>
          <div className='text-right'>
            <span
              className={`text-xs px-2 py-1 rounded ${
                currentItem.mode === 'classic' ? 'bg-blue-500' : 'bg-orange-500'
              }`}
            >
              {currentItem.mode.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Current Price & Timer */}
      <div className='p-4 border-b'>
        <div className='flex items-center justify-between mb-2'>
          <div>
            <p className='text-sm text-gray-600'>Current Price</p>
            <p className='text-2xl font-bold text-gray-900'>
              ${currentItem.currentPrice.toFixed(2)}
            </p>
          </div>
          {currentItem.status === 'running' && (
            <div className='text-right'>
              <p className='text-sm text-gray-600'>Time Left</p>
              <p className={`text-xl font-bold ${getTimerColor(timeLeft)}`}>
                {formatTimeLeft(timeLeft)}
              </p>
            </div>
          )}
        </div>

        {currentItem.leadingBidderId && (
          <p className='text-sm text-gray-600'>
            Leading bidder:{' '}
            {currentItem.leadingBidderId === currentUser?.uid
              ? 'You'
              : 'Anonymous'}
          </p>
        )}
      </div>

      {/* Bidding Interface */}
      {currentItem.status === 'running' && currentUser && (
        <div className='p-4 border-b'>
          <div className='space-y-3'>
            {/* Quick Bid */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Your Bid
              </label>
              <div className='flex space-x-2'>
                <input
                  type='number'
                  value={bidAmount}
                  onChange={e => setBidAmount(e.target.value)}
                  placeholder='0.00'
                  step='0.01'
                  min={currentItem.currentPrice + 0.01}
                  className='flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500'
                />
                <button
                  onClick={handlePlaceBid}
                  disabled={isPlacingBid || timeLeft <= 0}
                  className='btn-primary px-6 disabled:opacity-50'
                >
                  {isPlacingBid ? 'Bidding...' : 'Bid'}
                </button>
              </div>
            </div>

            {/* Max Bid Toggle */}
            <div className='flex items-center justify-between'>
              <button
                onClick={() => setShowMaxBid(!showMaxBid)}
                className='text-sm text-coral-600 hover:text-coral-700 font-medium'
              >
                {showMaxBid ? 'Hide' : 'Set'} Maximum Bid
              </button>
              {auctionEngineRef.current && (
                <p className='text-xs text-gray-500'>
                  Min: $
                  {auctionEngineRef.current
                    .calculateMinimumBid(currentItem.currentPrice)
                    .toFixed(2)}
                </p>
              )}
            </div>

            {/* Max Bid Input */}
            {showMaxBid && (
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Maximum Bid (Auto-bid up to this amount)
                </label>
                <div className='flex space-x-2'>
                  <input
                    type='number'
                    value={maxBidAmount}
                    onChange={e => setMaxBidAmount(e.target.value)}
                    placeholder='0.00'
                    step='0.01'
                    min={currentItem.currentPrice + 0.01}
                    className='flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500'
                  />
                  <button
                    onClick={handleSetMaxBid}
                    className='btn-secondary px-4'
                  >
                    Set
                  </button>
                </div>
              </div>
            )}

            {/* Error Message */}
            {bidError && <p className='text-sm text-red-600'>{bidError}</p>}
          </div>
        </div>
      )}

      {/* Auction Status */}
      {currentItem.status !== 'running' && (
        <div className='p-4 border-b'>
          <div className='text-center py-4'>
            {currentItem.status === 'queued' && (
              <p className='text-gray-600'>Auction starting soon...</p>
            )}
            {currentItem.status === 'sold' && (
              <div>
                <p className='text-green-600 font-medium'>SOLD!</p>
                <p className='text-sm text-gray-600'>
                  Final price: ${currentItem.currentPrice.toFixed(2)}
                </p>
              </div>
            )}
            {currentItem.status === 'unsold' && (
              <p className='text-gray-600'>No bids received</p>
            )}
          </div>
        </div>
      )}

      {/* Recent Bids */}
      <div className='p-4'>
        <h4 className='font-medium text-gray-900 mb-3'>Recent Bids</h4>
        <div className='space-y-2 max-h-32 overflow-y-auto'>
          {recentBids.length > 0 ? (
            recentBids.map(bid => (
              <div
                key={bid.id}
                className='flex items-center justify-between text-sm'
              >
                <span className='text-gray-600'>
                  {bid.username} {bid.source === 'auto' && '(auto)'}
                </span>
                <span className='font-medium'>${bid.amount.toFixed(2)}</span>
              </div>
            ))
          ) : (
            <p className='text-sm text-gray-500'>No bids yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
