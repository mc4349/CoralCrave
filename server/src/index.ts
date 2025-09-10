import { createServer } from 'http'

import express, { Request, Response } from 'express'
import { Server } from 'socket.io'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import dotenv from 'dotenv'

import { initializeFirebase } from './config/firebase'
import { initializeRedis } from './config/redis'
import { setupRoutes } from './routes'
import { paypalRouter } from './routes/paypal'
import { setupSocketHandlers } from './socket/handlers'
import { logger } from './utils/logger'
import { errorHandler } from './middleware/errorHandler'
// import { rateLimiterMiddleware } from './middleware/rateLimiter'

// Load environment variables
dotenv.config()

const app = express()
const server = createServer(app)
const allowedOrigins = [
  'https://coralcrave.web.app',
  'http://localhost:5173',
  process.env.FRONTEND_URL,
].filter((origin): origin is string => Boolean(origin))

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})

const PORT = process.env.PORT || 3001

async function startServer() {
  try {
    // Initialize services
    await initializeFirebase()
    await initializeRedis()

    // Middleware
    app.use(
      helmet({
        contentSecurityPolicy: false, // Disable for development
        crossOriginEmbedderPolicy: false,
      })
    )
    app.use(compression())
    app.use(
      cors({
        origin: allowedOrigins,
        credentials: true,
      })
    )
    app.use(express.json({ limit: '10mb' }))
    app.use(express.urlencoded({ extended: true, limit: '10mb' }))

    // Rate limiting
    // app.use('/api/', rateLimiterMiddleware)

    // Health check
    app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      })
    })

    // API routes
    setupRoutes(app)

    // PayPal routes
    app.use('/paypal', paypalRouter)

    // Socket.IO handlers
    setupSocketHandlers(io)

    // Error handling
    app.use(errorHandler)

    // Start server
    server.listen(PORT, () => {
      logger.info(`🚀 CoralCrave Auction Engine running on port ${PORT}`)
      logger.info(`📡 WebSocket server ready for real-time bidding`)
      logger.info(`🔥 Environment: ${process.env.NODE_ENV || 'development'}`)
    })

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully')
      server.close(() => {
        logger.info('Server closed')
        process.exit(0)
      })
    })

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully')
      server.close(() => {
        logger.info('Server closed')
        process.exit(0)
      })
    })
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  logger.error('Uncaught Exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

startServer()

export { app, server, io }
