import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { initializeFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

// Enhanced Firebase configuration with 400 error fixes
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

console.log('🔥 Initializing Firebase for CoralCrave...')
console.log('📊 Project ID:', firebaseConfig.projectId)
console.log('🌐 Environment:', import.meta.env.MODE)

// Initialize Firebase app
const app = initializeApp(firebaseConfig)
console.log('✅ Firebase app initialized')

// Initialize Firebase Auth
export const auth = getAuth(app)
console.log('✅ Firebase Auth ready')

// Initialize Firestore with comprehensive settings to fix 400 errors
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true, // Force long polling to avoid WebChannel 400 errors
  ignoreUndefinedProperties: true,
  cacheSizeBytes: 1048576, // 1MB cache
})
console.log('✅ Firestore initialized with enhanced 400 error fixes')

// Initialize Storage
export const storage = getStorage(app)
console.log('✅ Firebase Storage ready')

console.log('🎉 Firebase initialization complete!')

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider()

// Configure Google Auth Provider for better popup handling
googleProvider.setCustomParameters({
  prompt: 'select_account',
})

// Add additional scopes for better user info
googleProvider.addScope('email')
googleProvider.addScope('profile')

export default app
