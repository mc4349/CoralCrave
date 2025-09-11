import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore'

import { db } from '../lib/firebase'

export interface Livestream {
  id: string
  title: string
  description?: string
  hostId: string
  hostUsername: string
  channelName: string
  status: 'live' | 'offline' | 'ended'
  categories?: string[]
  startedAt: Timestamp
  endedAt?: Timestamp
  viewerCount: number
  previewUrl?: string
  createdAt: Timestamp
  updatedAt: Timestamp
  lastHeartbeat?: Timestamp
}

export interface CreateLivestreamData {
  title: string
  description?: string
  hostId: string
  hostUsername: string
  channelName: string
  categories?: string[]
  previewUrl?: string
}

export class LivestreamService {
  private static instance: LivestreamService
  private cleanupInterval: NodeJS.Timeout | null = null

  static getInstance(): LivestreamService {
    if (!LivestreamService.instance) {
      LivestreamService.instance = new LivestreamService()
    }
    return LivestreamService.instance
  }

  constructor() {
    // Start automatic cleanup routine when service is created
    this.startCleanupRoutine()
  }

  // Create a new livestream document when going live
  async createLivestream(data: CreateLivestreamData): Promise<string> {
    try {
      const livestreamRef = doc(collection(db, 'livestreams'))
      const livestreamId = livestreamRef.id

      const livestreamData: Omit<Livestream, 'id'> = {
        title: data.title,
        description: data.description || '',
        hostId: data.hostId,
        hostUsername: data.hostUsername,
        channelName: data.channelName,
        status: 'live',
        categories: data.categories || [],
        startedAt: serverTimestamp() as Timestamp,
        viewerCount: 0,
        previewUrl: data.previewUrl,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
      }

      await setDoc(livestreamRef, livestreamData)

      console.log('✅ LivestreamService: Created livestream document', {
        id: livestreamId,
        channelName: data.channelName,
        title: data.title,
      })

      return livestreamId
    } catch (error) {
      console.error('❌ LivestreamService: Failed to create livestream:', error)
      throw error
    }
  }

  // Update livestream status
  async updateLivestreamStatus(
    livestreamId: string,
    status: 'live' | 'offline' | 'ended'
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        updatedAt: serverTimestamp(),
      }

      if (status === 'ended' || status === 'offline') {
        updateData.endedAt = serverTimestamp()
      }

      await updateDoc(doc(db, 'livestreams', livestreamId), updateData)

