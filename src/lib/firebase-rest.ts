// Direct REST API implementation to bypass Firestore 400 errors
import { auth } from './firebase'

interface FirestoreDocument {
  name?: string
  fields: Record<string, any>
  createTime?: string
  updateTime?: string
}

class FirestoreRestClient {
  private projectId: string
  private baseUrl: string

  constructor() {
    this.projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID
    this.baseUrl = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents`
  }

  private async getAuthToken(): Promise<string> {
    if (!auth.currentUser) {
      throw new Error('User not authenticated')
    }
    return await auth.currentUser.getIdToken()
  }

  private convertToFirestoreValue(value: any): any {
    if (value === null || value === undefined) {
      return { nullValue: null }
    }
    if (typeof value === 'string') {
      return { stringValue: value }
    }
    if (typeof value === 'number') {
      return Number.isInteger(value) ? { integerValue: value.toString() } : { doubleValue: value }
    }
    if (typeof value === 'boolean') {
      return { booleanValue: value }
    }
    if (value instanceof Date) {
      return { timestampValue: value.toISOString() }
    }
    if (Array.isArray(value)) {
      return {
        arrayValue: {
          values: value.map(item => this.convertToFirestoreValue(item))
        }
      }
    }
    if (typeof value === 'object') {
      const fields: Record<string, any> = {}
      for (const [key, val] of Object.entries(value)) {
        if (key === 'serverTimestamp') {
          // Handle server timestamp
          fields[key] = { timestampValue: new Date().toISOString() }
        } else {
          fields[key] = this.convertToFirestoreValue(val)
        }
      }
      return { mapValue: { fields } }
    }
    return { stringValue: String(value) }
  }

  private convertFromFirestoreValue(value: any): any {
    if (!value) return null
    
    if (value.nullValue !== undefined) return null
    if (value.stringValue !== undefined) return value.stringValue
    if (value.integerValue !== undefined) return parseInt(value.integerValue)
    if (value.doubleValue !== undefined) return value.doubleValue
    if (value.booleanValue !== undefined) return value.booleanValue
    if (value.timestampValue !== undefined) return new Date(value.timestampValue)
    
    if (value.arrayValue) {
      return value.arrayValue.values?.map((item: any) => this.convertFromFirestoreValue(item)) || []
    }
    
    if (value.mapValue) {
      const result: Record<string, any> = {}
      for (const [key, val] of Object.entries(value.mapValue.fields || {})) {
        result[key] = this.convertFromFirestoreValue(val)
      }
      return result
    }
    
    return value
  }

  async createDocument(collection: string, data: Record<string, any>): Promise<string> {
    try {
      console.log('🔥 Creating document via REST API...')
      const token = await this.getAuthToken()
      
      const document: FirestoreDocument = {
        fields: {}
      }
      
      // Convert data to Firestore format
      for (const [key, value] of Object.entries(data)) {
        if (key === 'createdAt' || key === 'updatedAt') {
          document.fields[key] = { timestampValue: new Date().toISOString() }
        } else {
          document.fields[key] = this.convertToFirestoreValue(value)
        }
      }
      
      const response = await fetch(`${this.baseUrl}/${collection}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(document)
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('REST API Error:', response.status, errorText)
        throw new Error(`REST API Error: ${response.status} - ${errorText}`)
      }
      
      const result = await response.json()
      const documentId = result.name.split('/').pop()
      console.log('✅ Document created via REST API:', documentId)
      return documentId
      
    } catch (error: any) {
      console.error('❌ REST API create failed:', error)
      throw error
    }
  }

  async getDocument(collection: string, documentId: string): Promise<any> {
    try {
      const token = await this.getAuthToken()
      
      const response = await fetch(`${this.baseUrl}/${collection}/${documentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`REST API Error: ${response.status}`)
      }
      
      const result = await response.json()
      const data: Record<string, any> = { id: documentId }
      
      for (const [key, value] of Object.entries(result.fields || {})) {
        data[key] = this.convertFromFirestoreValue(value)
      }
      
      return data
      
    } catch (error: any) {
      console.error('❌ REST API get failed:', error)
      throw error
    }
  }

  async updateDocument(collection: string, documentId: string, updates: Record<string, any>): Promise<void> {
    try {
      const token = await this.getAuthToken()
      
      const document: FirestoreDocument = {
        fields: {}
      }
      
      // Convert updates to Firestore format
      for (const [key, value] of Object.entries(updates)) {
        if (key === 'updatedAt') {
          document.fields[key] = { timestampValue: new Date().toISOString() }
        } else {
          document.fields[key] = this.convertToFirestoreValue(value)
        }
      }
      
      const updateMask = Object.keys(updates).join(',')
      
      const response = await fetch(`${this.baseUrl}/${collection}/${documentId}?updateMask.fieldPaths=${updateMask}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(document)
      })
      
      if (!response.ok) {
        throw new Error(`REST API Error: ${response.status}`)
      }
      
      console.log('✅ Document updated via REST API')
      
    } catch (error: any) {
      console.error('❌ REST API update failed:', error)
      throw error
    }
  }
}

export const firestoreRest = new FirestoreRestClient()
