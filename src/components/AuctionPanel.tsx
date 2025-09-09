import React, { useState, useEffect, useRef } from 'react'
import { db } from '../lib/firebase'
import { collection, onSnapshot, query, orderBy, limit, where, doc, getDoc, getDocs, updateDoc, addDoc } from 'firebase/firestore'
import { useAuth } from '../contexts/AuthContext'
import { chatService } from '../services/chatService'
import { httpsCallable, getFunctions } from 'firebase/functions'
import { getApp } from 'firebase/app'

interface Bid {
  id: string
  amount: number
  userId: string
  username: string
  timestamp: Date
  roomId: string
}

interface AuctionItem {
  id: string
  title: string
  description: string
  startingPrice: number
  imageUrl?: string
  category: string
  sellerId: string
  roomId: string
  status: 'queued' | 'active' | 'ended' | 'sold'
  createdAt: Date
}

interface Auction {
  id: string
  itemId: string
  title: string
  description: string
  startingPrice: number
  currentPrice: number
  shippingPrice?: number
  endTime: Date
  sellerId: string
  roomId: string
  status: 'active' | 'ended' | 'sold'
  winnerId?: string
  winnerUsername?: string
  bids: Bid[]
}

interface AuctionPanelProps {
  roomId: string
  isHost?: boolean
  className?: string
}