      console.log('✅ LivestreamService: Updated livestream status', {
        id: livestreamId,
        status,
      })
    } catch (error) {
      console.error('❌ LivestreamService: Failed to update livestream status:', error)
      throw error
    }
  }

  // Update viewer count
  async updateViewerCount(livestreamId: string, count: number): Promise<void> {
    try {
      await updateDoc(doc(db, 'livestreams', livestreamId), {
        viewerCount: count,
        updatedAt: serverTimestamp(),
      })
    } catch (error) {
      console.error('❌ LivestreamService: Failed to update viewer count:', error)
    }
  }

  // Get livestream by ID
  async getLivestream(livestreamId: string): Promise<Livestream | null> {
    try {
      const docSnap = await getDoc(doc(db, 'livestreams', livestreamId))

      if (!docSnap.exists()) {
        return null
      }

      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as Livestream
    } catch (error) {
      console.error('❌ LivestreamService: Failed to get livestream:', error)
      return null
    }
  }

  // Get livestream by channel name
  async getLivestreamByChannel(channelName: string): Promise<Livestream | null> {
    try {
      const q = query(
        collection(db, 'livestreams'),
        where('channelName', '==', channelName),
        orderBy('startedAt', 'desc'),
        limit(1)
      )

      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        return null
      }

      const doc = querySnapshot.docs[0]
      return {
        id: doc.id,
        ...doc.data(),
      } as Livestream
    } catch (error) {
      console.error('❌ LivestreamService: Failed to get livestream by channel:', error)
      return null
    }
  }

  // Get all active livestreams (for Explore page)
  async getActiveLivestreams(): Promise<Livestream[]> {
    try {
      const q = query(
        collection(db, 'livestreams'),
        where('status', '==', 'live'),
        orderBy('startedAt', 'desc'),
        limit(50)
      )

      const querySnapshot = await getDocs(q)
      const livestreams: Livestream[] = []

      querySnapshot.forEach((doc) => {
        livestreams.push({
          id: doc.id,
          ...doc.data(),
        } as Livestream)
      })

      console.log('✅ LivestreamService: Found active livestreams', {
        count: livestreams.length,
        streams: livestreams.map(s => ({ id: s.id, title: s.title, channelName: s.channelName })),
      })

      return livestreams
    } catch (error) {
      console.error('❌ LivestreamService: Failed to get active livestreams:', error)
      return []
    }
  }

  // Search livestreams (both live and past)
  async searchLivestreams(searchQuery: string): Promise<Livestream[]> {
    try {
      // Get all livestreams and filter client-side since Firestore doesn't support text search well
      const q = query(
        collection(db, 'livestreams'),
        orderBy('startedAt', 'desc'),
        limit(100)
      )

      const querySnapshot = await getDocs(q)
      const allStreams: Livestream[] = []

      querySnapshot.forEach((doc) => {
        allStreams.push({
          id: doc.id,
          ...doc.data(),
        } as Livestream)
      })

      // Filter by search query
      const searchTerm = searchQuery.toLowerCase()
      const filteredStreams = allStreams.filter(stream =>
        stream.title?.toLowerCase().includes(searchTerm) ||
        stream.hostUsername?.toLowerCase().includes(searchTerm) ||
        stream.description?.toLowerCase().includes(searchTerm) ||
        stream.categories?.some(cat => cat.toLowerCase().includes(searchTerm))
      )

      // Return live streams first, then others
      return filteredStreams.sort((a, b) => {
        if (a.status === 'live' && b.status !== 'live') return -1
        if (a.status !== 'live' && b.status === 'live') return 1
        return b.startedAt.toMillis() - a.startedAt.toMillis()
      })
    } catch (error) {
      console.error('❌ LivestreamService: Failed to search livestreams:', error)
      return []
    }
  }

  // Subscribe to active livestreams (real-time updates)
  subscribeToActiveLivestreams(
    callback: (livestreams: Livestream[]) => void
  ): () => void {
    const q = query(
      collection(db, 'livestreams'),
      where('status', '==', 'live'),
      orderBy('startedAt', 'desc'),
      limit(50)
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const livestreams: Livestream[] = []
        snapshot.forEach((doc) => {
          livestreams.push({
            id: doc.id,
            ...doc.data(),
          } as Livestream)
        })

        console.log('🔄 LivestreamService: Real-time update - active streams', {
          count: livestreams.length,
        })

        callback(livestreams)
      },
      (error) => {
        console.error('❌ LivestreamService: Real-time subscription error:', error)
      }
    )

    return unsubscribe
  }

  // Clean up old ended streams (optional maintenance)
  async cleanupOldStreams(daysOld: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)

      const q = query(
        collection(db, 'livestreams'),
        where('status', 'in', ['ended', 'offline']),
        where('endedAt', '<', Timestamp.fromDate(cutoffDate))
      )

      const querySnapshot = await getDocs(q)
      const deletePromises: Promise<void>[] = []

      querySnapshot.forEach((doc) => {
        deletePromises.push(deleteDoc(doc.ref))
      })

      await Promise.all(deletePromises)

      console.log('🧹 LivestreamService: Cleaned up old streams', {
        count: deletePromises.length,
        daysOld,
      })
    } catch (error) {
      console.error('❌ LivestreamService: Failed to cleanup old streams:', error)
    }
  }

  // Update livestream metadata
  async updateLivestream(
    livestreamId: string,
    updates: Partial<Pick<Livestream, 'title' | 'description' | 'categories'>>
  ): Promise<void> {
    try {
      await updateDoc(doc(db, 'livestreams', livestreamId), {
        ...updates,
        updatedAt: serverTimestamp(),
      })

      console.log('✅ LivestreamService: Updated livestream metadata', {
        id: livestreamId,
        updates,
      })
    } catch (error) {
      console.error('❌ LivestreamService: Failed to update livestream:', error)
      throw error
    }
  }

  // Delete a livestream document
  async deleteStream(livestreamId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'livestreams', livestreamId))

      console.log('✅ LivestreamService: Deleted livestream', {
        id: livestreamId,
      })
    } catch (error) {
      console.error('❌ LivestreamService: Failed to delete livestream:', error)
      throw error
    }
  }

  // Update heartbeat to keep stream alive
  async updateHeartbeat(livestreamId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'livestreams', livestreamId), {
        lastHeartbeat: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    } catch (error) {
      console.error('❌ LivestreamService: Failed to update heartbeat:', error)
    }
  }

  // One-time cleanup of all existing "live" streams
  async deleteAllOldLiveStreams(): Promise<number> {
    try {
      console.log('🧹 Starting cleanup of old live streams...')

      const q = query(
        collection(db, 'livestreams'),
        where('status', '==', 'live')
      )

      const querySnapshot = await getDocs(q)
      const deletePromises: Promise<void>[] = []

      console.log(`📊 Found ${querySnapshot.size} live streams to clean up`)

      querySnapshot.forEach((document) => {
        console.log(`🗑️ Deleting old live stream: ${document.id}`)
        deletePromises.push(deleteDoc(document.ref))
      })

      await Promise.all(deletePromises)

      console.log(`✅ Successfully deleted ${deletePromises.length} old live streams`)
      return deletePromises.length
    } catch (error) {
      console.error('❌ LivestreamService: Failed to cleanup old live streams:', error)
      throw error
    }
  }

  // Routine cleanup of orphaned streams (called every minute)
  async cleanupOrphanedStreams(maxAgeMinutes: number = 2): Promise<number> {
    try {
      const cutoffTime = new Date()
      cutoffTime.setMinutes(cutoffTime.getMinutes() - maxAgeMinutes)

      console.log(`🔍 Looking for orphaned streams older than ${maxAgeMinutes} minutes...`)

      const q = query(
        collection(db, 'livestreams'),
        where('status', '==', 'live')
      )

      const querySnapshot = await getDocs(q)
      const deletePromises: Promise<void>[] = []
      let orphanedCount = 0

      querySnapshot.forEach((document) => {
        const data = document.data()
        const updatedAt = data.updatedAt?.toDate?.() || new Date(data.updatedAt)
        const lastHeartbeat = data.lastHeartbeat?.toDate?.() || new Date(data.lastHeartbeat)

        // Check if stream has been updated recently
        const mostRecentUpdate = lastHeartbeat > updatedAt ? lastHeartbeat : updatedAt

        if (mostRecentUpdate < cutoffTime) {
          console.log(`🗑️ Deleting orphaned stream: ${document.id} (last updated: ${mostRecentUpdate})`)
          deletePromises.push(deleteDoc(document.ref))
          orphanedCount++
        }
      })

      await Promise.all(deletePromises)

      if (orphanedCount > 0) {
        console.log(`✅ Cleaned up ${orphanedCount} orphaned streams`)
      }

      return orphanedCount
    } catch (error) {
      console.error('❌ LivestreamService: Failed to cleanup orphaned streams:', error)
      return 0
    }
  }

  // Start automatic cleanup routine (runs every minute)
  private startCleanupRoutine(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    console.log('🔄 LivestreamService: Starting automatic cleanup routine (every 60 seconds)')

    // Run cleanup every 60 seconds
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanupOrphanedStreams(2)
      } catch (error) {
        console.error('❌ LivestreamService: Cleanup routine error:', error)
      }
    }, 60000) // 60 seconds
  }

  // Stop cleanup routine (for cleanup)
  stopCleanupRoutine(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
      console.log('🔄 LivestreamService: Stopped cleanup routine')
    }
  }
}

export const livestreamService = LivestreamService.getInstance()
