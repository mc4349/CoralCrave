import { Server, Socket } from 'socket.io'
import { AuctionEngine } from '../services/AuctionEngine'
import { RedisService } from '../services/RedisService'
import { FirebaseService } from '../services/FirebaseService'
import { logger } from '../utils/logger'
import { SocketEvents } from '../types/auction'

let auctionEngine: AuctionEngine
let redisService: RedisService
let firebaseService: FirebaseService

export function setupSocketHandlers(io: Server): void {
  // Initialize services
  redisService = new RedisService()
  firebaseService = new FirebaseService()
  auctionEngine = new AuctionEngine(redisService, firebaseService)

  // Connect to Redis
  redisService.connect().catch(error => {
    logger.error('Failed to connect to Redis:', error)
  })

  // Recover auction states on startup
  auctionEngine.recoverAuctionsFromRedis().catch(error => {
    logger.error('Failed to recover auction states:', error)
  })

  // Set up auction engine event listeners
  setupAuctionEngineListeners(io)

  // Handle socket connections
  io.on('connection', (socket: Socket) => {
    logger.info(`Client connected: ${socket.id}`)

    // Handle joining a livestream
    socket.on('joinLive', async (data: { liveId: string; userId?: string }) => {
      try {
        const { liveId, userId } = data
        
        // Join the livestream room
        await socket.join(`live:${liveId}`)
        
        // Update viewer count if user is authenticated
        if (userId) {
          const viewerCount = await redisService.addViewer(liveId, userId)
          
          // Broadcast updated viewer count
          io.to(`live:${liveId}`).emit('viewerCountUpdate', {
            liveId,
            count: viewerCount
          })

          // Update viewer count in Firebase
          await firebaseService.updateViewerCount(liveId, viewerCount)
        }

        // Send current auction states for this livestream
        const livestreamItems = await firebaseService.getLivestreamItems(liveId)
        for (const item of livestreamItems) {
          if (item.status === 'running') {
            const auctionState = auctionEngine.getAuctionState(item.id)
            if (auctionState) {
              socket.emit('auctionState', auctionState)
            }
          }
        }

        logger.debug(`User ${userId || 'anonymous'} joined live ${liveId}`)
      } catch (error) {
        logger.error('Error handling joinLive:', error)
        socket.emit('error', { message: 'Failed to join livestream' })
      }
    })

    // Handle leaving a livestream
    socket.on('leaveLive', async (data: { liveId: string; userId?: string }) => {
      try {
        const { liveId, userId } = data
        
        // Leave the livestream room
        await socket.leave(`live:${liveId}`)
        
        // Update viewer count if user is authenticated
        if (userId) {
          const viewerCount = await redisService.removeViewer(liveId, userId)
          
          // Broadcast updated viewer count
          io.to(`live:${liveId}`).emit('viewerCountUpdate', {
            liveId,
            count: viewerCount
          })

          // Update viewer count in Firebase
          await firebaseService.updateViewerCount(liveId, viewerCount)
        }

        logger.debug(`User ${userId || 'anonymous'} left live ${liveId}`)
      } catch (error) {
        logger.error('Error handling leaveLive:', error)
      }
    })

    // Handle placing a bid
    socket.on('placeBid', async (data: {
      liveId: string
      itemId: string
      amount: number
      userId: string
      username: string
    }) => {
      try {
        const { liveId, itemId, amount, userId, username } = data

        // Validate input
        if (!liveId || !itemId || !userId || !username || amount <= 0) {
          socket.emit('error', { message: 'Invalid bid data' })
          return
        }

        // Rate limiting check
        const rateLimitKey = `bid_rate:${userId}`
        const rateLimit = await redisService.checkRateLimit(rateLimitKey, 10, 60000) // 10 bids per minute
        
        if (!rateLimit.allowed) {
          socket.emit('error', { message: 'Too many bids. Please slow down.' })
          return
        }

        // Place the bid
        const result = await auctionEngine.placeBid(itemId, userId, username, amount, liveId)
        
        if (result.success) {
          // Bid was successful - events will be emitted by auction engine
          logger.info(`Bid placed: ${username} bid $${amount} on item ${itemId}`)
        } else {
          // Send error back to the bidder
          socket.emit('error', { message: result.message || 'Failed to place bid' })
        }
      } catch (error) {
        logger.error('Error handling placeBid:', error)
        socket.emit('error', { message: 'Internal server error' })
      }
    })

    // Handle setting maximum bid (proxy bidding)
    socket.on('setMaxBid', async (data: {
      liveId: string
      itemId: string
      maxAmount: number
      userId: string
    }) => {
      try {
        const { liveId, itemId, maxAmount, userId } = data

        // Validate input
        if (!liveId || !itemId || !userId || maxAmount <= 0) {
          socket.emit('error', { message: 'Invalid max bid data' })
          return
        }

        // Set the maximum bid
        const result = await auctionEngine.setMaxBid(itemId, userId, maxAmount)
        
        if (result.success) {
          socket.emit('maxBidSet', { itemId, maxAmount })
          logger.info(`Max bid set: User ${userId} set max bid of $${maxAmount} on item ${itemId}`)
        } else {
          socket.emit('error', { message: result.message || 'Failed to set max bid' })
        }
      } catch (error) {
        logger.error('Error handling setMaxBid:', error)
        socket.emit('error', { message: 'Internal server error' })
      }
    })

    // Handle requesting auction state
    socket.on('requestState', async (data: { liveId: string; itemId: string }) => {
      try {
        const { itemId } = data
        
        const auctionState = auctionEngine.getAuctionState(itemId)
        if (auctionState) {
          socket.emit('auctionState', auctionState)
        } else {
          socket.emit('error', { message: 'Auction not found' })
        }
      } catch (error) {
        logger.error('Error handling requestState:', error)
        socket.emit('error', { message: 'Failed to get auction state' })
      }
    })

    // Handle starting an auction (host only)
    socket.on('startAuction', async (data: { liveId: string; itemId: string; userId: string }) => {
      try {
        const { liveId, itemId, userId } = data

        // Verify user is the host of the livestream
        const livestream = await firebaseService.getLivestream(liveId)
        if (!livestream || livestream.hostId !== userId) {
          socket.emit('error', { message: 'Unauthorized: Only the host can start auctions' })
          return
        }

        // Get item details
        const item = await firebaseService.getItem(liveId, itemId)
        if (!item) {
          socket.emit('error', { message: 'Item not found' })
          return
        }

        if (item.status !== 'queued') {
          socket.emit('error', { message: 'Item is not queued for auction' })
          return
        }

        // Start the auction
        await auctionEngine.startAuction(item)
        
        logger.info(`Auction started for item ${itemId} by host ${userId}`)
      } catch (error) {
        logger.error('Error handling startAuction:', error)
        socket.emit('error', { message: 'Failed to start auction' })
      }
    })

    // Handle stopping an auction (host only)
    socket.on('stopAuction', async (data: { liveId: string; itemId: string; userId: string }) => {
      try {
        const { liveId, itemId, userId } = data

        // Verify user is the host of the livestream
        const livestream = await firebaseService.getLivestream(liveId)
        if (!livestream || livestream.hostId !== userId) {
          socket.emit('error', { message: 'Unauthorized: Only the host can stop auctions' })
          return
        }

        // Stop the auction
        await auctionEngine.stopAuction(itemId)
        
        logger.info(`Auction stopped for item ${itemId} by host ${userId}`)
      } catch (error) {
        logger.error('Error handling stopAuction:', error)
        socket.emit('error', { message: 'Failed to stop auction' })
      }
    })

    // Handle disconnect
    socket.on('disconnect', (reason: any) => {
      logger.debug(`Client disconnected: ${socket.id}, reason: ${reason}`)
    })
  })

  // Cleanup interval for Redis
  setInterval(() => {
    if (redisService.isReady()) {
      redisService.cleanup().catch(error => {
        logger.error('Redis cleanup error:', error)
      })
    }
  }, 300000) // Every 5 minutes

  logger.info('Socket.IO handlers set up successfully')
}

