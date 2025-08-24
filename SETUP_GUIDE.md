# CoralCrave Setup Guide

## Current Status ✅
- All TypeScript errors resolved (0 compilation errors)
- Agora credentials configured
- Server environment configured
- Frontend running on http://localhost:5173

## Next Steps to Complete Setup

### 1. Firebase Configuration (Required)
You need to update the Firebase settings with your actual project details:

**Frontend (.env.local):**
Replace the demo values with your Firebase project config:
```
VITE_FIREBASE_API_KEY=your-actual-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-actual-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

**Server (server/.env):**
Add your Firebase service account JSON:
```
FIREBASE_PROJECT_ID=your-actual-project-id
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}
```

### 2. Firebase Console Setup
1. Go to https://console.firebase.google.com
2. Enable Authentication > Sign-in method > Google
3. Create Firestore Database (start in test mode)
4. Generate service account key (Settings > Service Accounts > Generate new private key)

### 3. Start Redis (Required for Auctions)
**Option A - Local Redis:**
```bash
# Install Redis
brew install redis  # macOS
# or
sudo apt install redis-server  # Ubuntu

# Start Redis
redis-server
```

**Option B - Cloud Redis:**
Update `REDIS_URL` in server/.env with your cloud Redis URL

### 4. Start the Auction Server
```bash
cd server
npm install
npm run dev
```
Server will start on http://localhost:3001

### 5. Test the Application

**Frontend Features (Ready Now):**
- ✅ User interface and navigation
- ✅ Google sign-in (once Firebase is configured)
- ✅ Ocean-themed design
- ✅ Go Live interface

**Backend Features (Need Redis + Server):**
- 🔧 Real-time auctions
- 🔧 WebSocket bidding
- 🔧 Viewer count tracking

**Livestream Features (Ready with Agora):**
- ✅ Video streaming (Agora configured)
- ✅ Stream controls (mic/camera toggle)
- ✅ Real-time viewer updates

## Current Configuration Status

✅ **Agora Video Streaming**
- App ID: 659ca74bd1ef43f8bd76eee364741b32
- Certificate: 9db41529f0c549ce8e243b097acef372

🔧 **Firebase** (Needs your project details)
- Currently using demo/placeholder values

🔧 **Redis** (Needs to be running)
- Configured for localhost:6379

## Quick Test Commands

```bash
# Test frontend (should work now)
npm run dev

# Test server (needs Redis running)
cd server && npm run dev

# Test Redis connection
redis-cli ping  # Should return "PONG"
```

## Troubleshooting

**If livestream doesn't work:**
- Check browser console for Agora errors
- Verify camera/microphone permissions
- Ensure HTTPS in production (Agora requirement)

**If auctions don't work:**
- Ensure Redis is running: `redis-cli ping`
- Check server logs for connection errors
- Verify WebSocket connection in browser dev tools

**If authentication doesn't work:**
- Update Firebase config with real project values
- Enable Google sign-in in Firebase Console
- Check browser console for Firebase errors
