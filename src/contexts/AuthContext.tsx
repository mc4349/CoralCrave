import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  signInWithPopup,
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { auth, db, googleProvider } from '../lib/firebase'

interface UserProfile {
  uid: string
  username: string
  email: string
  photoURL?: string
  bio?: string
  role: 'buyer' | 'seller' | 'both'
  emailVerified: boolean
  createdAt: Date
  lastActiveAt: Date
  referralCode: string
  referredBy?: string
  kyc: {
    stripeAccountId?: string
    status: 'unverified' | 'pending' | 'verified'
  }
  credit: {
    available: number
    pending: number
  }
}

interface AuthContextType {
  currentUser: User | null
  userProfile: UserProfile | null
  loading: boolean
  signup: (email: string, password: string, username: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<{ needsUsername: boolean }>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

function generateReferralCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function signup(email: string, password: string, username: string) {
    const { user } = await createUserWithEmailAndPassword(auth, email, password)
    
    // Update the user's display name
    await updateProfile(user, { displayName: username })
    
    // Send email verification
    await sendEmailVerification(user)
    
    // Create user profile in Firestore
    const userProfile: UserProfile = {
      uid: user.uid,
      username,
      email: user.email!,
      photoURL: user.photoURL || undefined,
      bio: '',
      role: 'buyer',
      emailVerified: user.emailVerified,
      createdAt: new Date(),
      lastActiveAt: new Date(),
      referralCode: generateReferralCode(),
      kyc: {
        status: 'unverified'
      },
      credit: {
        available: 0,
        pending: 0
      }
    }
    
    await setDoc(doc(db, 'users', user.uid), userProfile)
    setUserProfile(userProfile)
  }

  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password)
  }

  async function loginWithGoogle(): Promise<{ needsUsername: boolean }> {
    const result = await signInWithPopup(auth, googleProvider)
    const user = result.user
    
    // Check if user profile already exists
    const userDoc = await getDoc(doc(db, 'users', user.uid))
    
    if (userDoc.exists()) {
      // User already has a profile
      return { needsUsername: false }
    } else {
      // New user - needs to set username
      // Create a temporary profile that will be completed later
      const tempProfile: UserProfile = {
        uid: user.uid,
        username: '', // Will be set later
        email: user.email!,
        photoURL: user.photoURL || undefined,
        bio: '',
        role: 'buyer',
        emailVerified: user.emailVerified,
        createdAt: new Date(),
        lastActiveAt: new Date(),
        referralCode: generateReferralCode(),
        kyc: {
          status: 'unverified'
        },
        credit: {
          available: 0,
          pending: 0
        }
      }
      
      await setDoc(doc(db, 'users', user.uid), tempProfile)
      return { needsUsername: true }
    }
  }

  async function logout() {
    await signOut(auth)
    setUserProfile(null)
  }

  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email)
  }

  async function updateUserProfile(updates: Partial<UserProfile>) {
    if (!currentUser || !userProfile) return
    
    const updatedProfile = { ...userProfile, ...updates, lastActiveAt: new Date() }
    await setDoc(doc(db, 'users', currentUser.uid), updatedProfile, { merge: true })
    setUserProfile(updatedProfile)
  }

  async function loadUserProfile(user: User) {
    const userDoc = await getDoc(doc(db, 'users', user.uid))
    if (userDoc.exists()) {
      const data = userDoc.data() as UserProfile
      // Convert Firestore timestamps to Date objects
      const profile = {
        ...data,
        createdAt: data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt),
        lastActiveAt: data.lastActiveAt instanceof Date ? data.lastActiveAt : new Date(data.lastActiveAt),
      }
      setUserProfile(profile)
      
      // Update last active time
      await setDoc(doc(db, 'users', user.uid), { lastActiveAt: new Date() }, { merge: true })
    }
  }

  useEffect(() => {
    let unsubscribe: (() => void) | undefined

    try {
      unsubscribe = onAuthStateChanged(auth, async (user) => {
        try {
          setCurrentUser(user)
          if (user) {
            await loadUserProfile(user)
          } else {
            setUserProfile(null)
          }
          setError(null)
        } catch (err) {
          console.error('Error loading user profile:', err)
          setError('Failed to load user profile')
        } finally {
          setLoading(false)
        }
      })
    } catch (err) {
      console.error('Error initializing auth:', err)
      setError('Failed to initialize authentication')
      setLoading(false)
    }

    // Fallback timeout to ensure loading doesn't hang forever
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Auth loading timeout - forcing render')
        setLoading(false)
      }
    }, 3000) // 3 second timeout

    return () => {
      if (unsubscribe) unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const value: AuthContextType = {
    currentUser,
    userProfile,
    loading,
    signup,
    login,
    loginWithGoogle,
    logout,
    resetPassword,
    updateUserProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
            <p className="text-slate-300">Loading CoralCrave...</p>
            {error && (
              <p className="text-red-400 text-sm mt-2">
                {error} - App will continue loading...
              </p>
            )}
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  )
}
