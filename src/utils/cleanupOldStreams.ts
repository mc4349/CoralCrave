import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../lib/firebase'

/**
 * One-time cleanup script to delete all existing "live" streams
 * This will clear out the 13 old streams that are cluttering the interface
 */
export async function cleanupOldLiveStreams(): Promise<number> {
  try {
    console.log('🧹 Starting cleanup of old live streams...')

    // Query all streams with status "live"
    const q = query(
      collection(db, 'livestreams'),
      where('status', '==', 'live')
    )

    const querySnapshot = await getDocs(q)
    const deletePromises: Promise<void>[] = []

    console.log(`📊 Found ${querySnapshot.size} live streams to clean up`)

    querySnapshot.forEach((document) => {
      console.log(`🗑️ Deleting old live stream: ${document.id}`)
      deletePromises.push(deleteDoc(doc(db, 'livestreams', document.id)))
    })

    // Delete all old streams
    await Promise.all(deletePromises)

    console.log(`✅ Successfully deleted ${deletePromises.length} old live streams`)
    return deletePromises.length
  } catch (error) {
    console.error('❌ Failed to cleanup old live streams:', error)
    throw error
  }
}

/**
 * Cleanup script for orphaned streams (streams that haven't been updated recently)
 * This is used by the automatic cleanup routine
 */
export async function cleanupOrphanedStreams(maxAgeMinutes: number = 2): Promise<number> {
  try {
    const cutoffTime = new Date()
    cutoffTime.setMinutes(cutoffTime.getMinutes() - maxAgeMinutes)

    console.log(`🔍 Looking for orphaned streams older than ${maxAgeMinutes} minutes...`)

    // Query all streams with status "live" that haven't been updated recently
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
        deletePromises.push(deleteDoc(doc(db, 'livestreams', document.id)))
        orphanedCount++
      }
    })

    // Delete orphaned streams
    await Promise.all(deletePromises)

    if (orphanedCount > 0) {
      console.log(`✅ Cleaned up ${orphanedCount} orphaned streams`)
    }

    return orphanedCount
  } catch (error) {
    console.error('❌ Failed to cleanup orphaned streams:', error)
    return 0
  }
}
