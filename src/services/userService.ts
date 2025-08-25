import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp,
  addDoc
} from 'firebase/firestore'
import { db } from '../lib/firebase'

export interface UserProfile {
  uid: string
  username: string
  email: string
  photoURL?: string
  bio?: string
  role: 'buyer' | 'seller' | 'both'
  follows: string[]
  followers: string[]
  followersCount: number
  followingCount: number
  createdAt: Timestamp
  lastActiveAt: Timestamp
  emailVerified: boolean
  referralCode: string
  referredBy?: string
  kyc?: {
    stripeAccountId?: string
    status: 'unverified' | 'pending' | 'verified'
    verifiedAt?: Timestamp
  }
  credit?: {
    available: number
    pending: number
  }
  stats?: {
    totalPurchases: number
    totalSales: number
    totalRevenue: number
    averageRating: number
    reviewCount: number
  }
  preferences?: {
    notifications: {
      email: boolean
      push: boolean
      sms: boolean
    }
    privacy: {
      showEmail: boolean
      showPhone: boolean
      allowMessages: boolean
    }
  }
}

export interface UserAnalytics {
  userId: string
  period: 'hourly' | 'daily' | 'weekly' | 'monthly'
  date: string
  revenue: number
  itemsSold: number
  averageBids: number
  viewerCount: number
  watchTime: number
  sellThroughRate: number
  modeBreakdown: {
    classic: {
      items: number
      revenue: number
    }
    speed: {
      items: number
      revenue: number
    }
  }
  createdAt: Timestamp
}

class UserService {
  // Create notification
  private async createNotification(
    userId: string,
    type: 'follow' | 'follow_back' | 'live_start' | 'auction_win' | 'message',
    data: any
  ): Promise<void> {
    try {
      await addDoc(collection(db, 'notifications'), {
        userId,
        type,
        data,
        read: false,
        createdAt: serverTimestamp()
      })
    } catch (error) {
      console.error('Error creating notification:', error)
      throw error
    }
  }

  // Get user profile
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const userRef = doc(db, 'users', uid)
      const userSnap = await getDoc(userRef)
      
