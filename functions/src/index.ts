import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

admin.initializeApp()
const db = admin.firestore()

/**
 * Scheduled function to mark stale live streams as ended
 * Runs every 5 minutes to mark streams as ended if heartbeat is stale (> 2 minutes)
 */
export const endStaleLiveStreams = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async (context) => {
    console.log('🧹 Starting scheduled cleanup of stale live streams...')

    try {
      const now = admin.firestore.Timestamp.now()
      const staleMillis = 2 * 60 * 1000 // 2 minutes
      const cutoff = new Date(now.toMillis() - staleMillis)

      // Query all streams with status "live"
      const q = db.collection('livestreams').where('status', '==', 'live')
      const querySnapshot = await q.get()

      const batch = db.batch()
      let count = 0

      querySnapshot.forEach((docSnap) => {
        const d = docSnap.data() as any
        const last = d.lastHeartbeat?.toDate?.() || d.lastHeartbeat
        const lastMs = last instanceof Date ? last.getTime() : 0

        // If lastHeartbeat missing or older than cutoff -> mark as ended
        if (!lastMs || lastMs < cutoff.getTime()) {
          batch.update(docSnap.ref, {
            status: 'ended',
            endedAt: admin.firestore.FieldValue.serverTimestamp(),
            staleEnded: true,
          })
          count++
        }
      })

      if (count > 0) {
        await batch.commit()
        console.log(`✅ endStaleLiveStreams: marked ${count} streams as ended`)
      } else {
        console.log('ℹ️ endStaleLiveStreams: no stale streams found')
      }

      return { success: true, endedCount: count }
    } catch (error) {
      console.error('❌ endStaleLiveStreams failed:', error)
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
