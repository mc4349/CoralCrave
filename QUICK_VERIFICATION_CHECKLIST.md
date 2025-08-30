# 🔍 Quick Verification Checklist - CoralCrave Firebase Setup

## ✅ COMPLETED (Based on your confirmation):
- [x] **Step 1**: Firestore Database created
- [x] **Step 3**: Required APIs enabled in Google Cloud Console
- [x] **Step 5**: Firebase Authentication set up

---

## 🔍 ITEMS TO VERIFY NOW:

### 1. **Billing Plan** (Step 2)
**Check**: Go to Firebase Console → Usage and billing
- **Expected**: Should show "Blaze (Pay as you go)" plan
- **If not**: You'll need to upgrade from Spark (free) to Blaze plan
- **Why critical**: Required for external API access from your website

### 2. **Firestore Security Rules** (Step 4)
**Check**: Firebase Console → Firestore Database → Rules tab
- **Current rules should allow**: Authenticated users to create/read streams
- **If default rules**: You'll get permission denied errors
- **Action needed**: Copy the rules from FIREBASE_SETUP_COMPLETE.md step 4

### 3. **Environment Variables** (Step 6)
**Check**: Your `.env.local` file has all Firebase config values
- **Location**: Root of your project (d:/CoralCrave/.env.local)
- **Required values**: API key, auth domain, project ID, etc.
- **Get values from**: Firebase Console → Project Settings → Your apps

### 4. **Authentication Methods** (Step 5 details)
**Check**: Firebase Console → Authentication → Sign-in method
- **Should be enabled**: Email/Password and Google sign-in
- **Authorized domains**: Should include localhost and your domains

---

## 🧪 READY TO TEST?

If the above 4 items are verified, you can test stream creation:

### Test Steps:
1. **Go to your website**: http://localhost:5173 (or your dev server URL)
2. **Sign in**: Use Google or email/password
3. **Try to start a stream**: Go to "Go Live" or stream creation
4. **Check browser console**: Look for success messages instead of 400 errors

### Expected Success Messages:
```
🚀 Creating livestream with FAST execution...
⚡ FAST: Livestream created in Firestore: [stream-id]
✅ Stream created successfully
```

### If Still Getting 400 Errors:
- **Wait 10-15 minutes**: APIs need time to propagate
- **Check billing plan**: Must be Blaze, not Spark
- **Verify security rules**: Must allow authenticated writes
- **Clear browser cache**: Hard refresh (Ctrl+Shift+R)

---

## 🚨 IGNORE REDIS ERRORS

The Redis connection errors in your server terminal are **NORMAL** and **SAFE TO IGNORE**:
- Redis is optional for development
- Your server will work without Redis
- Streams will still save to Firestore
- Only affects advanced auction features

**Focus on Firestore - that's what needs to work for streams!**
