import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

admin.initializeApp()
const db = admin.firestore()

/**
 * Scheduled function to cleanup orphaned live streams
 * Runs every 2 minutes to remove streams that haven't been updated recently
 */
export const cleanupOrphanedStreams = functions.pubsub
  .schedule('every 2 minutes')
  .onRun(async (context) => {
    console.log('🧹 Starting scheduled cleanup of orphaned live streams...')

    try {
      const cutoffTime = new Date()
      cutoffTime.setMinutes(cutoffTime.getMinutes() - 2) // 2 minute threshold

      // Query all streams with status "live"
      const q = db.collection('livestreams').where('status', '==', 'live')
      const querySnapshot = await q.get()

      const deletePromises: Promise<any>[] = []
      let orphanedCount = 0

      querySnapshot.forEach((document) => {
        const data = document.data()
        const updatedAt = data.updatedAt?.toDate?.() || new Date(data.updatedAt)
        const lastHeartbeat = data.lastHeartbeat?.toDate?.() || new Date(data.lastHeartbeat)

        // Check if stream has been updated recently
        const mostRecentUpdate = lastHeartbeat > updatedAt ? lastHeartbeat : updatedAt

        if (mostRecentUpdate < cutoffTime) {
          console.log(`🗑️ Deleting orphaned stream: ${document.id} (last updated: ${mostRecentUpdate})`)
          deletePromises.push(document.ref.delete())
          orphanedCount++
        }
      })

      // Delete orphaned streams
      await Promise.all(deletePromises)

      if (orphanedCount > 0) {
        console.log(`✅ Cleaned up ${orphanedCount} orphaned streams`)
      } else {
        console.log('ℹ️ No orphaned streams found to clean up')
      }

      return { success: true, cleanedCount: orphanedCount }
    } catch (error) {
      console.error('❌ Failed to cleanup orphaned streams:', error)
      throw error
    }
  })

/**
 * Manual cleanup function that can be called via HTTP
 * Useful for immediate cleanup or testing
 */
export const manualCleanup = functions.https.onCall(async (data, context) => {
  console.log('🧹 Starting manual cleanup of old live streams...')

  try {
    // Query all streams with status "live"
    const q = db.collection('livestreams').where('status', '==', 'live')
    const querySnapshot = await q.get()

    const deletePromises: Promise<any>[] = []

    console.log(`📊 Found ${querySnapshot.size} live streams to clean up`)

    querySnapshot.forEach((document) => {
      console.log(`🗑️ Deleting old live stream: ${document.id}`)
      deletePromises.push(document.ref.delete())
    })

    // Delete all old streams
    await Promise.all(deletePromises)

    console.log(`✅ Successfully deleted ${deletePromises.length} old live streams`)
    return { success: true, deletedCount: deletePromises.length }
  } catch (error) {
    console.error('❌ Failed to cleanup old live streams:', error)
    throw error
  }
})

export const placeBid = functions.https.onCall(async (data, context) => {
  const { streamId, productId, amount } = data || {}
  const uid = context.auth?.uid

  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Login required')
  }

  if (!streamId || !productId || typeof amount !== 'number') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Missing/invalid fields'
    )
  }

  const itemRef = db.doc(`livestreams/${streamId}/items/${productId}`)
  const bidsCol = itemRef.collection('bids')
  const streamRef = db.doc(`livestreams/${streamId}`)

  return db.runTransaction(async tx => {
    const [streamSnap, itemSnap] = await Promise.all([
      tx.get(streamRef),
      tx.get(itemRef),
    ])

    if (!streamSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Stream not found')
    }

    if (!itemSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Item not found')
    }

    const stream = streamSnap.data() as any
    if (stream.status !== 'live') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Stream not live'
      )
    }

    const item = itemSnap.data() as any
    if (item.status !== 'running') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Auction not active'
      )
    }

    const now = admin.firestore.Timestamp.now()
    if (item.endAt && item.endAt.toMillis() <= now.toMillis()) {
      throw new functions.https.HttpsError('deadline-exceeded', 'Auction ended')
    }

    const currentHigh = Number(item.currentPrice || item.startingPrice || 0)
    const minInc = 1 // Default increment, could be made configurable
    if (amount < currentHigh + minInc) {
      throw new functions.https.HttpsError('failed-precondition', 'Bid too low')
    }

    const bidRef = bidsCol.doc()
    tx.set(bidRef, {
      amount,
      bidderUid: uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      userId: uid,
      username: '', // Will be populated from user profile
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      source: 'user',
      isValid: true,
    })

    tx.update(itemRef, {
      currentPrice: amount,
      leadingBidderId: uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    return { ok: true, highestBid: amount, highestBidderUid: uid }
  })
})
