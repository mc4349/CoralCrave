import { FirebaseService } from '../services/FirebaseService'
import { logger } from '../utils/logger'

let firebaseService: FirebaseService

export async function initializeFirebase(): Promise<void> {
  try {
    firebaseService = new FirebaseService()
    
    // Test the connection
    const isHealthy = await firebaseService.healthCheck()
    if (!isHealthy) {
      throw new Error('Firebase health check failed')
    }
    
    logger.info('Firebase initialized successfully')
  } catch (error) {
    logger.error('Failed to initialize Firebase:', error)
    throw error
  }
}

export function getFirebaseService(): FirebaseService {
  if (!firebaseService) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.')
  }
  return firebaseService
}
