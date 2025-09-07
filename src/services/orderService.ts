import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'

import { db } from '../lib/firebase'

export interface Order {
  id?: string
  itemId: string
  liveId: string
  buyerId: string
  buyerUsername: string
  sellerId: string
  sellerUsername: string
  itemTitle: string
  itemDescription: string
  itemImages: string[]
  amount: number
  fees: number
  tax: number
  shippingCost: number
  totalAmount: number
  paymentIntentId?: string
  stripeChargeId?: string
  status:
    | 'pending'
    | 'requires_capture'
    | 'captured'
    | 'shipped'
    | 'delivered'
    | 'cancelled'
    | 'refunded'
  shippingAddress: {
    name: string
    line1: string
    line2?: string
    city: string
    state: string
    postalCode: string
    country: string
  }
  trackingNumber?: string
  createdAt: Timestamp
  updatedAt: Timestamp
  settledAt?: Timestamp
  shippedAt?: Timestamp
  deliveredAt?: Timestamp
}

export interface Review {
  id?: string
  orderId: string
  itemId: string
  reviewerId: string
  reviewerUsername: string
  sellerId: string
  sellerUsername: string
  rating: number // 1-5
  title?: string
  text: string
  images?: string[]
  isVerifiedPurchase: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface CraveCredit {
  id?: string
  uid: string
  type: 'referral' | 'bonus' | 'refund'
  amount: number
  state: 'pending' | 'available' | 'spent' | 'expired'
  description: string
  relatedId?: string // referral ID, order ID, etc.
  expiresAt?: Timestamp
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface Referral {
  id?: string
  referrerId: string
  referrerUsername: string
  refereeId: string
  refereeUsername: string
  status: 'pending' | 'qualified' | 'credited'
  qualifyingOrderId?: string
  creditAmount?: number
  creditId?: string
  createdAt: Timestamp
  updatedAt: Timestamp
  qualifiedAt?: Timestamp
  creditedAt?: Timestamp
}

class OrderService {
  // Create a new order
  async createOrder(
    orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      const order = {
        ...orderData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      const docRef = await addDoc(collection(db, 'orders'), order)
      return docRef.id
    } catch (error) {
      console.error('Error creating order:', error)
      throw error
    }
  }

  // Update order
  async updateOrder(orderId: string, updates: Partial<Order>): Promise<void> {
    try {
      const orderRef = doc(db, 'orders', orderId)
      await updateDoc(orderRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      })
    } catch (error) {
      console.error('Error updating order:', error)
      throw error
    }
  }

  // Get order by ID
  async getOrder(orderId: string): Promise<Order | null> {
    try {
      const orderRef = doc(db, 'orders', orderId)
      const orderSnap = await getDoc(orderRef)

      if (orderSnap.exists()) {
        return { id: orderSnap.id, ...orderSnap.data() } as Order
      }
      return null
    } catch (error) {
      console.error('Error getting order:', error)
      throw error
    }
  }

  // Get user's orders (as buyer)
  async getUserOrders(
    userId: string,
    limitCount: number = 20
  ): Promise<Order[]> {
    try {
      const q = query(
        collection(db, 'orders'),
        where('buyerId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      )

      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Order[]
    } catch (error) {
      console.error('Error getting user orders:', error)
      throw error
    }
  }

  // Get seller's orders
  async getSellerOrders(
    sellerId: string,
    limitCount: number = 20
  ): Promise<Order[]> {
    try {
      const q = query(
        collection(db, 'orders'),
        where('sellerId', '==', sellerId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      )

      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Order[]
    } catch (error) {
      console.error('Error getting seller orders:', error)
      throw error
    }
  }

  // Subscribe to order updates
  subscribeOrder(
    orderId: string,
    callback: (order: Order | null) => void
  ): () => void {
    const orderRef = doc(db, 'orders', orderId)

    return onSnapshot(orderRef, doc => {
      if (doc.exists()) {
        callback({ id: doc.id, ...doc.data() } as Order)
      } else {
        callback(null)
      }
    })
  }

  // Mark order as shipped
  async markOrderShipped(
    orderId: string,
    trackingNumber?: string
  ): Promise<void> {
    try {
      const updates: Partial<Order> = {
        status: 'shipped',
        shippedAt: serverTimestamp() as Timestamp,
      }

      if (trackingNumber) {
        updates.trackingNumber = trackingNumber
      }

      await this.updateOrder(orderId, updates)
    } catch (error) {
      console.error('Error marking order as shipped:', error)
      throw error
    }
  }

  // Mark order as delivered
  async markOrderDelivered(orderId: string): Promise<void> {
    try {
      await this.updateOrder(orderId, {
        status: 'delivered',
        deliveredAt: serverTimestamp() as Timestamp,
      })
    } catch (error) {
      console.error('Error marking order as delivered:', error)
      throw error
    }
  }

  // Create a review
  async createReview(
    reviewData: Omit<Review, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      const review = {
        ...reviewData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      const docRef = await addDoc(collection(db, 'reviews'), review)
      return docRef.id
    } catch (error) {
      console.error('Error creating review:', error)
      throw error
    }
  }

  // Get reviews for a seller
  async getSellerReviews(
    sellerId: string,
    limitCount: number = 20
  ): Promise<Review[]> {
    try {
      const q = query(
        collection(db, 'reviews'),
        where('sellerId', '==', sellerId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      )

      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Review[]
    } catch (error) {
      console.error('Error getting seller reviews:', error)
      throw error
    }
  }

  // Get reviews by user
  async getUserReviews(
    userId: string,
    limitCount: number = 20
  ): Promise<Review[]> {
    try {
      const q = query(
        collection(db, 'reviews'),
        where('reviewerId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      )

      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Review[]
    } catch (error) {
      console.error('Error getting user reviews:', error)
      throw error
    }
  }

  // Create referral
  async createReferral(
    referralData: Omit<Referral, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      const referral = {
        ...referralData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      const docRef = await addDoc(collection(db, 'referrals'), referral)
      return docRef.id
    } catch (error) {
      console.error('Error creating referral:', error)
      throw error
    }
  }

  // Get user's referrals
  async getUserReferrals(userId: string): Promise<Referral[]> {
    try {
      const q = query(
        collection(db, 'referrals'),
        where('referrerId', '==', userId),
        orderBy('createdAt', 'desc')
      )

      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Referral[]
    } catch (error) {
      console.error('Error getting user referrals:', error)
      throw error
    }
  }

  // Qualify referral (when referee makes first purchase)
  async qualifyReferral(
    referralId: string,
    qualifyingOrderId: string
  ): Promise<void> {
    try {
      await updateDoc(doc(db, 'referrals', referralId), {
        status: 'qualified',
        qualifyingOrderId,
        qualifiedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    } catch (error) {
      console.error('Error qualifying referral:', error)
      throw error
    }
  }

  // Create Crave Credit
  async createCredit(
    creditData: Omit<CraveCredit, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      const credit = {
        ...creditData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      const docRef = await addDoc(collection(db, 'credits'), credit)
      return docRef.id
    } catch (error) {
      console.error('Error creating credit:', error)
      throw error
    }
  }

  // Get user's credits
  async getUserCredits(userId: string): Promise<CraveCredit[]> {
    try {
      const q = query(
        collection(db, 'credits'),
        where('uid', '==', userId),
        orderBy('createdAt', 'desc')
      )

      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as CraveCredit[]
    } catch (error) {
      console.error('Error getting user credits:', error)
      throw error
    }
  }

  // Get available credit balance
  async getAvailableCreditBalance(userId: string): Promise<number> {
    try {
      const q = query(
        collection(db, 'credits'),
        where('uid', '==', userId),
        where('state', '==', 'available')
      )

      const querySnapshot = await getDocs(q)
      let total = 0

      querySnapshot.docs.forEach(doc => {
        const credit = doc.data() as CraveCredit
        // Check if credit hasn't expired
        if (!credit.expiresAt || credit.expiresAt.toMillis() > Date.now()) {
          total += credit.amount
        }
      })

      return total
    } catch (error) {
      console.error('Error getting available credit balance:', error)
      throw error
    }
  }

  // Use credits for payment
  async useCredits(
    userId: string,
    amount: number,
    orderId: string
  ): Promise<void> {
    try {
      const q = query(
        collection(db, 'credits'),
        where('uid', '==', userId),
        where('state', '==', 'available'),
        orderBy('createdAt', 'asc') // Use oldest credits first
      )

      const querySnapshot = await getDocs(q)
      let remainingAmount = amount

      for (const docSnap of querySnapshot.docs) {
        if (remainingAmount <= 0) break

        const credit = docSnap.data() as CraveCredit

        // Check if credit hasn't expired
        if (credit.expiresAt && credit.expiresAt.toMillis() <= Date.now()) {
          continue
        }

        const useAmount = Math.min(remainingAmount, credit.amount)

        if (useAmount === credit.amount) {
          // Use entire credit
          await updateDoc(doc(db, 'credits', docSnap.id), {
            state: 'spent',
            relatedId: orderId,
            updatedAt: serverTimestamp(),
          })
        } else {
          // Partial use - create new spent credit and update remaining
          await this.createCredit({
            uid: userId,
            type: credit.type,
            amount: useAmount,
            state: 'spent',
            description: `Used for order ${orderId}`,
            relatedId: orderId,
            expiresAt: credit.expiresAt,
          })

          await updateDoc(doc(db, 'credits', docSnap.id), {
            amount: credit.amount - useAmount,
            updatedAt: serverTimestamp(),
          })
        }

        remainingAmount -= useAmount
      }

      if (remainingAmount > 0) {
        throw new Error('Insufficient credit balance')
      }
    } catch (error) {
      console.error('Error using credits:', error)
      throw error
    }
  }

  // Award referral credits (called when user gets 5 qualified referrals)
  async awardReferralCredits(
    userId: string,
    amount: number = 200
  ): Promise<string> {
    try {
      const expiresAt = new Date()
      expiresAt.setFullYear(expiresAt.getFullYear() + 1) // 1 year expiry

      return await this.createCredit({
        uid: userId,
        type: 'referral',
        amount,
        state: 'available',
        description: `Referral bonus for 5 qualified referrals`,
        expiresAt: Timestamp.fromDate(expiresAt),
      })
    } catch (error) {
      console.error('Error awarding referral credits:', error)
      throw error
    }
  }
}

export const orderService = new OrderService()