      if (userSnap.exists()) {
        return userSnap.data() as UserProfile
      }
      return null
    } catch (error) {
      console.error('Error getting user profile:', error)
      throw error
    }
  }

  // Update user profile
  async updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      const userRef = doc(db, 'users', uid)
      await updateDoc(userRef, {
        ...updates,
        lastActiveAt: serverTimestamp()
      })
    } catch (error) {
      console.error('Error updating user profile:', error)
      throw error
    }
  }

  // Search users by username
  async searchUsers(searchTerm: string, limitCount: number = 20): Promise<UserProfile[]> {
    try {
      const q = query(
        collection(db, 'users'),
        where('username', '>=', searchTerm),
        where('username', '<=', searchTerm + '\uf8ff'),
        limit(limitCount)
      )
      
      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(doc => doc.data() as UserProfile)
    } catch (error) {
      console.error('Error searching users:', error)
      throw error
    }
  }

  // Follow/unfollow user
  async followUser(followerId: string, followeeId: string): Promise<void> {
    try {
      const followerRef = doc(db, 'users', followerId)
      const followeeRef = doc(db, 'users', followeeId)
      
      // Get current data
      const [followerSnap, followeeSnap] = await Promise.all([
        getDoc(followerRef),
        getDoc(followeeRef)
      ])
      
      if (!followerSnap.exists() || !followeeSnap.exists()) {
        throw new Error('User not found')
      }
      
      const followerData = followerSnap.data() as UserProfile
      const followeeData = followeeSnap.data() as UserProfile
      
      // Check if already following
      if (followerData.follows?.includes(followeeId)) {
        return // Already following
      }
      
      // Update follows array
      const updatedFollows = [...(followerData.follows || []), followeeId]
      const updatedFollowers = [...(followeeData.followers || []), followerId]
      
      // Check if this is a mutual follow (follow back)
      const isFollowBack = followeeData.follows?.includes(followerId) || false
      
      // Update both users
      await Promise.all([
        updateDoc(followerRef, {
          follows: updatedFollows,
          followingCount: updatedFollows.length,
          lastActiveAt: serverTimestamp()
        }),
        updateDoc(followeeRef, {
          followers: updatedFollowers,
          followersCount: updatedFollowers.length,
          lastActiveAt: serverTimestamp()
        })
      ])
      
      // Create notification for the followee
      await this.createNotification(followeeId, isFollowBack ? 'follow_back' : 'follow', {
        fromUserId: followerId,
        fromUsername: followerData.username,
        fromPhotoURL: followerData.photoURL,
        message: isFollowBack 
          ? `${followerData.username} followed you back!` 
          : `${followerData.username} started following you!`
      })
    } catch (error) {
      console.error('Error following user:', error)
      throw error
    }
  }

  async unfollowUser(followerId: string, followeeId: string): Promise<void> {
    try {
      const followerRef = doc(db, 'users', followerId)
      const followeeRef = doc(db, 'users', followeeId)
      
      // Get current data
      const [followerSnap, followeeSnap] = await Promise.all([
        getDoc(followerRef),
        getDoc(followeeRef)
      ])
      
      if (!followerSnap.exists() || !followeeSnap.exists()) {
        throw new Error('User not found')
      }
      
      const followerData = followerSnap.data() as UserProfile
      const followeeData = followeeSnap.data() as UserProfile
      
      // Update follows array
      const updatedFollows = (followerData.follows || []).filter(id => id !== followeeId)
      const updatedFollowers = (followeeData.followers || []).filter(id => id !== followerId)
      
      // Update both users
      await Promise.all([
        updateDoc(followerRef, {
          follows: updatedFollows,
          followingCount: updatedFollows.length,
          lastActiveAt: serverTimestamp()
        }),
        updateDoc(followeeRef, {
          followers: updatedFollowers,
          followersCount: updatedFollowers.length,
          lastActiveAt: serverTimestamp()
        })
      ])
    } catch (error) {
      console.error('Error unfollowing user:', error)
      throw error
    }
  }

  // Get user analytics
  async getUserAnalytics(
    userId: string, 
    period: 'hourly' | 'daily' | 'weekly' | 'monthly' = 'daily',
    limitCount: number = 30
  ): Promise<UserAnalytics[]> {
    try {
      const q = query(
        collection(db, 'analytics', 'seller', userId),
        where('period', '==', period),
        orderBy('date', 'desc'),
        limit(limitCount)
      )
      
      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(doc => doc.data() as UserAnalytics)
    } catch (error) {
      console.error('Error getting user analytics:', error)
      throw error
    }
  }

  // Get top sellers
  async getTopSellers(limitCount: number = 10): Promise<UserProfile[]> {
    try {
      const q = query(
        collection(db, 'users'),
        where('role', 'in', ['seller', 'both']),
        orderBy('stats.totalRevenue', 'desc'),
        limit(limitCount)
      )
      
      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(doc => doc.data() as UserProfile)
    } catch (error) {
      console.error('Error getting top sellers:', error)
      throw error
    }
  }

  // Update user stats (called after order completion)
  async updateUserStats(userId: string, orderAmount: number, isNewSale: boolean = true): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId)
      const userSnap = await getDoc(userRef)
      
      if (!userSnap.exists()) {
        throw new Error('User not found')
      }
      
      const userData = userSnap.data() as UserProfile
      const currentStats = userData.stats || {
        totalPurchases: 0,
        totalSales: 0,
        totalRevenue: 0,
        averageRating: 0,
        reviewCount: 0
      }
      
      const updates: Partial<UserProfile> = {
        stats: {
          ...currentStats,
          totalSales: isNewSale ? currentStats.totalSales + 1 : currentStats.totalSales,
          totalRevenue: currentStats.totalRevenue + orderAmount
        },
        lastActiveAt: serverTimestamp() as Timestamp
      }
      
      await updateDoc(userRef, updates)
    } catch (error) {
      console.error('Error updating user stats:', error)
      throw error
    }
  }

  // Update user rating (called after review)
  async updateUserRating(userId: string, newRating: number): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId)
      const userSnap = await getDoc(userRef)
      
      if (!userSnap.exists()) {
        throw new Error('User not found')
      }
      
      const userData = userSnap.data() as UserProfile
      const currentStats = userData.stats || {
        totalPurchases: 0,
        totalSales: 0,
        totalRevenue: 0,
        averageRating: 0,
        reviewCount: 0
      }
      
      const newReviewCount = currentStats.reviewCount + 1
      const newAverageRating = (
        (currentStats.averageRating * currentStats.reviewCount + newRating) / 
        newReviewCount
      )
      
      const updates: Partial<UserProfile> = {
        stats: {
          ...currentStats,
          averageRating: Math.round(newAverageRating * 100) / 100, // Round to 2 decimal places
          reviewCount: newReviewCount
        },
        lastActiveAt: serverTimestamp() as Timestamp
      }
      
      await updateDoc(userRef, updates)
    } catch (error) {
      console.error('Error updating user rating:', error)
      throw error
    }
  }

  // Generate unique referral code
  generateReferralCode(username: string): string {
    const timestamp = Date.now().toString(36)
    const randomStr = Math.random().toString(36).substring(2, 8)
    return `${username.substring(0, 4).toUpperCase()}${timestamp}${randomStr}`.toUpperCase()
  }

  // Check if username is available
  async isUsernameAvailable(username: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, 'users'),
        where('username', '==', username),
        limit(1)
      )
      
      const querySnapshot = await getDocs(q)
      return querySnapshot.empty
    } catch (error) {
      console.error('Error checking username availability:', error)
      throw error
    }
  }

  // Get user by referral code
  async getUserByReferralCode(referralCode: string): Promise<UserProfile | null> {
    try {
      const q = query(
        collection(db, 'users'),
        where('referralCode', '==', referralCode),
        limit(1)
      )
      
      const querySnapshot = await getDocs(q)
      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].data() as UserProfile
      }
      return null
    } catch (error) {
      console.error('Error getting user by referral code:', error)
      throw error
    }
  }
}

export const userService = new UserService()
