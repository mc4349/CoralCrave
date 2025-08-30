# 🛡️ FIRESTORE SECURITY RULES SETUP

## 📍 WHERE TO FIND THE RULES

### Step 1: Go to Firebase Console
1. **Open**: https://console.firebase.google.com/project/coralcrave
2. **Click**: "Firestore Database" in the left sidebar
3. **Click**: "Rules" tab (next to "Data" tab)

### Step 2: You'll See Current Rules
- **Default rules** look like this (THESE WON'T WORK):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## 🔧 REPLACE WITH THESE RULES

### Step 3: Copy This Entire Code Block
**Select all the text in the rules editor and replace it with:**

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

### Step 4: Publish the Rules
1. **Click**: "Publish" button (blue button at top)
2. **Wait**: 10-30 seconds for "Rules published successfully"
3. **Success**: You should see a green checkmark

---

## ✅ WHAT THESE RULES DO

### For Livestreams (Most Important):
- ✅ **Anyone can view streams** (allow read: if true)
- ✅ **Only signed-in users can create streams** (allow create: if request.auth != null)
- ✅ **Only stream owners can edit/delete** (security)
- ✅ **Anyone can read stream content** (chat, items, etc.)
- ✅ **Only signed-in users can write** (send messages, place bids)

### For User Data:
- ✅ **Users can only access their own profile data**
- ✅ **Prevents unauthorized access to other users' data**

### For Auctions & Bids:
- ✅ **Only signed-in users can participate**
- ✅ **Prevents anonymous bidding**

---

## 🚨 CRITICAL: WHY THIS FIXES 400 ERRORS

### Before (Default Rules):
```javascript
allow read, write: if false;  // ❌ BLOCKS EVERYTHING
```

### After (Our Rules):
```javascript
allow create: if request.auth != null;  // ✅ ALLOWS AUTHENTICATED USERS
```

**The default rules block ALL database writes, which causes 400 Bad Request errors when trying to create streams!**

---

## 🧪 READY TO TEST

### After publishing the rules:
1. **Go to**: http://localhost:5173
2. **Sign in**: With Google or email/password
3. **Try creating a stream**: Go to "Go Live" page
4. **Check browser console**: Should see success messages

### Expected Success:
```
🚀 Creating livestream with FAST execution...
⚡ FAST: Livestream created in Firestore: abc123
✅ Stream created successfully
```

### If Still Getting Errors:
- **Wait 5 minutes**: Rules need time to propagate
- **Hard refresh**: Ctrl+Shift+R to clear cache
- **Check authentication**: Make sure you're signed in
- **Verify rules**: Go back to Firebase Console and confirm rules are published

---

## 📱 QUICK ACCESS LINKS

- **Firebase Console**: https://console.firebase.google.com/project/coralcrave
- **Firestore Rules**: https://console.firebase.google.com/project/coralcrave/firestore/rules
- **Your Website**: http://localhost:5173

**Once you publish these rules, your streams should start working immediately!**
