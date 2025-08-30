# 🔥 Complete Firebase Setup Guide for CoralCrave

## CRITICAL: Your Firestore database is not set up - this is why streams can't save!

Follow these steps **exactly** to get your livestreaming platform working:

---

## 1. 🗄️ SET UP FIRESTORE DATABASE

### Step 1: Go to Firebase Console
1. Open https://console.firebase.google.com/project/coralcrave
2. Click on **"Firestore Database"** in the left sidebar
3. Click **"Create database"**

### Step 2: Choose Database Mode
- **IMPORTANT**: Select **"Start in production mode"** (not test mode)
- Click **"Next"**

### Step 3: Choose Location
- **RECOMMENDED**: Select **"us-central1 (Iowa)"** for best performance in US
- Click **"Done"**

### Step 4: Wait for Creation
- Wait 2-3 minutes for database to be created
- You should see "Cloud Firestore" with collections view

---

## 2. 💳 UPGRADE TO BLAZE PLAN (REQUIRED)

### Why This is Critical:
- Firestore requires Blaze plan for external API access
- Your website needs to connect from outside Google Cloud

### Steps:
1. In Firebase Console, click **"Usage and billing"** (left sidebar)
2. Click **"Details & settings"**
3. Click **"Modify plan"**
4. Select **"Blaze (Pay as you go)"**
5. Add your credit card
6. Click **"Purchase"**

**Don't worry about cost**: You get generous free tier limits, likely $0-5/month for development.

---

## 3. 🔑 ENABLE REQUIRED APIS

### Step 1: Go to Google Cloud Console
1. Open https://console.cloud.google.com/apis/dashboard?project=coralcrave
2. Click **"+ ENABLE APIS AND SERVICES"**

### Step 2: Enable These APIs:
Search for and enable each one:
- **Cloud Firestore API**
- **Firebase Authentication API** 
- **Firebase Hosting API**
- **Firebase Storage API**

---

## 4. 🛡️ SET UP FIRESTORE SECURITY RULES

### Step 1: Go to Firestore Rules
1. In Firebase Console → Firestore Database
2. Click **"Rules"** tab
3. Replace the content with this:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow authenticated users to create and read livestreams
    match /livestreams/{streamId} {
      allow read: if true; // Anyone can view streams
      allow create: if request.auth != null; // Only authenticated users can create
      allow update, delete: if request.auth != null && 
        (request.auth.uid == resource.data.hostId || 
         request.auth.uid in resource.data.moderators);
      
      // Allow access to stream items and messages
      match /{document=**} {
        allow read: if true; // Anyone can read stream content
        allow write: if request.auth != null; // Only authenticated users can write
      }
    }
    
    // Allow authenticated users to read/write auction data
    match /auctions/{auctionId} {
      allow read, write: if request.auth != null;
    }
    
    // Allow authenticated users to read/write bids
    match /bids/{bidId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Step 2: Publish Rules
- Click **"Publish"**

---

## 5. 🔐 SET UP FIREBASE AUTHENTICATION

### Step 1: Enable Auth Methods
1. In Firebase Console → **"Authentication"**
2. Click **"Sign-in method"** tab
3. Enable these providers:
   - **Email/Password** → Enable → Save
   - **Google** → Enable → Add your domain → Save

### Step 2: Add Authorized Domains
1. In Authentication → Settings → Authorized domains
2. Add these domains:
   - `localhost`
   - `coralcrave.web.app`
   - `coralcrave.firebaseapp.com`

---

## 6. 📦 VERIFY FIREBASE CONFIG

### Check Your Environment Variables
Make sure your `.env.local` file has these values:

```env
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=coralcrave.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=coralcrave
VITE_FIREBASE_STORAGE_BUCKET=coralcrave.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### Get These Values:
1. Firebase Console → Project Settings (gear icon)
2. Scroll down to "Your apps"
3. Click on your web app
4. Copy the config values

---

## 7. 🧪 TEST THE SETUP

### After completing all steps above:

1. **Restart your development server**:
   ```bash
   # Stop current servers (Ctrl+C)
   npm run dev
   ```

2. **Test the connection**:
   - Go to https://coralcrave.web.app
   - Sign in with Google or email
   - Try to start a stream
   - Check browser console for success messages

### Expected Success Messages:
```
🚀 Creating livestream with FAST execution...
⚡ FAST: Livestream created in Firestore: [stream-id]
✅ Stream created successfully
```

---

## 8. 🚨 TROUBLESHOOTING

### If you still get 400 errors:
1. **Wait 10-15 minutes** after enabling APIs
2. **Clear browser cache** completely
3. **Check billing** - make sure Blaze plan is active
4. **Verify all APIs are enabled** in Google Cloud Console

### If Redis errors (server):
- Redis is optional for development
- The server will work without Redis
- Ignore Redis connection errors for now

---

## 9. ✅ VERIFICATION CHECKLIST

Before testing, verify you have:
- [ ] Created Firestore database in production mode
- [ ] Upgraded to Blaze billing plan
- [ ] Enabled all required APIs in Google Cloud Console
- [ ] Set up Firestore security rules
- [ ] Enabled Authentication methods
- [ ] Added authorized domains
- [ ] Updated environment variables
- [ ] Restarted development server

---

## 🎯 NEXT STEPS

Once Firestore is working:
1. **Test stream creation** - should work instantly
2. **Verify data saves** - check Firestore console for stream documents
3. **Test from multiple devices** - ensure it works for all users
4. **Monitor performance** - streams should start in <2 seconds

**This setup will fix your 400 errors and make streams save properly to the database!**
