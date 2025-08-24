import { orderService } from './orderService'
import { userService } from './userService'

export interface PaymentIntent {
  id: string
  amount: number
  currency: string
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'requires_capture' | 'canceled' | 'succeeded'
  client_secret: string
}

export interface StripeAccount {
  id: string
  type: 'express' | 'standard' | 'custom'
  country: string
  email: string
  business_type: 'individual' | 'company'
  charges_enabled: boolean
  payouts_enabled: boolean
  details_submitted: boolean
  requirements: {
    currently_due: string[]
    eventually_due: string[]
    past_due: string[]
    pending_verification: string[]
  }
}

class PaymentService {
  private readonly STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY
  private readonly API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

  // Create payment intent for auction win
  async createPaymentIntent(
    amount: number,
    currency: string = 'usd',
    sellerId: string,
    itemId: string,
    liveId: string,
    buyerId: string
  ): Promise<PaymentIntent> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/payments/create-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Convert to cents
          currency,
          sellerId,
          itemId,
          liveId,
          buyerId,
          application_fee_amount: Math.round(amount * 0.05 * 100), // 5% platform fee
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create payment intent')
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating payment intent:', error)
      throw error
    }
  }

  // Confirm payment intent
  async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId: string
  ): Promise<PaymentIntent> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/payments/confirm-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_intent_id: paymentIntentId,
          payment_method: paymentMethodId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to confirm payment intent')
      }

      return await response.json()
    } catch (error) {
      console.error('Error confirming payment intent:', error)
      throw error
    }
  }

  // Capture payment (for auctions that require manual capture)
  async capturePayment(paymentIntentId: string): Promise<PaymentIntent> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/payments/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_intent_id: paymentIntentId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to capture payment')
      }

      return await response.json()
    } catch (error) {
      console.error('Error capturing payment:', error)
      throw error
    }
  }

  // Create Stripe Connect account for seller
  async createConnectAccount(
    userId: string,
    email: string,
    businessType: 'individual' | 'company' = 'individual'
  ): Promise<StripeAccount> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/payments/create-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          email,
          business_type: businessType,
          type: 'express',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create Stripe account')
      }

      const account = await response.json()
      
      // Update user profile with Stripe account ID
      await userService.updateUserProfile(userId, {
        kyc: {
          stripeAccountId: account.id,
          status: 'pending'
        }
      })

      return account
    } catch (error) {
      console.error('Error creating Stripe account:', error)
      throw error
    }
  }

  // Create account link for onboarding
  async createAccountLink(accountId: string, userId: string): Promise<{ url: string }> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/payments/create-account-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_id: accountId,
          user_id: userId,
          refresh_url: `${window.location.origin}/account?tab=payouts&refresh=true`,
          return_url: `${window.location.origin}/account?tab=payouts&success=true`,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create account link')
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating account link:', error)
      throw error
    }
  }

  // Get account status
  async getAccountStatus(accountId: string): Promise<StripeAccount> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/payments/account-status/${accountId}`)

      if (!response.ok) {
        throw new Error('Failed to get account status')
      }

      return await response.json()
    } catch (error) {
      console.error('Error getting account status:', error)
      throw error
    }
  }

  // Get account balance
  async getAccountBalance(accountId: string): Promise<{
    available: Array<{ amount: number; currency: string }>
    pending: Array<{ amount: number; currency: string }>
  }> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/payments/account-balance/${accountId}`)

      if (!response.ok) {
        throw new Error('Failed to get account balance')
      }

      return await response.json()
    } catch (error) {
      console.error('Error getting account balance:', error)
      throw error
    }
  }

  // Process refund
  async processRefund(
    paymentIntentId: string,
    amount?: number,
    reason: 'duplicate' | 'fraudulent' | 'requested_by_customer' = 'requested_by_customer'
  ): Promise<{ id: string; amount: number; status: string }> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/payments/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_intent_id: paymentIntentId,
          amount: amount ? Math.round(amount * 100) : undefined,
          reason,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to process refund')
      }

      return await response.json()
    } catch (error) {
      console.error('Error processing refund:', error)
      throw error
    }
  }

  // Apply Crave Credits to payment
  async applyCraveCredits(
    userId: string,
    orderAmount: number,
    maxCreditAmount?: number
  ): Promise<{ creditApplied: number; remainingAmount: number }> {
    try {
      // Get available credit balance
      const availableCredit = await orderService.getAvailableCreditBalance(userId)
      
      if (availableCredit === 0) {
        return { creditApplied: 0, remainingAmount: orderAmount }
      }

      // Calculate how much credit to apply
      const maxToApply = maxCreditAmount || orderAmount
      const creditToApply = Math.min(availableCredit, maxToApply, orderAmount)
      
      if (creditToApply > 0) {
        // This would be called after order creation to actually use the credits
        // For now, just return the calculation
        return {
          creditApplied: creditToApply,
          remainingAmount: orderAmount - creditToApply
        }
      }

      return { creditApplied: 0, remainingAmount: orderAmount }
    } catch (error) {
      console.error('Error applying Crave credits:', error)
      throw error
    }
  }

  // Calculate fees and taxes
  calculateOrderTotals(itemPrice: number, shippingCost: number = 0): {
    subtotal: number
    platformFee: number
    processingFee: number
    tax: number
    total: number
  } {
    const subtotal = itemPrice + shippingCost
    const platformFee = Math.round(itemPrice * 0.05 * 100) / 100 // 5% of item price only
    const processingFee = Math.round((subtotal * 0.029 + 0.30) * 100) / 100 // Stripe fees
    const tax = 0 // Tax calculation would be more complex in production
    const total = subtotal + platformFee + processingFee + tax

    return {
      subtotal,
      platformFee,
      processingFee,
      tax,
      total
    }
  }

  // Initialize Stripe (client-side)
  async initializeStripe() {
    if (!this.STRIPE_PUBLIC_KEY) {
      throw new Error('Stripe public key not configured')
    }

    // This would typically load Stripe.js
    // For now, just return a mock object
    return {
      confirmCardPayment: async (clientSecret: string, paymentMethod: any) => {
        // Mock implementation
        console.log('Confirming payment with Stripe:', { clientSecret, paymentMethod })
        return { error: null, paymentIntent: { status: 'succeeded' } }
      },
      createPaymentMethod: async (options: any) => {
        // Mock implementation
        console.log('Creating payment method:', options)
        return { error: null, paymentMethod: { id: 'pm_mock_' + Date.now() } }
      }
    }
  }
}

export const paymentService = new PaymentService()
