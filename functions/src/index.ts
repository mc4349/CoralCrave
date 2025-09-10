import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

admin.initializeApp()
const db = admin.firestore()

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
      isValid: true
    })

    tx.update(itemRef, {
      currentPrice: amount,
      leadingBidderId: uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    return { ok: true, highestBid: amount, highestBidderUid: uid }
  })
})
