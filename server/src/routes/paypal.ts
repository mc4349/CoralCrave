import express from 'express'
import cors from 'cors'
import * as paypal from '@paypal/checkout-server-sdk'
import admin from 'firebase-admin'
import dotenv from 'dotenv'

dotenv.config()

if (!admin.apps.length) {
  admin.initializeApp()
}
const db = admin.firestore()

const clientId = process.env.PAYPAL_CLIENT_ID
const clientSecret = process.env.PAYPAL_SECRET
const environment =
  process.env.PAYPAL_ENV === 'live'
    ? new paypal.core.LiveEnvironment(clientId!, clientSecret!)
    : new paypal.core.SandboxEnvironment(clientId!, clientSecret!)
const payPalClient = new paypal.core.PayPalHttpClient(environment)

export const paypalRouter = express.Router()
paypalRouter.use(cors())
paypalRouter.use(express.json())

// POST /paypal/create-order
// body: { streamId, productId, amountUSD }
paypalRouter.post('/create-order', async (req, res) => {
  try {
    const { streamId, productId, amountUSD } = req.body || {}
    if (!streamId || !productId || typeof amountUSD !== 'number') {
      return res.status(400).json({ error: 'Missing/invalid fields' })
    }

    // Validate winner server-side
    const itemRef = db.doc(`livestreams/${streamId}/items/${productId}`)
    const snap = await itemRef.get()
    if (!snap.exists)
      return res.status(404).json({ error: 'Item not found' })
    const item = snap.data()

    if (item?.status !== 'sold') {
      return res.status(400).json({ error: 'Auction not finalized yet' })
    }

    const order = new paypal.orders.OrdersCreateRequest()
    order.prefer('return=representation')
    order.requestBody({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: { currency_code: 'USD', value: amountUSD.toFixed(2) },
          custom_id: `${streamId}:${productId}`,
        },
      ],
    })

    const result = await payPalClient.execute(order)

    // Create order doc
    await db
      .collection('orders')
      .doc(result.result.id)
      .set({
        provider: 'paypal',
        status: 'created',
        streamId,
        productId,
        amount: amountUSD,
        paypalOrderId: result.result.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        winnerUid: item.highestBidderId || null,
      })

    res.json({ orderId: result.result.id, approveLinks: result.result.links })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'PayPal create failed' })
  }
})

// POST /paypal/capture
// body: { orderId }
paypalRouter.post('/capture', async (req, res) => {
  try {
    const { orderId } = req.body || {}
    const captureReq = new paypal.orders.OrdersCaptureRequest(orderId)
    captureReq.requestBody({})
    const result = await payPalClient.execute(captureReq)

    // Mark paid
    await db.collection('orders').doc(orderId).update({
      status: 'paid',
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    res.json({ ok: true, result })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'PayPal capture failed' })
  }
})
