import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, Firestore, FieldValue } from 'firebase-admin/firestore'
import { Bid, AuctionItem } from '../types/auction'
import { logger } from '../utils/logger'

export class FirebaseService {
  private db: Firestore

  constructor() {
    // Initialize Firebase Admin if not already initialized
    if (getApps().length === 0) {
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
      
      if (serviceAccount) {
        initializeApp({
          credential: cert(JSON.parse(serviceAccount)),
          projectId: process.env.FIREBASE_PROJECT_ID
        })
      } else {
        // Use default credentials in production (Cloud Run)
        initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID
        })
      }
    }

    this.db = getFirestore()
  }

  // Update item status in livestream
  async updateItemStatus(
    liveId: string,
    itemId: string,
    status: 'queued' | 'running' | 'sold' | 'unsold',
    endAt?: number,
    winnerId?: string,
    finalPrice?: number
  ): Promise<void> {
    try {
      const itemRef = this.db
        .collection('livestreams')
        .doc(liveId)
        .collection('items')
        .doc(itemId)

      const updateData: any = {
        status,
        updatedAt: FieldValue.serverTimestamp()
      }

      if (endAt !== undefined) {
        updateData.endAt = new Date(endAt)
      }

      if (winnerId) {
        updateData.winnerId = winnerId
      }

      if (finalPrice !== undefined) {
        updateData.currentPrice = finalPrice
      }

      await itemRef.update(updateData)
      logger.debug(`Updated item ${itemId} status to ${status}`)
    } catch (error) {
      logger.error(`Failed to update item ${itemId} status:`, error)
      throw error
    }
  }

  // Save bid to Firestore
  async saveBid(bid: Bid): Promise<void> {
    try {
      const bidRef = this.db
        .collection('livestreams')
        .doc(bid.liveId)
        .collection('items')
        .doc(bid.itemId)
        .collection('bids')
        .doc(bid.id)

      await bidRef.set({
        userId: bid.userId,
        username: bid.username,
        amount: bid.amount,
        timestamp: new Date(bid.timestamp),
        source: bid.source,
        isValid: bid.isValid
      })

      logger.debug(`Saved bid ${bid.id} for item ${bid.itemId}`)
    } catch (error) {
      logger.error(`Failed to save bid ${bid.id}:`, error)
      throw error
    }
  }

  // Get item details
  async getItem(liveId: string, itemId: string): Promise<AuctionItem | null> {
    try {
      const itemRef = this.db
        .collection('livestreams')
        .doc(liveId)
        .collection('items')
        .doc(itemId)

      const doc = await itemRef.get()
      
      if (!doc.exists) {
        return null
      }

      const data = doc.data()!
      return {
        id: doc.id,
        liveId,
        title: data.title,
        description: data.description,
        images: data.images || [],
        startingPrice: data.startingPrice,
        currentPrice: data.currentPrice || data.startingPrice,
        shipping: data.shipping || 0,
        category: data.category,
        status: data.status,
        mode: data.mode,
        incrementSchemeId: data.incrementSchemeId || 'default',
        endAt: data.endAt?.toMillis() || 0,
        leadingBidderId: data.leadingBidderId,
        winnerId: data.winnerId,
        orderId: data.orderId,
        createdAt: data.createdAt?.toMillis() || Date.now(),
        updatedAt: data.updatedAt?.toMillis() || Date.now()
      }
    } catch (error) {
      logger.error(`Failed to get item ${itemId}:`, error)
      return null
    }
  }

  // Get livestream details
  async getLivestream(liveId: string): Promise<any | null> {
    try {
      const liveRef = this.db.collection('livestreams').doc(liveId)
      const doc = await liveRef.get()
      
      if (!doc.exists) {
        return null
      }

      return {
        id: doc.id,
        ...doc.data()
      }
    } catch (error) {
      logger.error(`Failed to get livestream ${liveId}:`, error)
      return null
    }
  }

  // Create order after auction completion
  async createOrder(
    itemId: string,
    liveId: string,
    buyerId: string,
    amount: number
  ): Promise<string> {
    try {
      // Get item and livestream details
      const [item, livestream] = await Promise.all([
        this.getItem(liveId, itemId),
        this.getLivestream(liveId)
      ])

      if (!item || !livestream) {
        throw new Error('Item or livestream not found')
      }

      // Get buyer details
      const buyerRef = this.db.collection('users').doc(buyerId)
      const buyerDoc = await buyerRef.get()
      
      if (!buyerDoc.exists) {
        throw new Error('Buyer not found')
      }

      const buyerData = buyerDoc.data()!

      // Create order
      const orderRef = this.db.collection('orders').doc()
      const orderId = orderRef.id

      const orderData = {
        itemId,
        liveId,
        buyerId,
        buyerUsername: buyerData.username,
        sellerId: livestream.hostId,
        sellerUsername: livestream.hostUsername,
        itemTitle: item.title,
        itemDescription: item.description,
        itemImages: item.images,
        amount,
        fees: Math.round(amount * 0.05 * 100) / 100, // 5% platform fee
        tax: 0, // Tax calculation would be more complex
        shippingCost: item.shipping,
        totalAmount: amount + Math.round(amount * 0.05 * 100) / 100 + item.shipping,
        status: 'pending',
        shippingAddress: buyerData.shippingAddress || {},
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      }

      await orderRef.set(orderData)

      // Update item with order ID
      await this.updateItemStatus(liveId, itemId, 'sold', undefined, buyerId, amount)
      await this.db
        .collection('livestreams')
        .doc(liveId)
        .collection('items')
        .doc(itemId)
        .update({ orderId })

      logger.info(`Created order ${orderId} for item ${itemId}`)
      return orderId
    } catch (error) {
      logger.error(`Failed to create order for item ${itemId}:`, error)
      throw error
    }
  }

  // Update viewer count
  async updateViewerCount(liveId: string, count: number): Promise<void> {
    try {
      const liveRef = this.db.collection('livestreams').doc(liveId)
      await liveRef.update({
        viewerCount: count,
        updatedAt: FieldValue.serverTimestamp()
      })
    } catch (error) {
      logger.error(`Failed to update viewer count for ${liveId}:`, error)
    }
  }

  // Get user details
  async getUser(userId: string): Promise<any | null> {
    try {
      const userRef = this.db.collection('users').doc(userId)
      const doc = await userRef.get()
      
      if (!doc.exists) {
        return null
      }

      return {
        uid: doc.id,
        ...doc.data()
      }
    } catch (error) {
      logger.error(`Failed to get user ${userId}:`, error)
      return null
    }
  }

  // Update user stats after successful auction
  async updateUserStats(userId: string, saleAmount: number): Promise<void> {
    try {
      const userRef = this.db.collection('users').doc(userId)
      
      await userRef.update({
        'stats.totalSales': FieldValue.increment(1),
        'stats.totalRevenue': FieldValue.increment(saleAmount),
        lastActiveAt: FieldValue.serverTimestamp()
      })

      logger.debug(`Updated stats for user ${userId}`)
    } catch (error) {
      logger.error(`Failed to update user stats for ${userId}:`, error)
    }
  }

  // Get active livestreams
  async getActiveLivestreams(): Promise<any[]> {
    try {
      const snapshot = await this.db
        .collection('livestreams')
        .where('status', '==', 'live')
        .orderBy('startedAt', 'desc')
        .limit(50)
        .get()

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      logger.error('Failed to get active livestreams:', error)
      return []
    }
  }

  // Get items for a livestream
  async getLivestreamItems(liveId: string): Promise<AuctionItem[]> {
    try {
      const snapshot = await this.db
        .collection('livestreams')
        .doc(liveId)
        .collection('items')
        .orderBy('createdAt', 'asc')
        .get()

      return snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          liveId,
          title: data.title,
          description: data.description,
          images: data.images || [],
          startingPrice: data.startingPrice,
          currentPrice: data.currentPrice || data.startingPrice,
          shipping: data.shipping || 0,
          category: data.category,
          status: data.status,
          mode: data.mode,
          incrementSchemeId: data.incrementSchemeId || 'default',
          endAt: data.endAt?.toMillis() || 0,
          leadingBidderId: data.leadingBidderId,
          winnerId: data.winnerId,
          orderId: data.orderId,
          createdAt: data.createdAt?.toMillis() || Date.now(),
          updatedAt: data.updatedAt?.toMillis() || Date.now()
        }
      })
    } catch (error) {
      logger.error(`Failed to get items for livestream ${liveId}:`, error)
      return []
    }
  }

  // Save chat message
  async saveChatMessage(liveId: string, message: any): Promise<void> {
    try {
      const chatRef = this.db
        .collection('livestreams')
        .doc(liveId)
        .collection('chat')
        .doc()

      await chatRef.set({
        ...message,
        timestamp: FieldValue.serverTimestamp()
      })
    } catch (error) {
      logger.error(`Failed to save chat message for ${liveId}:`, error)
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      // Try to read from a test collection
      await this.db.collection('_health').limit(1).get()
      return true
    } catch (error) {
      logger.error('Firebase health check failed:', error)
      return false
    }
  }

  // Get Firestore instance for direct access
  getFirestore(): Firestore {
    return this.db
  }
}
