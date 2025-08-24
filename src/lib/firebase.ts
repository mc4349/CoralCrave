import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

// Connect to emulators in development - TEMPORARILY DISABLED FOR TESTING
// if (import.meta.env.DEV) {
//   try {
//     // Connect to Auth emulator
//     connectAuthEmulator(auth, 'http://localhost:9099')
//   } catch (error) {
//     // Emulator already connected or not available
//     console.log('Auth emulator connection skipped:', error)
//   }
  
//   try {
//     // Connect to Firestore emulator
//     connectFirestoreEmulator(db, 'localhost', 8080)
//   } catch (error) {
//     // Emulator already connected or not available
//     console.log('Firestore emulator connection skipped:', error)
//   }
// }

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider()

export default app
