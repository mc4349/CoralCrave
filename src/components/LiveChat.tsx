import { useState } from 'react'

import { useAuth } from '../contexts/AuthContext'

interface LiveChatProps {
  liveId: string
  isHost?: boolean
}

export default function LiveChat({ }: LiveChatProps) {
  const { currentUser } = useAuth()
  const [newMessage, setNewMessage] = useState('')

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    // Minimal implementation - just clear the input
    setNewMessage('')
  }

  if (!currentUser) {
    return (
      <div className='h-full flex items-center justify-center text-gray-500'>
        <p className='text-sm'>Sign in to join the chat</p>
      </div>
    )
  }

  return (
    <div className='h-full flex flex-col bg-white'>
      {/* Chat Header */}
      <div className='flex-shrink-0 px-4 py-3 border-b bg-gray-50'>
        <h3 className='font-medium text-gray-900'>Live Chat</h3>
        <p className='text-xs text-gray-500'>Chat disabled in minimal tester</p>
      </div>

      {/* Messages Container */}
      <div className='flex-1 overflow-y-auto px-4 py-2 space-y-2'>
        <div className='flex items-center justify-center h-full text-gray-500'>
          <p className='text-sm'>
            Chat functionality removed in minimal Agora tester
          </p>
        </div>
      </div>

      {/* Message Input */}
      <div className='flex-shrink-0 border-t bg-white'>
        <form onSubmit={handleSendMessage} className='p-4'>
          <div className='flex space-x-2'>
            <input
              type='text'
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder='Chat disabled...'
              maxLength={500}
              disabled={true}
              className='flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500 disabled:opacity-50'
            />
            <button
              type='submit'
              disabled={true}
              className='btn-primary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
