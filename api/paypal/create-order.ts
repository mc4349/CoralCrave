import { VercelRequest, VercelResponse } from '@vercel/node'
import * as paypal from '@paypal/checkout-server-sdk'
import * as admin from 'firebase-admin'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: { message: 'Method not allowed' },
    })
  }

  try {
    const { streamId, productId, amountUSD } = req.body || {}

    if (!streamId || !productId || typeof amountUSD !== 'number') {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing/invalid fields' },
      })
    }

    // Initialize Firebase if not already initialized
    if (!admin.apps.length) {
      admin.initializeApp()
    }
    const db = admin.firestore()

    // Validate winner server-side
    const itemRef = db.doc(`livestreams/${streamId}/items/${productId}`)
    const snap = await itemRef.get()

    if (!snap.exists) {
      return res.status(404).json({
        success: false,
        error: { message: 'Item not found' },
      })
    }

    const item = snap.data()

    if (item?.status !== 'sold') {
      return res.status(400).json({
        success: false,
        error: { message: 'Auction not finalized yet' },
      })
    }

    // Initialize PayPal client
    const clientId = process.env.PAYPAL_CLIENT_ID
    const clientSecret = process.env.PAYPAL_SECRET

    if (!clientId || !clientSecret) {
      console.error('PayPal credentials not configured')
      return res.status(500).json({
        success: false,
        error: { message: 'PayPal credentials not configured' },
      })
    }

    const environment =
      process.env.PAYPAL_ENV === 'live'
        ? new paypal.core.LiveEnvironment(clientId, clientSecret)
        : new paypal.core.SandboxEnvironment(clientId, clientSecret)

    const payPalClient = new paypal.core.PayPalHttpClient(environment)

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

    res.json({
      success: true,
      orderId: result.result.id,
      approveLinks: result.result.links,
    })
  } catch (error) {
    console.error('PayPal create order error:', error)
    res.status(500).json({
      success: false,
      error: { message: 'PayPal create order failed' },
    })
  }
}
