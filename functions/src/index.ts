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

  const productRef = db.doc(`livestreams/${streamId}/products/${productId}`)
  const bidsCol = productRef.collection('bids')
  const streamRef = db.doc(`livestreams/${streamId}`)

  return db.runTransaction(async tx => {
    const [streamSnap, productSnap] = await Promise.all([
      tx.get(streamRef),
      tx.get(productRef),
    ])

    if (!streamSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Stream not found')
    }

    if (!productSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Product not found')
    }

    const stream = streamSnap.data() as any
    if (stream.status !== 'live') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Stream not live'
      )
    }

    const product = productSnap.data() as any
    if (product.status !== 'active') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Auction not active'
      )
    }

    const now = admin.firestore.Timestamp.now()
    if (product.endAt && product.endAt.toMillis() <= now.toMillis()) {
      throw new functions.https.HttpsError('deadline-exceeded', 'Auction ended')
    }

    const currentHigh = Number(product.highestBid || 0)
    const minInc = Number(product.minIncrement || 1)
    if (amount < currentHigh + minInc) {
      throw new functions.https.HttpsError('failed-precondition', 'Bid too low')
    }

    const bidRef = bidsCol.doc()
    tx.set(bidRef, {
      amount,
      bidderUid: uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    tx.update(productRef, {
      highestBid: amount,
      highestBidderUid: uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    return { ok: true, highestBid: amount, highestBidderUid: uid }
  })
})
