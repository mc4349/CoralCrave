import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { livestreamService, ChatMessage } from '../services/livestreamService'

interface LiveChatProps {
  liveId: string
  isHost?: boolean
}

export default function LiveChat({ liveId, isHost = false }: LiveChatProps) {
  const { currentUser } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Subscribe to chat messages
  useEffect(() => {
    if (!liveId) return

    const unsubscribe = livestreamService.subscribeChatMessages(liveId, (newMessages) => {
      setMessages(newMessages)
    })

    return unsubscribe
  }, [liveId])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMessage.trim() || !currentUser || isLoading) return

    setIsLoading(true)
    
    try {
      await livestreamService.sendChatMessage(liveId, {
        userId: currentUser.uid,
        username: currentUser.displayName || 'Anonymous',
        text: newMessage.trim(),
        isHost,
        isModerator: false
      })
      
      setNewMessage('')
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return ''
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getUsernameColor = (userId: string, isHost: boolean, isModerator: boolean) => {
    if (isHost) return 'text-coral-600 font-semibold'
    if (isModerator) return 'text-blue-600 font-semibold'
    
    // Generate consistent color based on userId
    const colors = [
      'text-purple-600',
      'text-green-600',
      'text-blue-600',
      'text-pink-600',
      'text-indigo-600',
      'text-teal-600'
    ]
    
    const hash = userId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0)
      return a & a
    }, 0)
    
    return colors[Math.abs(hash) % colors.length]
  }

  if (!currentUser) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <p className="text-sm">Sign in to join the chat</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Chat Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b bg-gray-50">
        <h3 className="font-medium text-gray-900">Live Chat</h3>
        <p className="text-xs text-gray-500">{messages.length} messages</p>
      </div>

      {/* Messages Container */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-2 space-y-2"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p className="text-sm">No messages yet. Be the first to say hello! 👋</p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="flex flex-col space-y-1">
              <div className="flex items-baseline space-x-2">
                <span className={`text-sm font-medium ${getUsernameColor(
                  message.userId, 
                  message.isHost || false, 
                  message.isModerator || false
                )}`}>
                  {message.username}
                  {message.isHost && (
                    <span className="ml-1 text-xs bg-coral-100 text-coral-700 px-1 rounded">
                      HOST
                    </span>
                  )}
                  {message.isModerator && (
                    <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1 rounded">
                      MOD
                    </span>
                  )}
                </span>
                <span className="text-xs text-gray-400">
                  {formatTimestamp(message.timestamp)}
                </span>
              </div>
              <p className="text-sm text-gray-800 break-words">
                {message.text}
              </p>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="flex-shrink-0 border-t bg-white">
        <form onSubmit={handleSendMessage} className="p-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              maxLength={500}
              disabled={isLoading}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || isLoading}
              className="btn-primary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Send'
              )}
            </button>
          </div>
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-gray-500">
              {newMessage.length}/500 characters
            </p>
            {isHost && (
              <p className="text-xs text-coral-600 font-medium">
                You're the host
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
