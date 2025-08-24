# CoralCrave Setup Instructions

## Part 1: Google Sign-In Setup (5 minutes)

### Step 1: Enable Google Authentication in Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your CoralCrave project
3. Click **Authentication** in the left sidebar
4. Click **Sign-in method** tab
5. Find **Google** in the list and click on it
6. Click the **Enable** toggle switch
7. You'll see two fields:
   - **Web SDK configuration** - Leave as default
   - **Project support email** - Select your email from dropdown
8. Click **Save**

### Step 2: Add Authorized Domains (if needed)
1. Still in **Authentication → Sign-in method**
2. Scroll down to **Authorized domains**
3. Make sure these domains are listed:
   - `localhost` (for development)
   - Your production domain (when you deploy)
4. If `localhost` is missing, click **Add domain** and add it

### Step 3: Test Google Sign-In
1. Go back to your app at `http://localhost:5173/auth`
2. Click **"Sign up with Google"** button
3. It should open Google's OAuth popup
4. Complete the sign-in process
5. You should be redirected to the home page

---

## Part 2: Agora Livestreaming Setup (15 minutes)

### Step 1: Create Agora Account
1. Go to [Agora.io](https://www.agora.io/)
2. Click **"Get Started for Free"** or **"Sign Up"**
3. Create account with your email
4. Verify your email address
5. Complete the registration process

### Step 2: Create Agora Project
1. After logging in, you'll be in the Agora Console
2. Click **"Create Project"** or **"New Project"**
3. Enter project details:
   - **Project Name**: `CoralCrave`
   - **Use Case**: Select **"Live Streaming"**
   - **Authentication**: Select **"App ID"** (for now, we'll upgrade to tokens later)
4. Click **"Create"**

### Step 3: Get Your App ID
1. In your new project dashboard, you'll see:
   - **App ID**: A string like `"a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"`
   - **App Certificate**: (We'll use this later for tokens)
2. **Copy the App ID** - you'll need it in the next step

### Step 4: Update Environment Variables
1. Open your `.env.local` file in the CoralCrave project
2. Find the line: `VITE_AGORA_APP_ID=your_agora_app_id_here`
3. Replace `your_agora_app_id_here` with your actual App ID:
   ```
   VITE_AGORA_APP_ID=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
   ```
4. Save the file

### Step 5: Restart Development Server
1. In your terminal, press `Ctrl+C` to stop the current server
2. Run `npm run dev` again to restart with new environment variables
3. The server should start at `http://localhost:5173/`

### Step 6: Test Livestreaming
1. Go to `http://localhost:5173/go-live`
2. Allow camera and microphone permissions when prompted
3. You should see your camera feed in the preview
4. Enter a stream title and click **"Start Live"**
5. If successful, you should see the live streaming interface

---

## Part 3: Testing Both Features

### Test Google Sign-In:
1. Go to `http://localhost:5173/auth`
2. Click **"Sign in with Google"**
3. Complete Google OAuth flow
4. Verify you're logged in (should redirect to home page)

### Test Livestreaming:
1. Make sure you're logged in
2. Go to `http://localhost:5173/go-live`
3. Allow camera/microphone permissions
4. Enter stream title: "Test Stream"
5. Click **"Start Live"**
6. Verify camera feed appears

### Test Viewing Streams:
1. Open a second browser tab/window
2. Go to `http://localhost:5173/` (home page)
3. You should see your live stream in the "Live Now" section
4. Click on it to join as a viewer

---

## Troubleshooting

### Google Sign-In Issues:
- **"Popup blocked"**: Allow popups for localhost in browser settings
- **"Unauthorized domain"**: Add `localhost` to authorized domains in Firebase
- **"OAuth error"**: Check that Google provider is enabled in Firebase Console

### Agora Livestreaming Issues:
- **"Camera not found"**: Check browser permissions for camera/microphone
- **"Failed to join channel"**: Verify App ID is correct in `.env.local`
- **"Network error"**: Check internet connection and firewall settings
- **"Invalid App ID"**: Double-check the App ID from Agora Console

### General Issues:
- **Environment variables not loading**: Restart the development server after changing `.env.local`
- **CORS errors**: Make sure you're accessing via `http://localhost:5173` not `127.0.0.1`

---

## Next Steps (Optional)

### For Production Deployment:
1. **Agora Token Server**: Set up secure token generation for production
2. **Domain Configuration**: Add your production domain to Firebase authorized domains
3. **SSL Certificate**: Ensure HTTPS for camera/microphone access in production
4. **Agora App Certificate**: Enable for enhanced security

### For Enhanced Features:
1. **Stripe Integration**: For payment processing
2. **Push Notifications**: For bid alerts and stream notifications
3. **CDN Setup**: For better video streaming performance
