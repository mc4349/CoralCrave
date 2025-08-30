import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp,
  increment,
  Timestamp
} from 'firebase/firestore'
import { db } from '../lib/firebase'

export interface LivestreamData {
  id?: string
  hostId: string
  hostUsername: string
  title: string
  description?: string
  status: 'offline' | 'live' | 'ended'
  categories: string[]
  viewerCount: number
  startedAt?: Timestamp
  endedAt?: Timestamp
  agora: {
    channel: string
    broadcasterUid?: number | string
    token?: string
  }
  thumbnailUrl?: string
  totalRevenue?: number
  itemsSold?: number
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface LivestreamItem {
  id?: string
  liveId: string
  title: string
  description: string
  images: string[]
  startingPrice: number
  currentPrice: number
  status: 'queued' | 'running' | 'sold' | 'unsold'
  mode: 'classic' | 'speed'
  category: string
  leadingBidderId?: string
  leadingBidderUsername?: string
  winnerId?: string
  winnerUsername?: string
  orderId?: string
  endAt?: Timestamp
  incrementSchemeId: string
  bidCount: number
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface ChatMessage {
  id?: string
  liveId: string
  userId: string
  username: string
  text: string
  timestamp: Timestamp
  isHost?: boolean
  isModerator?: boolean
}

class LivestreamService {
  // Create a new livestream - MUST save to Firestore for everyone to see
  async createLivestream(data: Omit<LivestreamData, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    console.log('🚀 Creating livestream - MUST save to Firestore for visibility...')
    
    const livestreamData = {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
    
    try {
      // Try with a reasonable timeout (5 seconds)
      const firestoreTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Firestore timeout - database may be down')), 5000)
      })
      
      const firestoreOperation = addDoc(collection(db, 'livestreams'), livestreamData)
      const docRef = await Promise.race([firestoreOperation, firestoreTimeout]) as any
      
      console.log('✅ SUCCESS: Livestream saved to Firestore - everyone can see it:', docRef.id)
      return docRef.id
      
    } catch (error: any) {
      console.error('❌ CRITICAL ERROR: Failed to save livestream to Firestore!')
      console.error('❌ This means viewers CANNOT see your stream!')
      console.error('❌ Error details:', error)
      
      // Don't create offline streams - fail fast so user knows there's a problem
      throw new Error(`Cannot start stream: Database is unavailable. ${error.message}`)
    }
  }

  // Update livestream - Firestore only
  async updateLivestream(liveId: string, updates: Partial<LivestreamData>): Promise<void> {
    try {
      const livestreamRef = doc(db, 'livestreams', liveId)
      await updateDoc(livestreamRef, {
        ...updates,
        updatedAt: serverTimestamp()
      })
    } catch (error: any) {
      console.error('Error updating livestream:', error)
      throw error
    }
  }

  // Get livestream by ID - Firestore only
  async getLivestream(liveId: string): Promise<LivestreamData | null> {
    try {
      const livestreamRef = doc(db, 'livestreams', liveId)
      const livestreamSnap = await getDoc(livestreamRef)
      
      if (livestreamSnap.exists()) {
        return { id: livestreamSnap.id, ...livestreamSnap.data() } as LivestreamData
      }
      return null
    } catch (error: any) {
      console.error('Error getting livestream:', error)
      throw error
    }
  }

  // Get live streams - Firestore only
  async getLiveStreams(limitCount: number = 20): Promise<LivestreamData[]> {
    try {
      const q = query(
        collection(db, 'livestreams'),
        where('status', '==', 'live'),
        orderBy('startedAt', 'desc'),
        limit(limitCount)
      )
      
      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LivestreamData[]
    } catch (error: any) {
      console.error('Error getting live streams:', error)
      throw error
    }
  }

  // Get streams by category - Firestore only
  async getStreamsByCategory(category: string, limitCount: number = 20): Promise<LivestreamData[]> {
    try {
      const q = query(
        collection(db, 'livestreams'),
        where('categories', 'array-contains', category),
        where('status', '==', 'live'),
        orderBy('viewerCount', 'desc'),
        limit(limitCount)
      )
      
      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LivestreamData[]
    } catch (error: any) {
      console.error('Error getting streams by category:', error)
      throw error
    }
  }

  // Subscribe to livestream updates - Firestore only
  subscribeLivestream(liveId: string, callback: (livestream: LivestreamData | null) => void): () => void {
    try {
      const livestreamRef = doc(db, 'livestreams', liveId)
      
      return onSnapshot(livestreamRef, (doc) => {
        if (doc.exists()) {
          callback({ id: doc.id, ...doc.data() } as LivestreamData)
        } else {
          callback(null)
        }
      }, (error) => {
        console.error('Livestream subscription error:', error)
        throw error
      })
    } catch (error: any) {
      console.error('Error subscribing to livestream:', error)
      throw error
    }
  }

  // Update viewer count - Firestore only
  async updateViewerCount(liveId: string, incrementValue: number): Promise<void> {
    try {
      const livestreamRef = doc(db, 'livestreams', liveId)
      await updateDoc(livestreamRef, {
        viewerCount: incrementValue > 0 ? increment(incrementValue) : increment(-Math.abs(incrementValue))
      })
    } catch (error: any) {
      console.error('Error updating viewer count:', error)
      throw error
    }
  }

  // Add item to livestream - Firestore only
  async addItem(liveId: string, itemData: Omit<LivestreamItem, 'id' | 'liveId' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const item = {
        ...itemData,
        liveId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
      
      const docRef = await addDoc(collection(db, 'livestreams', liveId, 'items'), item)
      return docRef.id
    } catch (error: any) {
      console.error('Error adding item:', error)
      throw error
    }
  }

  // Update item - Firestore only
  async updateItem(liveId: string, itemId: string, updates: Partial<LivestreamItem>): Promise<void> {
    try {
      const itemRef = doc(db, 'livestreams', liveId, 'items', itemId)
      await updateDoc(itemRef, {
        ...updates,
        updatedAt: serverTimestamp()
      })
    } catch (error: any) {
      console.error('Error updating item:', error)
      throw error
    }
  }

  // Get items for livestream - Firestore only
  async getItems(liveId: string): Promise<LivestreamItem[]> {
    try {
      const q = query(
        collection(db, 'livestreams', liveId, 'items'),
        orderBy('createdAt', 'asc')
      )
      
      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LivestreamItem[]
    } catch (error: any) {
      console.error('Error getting items:', error)
      throw error
    }
  }

  // Subscribe to items - Firestore only
  subscribeItems(liveId: string, callback: (items: LivestreamItem[]) => void): () => void {
    try {
      const q = query(
        collection(db, 'livestreams', liveId, 'items'),
        orderBy('createdAt', 'asc')
      )
      
      return onSnapshot(q, (querySnapshot) => {
        const items = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as LivestreamItem[]
        callback(items)
      }, (error) => {
        console.error('Items subscription error:', error)
        throw error
      })
    } catch (error: any) {
      console.error('Error subscribing to items:', error)
      throw error
    }
  }

  // Send chat message - Firestore only
  async sendChatMessage(liveId: string, message: Omit<ChatMessage, 'id' | 'liveId' | 'timestamp'>): Promise<string> {
    try {
      const messageData = {
        ...message,
        liveId,
        timestamp: serverTimestamp()
      }
      
      const docRef = await addDoc(collection(db, 'livestreams', liveId, 'messages'), messageData)
      return docRef.id
    } catch (error: any) {
      console.error('Error sending chat message:', error)
      throw error
    }
  }

  // Subscribe to chat messages - Firestore only
  subscribeChatMessages(liveId: string, callback: (messages: ChatMessage[]) => void, limitCount: number = 50): () => void {
    try {
      const q = query(
        collection(db, 'livestreams', liveId, 'messages'),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      )
      
      return onSnapshot(q, (querySnapshot) => {
        const messages = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ChatMessage[]
        callback(messages.reverse()) // Reverse to show oldest first
      }, (error) => {
        console.error('Chat subscription error:', error)
        throw error
      })
    } catch (error: any) {
      console.error('Error subscribing to chat messages:', error)
      throw error
    }
  }

  // Delete livestream (host only) - Firestore only
  async deleteLivestream(liveId: string): Promise<void> {
    try {
      const livestreamRef = doc(db, 'livestreams', liveId)
      await deleteDoc(livestreamRef)
    } catch (error: any) {
      console.error('Error deleting livestream:', error)
      throw error
    }
  }

  // Get user's livestreams - Firestore only
  async getUserLivestreams(userId: string, limitCount: number = 20): Promise<LivestreamData[]> {
    try {
      const q = query(
        collection(db, 'livestreams'),
        where('hostId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      )
      
      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LivestreamData[]
    } catch (error: any) {
      console.error('Error getting user livestreams:', error)
      throw error
    }
  }

  // Start auction for item - Firestore only
  async startItemAuction(liveId: string, itemId: string, durationMs: number): Promise<void> {
    try {
      const endAt = new Date(Date.now() + durationMs)
      await this.updateItem(liveId, itemId, {
        status: 'running',
        endAt: Timestamp.fromDate(endAt)
      })
    } catch (error: any) {
      console.error('Error starting item auction:', error)
      throw error
    }
  }

  // End auction for item - Firestore only
  async endItemAuction(liveId: string, itemId: string, winnerId?: string, winnerUsername?: string): Promise<void> {
    try {
      const updates: Partial<LivestreamItem> = {
        status: winnerId ? 'sold' : 'unsold',
        winnerId,
        winnerUsername
      }
      
      await this.updateItem(liveId, itemId, updates)
    } catch (error: any) {
      console.error('Error ending item auction:', error)
      throw error
    }
  }
}

export const livestreamService = new LivestreamService()
