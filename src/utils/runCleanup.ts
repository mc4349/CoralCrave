import { cleanupOldLiveStreams } from './cleanupOldStreams'

/**
 * Script to run the immediate cleanup of old live streams
 * This will delete all existing "live" streams from the database
 */
async function runCleanup() {
  try {
    console.log('🚀 Starting immediate cleanup of old live streams...')

    const deletedCount = await cleanupOldLiveStreams()

    if (deletedCount > 0) {
      console.log(`✅ Cleanup completed! Deleted ${deletedCount} old live streams.`)
      console.log('🎉 Your Explore page should now show only active streams.')
    } else {
      console.log('ℹ️ No old live streams found to clean up.')
    }

    console.log('📋 Next steps:')
    console.log('1. Check your Explore page - it should now be clean')
    console.log('2. Create a new stream - it should appear immediately')
    console.log('3. The automatic cleanup will run every minute to prevent future issues')

  } catch (error) {
    console.error('❌ Cleanup failed:', error)
    process.exit(1)
  }
}

// Run the cleanup if this script is executed directly
if (require.main === module) {
  runCleanup()
}

export { runCleanup }
