// Simple JavaScript cleanup script to delete old live streams
// This can be run directly with Node.js

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore'

// Firebase configuration - you'll need to replace this with your actual config
const firebaseConfig = {
  // This should match your Firebase project config
  // You can find this in your Firebase console
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
}

async function cleanupOldLiveStreams() {
  try {
    console.log('🧹 Starting cleanup of old live streams...')

    // Initialize Firebase
    const app = initializeApp(firebaseConfig)
    const db = getFirestore(app)

    // Query all streams with status "live"
    const q = query(
      collection(db, 'livestreams'),
      where('status', '==', 'live')
    )

    const querySnapshot = await getDocs(q)
    const deletePromises = []

    console.log(`📊 Found ${querySnapshot.size} live streams to clean up`)

    querySnapshot.forEach((document) => {
      console.log(`🗑️ Deleting old live stream: ${document.id}`)
      deletePromises.push(deleteDoc(doc(db, 'livestreams', document.id)))
    })

    // Delete all old streams
    await Promise.all(deletePromises)

    console.log(`✅ Successfully deleted ${deletePromises.length} old live streams`)
    return deletePromises.length
  } catch (error) {
    console.error('❌ Failed to cleanup old live streams:', error)
    throw error
  }
}

async function main() {
  try {
    console.log('🚀 Starting immediate cleanup of old live streams...')

    const deletedCount = await cleanupOldLiveStreams()

    if (deletedCount > 0) {
      console.log(`✅ Cleanup completed! Deleted ${deletedCount} old live streams.`)
      console.log('🎉 Your Explore page should now show only active streams.')
    } else {
      console.log('ℹ️ No old live streams found to clean up.')
    }

    console.log('📋 Next steps:')
    console.log('1. Check your Explore page - it should now be clean')
    console.log('2. Create a new stream - it should appear immediately')
    console.log('3. The automatic cleanup will run every minute to prevent future issues')

  } catch (error) {
    console.error('❌ Cleanup failed:', error)
    process.exit(1)
  }
}

// Run the cleanup
main()
