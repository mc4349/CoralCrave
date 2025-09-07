// Test Firestore connection with enhanced diagnostics
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  enableNetwork,
} from 'firebase/firestore'
import { signInAnonymously } from 'firebase/auth'

import { db, auth } from '../lib/firebase'

export async function testFirestoreConnection(): Promise<boolean> {
  console.log('🔥 Starting Enhanced Firestore connection test...')
  console.log('🌐 Environment:', import.meta.env.MODE)
  console.log('📍 Project ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID)

  try {
    // Step 0: Check authentication state
    console.log('🔐 Step 0: Checking authentication state...')
    if (!auth.currentUser) {
      console.log('👤 No user authenticated, signing in anonymously...')
      try {
        await signInAnonymously(auth)
        console.log('✅ Anonymous authentication successful')
      } catch (authError: any) {
        console.error('❌ Anonymous auth failed:', authError)
        console.error('Auth error code:', authError.code)
        console.error('Auth error message:', authError.message)
      }
    } else {
      console.log('✅ User already authenticated:', auth.currentUser.uid)
    }

    // Step 1: Test network connectivity
    console.log('🌐 Step 1: Testing Firestore network connectivity...')
    try {
      await enableNetwork(db)
      console.log('✅ Step 1 SUCCESS: Network enabled')
    } catch (networkError: any) {
      console.error('❌ Network error:', networkError)
      throw networkError
    }

    console.log('📝 Step 2: Testing write operation...')

    // Try to write a test document with minimal data
    const testData = {
      test: true,
      timestamp: new Date().toISOString(),
      message: 'Enhanced connection test',
      testId: Math.random().toString(36).substr(2, 9),
      userId: auth.currentUser?.uid || 'anonymous',
    }

    console.log('📤 Attempting to write test data:', testData)
    const docRef = await addDoc(collection(db, 'test'), testData)
    console.log('✅ Step 2 SUCCESS: Wrote test document with ID:', docRef.id)

    console.log('📖 Step 3: Testing read operation...')

    // Try to read the test collection
    const querySnapshot = await getDocs(collection(db, 'test'))
    console.log(
      '✅ Step 3 SUCCESS: Read test collection, found',
      querySnapshot.size,
      'documents'
    )

    // Log some document data for verification
    querySnapshot.forEach(doc => {
      console.log('📄 Document:', doc.id, '=>', doc.data())
    })

    console.log('🗑️ Step 4: Testing delete operation...')

    // Clean up - delete the test document
    await deleteDoc(doc(db, 'test', docRef.id))
    console.log('✅ Step 4 SUCCESS: Deleted test document')

    console.log(
      '🎉 ALL TESTS PASSED! Firestore connection is working perfectly!'
    )
    return true
  } catch (error: any) {
    console.error('❌ ENHANCED FIRESTORE TEST FAILED!')
    console.error('🔍 Full error object:', error)
    console.error('📝 Error message:', error.message)
    console.error('🏷️ Error code:', error.code)
    console.error('📊 Error stack:', error.stack)

    // Enhanced error analysis
    if (error.code === 'permission-denied') {
      console.error('🔒 PERMISSION DENIED - Possible causes:')
      console.error('   • Firestore security rules are too restrictive')
      console.error('   • User not properly authenticated')
      console.error('   • Collection access rules need updating')
    } else if (error.code === 'unavailable') {
      console.error('🌐 SERVICE UNAVAILABLE - Possible causes:')
      console.error('   • Internet connection issues')
      console.error('   • Firebase project not accessible')
      console.error('   • Firestore API not enabled')
    } else if (error.code === 'failed-precondition') {
      console.error('⚠️ FAILED PRECONDITION - Possible causes:')
      console.error('   • Firestore database not created')
      console.error('   • Wrong database mode (Native vs Datastore)')
    } else if (
      error.message?.includes('400') ||
      error.message?.includes('Bad Request')
    ) {
      console.error('🚫 400 BAD REQUEST - Possible causes:')
      console.error('   • Invalid API key or project configuration')
      console.error('   • Firestore API not enabled for this project')
      console.error('   • Project ID mismatch')
      console.error('   • Billing not enabled (if required)')
      console.error('💡 IMMEDIATE FIXES TO TRY:')
      console.error('   1. Verify project ID in Firebase Console')
      console.error('   2. Enable Firestore API in Google Cloud Console')
      console.error('   3. Check billing status')
      console.error('   4. Regenerate API keys if needed')
    } else if (error.message?.includes('WebChannelConnection')) {
      console.error('🔌 WEBCHANNEL CONNECTION ERROR - Possible causes:')
      console.error('   • Network transport issues')
      console.error('   • CORS policy problems')
      console.error('   • Firestore gRPC connection blocked')
    }

    return false
  }
}
