import { db } from '../lib/firebase'
import { collection, addDoc, onSnapshot, query, orderBy, limit, where } from 'firebase/firestore'

export interface ChatMessage {
  id: string
  text: string
  userId: string
  username: string
  timestamp: Date
  roomId: string
  type: 'user' | 'system_bid' | 'system_winner'
}

export class ChatService {
  private static instance: ChatService

  static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService()
    }
    return ChatService.instance
  }

  // Send a regular user message
  async sendMessage(
    text: string,
    userId: string,
    username: string,
    roomId: string
  ): Promise<void> {
    try {
      await addDoc(collection(db, 'chatMessages'), {
        text: text.trim(),
        userId,
        username,
        timestamp: new Date(),
        roomId,
        type: 'user',
      })
    } catch (error) {
      console.error('Error sending message:', error)
      throw error
    }
  }

  // Send a bid announcement message
  async sendBidAnnouncement(
    username: string,
    amount: number,
    roomId: string
  ): Promise<void> {
    try {
      const message = `${username} is the highest bidder at $${amount.toFixed(2)}`
      await addDoc(collection(db, 'chatMessages'), {
        text: message,
        userId: 'system',
        username: 'Auction Bot',
        timestamp: new Date(),
        roomId,
        type: 'system_bid',
      })
    } catch (error) {
      console.error('Error sending bid announcement:', error)
      throw error
    }
  }

  // Send a winner announcement message
  async sendWinnerAnnouncement(
    username: string,
    itemTitle: string,
    finalPrice: number,
    roomId: string
  ): Promise<void> {
    try {
      const message = `${username} won "${itemTitle}" for $${finalPrice.toFixed(2)}`
      await addDoc(collection(db, 'chatMessages'), {
        text: message,
        userId: 'system',
        username: 'Auction Bot',
        timestamp: new Date(),
        roomId,
        type: 'system_winner',
      })
    } catch (error) {
      console.error('Error sending winner announcement:', error)
      throw error
    }
  }

  // Listen to chat messages
  subscribeToMessages(
    roomId: string,
    callback: (messages: ChatMessage[]) => void
  ): () => void {
    const q = query(
      collection(db, 'chatMessages'),
      where('roomId', '==', roomId),
      orderBy('timestamp', 'desc'),
      limit(50)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages: ChatMessage[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        messages.push({
          id: doc.id,
          text: data.text,
          userId: data.userId,
          username: data.username,
          timestamp: data.timestamp?.toDate() || new Date(),
          roomId: data.roomId,
          type: data.type || 'user',
        })
      })
      callback(messages.reverse())
    })

    return unsubscribe
  }
}

export const chatService = ChatService.getInstance()
