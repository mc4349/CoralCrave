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
  // Create a new livestream
  async createLivestream(data: Omit<LivestreamData, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const livestreamData = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
      
      const docRef = await addDoc(collection(db, 'livestreams'), livestreamData)
      return docRef.id
    } catch (error) {
      console.error('Error creating livestream:', error)
      throw error
    }
  }

  // Update livestream
  async updateLivestream(liveId: string, updates: Partial<LivestreamData>): Promise<void> {
    try {
      const livestreamRef = doc(db, 'livestreams', liveId)
      await updateDoc(livestreamRef, {
        ...updates,
        updatedAt: serverTimestamp()
      })
    } catch (error) {
      console.error('Error updating livestream:', error)
      throw error
    }
  }

  // Get livestream by ID
  async getLivestream(liveId: string): Promise<LivestreamData | null> {
    try {
      const livestreamRef = doc(db, 'livestreams', liveId)
      const livestreamSnap = await getDoc(livestreamRef)
      
      if (livestreamSnap.exists()) {
        return { id: livestreamSnap.id, ...livestreamSnap.data() } as LivestreamData
      }
      return null
    } catch (error) {
      console.error('Error getting livestream:', error)
      throw error
    }
  }

  // Get live streams
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
    } catch (error) {
      console.error('Error getting live streams:', error)
      throw error
    }
  }

  // Get streams by category
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
    } catch (error) {
      console.error('Error getting streams by category:', error)
      throw error
    }
  }

  // Subscribe to livestream updates
  subscribeLivestream(liveId: string, callback: (livestream: LivestreamData | null) => void): () => void {
    const livestreamRef = doc(db, 'livestreams', liveId)
    
    return onSnapshot(livestreamRef, (doc) => {
      if (doc.exists()) {
        callback({ id: doc.id, ...doc.data() } as LivestreamData)
      } else {
        callback(null)
      }
    })
  }

  // Update viewer count
  async updateViewerCount(liveId: string, incrementValue: number): Promise<void> {
    try {
      const livestreamRef = doc(db, 'livestreams', liveId)
      await updateDoc(livestreamRef, {
        viewerCount: incrementValue > 0 ? increment(incrementValue) : increment(-Math.abs(incrementValue))
      })
    } catch (error) {
      console.error('Error updating viewer count:', error)
      throw error
    }
  }

  // Add item to livestream
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
    } catch (error) {
      console.error('Error adding item:', error)
      throw error
    }
  }

  // Update item
  async updateItem(liveId: string, itemId: string, updates: Partial<LivestreamItem>): Promise<void> {
    try {
      const itemRef = doc(db, 'livestreams', liveId, 'items', itemId)
      await updateDoc(itemRef, {
        ...updates,
        updatedAt: serverTimestamp()
      })
    } catch (error) {
      console.error('Error updating item:', error)
      throw error
    }
  }

  // Get items for livestream
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
    } catch (error) {
      console.error('Error getting items:', error)
      throw error
    }
  }

  // Subscribe to items
  subscribeItems(liveId: string, callback: (items: LivestreamItem[]) => void): () => void {
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
    })
  }

  // Send chat message
  async sendChatMessage(liveId: string, message: Omit<ChatMessage, 'id' | 'liveId' | 'timestamp'>): Promise<string> {
    try {
      const messageData = {
        ...message,
        liveId,
        timestamp: serverTimestamp()
      }
      
      const docRef = await addDoc(collection(db, 'livestreams', liveId, 'messages'), messageData)
      return docRef.id
    } catch (error) {
      console.error('Error sending chat message:', error)
      throw error
    }
  }

  // Subscribe to chat messages
  subscribeChatMessages(liveId: string, callback: (messages: ChatMessage[]) => void, limitCount: number = 50): () => void {
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
    })
  }

  // Delete livestream (host only)
  async deleteLivestream(liveId: string): Promise<void> {
    try {
      const livestreamRef = doc(db, 'livestreams', liveId)
      await deleteDoc(livestreamRef)
    } catch (error) {
      console.error('Error deleting livestream:', error)
      throw error
    }
  }

  // Get user's livestreams
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
    } catch (error) {
      console.error('Error getting user livestreams:', error)
      throw error
    }
  }

  // Start auction for item
  async startItemAuction(liveId: string, itemId: string, durationMs: number): Promise<void> {
    try {
      const endAt = new Date(Date.now() + durationMs)
      await this.updateItem(liveId, itemId, {
        status: 'running',
        endAt: Timestamp.fromDate(endAt)
      })
    } catch (error) {
      console.error('Error starting item auction:', error)
      throw error
    }
  }

  // End auction for item
  async endItemAuction(liveId: string, itemId: string, winnerId?: string, winnerUsername?: string): Promise<void> {
    try {
      const updates: Partial<LivestreamItem> = {
        status: winnerId ? 'sold' : 'unsold',
        winnerId,
        winnerUsername
      }
      
      // Remove endAt by setting it to undefined
      await this.updateItem(liveId, itemId, updates)
    } catch (error) {
      console.error('Error ending item auction:', error)
      throw error
    }
  }
}

export const livestreamService = new LivestreamService()