export default function AuctionPanel({ roomId, isHost = false, className = '' }: AuctionPanelProps) {
  const [auction, setAuction] = useState<Auction | null>(null)
  const [auctionQueue, setAuctionQueue] = useState<AuctionItem[]>([])
  const [bids, setBids] = useState<Bid[]>([])
  const [bidAmount, setBidAmount] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [timeLeft, setTimeLeft] = useState<string>('')
  const [winner, setWinner] = useState<{username: string, amount: number} | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [auctionForm, setAuctionForm] = useState({
    title: '',
    description: '',
    startingPrice: '',
    shippingPrice: '',
    duration: '10'
  })
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const { currentUser, userProfile } = useAuth()

  // Load auction queue (for sellers)
  useEffect(() => {
    if (!roomId || !isHost) return

    const queueQuery = query(
      collection(db, 'auctionItems'),
      where('roomId', '==', roomId),
      where('sellerId', '==', currentUser?.uid),
      orderBy('createdAt', 'asc')
    )

    const unsubscribe = onSnapshot(queueQuery, (snapshot) => {
      const items: AuctionItem[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        items.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
        } as AuctionItem)
      })
      setAuctionQueue(items)
    })

    return () => unsubscribe()
  }, [roomId, isHost, currentUser?.uid])

  // Load auction data
  useEffect(() => {
    if (!roomId) return

    const auctionQuery = query(
      collection(db, 'auctions'),
      where('roomId', '==', roomId),
      where('status', '==', 'active'),
      limit(1)
    )

    const unsubscribe = onSnapshot(auctionQuery, (snapshot) => {
      if (!snapshot.empty) {
        const auctionData = snapshot.docs[0].data() as Auction
        auctionData.id = snapshot.docs[0].id

        // Properly handle Firestore timestamp conversion
        if (auctionData.endTime) {
          // Handle Firestore Timestamp object
          if (auctionData.endTime && typeof auctionData.endTime === 'object' && 'toDate' in auctionData.endTime) {
            auctionData.endTime = (auctionData.endTime as any).toDate()
          } else if (auctionData.endTime instanceof Date) {
            // Already a Date object, keep as is
          } else {
            // Fallback: try to create Date from value
            try {
              auctionData.endTime = new Date(auctionData.endTime as any)
            } catch (error) {
              console.error('Invalid endTime format:', auctionData.endTime)
              auctionData.endTime = new Date(Date.now() + 60000) // Default to 1 minute from now
            }
          }
        } else {
          // If no endTime, set default
          auctionData.endTime = new Date(Date.now() + 60000) // Default to 1 minute from now
        }

        setAuction(auctionData)
        setWinner(null) // Reset winner when new auction starts
      } else {
        setAuction(null)
      }
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [roomId])

  // Load bids and sync current price
  useEffect(() => {
    if (!auction?.id) return

    const bidsQuery = query(
      collection(db, 'auctions', auction.id, 'bids'),
      orderBy('amount', 'desc'),
      orderBy('timestamp', 'desc'),
      limit(10)
    )

    const unsubscribe = onSnapshot(bidsQuery, (snapshot) => {
      const newBids: Bid[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        newBids.push({
          id: doc.id,
          amount: data.amount,
          userId: data.userId,
          username: data.username,
          timestamp: data.timestamp?.toDate() || new Date(),
          roomId: data.roomId,
        })
      })
      setBids(newBids)

      // Sync current price with highest bid
      if (newBids.length > 0) {
        const highestBid = newBids[0].amount
        setAuction(prev => {
          if (!prev) return null
          // Only update if the current price is different to avoid unnecessary re-renders
          if (prev.currentPrice !== highestBid) {
            return { ...prev, currentPrice: highestBid }
          }
          return prev
        })
      }
    })

    return () => unsubscribe()
  }, [auction?.id])

  // Update countdown timer and handle auction end
  useEffect(() => {
    if (!auction?.endTime) return

    const updateTimer = async () => {
      const now = new Date()
      const end = new Date(auction.endTime)
      const diff = end.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeLeft('Auction ended')

        // Determine winner and add to cart - fetch fresh data from Firestore to avoid race conditions
        if (auction.status === 'active') {
          try {
            // Fetch the highest bid directly from Firestore to ensure we have the latest data
            const bidsQuery = query(
              collection(db, 'auctions', auction.id, 'bids'),
              orderBy('amount', 'desc'),
              orderBy('timestamp', 'desc'),
              limit(1)
            )

            const bidsSnapshot = await getDocs(bidsQuery)
            const highestBidDoc = bidsSnapshot.docs[0]

            if (highestBidDoc) {
              const highestBid = {
                id: highestBidDoc.id,
                ...highestBidDoc.data(),
                timestamp: highestBidDoc.data().timestamp?.toDate() || new Date(),
              } as Bid

              // Validate the bid is higher than starting price
              if (highestBid.amount >= auction.startingPrice) {
                const shippingCost = auction.shippingPrice || 0
                const totalPrice = highestBid.amount + shippingCost

                setWinner({ username: highestBid.username, amount: totalPrice })

                // Update auction status
                await updateDoc(doc(db, 'auctions', auction.id), {
                  status: 'sold',
                  winnerId: highestBid.userId,
                  winnerUsername: highestBid.username,
                })

                // Add item to winner's cart
                const cartItem = {
                  auctionId: auction.id,
                  itemTitle: auction.title,
                  itemDescription: auction.description,
                  finalPrice: totalPrice,
                  shippingPrice: shippingCost,
                  sellerId: auction.sellerId,
                  purchasedAt: new Date(),
                  status: 'pending_payment',
                }

                await addDoc(collection(db, 'users', highestBid.userId, 'cart'), cartItem)

                // Send winner announcement to chat
                try {
                  await chatService.sendWinnerAnnouncement(highestBid.username, auction.title, totalPrice, roomId)
                } catch (chatError) {
                  console.error('Error sending winner announcement:', chatError)
                  // Don't fail auction end if chat fails
                }

                console.log(`Auction ended! Winner: ${highestBid.username} with $${totalPrice} (including $${shippingCost} shipping)`)
              } else {
                console.log('No valid bids found - bid amount below starting price')
              }
            } else {
              console.log('No bids found for auction')
            }
          } catch (error) {
            console.error('Error ending auction:', error)
          }
        }

        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [auction?.endTime, auction?.status, auction?.id, auction?.startingPrice, auction?.shippingPrice, auction?.title, auction?.description, auction?.sellerId, roomId])

  const placeBid = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auction || !currentUser || !userProfile || !bidAmount) return

    const amount = parseFloat(bidAmount)
    if (amount <= auction.currentPrice) {
      alert('Bid must be higher than current price')
      return
    }

    try {
      // Use Cloud Function for atomic bidding
      const placeBidFn = httpsCallable(getFunctions(getApp()), 'placeBid')
      const result = await placeBidFn({
        streamId: roomId, // Using roomId as streamId for now
        productId: auction.itemId || auction.id, // Use itemId if available, fallback to auction.id
        amount
      })

      console.log('Bid placed successfully:', result.data)

      // Send bid announcement to chat
      try {
        await chatService.sendBidAnnouncement(userProfile.username, amount, roomId)
      } catch (chatError) {
        console.error('Error sending bid announcement:', chatError)
        // Don't fail the bid if chat fails
      }

      setBidAmount('')
    } catch (error: any) {
      console.error('Error placing bid:', error)
      const errorMessage = error?.message || 'Failed to place bid. Please try again.'
      alert(errorMessage)
    }
  }

  const createAuction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser || !userProfile) return

    const { title, description, startingPrice, shippingPrice, duration } = auctionForm
    const price = parseFloat(startingPrice)
    const shipping = shippingPrice ? parseFloat(shippingPrice) : 0

    if (!title.trim() || !description.trim() || isNaN(price) || price <= 0) {
      alert('Please fill in all fields with valid values')
      return
    }

    try {
      const endTime = new Date()
      const durationSeconds = parseInt(duration)

      if (durationSeconds === 60) {
        // 1 minute
        endTime.setMinutes(endTime.getMinutes() + 1)
      } else {
        // 10, 20, or 30 seconds
        endTime.setSeconds(endTime.getSeconds() + durationSeconds)
      }

      const auctionData: any = {
        title: title.trim(),
        description: description.trim(),
        startingPrice: price,
        currentPrice: price,
        endTime,
        sellerId: currentUser.uid,
        roomId,
        status: 'active',
      }

      // Include shipping price if provided
      if (shipping > 0) {
        auctionData.shippingPrice = shipping
      }

      console.log('Creating auction with data:', auctionData)

      const docRef = await addDoc(collection(db, 'auctions'), auctionData)

      console.log('Auction created successfully with ID:', docRef.id)

      // Reset form
      setAuctionForm({
        title: '',
        description: '',
        startingPrice: '',
        shippingPrice: '',
        duration: '10'
      })
      setShowCreateForm(false)
    } catch (error) {
      console.error('Error creating auction:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to create auction: ${errorMessage}. Please try again.`)
    }
  }

  const addToQueue = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) return

    const { title, description, startingPrice } = auctionForm
    const price = parseFloat(startingPrice)

    if (!title.trim() || !description.trim() || isNaN(price) || price <= 0) {
      alert('Please fill in all fields with valid values')
      return
    }

    try {
      await addDoc(collection(db, 'auctionItems'), {
        title: title.trim(),
        description: description.trim(),
        startingPrice: price,
        category: 'General',
        sellerId: currentUser.uid,
        roomId,
        status: 'queued',
        createdAt: new Date(),
      })

      // Reset form
      setAuctionForm({
        title: '',
        description: '',
        startingPrice: '',
        shippingPrice: '',
        duration: '10'
      })
      setShowCreateForm(false)
    } catch (error) {
      console.error('Error adding to queue:', error)
      alert('Failed to add item to queue. Please try again.')
    }
  }

  const startNextAuction = async (item: AuctionItem) => {
    if (!currentUser) return

    try {
      const endTime = new Date()
      endTime.setMinutes(endTime.getMinutes() + 10) // 10 minute auction

      // Create auction from queued item
      await addDoc(collection(db, 'auctions'), {
        itemId: item.id,
        title: item.title,
        description: item.description,
        startingPrice: item.startingPrice,
        currentPrice: item.startingPrice,
        endTime,
        sellerId: currentUser.uid,
        roomId,
        status: 'active',
      })

      // Update item status
      await updateDoc(doc(db, 'auctionItems', item.id), {
        status: 'active',
      })
    } catch (error) {
      console.error('Error starting auction:', error)
    }
  }

  const removeFromQueue = async (itemId: string) => {
    try {
      await updateDoc(doc(db, 'auctionItems', itemId), {
        status: 'ended',
      })
    } catch (error) {
      console.error('Error removing from queue:', error)
    }
  }

  if (!currentUser) {
    return (
      <div className={`bg-slate-800 rounded-lg p-4 ${className}`}>
        <p className="text-slate-400 text-center">Please log in to participate in auctions</p>
      </div>
    )
  }

  return (
    <div className={`bg-slate-800 rounded-lg flex flex-col ${className}`}>
      {/* Auction Header */}
      <div className="p-3 border-b border-slate-700">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <h3 className="text-white font-semibold text-lg">Live Auction</h3>
          {isHost && (
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {!auction && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors w-full sm:w-auto"
                >
                  Quick Auction
                </button>
              )}
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors w-full sm:w-auto"
              >
                Add to Queue
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Auction Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="text-center text-slate-400">Loading auction...</div>
        ) : !auction ? (
          <div className="text-center text-slate-400">
            {isHost ? 'Create an auction to get started' : 'No active auction'}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Auction Info */}
            <div className="bg-slate-700 rounded p-3">
              <h4 className="text-white font-semibold text-base sm:text-lg break-words">{auction.title}</h4>
              <p className="text-slate-300 text-sm mt-1 break-words">{auction.description}</p>
              <div className="mt-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <div className="text-center sm:text-left">
                  <p className="text-cyan-400 font-bold text-lg">${auction.currentPrice}</p>
                  <p className="text-slate-400 text-xs">Current bid</p>
                </div>
                <div className="text-center sm:text-right">
                  <p className="text-red-400 font-bold text-lg font-mono">{timeLeft}</p>
                  <p className="text-slate-400 text-xs">Time left</p>
                </div>
              </div>
            </div>

            {/* Bid Form */}
            {auction.status === 'active' && (
              <form onSubmit={placeBid} className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder={`Min: $${(auction.currentPrice + 1).toFixed(2)}`}
                    step="0.01"
                    min={auction.currentPrice + 1}
                    className="flex-1 bg-slate-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-base"
                    required
                  />
                  <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold transition-colors w-full sm:w-auto"
                  >
                    Place Bid
                  </button>
                </div>
              </form>
            )}

            {/* Recent Bids */}
            <div className="space-y-1">
              <h5 className="text-slate-300 text-sm font-semibold">Recent Bids</h5>
              {bids.length === 0 ? (
                <p className="text-slate-400 text-sm">No bids yet</p>
              ) : (
                bids.slice(0, 5).map((bid) => (
                  <div key={bid.id} className="flex justify-between items-center bg-slate-700 rounded px-3 py-2">
                    <div>
                      <p className="text-white text-sm font-semibold">{bid.username}</p>
                      <p className="text-slate-400 text-xs">
                        {bid.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    <p className="text-cyan-400 font-bold">${bid.amount}</p>
                  </div>
                ))
              )}
            </div>

            {/* Auction Queue (for sellers) */}
            {isHost && auctionQueue.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-slate-300 text-sm font-semibold">Auction Queue</h5>
                {auctionQueue.filter(item => item.status === 'queued').map((item) => (
                  <div key={item.id} className="bg-slate-700 rounded p-3">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold break-words">{item.title}</p>
                        <p className="text-slate-400 text-xs">${item.startingPrice}</p>
                      </div>
                      <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => startNextAuction(item)}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-xs font-medium transition-colors flex-1 sm:flex-none"
                        >
                          Start Auction
                        </button>
                        <button
                          onClick={() => removeFromQueue(item.id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-xs font-medium transition-colors flex-1 sm:flex-none"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Winner Announcement */}
            {winner && (
              <div className="bg-green-900/50 border border-green-700 rounded p-3">
                <h5 className="text-green-300 text-sm font-semibold">🎉 Auction Ended!</h5>
                <p className="text-white text-sm">
                  Winner: <span className="font-bold">{winner.username}</span>
                </p>
                <p className="text-green-300 text-sm">
                  Final Price: <span className="font-bold">${winner.amount}</span>
                </p>
                <p className="text-slate-400 text-xs mt-1">
                  Item added to winner's cart for payment processing
                </p>
              </div>
            )}
          </div>
        )}

        {/* Auction Creation Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-slate-800 rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-4">Create Auction</h3>

              <form onSubmit={createAuction} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    value={auctionForm.title}
                    onChange={(e) => setAuctionForm(prev => ({...prev, title: e.target.value}))}
                    placeholder="Enter item name..."
                    className="w-full bg-slate-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-base"
                    required
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={auctionForm.description}
                    onChange={(e) => setAuctionForm(prev => ({...prev, description: e.target.value}))}
                    placeholder="Describe the item..."
                    className="w-full bg-slate-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 h-20 resize-none text-base"
                    required
                    maxLength={500}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Starting Price *
                  </label>
                  <input
                    type="number"
                    value={auctionForm.startingPrice}
                    onChange={(e) => setAuctionForm(prev => ({...prev, startingPrice: e.target.value}))}
                    placeholder="0.00"
                    step="0.01"
                    min="0.01"
                    className="w-full bg-slate-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-base"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Shipping Price
                  </label>
                  <input
                    type="number"
                    value={auctionForm.shippingPrice}
                    onChange={(e) => setAuctionForm(prev => ({...prev, shippingPrice: e.target.value}))}
                    placeholder="0.00"
                    step="0.01"
                    min="0.00"
                    className="w-full bg-slate-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Auction Duration
                  </label>
                  <select
                    value={auctionForm.duration}
                    onChange={(e) => setAuctionForm(prev => ({...prev, duration: e.target.value}))}
                    className="w-full bg-slate-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-base"
                  >
                    <option value="10">10 seconds</option>
                    <option value="20">20 seconds</option>
                    <option value="30">30 seconds</option>
                    <option value="60">1 minute</option>
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false)
                      setAuctionForm({
                        title: '',
                        description: '',
                        startingPrice: '',
                        shippingPrice: '',
                        duration: '10'
                      })
                    }}
                    className="flex-1 bg-slate-600 hover:bg-slate-700 text-white px-4 py-3 rounded font-semibold transition-colors text-base"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!auctionForm.title.trim() || !auctionForm.description.trim() || !auctionForm.startingPrice}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white px-4 py-3 rounded font-semibold transition-colors disabled:cursor-not-allowed text-base"
                  >
                    Start Auction
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
