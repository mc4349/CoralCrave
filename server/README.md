# CoralCrave Auction Engine

A real-time auction engine built with Node.js, TypeScript, Socket.IO, Redis, and Firebase for the CoralCrave livestream marketplace.

## Features

- **Real-time Bidding**: WebSocket-based bidding with sub-second latency
- **Auction Modes**: Classic (timer resets) and Speed (fixed timer) auctions
- **Proxy Bidding**: Automatic bidding up to user-defined maximum amounts
- **Increment Ladder**: Configurable bid increments based on price ranges
- **Rate Limiting**: Protection against spam and abuse
- **Redis State Management**: Fast, persistent auction state storage
- **Firebase Integration**: User data, orders, and analytics
- **Cloud Run Ready**: Containerized for Google Cloud deployment

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Client  │◄──►│  Auction Engine  │◄──►│   Firebase      │
│   (WebSocket)   │    │   (Cloud Run)    │    │   (Firestore)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │      Redis      │
                       │  (State Cache)  │
                       └─────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+
- Redis server
- Firebase project with Firestore
- Google Cloud account (for deployment)

### Local Development

1. **Clone and install dependencies**:
```bash
cd server
npm install
```

2. **Set up environment variables**:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start Redis** (using Docker):
```bash
docker run -d -p 6379:6379 redis:alpine
```

4. **Run in development mode**:
```bash
npm run dev
```

The server will start on `http://localhost:3001` with hot reloading.

### Production Deployment

#### Deploy to Google Cloud Run

1. **Set up Google Cloud**:
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com
```

2. **Deploy using Cloud Build**:
```bash
gcloud builds submit --config cloudbuild.yaml
```

3. **Set environment variables**:
```bash
gcloud run services update coralcrave-auction-engine \
  --set-env-vars="REDIS_URL=redis://your-redis-instance:6379" \
  --set-env-vars="STRIPE_SECRET_KEY=sk_live_..." \
  --region=us-central1
```

## API Endpoints

### Health & Status
- `GET /health` - Health check
- `GET /api/status` - Detailed service status

### Livestreams
- `GET /api/livestreams/active` - Get active livestreams
- `GET /api/livestreams/:liveId` - Get livestream details
- `GET /api/livestreams/:liveId/items` - Get auction items
- `GET /api/livestreams/:liveId/viewers` - Get viewer count

### Analytics
- `GET /api/analytics/overview` - System overview metrics

### Webhooks
- `POST /api/webhooks/stripe` - Stripe webhook handler

## WebSocket Events

### Client → Server
- `joinLive` - Join a livestream room
- `leaveLive` - Leave a livestream room
- `placeBid` - Place a bid on an item
- `setMaxBid` - Set maximum bid (proxy bidding)
- `requestState` - Request current auction state
- `startAuction` - Start an auction (host only)
- `stopAuction` - Stop an auction (host only)

### Server → Client
- `auctionState` - Current auction state
- `bidPlaced` - New bid placed
- `timerUpdate` - Timer countdown update
- `auctionClosed` - Auction ended
- `viewerCountUpdate` - Viewer count changed
- `error` - Error message

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3001` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` |
| `FIREBASE_PROJECT_ID` | Firebase project ID | - |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Firebase service account JSON | - |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `STRIPE_SECRET_KEY` | Stripe secret key | - |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | - |
| `LOG_LEVEL` | Logging level | `info` |

### Auction Configuration

```typescript
export const DEFAULT_AUCTION_CONFIG = {
  classicTimerSeconds: 20,    // Classic auction timer
  speedTimerSeconds: 10,      // Speed auction timer
  graceMs: 400,              // Grace period for late bids
  minBidIncrement: 1,        // Minimum bid increment
  maxProxyBids: 5,           // Max proxy bidders per auction
  bidHistoryLimit: 50        // Max bids to keep in memory
}

export const DEFAULT_INCREMENT_RULES = [
  { lt: 20, inc: 1 },        // Under $20: $1 increments
  { lt: 100, inc: 2 },       // Under $100: $2 increments
  { lt: 500, inc: 5 },       // Under $500: $5 increments
  { lt: Infinity, inc: 10 }  // Over $500: $10 increments
]
```

## Development

### Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run ESLint

### Project Structure

```
server/
├── src/
│   ├── config/          # Configuration files
│   ├── middleware/      # Express middleware
│   ├── routes/          # API routes
│   ├── services/        # Business logic services
│   ├── socket/          # WebSocket handlers
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   └── index.ts         # Application entry point
├── logs/                # Log files (created at runtime)
├── Dockerfile           # Container configuration
├── cloudbuild.yaml      # Google Cloud Build config
└── package.json         # Dependencies and scripts
```

### Key Services

#### AuctionEngine
Core auction logic with real-time bidding, proxy bidding, and timer management.

#### RedisService
High-performance caching and state management for active auctions.

#### FirebaseService
Integration with Firestore for persistent data storage.

## Monitoring & Logging

### Health Checks
- Application health: `GET /health`
- Service status: `GET /api/status`
- Container health check built into Docker

### Logging
- Structured JSON logging with Winston
- Log levels: error, warn, info, debug
- Automatic log rotation
- Cloud Logging integration in production

### Metrics
- Active auction count
- Bid rate per minute
- WebSocket connection count
- Redis hit/miss ratio
- Firebase operation latency

## Security

### Rate Limiting
- API endpoints: 100 requests/minute per IP
- Bidding: 10 bids/minute per user
- Authentication: 5 attempts/15 minutes per IP

### Input Validation
- Joi schema validation for all inputs
- SQL injection prevention
- XSS protection with Helmet.js

### Authentication
- Firebase Auth integration
- JWT token validation
- Role-based access control

## Performance

### Optimizations
- Redis caching for auction states
- Connection pooling for database
- Gzip compression for responses
- Efficient WebSocket broadcasting

### Scaling
- Horizontal scaling with Cloud Run
- Redis cluster support
- Load balancing with Google Cloud Load Balancer
- Auto-scaling based on CPU/memory usage

## Troubleshooting

### Common Issues

1. **Redis Connection Failed**
   ```bash
   # Check Redis is running
   redis-cli ping
   # Should return PONG
   ```

2. **Firebase Permission Denied**
   ```bash
   # Verify service account key
   echo $FIREBASE_SERVICE_ACCOUNT_KEY | jq .
   ```

3. **WebSocket Connection Issues**
   ```bash
   # Check CORS configuration
   curl -H "Origin: http://localhost:5173" \
        -H "Access-Control-Request-Method: GET" \
        -H "Access-Control-Request-Headers: X-Requested-With" \
        -X OPTIONS http://localhost:3001/socket.io/
   ```

### Debug Mode
```bash
LOG_LEVEL=debug npm run dev
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