function setupAuctionEngineListeners(io: Server): void {
  // Listen for auction events and broadcast to clients
  auctionEngine.on('auctionStarted', (auctionState) => {
    io.to(`live:${auctionState.liveId}`).emit('auctionState', auctionState)
    logger.debug(`Broadcasted auction start for item ${auctionState.itemId}`)
  })

  auctionEngine.on('bidPlaced', (data) => {
    const { itemId, bid, newPrice, leaderId } = data
    const auctionState = auctionEngine.getAuctionState(itemId)
    
    if (auctionState) {
      // Broadcast bid placed event
      io.to(`live:${auctionState.liveId}`).emit('bidPlaced', {
        itemId,
        bid,
        newPrice,
        leaderId
      })

      // Broadcast updated auction state
      io.to(`live:${auctionState.liveId}`).emit('auctionState', auctionState)
      
      logger.debug(`Broadcasted bid for item ${itemId}: $${newPrice}`)
    }
  })

  auctionEngine.on('timerUpdate', (data) => {
    const { itemId, timeLeftMs } = data
    const auctionState = auctionEngine.getAuctionState(itemId)
    
    if (auctionState) {
      io.to(`live:${auctionState.liveId}`).emit('timerUpdate', {
        itemId,
        timeLeftMs
      })
    }
  })

  auctionEngine.on('auctionClosed', async (data) => {
    const { itemId, winnerId, finalPrice } = data
    const auctionState = auctionEngine.getAuctionState(itemId)
    
    if (auctionState) {
      // Broadcast auction closed event
      io.to(`live:${auctionState.liveId}`).emit('auctionClosed', {
        itemId,
        winnerId,
        finalPrice
      })

      // Update user stats if there was a winner
      if (winnerId && finalPrice > 0) {
        const livestream = await firebaseService.getLivestream(auctionState.liveId)
        if (livestream) {
          await firebaseService.updateUserStats(livestream.hostId, finalPrice)
        }
      }
      
      logger.info(`Broadcasted auction close for item ${itemId}. Winner: ${winnerId || 'none'}, Price: $${finalPrice}`)
    }
  })

  logger.info('Auction engine event listeners set up')
}
