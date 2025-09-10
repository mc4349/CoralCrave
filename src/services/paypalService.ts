export interface PayPalOrder {
  id: string
  status: 'CREATED' | 'SAVED' | 'APPROVED' | 'VOIDED' | 'COMPLETED'
  purchase_units: Array<{
    amount: {
      currency_code: string
      value: string
    }
    payee?: {
      email_address: string
    }
  }>
}

export interface PayPalPaymentData {
  orderID: string
  payerID: string
  paymentID: string
  billingToken: string
  facilitatorAccessToken: string
}

class PayPalService {
  private readonly PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID
  private readonly API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

  constructor() {
    if (!this.PAYPAL_CLIENT_ID) {
      console.warn(
        'PayPal client ID not configured. PayPal payments will not work.'
      )
    }
  }

  // Create PayPal order for auction payment
  async createOrder(
    amount: number,
    currency: string = 'USD',
    itemName: string,
    auctionId: string,
    sellerId: string,
    buyerId: string
  ): Promise<PayPalOrder> {
    try {
      const response = await fetch(
        `${this.API_BASE_URL}/api/paypal/create-order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: amount.toFixed(2),
            currency,
            itemName,
            auctionId,
            sellerId,
            buyerId,
          }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to create PayPal order')
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating PayPal order:', error)
      throw error
    }
  }

  // Capture PayPal payment
  async capturePayment(orderId: string): Promise<PayPalOrder> {
    try {
      const response = await fetch(
        `${this.API_BASE_URL}/api/paypal/capture-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId,
          }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to capture PayPal payment')
      }

      return await response.json()
    } catch (error) {
      console.error('Error capturing PayPal payment:', error)
      throw error
    }
  }

  // Refund PayPal payment
  async refundPayment(
    captureId: string,
    amount?: number,
    reason?: string
  ): Promise<any> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/paypal/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          captureId,
          amount: amount?.toFixed(2),
          reason,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to process PayPal refund')
      }

      return await response.json()
    } catch (error) {
      console.error('Error processing PayPal refund:', error)
      throw error
    }
  }

  // Get PayPal script options
  getPayPalScriptOptions() {
    return {
      'client-id': this.PAYPAL_CLIENT_ID || 'test',
      currency: 'USD',
      intent: 'capture',
      'enable-funding': 'venmo',
      'disable-funding': 'paylater,card',
    }
  }

  // Calculate PayPal fees (for display purposes)
  calculatePayPalFees(amount: number): {
    paypalFee: number
    total: number
  } {
    // PayPal standard rate: 2.9% + $0.30
    const paypalFee = Math.round((amount * 0.029 + 0.3) * 100) / 100
    const total = amount + paypalFee

    return {
      paypalFee,
      total,
    }
  }

  // Validate PayPal configuration
  isConfigured(): boolean {
    return !!this.PAYPAL_CLIENT_ID
  }
}

export const paypalService = new PayPalService()
