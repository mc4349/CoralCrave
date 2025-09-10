import React, { useState, useEffect, useRef } from 'react'

import { useAuth } from '../contexts/AuthContext'
import { chatService, ChatMessage } from '../services/chatService'

interface LiveChatProps {
  roomId: string
  className?: string
}

export default function LiveChat({ roomId, className = '' }: LiveChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { currentUser, userProfile } = useAuth()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (!roomId) return

    const unsubscribe = chatService.subscribeToMessages(roomId, newMessages => {
      setMessages(newMessages)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [roomId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !currentUser || !userProfile) return

    try {
      await chatService.sendMessage(
        newMessage.trim(),
        currentUser.uid,
        userProfile.username,
        roomId
      )
      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  if (!currentUser) {
    return (
      <div className={`bg-slate-800 rounded-lg p-4 ${className}`}>
        <p className='text-slate-400 text-center'>
          Please log in to join the chat
        </p>
      </div>
    )
  }

  return (
    <div className={`bg-slate-800 rounded-lg flex flex-col ${className}`}>
      {/* Chat Header */}
      <div className='p-3 border-b border-slate-700'>
        <h3 className='text-white font-semibold'>Live Chat</h3>
        <p className='text-slate-400 text-sm'>{messages.length} messages</p>
      </div>

      {/* Messages */}
      <div className='flex-1 overflow-y-auto p-3 space-y-2 min-h-0'>
        {isLoading ? (
          <div className='text-center text-slate-400'>Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className='text-center text-slate-400'>
            No messages yet. Be the first!
          </div>
        ) : (
          messages.map(message => {
            // System messages (bid announcements and winner announcements)
            if (
              message.type === 'system_bid' ||
              message.type === 'system_winner'
            ) {
              return (
                <div key={message.id} className='flex justify-center'>
                  <div className='bg-yellow-900/30 border border-yellow-700 rounded-lg px-4 py-2 max-w-md'>
                    <div className='text-yellow-300 text-sm font-semibold text-center'>
                      {message.type === 'system_bid' ? '💰' : '🏆'}{' '}
                      {message.username}
                    </div>
                    <div className='text-yellow-200 text-sm text-center mt-1'>
                      {message.text}
                    </div>
                    <div className='text-yellow-400 text-xs text-center mt-1 opacity-75'>
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              )
            }

            // Regular user messages
            return (
              <div
                key={message.id}
                className={`flex ${
                  message.userId === currentUser.uid
                    ? 'justify-end'
                    : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-xs px-3 py-2 rounded-lg ${
                    message.userId === currentUser.uid
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-700 text-slate-200'
                  }`}
                >
                  <div className='text-xs opacity-75 mb-1'>
                    {message.username}
                  </div>
                  <div>{message.text}</div>
                  <div className='text-xs opacity-50 mt-1'>
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={sendMessage} className='p-3 border-t border-slate-700'>
        <div className='flex space-x-2'>
          <input
            type='text'
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder='Type a message...'
            className='flex-1 bg-slate-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500'
            maxLength={200}
          />
          <button
            type='submit'
            disabled={!newMessage.trim()}
            className='bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-600 text-white px-4 py-2 rounded font-semibold transition-colors'
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}
