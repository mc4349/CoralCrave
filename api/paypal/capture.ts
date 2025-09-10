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
    const { orderId } = req.body || {}

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing orderId' },
      })
    }

    // Initialize Firebase if not already initialized
    if (!admin.apps.length) {
      admin.initializeApp()
    }
    const db = admin.firestore()

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

    const captureReq = new paypal.orders.OrdersCaptureRequest(orderId)
    captureReq.requestBody({})
    const result = await payPalClient.execute(captureReq)

    // Mark paid
    await db.collection('orders').doc(orderId).update({
      status: 'paid',
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    res.json({
      success: true,
      ok: true,
      result,
    })
  } catch (error) {
    console.error('PayPal capture error:', error)
    res.status(500).json({
      success: false,
      error: { message: 'PayPal capture failed' },
    })
  }
}
