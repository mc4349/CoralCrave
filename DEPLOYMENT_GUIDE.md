# CoralCrave Deployment Guide

Deploy your CoralCrave marketplace so users worldwide can access it! Here are the best options, ranked by ease of setup:

## 🚀 Option 1: Vercel (Recommended - Easiest)

**Why Vercel**: Free tier, automatic deployments, perfect for React apps, built-in SSL

### Steps:

1. **Create Vercel Account**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub (recommended)

2. **Push Code to GitHub**

   ```bash
   # In your CoralCrave directory
   git init
   git add .
   git commit -m "Initial CoralCrave deployment"

   # Create repository on GitHub, then:
   git remote add origin https://github.com/yourusername/coralcrave.git
   git push -u origin main
   ```

3. **Deploy on Vercel**
   - Go to Vercel dashboard
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will auto-detect it's a Vite React app
   - Click "Deploy"

4. **Add Environment Variables**
   - In Vercel dashboard → Project → Settings → Environment Variables
   - Add all your `.env.local` variables:
     ```
     VITE_FIREBASE_API_KEY=your_key_here
     VITE_FIREBASE_AUTH_DOMAIN=your_domain_here
     VITE_FIREBASE_PROJECT_ID=your_project_id
     VITE_FIREBASE_STORAGE_BUCKET=your_bucket_here
     VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
     VITE_FIREBASE_APP_ID=your_app_id
     VITE_AGORA_APP_ID=your_agora_app_id
     ```

5. **Update Firebase Authorized Domains**
   - Go to Firebase Console → Authentication → Sign-in method
   - Add your Vercel domain (e.g., `coralcrave.vercel.app`) to authorized domains

6. **Redeploy**
   - Vercel will auto-redeploy when you push to GitHub
   - Or manually redeploy from Vercel dashboard

**Result**: Your app will be live at `https://your-project-name.vercel.app`

---

## 🌐 Option 2: Netlify (Also Great)

**Why Netlify**: Free tier, drag-and-drop deployment, great for static sites

### Steps:

1. **Build Your App**

   ```bash
   npm run build
   ```

2. **Deploy to Netlify**
   - Go to [netlify.com](https://netlify.com)
   - Sign up for free account
   - Drag and drop your `dist` folder to Netlify
   - Or connect your GitHub repository for auto-deployments

3. **Configure Environment Variables**
   - In Netlify dashboard → Site settings → Environment variables
   - Add all your environment variables

4. **Update Firebase Domains**
   - Add your Netlify domain to Firebase authorized domains

---

## ☁️ Option 3: Firebase Hosting (Google's Platform)

**Why Firebase**: Integrated with your Firebase backend, fast CDN

### Steps:

1. **Install Firebase CLI**

   ```bash
   npm install -g firebase-tools
   firebase login
   ```

2. **Initialize Hosting**

   ```bash
   firebase init hosting
   # Select your Firebase project
   # Set public directory to: dist
   # Configure as single-page app: Yes
   # Set up automatic builds: No (for now)
   ```

3. **Build and Deploy**

   ```bash
   npm run build
   firebase deploy
   ```

4. **Update Authorized Domains**
   - Your domain will be `https://your-project-id.web.app`
   - Add to Firebase authorized domains

---

## 🔧 Pre-Deployment Checklist

### 1. Environment Variables

Make sure these are set in your deployment platform:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_AGORA_APP_ID=
```

### 2. Firebase Configuration

- ✅ Firestore security rules deployed
- ✅ Authentication methods enabled (Email/Password, Google)
- ✅ Add your deployment domain to authorized domains

### 3. Agora Configuration

- ✅ Agora project created
- ✅ App ID configured
- ✅ For production: Set up token server for security

### 4. Build Test

```bash
npm run build
npm run preview  # Test the production build locally
```

---

## 🌍 Custom Domain (Optional)

### For Vercel:

1. Buy domain from any registrar (Namecheap, GoDaddy, etc.)
2. In Vercel dashboard → Project → Settings → Domains
3. Add your custom domain
4. Update DNS records as instructed by Vercel
5. Add custom domain to Firebase authorized domains

### For Netlify:

1. In Netlify dashboard → Domain settings
2. Add custom domain
3. Update DNS records
4. Add to Firebase authorized domains

---

## 🚀 Quick Start (Vercel - 10 minutes)

1. **Push to GitHub**:

   ```bash
   git init
   git add .
   git commit -m "Deploy CoralCrave"
   # Create GitHub repo, then push
   ```

2. **Deploy on Vercel**:
   - Connect GitHub repo
   - Add environment variables
   - Deploy

3. **Update Firebase**:
   - Add Vercel domain to authorized domains

4. **Test**: Your app is live worldwide! 🎉

---

## 📱 Mobile Considerations

Your deployed app will work on mobile browsers, but for better mobile experience:

### Progressive Web App (PWA)

- Add to `vite.config.ts`:

```javascript
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
})
```

### Camera/Microphone on Mobile

- Requires HTTPS (all deployment options provide this)
- iOS Safari may need special handling for camera access

---

## 🔒 Security Notes

### Production Checklist:

- ✅ All environment variables secured
- ✅ Firebase security rules deployed
- ✅ HTTPS enabled (automatic with all platforms)
- ✅ Agora token server for production (recommended)
- ✅ Rate limiting configured
- ✅ CORS properly configured

### Agora Security (Production):

For production, implement Agora token server:

1. Deploy the `server` folder to Cloud Run or similar
2. Generate tokens server-side for each stream
3. Update client to request tokens from your server

---

## 💰 Cost Estimates

### Free Tiers:

- **Vercel**: 100GB bandwidth/month, unlimited projects
- **Netlify**: 100GB bandwidth/month, 300 build minutes
- **Firebase Hosting**: 10GB storage, 360MB/day transfer
- **Firebase Firestore**: 50K reads, 20K writes per day
- **Agora**: 10,000 minutes/month free

### Scaling:

- Most apps stay within free tiers initially
- Paid plans start around $20-50/month for significant traffic
- Monitor usage in each platform's dashboard

---

## 🎯 Recommended Deployment Flow

1. **Start with Vercel** (easiest, most reliable)
2. **Test with friends/family** using the Vercel URL
3. **Add custom domain** when ready for public launch
4. **Monitor usage** and upgrade plans as needed
5. **Implement Agora token server** for production security

Your CoralCrave marketplace will be accessible worldwide within minutes! 🌍
