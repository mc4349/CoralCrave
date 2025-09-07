import '@testing-library/jest-dom'

// Mock Firebase
import { vi, afterEach } from 'vitest'
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Mock Firebase configuration
const firebaseConfig = {
  apiKey: 'test-api-key',
  authDomain: 'test.firebaseapp.com',
  projectId: 'test-project',
  storageBucket: 'test.appspot.com',
  messagingSenderId: '123456789',
  appId: 'test-app-id',
}

// Initialize Firebase with test config
const app = initializeApp(firebaseConfig)
getAuth(app)
getFirestore(app)

// Mock Agora SDK
vi.mock('agora-rtc-sdk-ng', () => ({
  createClient: vi.fn(() => ({
    join: vi.fn(),
    leave: vi.fn(),
    publish: vi.fn(),
    subscribe: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  })),
  createMicrophoneAndCameraTracks: vi.fn(),
}))

// Mock Socket.IO
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  })),
}))

// Global test utilities
global.fetch = vi.fn()

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks()
})
