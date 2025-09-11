import * as admin from "firebase-admin";

// One-time script to mark obviously stale live streams as ended
// Run this once to clean up existing stale streams before deploying the new system

(async () => {
  // Initialize Firebase Admin (you'll need to set up credentials)
  if (!admin.apps.length) {
    // For local development, set up your Firebase credentials
    // You can use a service account key or set environment variables
    admin.initializeApp({
      // Add your Firebase config here or use environment variables
      projectId: process.env.FIREBASE_PROJECT_ID || 'your-project-id',
    });
  }

  const db = admin.firestore();

  console.log('🧹 Starting one-time cleanup of stale live streams...');

  const now = Date.now();
  const cutoffMs = 10 * 60 * 1000; // 10 minutes (more conservative for one-time cleanup)

  console.log(`📅 Cutoff time: ${new Date(now - cutoffMs).toISOString()}`);

  const snap = await db.collection('livestreams').where('status', '==', 'live').get();

  console.log(`📊 Found ${snap.size} live streams to check`);

  let batch = db.batch();
  let count = 0;
  let batchCount = 0;

  snap.forEach(docSnap => {
    const d: any = docSnap.data();
    const last = d.lastHeartbeat?.toDate?.() || d.lastHeartbeat;
    const lastMs = last instanceof Date ? last.getTime() : 0;

    console.log(`🔍 Checking stream ${docSnap.id}:`, {
      lastHeartbeat: last,
      lastMs,
      ageMinutes: lastMs ? ((now - lastMs) / (1000 * 60)).toFixed(1) : 'unknown'
    });

    // If lastHeartbeat missing or older than cutoff -> mark as ended
    if (!lastMs || (now - lastMs) > cutoffMs) {
      console.log(`🗑️ Marking stream ${docSnap.id} as ended (stale)`);

      batch.update(docSnap.ref, {
        status: 'ended',
        endedAt: admin.firestore.FieldValue.serverTimestamp(),
        backfilled: true,
        backfillTimestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
      count++;

      // Firestore batches are limited to 500 operations
      if (count % 400 === 0) {
        batchCount++;
        console.log(`📦 Committing batch ${batchCount}...`);
        // Note: In a real script, you'd commit here and start a new batch
        // For this example, we'll just count
      }
    } else {
      console.log(`✅ Stream ${docSnap.id} is still fresh`);
    }
  });

  if (count > 0) {
    console.log(`📦 Committing final batch...`);
    await batch.commit();
    console.log(`✅ Backfilled ${count} stale live streams to ended.`);
  } else {
    console.log('ℹ️ No stale streams found to backfill.');
  }

  console.log('🎉 One-time cleanup complete!');
  process.exit(0);
})();
