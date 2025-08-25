import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useNavigate } from 'react-router-dom'

interface Notification {
  id: string
  type: 'follow' | 'follow_back' | 'live_start' | 'auction_win' | 'message'
  title: string
  message: string
  read: boolean
  createdAt: Date
  fromUserId?: string
  fromUsername?: string
  fromPhotoURL?: string
  relatedId?: string
}

export default function Notifications() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser) return

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const notificationsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Notification[]
      
      setNotifications(notificationsList)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [currentUser])

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true
      })
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id)
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'follow':
      case 'follow_back':
        if (notification.fromUserId) {
          navigate(`/profile/${notification.fromUserId}`)
        }
        break
      case 'live_start':
        if (notification.relatedId) {
          navigate(`/live/${notification.relatedId}`)
        }
        break
      case 'message':
        navigate('/activity')
        break
      default:
        break
    }
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    
    return date.toLocaleDateString()
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'follow':
      case 'follow_back':
        return (
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full flex items-center justify-center border border-blue-500/30">
            <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
            </svg>
          </div>
        )
      case 'live_start':
        return (
          <div className="w-10 h-10 bg-gradient-to-r from-red-500/20 to-pink-500/20 rounded-full flex items-center justify-center border border-red-500/30">
            <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
            </svg>
          </div>
        )
      case 'auction_win':
        return (
          <div className="w-10 h-10 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full flex items-center justify-center border border-green-500/30">
            <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
        )
      case 'message':
        return (
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 rounded-full flex items-center justify-center border border-purple-500/30">
            <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
          </div>
        )
      default:
        return (
          <div className="w-10 h-10 bg-gradient-to-r from-slate-500/20 to-gray-500/20 rounded-full flex items-center justify-center border border-slate-500/30">
            <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
        )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
        {/* Floating ocean elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-4 h-4 bg-cyan-400/20 rounded-full animate-pulse"></div>
          <div className="absolute top-40 right-20 w-6 h-6 bg-blue-400/20 rounded-full animate-bounce"></div>
          <div className="absolute bottom-40 left-1/4 w-3 h-3 bg-cyan-300/30 rounded-full animate-pulse"></div>
          <div className="absolute bottom-60 right-1/3 w-5 h-5 bg-blue-300/20 rounded-full animate-bounce"></div>
        </div>

        <div className="relative max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-700 rounded w-48 mb-6"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 card">
                  <div className="w-10 h-10 bg-slate-700 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                    <div className="h-3 bg-slate-700 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      {/* Floating ocean elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-4 h-4 bg-cyan-400/20 rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-20 w-6 h-6 bg-blue-400/20 rounded-full animate-bounce"></div>
        <div className="absolute bottom-40 left-1/4 w-3 h-3 bg-cyan-300/30 rounded-full animate-pulse"></div>
        <div className="absolute bottom-60 right-1/3 w-5 h-5 bg-blue-300/20 rounded-full animate-bounce"></div>
        <div className="absolute top-1/3 left-1/2 w-2 h-2 bg-cyan-500/30 rounded-full animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-4 h-4 bg-blue-400/20 rounded-full animate-bounce"></div>
      </div>

      <div className="relative max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-6">Notifications</h1>
        
        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM10.5 3.75a6 6 0 0 1 6 6v2.25l2.25 2.25v.75H2.25v-.75L4.5 12V9.75a6 6 0 0 1 6-6z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-slate-100">No notifications</h3>
            <p className="mt-1 text-sm text-slate-400">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`flex items-start space-x-4 p-4 rounded-lg cursor-pointer transition-all duration-300 ${
                  notification.read 
                    ? 'card hover:bg-slate-700/50' 
                    : 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 hover:from-cyan-500/20 hover:to-blue-500/20 border-l-4 border-cyan-400 backdrop-blur-sm'
                }`}
              >
                <div className="flex-shrink-0">
                  {notification.fromPhotoURL ? (
                    <img
                      src={notification.fromPhotoURL}
                      alt={notification.fromUsername}
                      className="w-10 h-10 rounded-full object-cover border-2 border-cyan-500/30"
                    />
                  ) : (
                    getNotificationIcon(notification.type)
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm ${notification.read ? 'text-slate-100' : 'text-slate-100 font-medium'}`}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-slate-400 flex-shrink-0 ml-2">
                      {formatTimeAgo(notification.createdAt)}
                    </p>
                  </div>
                  <p className="text-sm text-slate-300 mt-1">
                    {notification.message}
                  </p>
                </div>
                
                {!notification.read && (
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
