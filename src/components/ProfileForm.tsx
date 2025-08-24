import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface ProfileFormProps {
  onSave?: () => void
}

type FormData = {
  username: string
  bio: string
  role: 'buyer' | 'seller' | 'both'
}

export default function ProfileForm({ onSave }: ProfileFormProps) {
  const { userProfile, updateUserProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [formData, setFormData] = useState<FormData>({
    username: userProfile?.username || '',
    bio: userProfile?.bio || '',
    role: userProfile?.role || 'buyer'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setError('')
      setSuccess('')
      setLoading(true)
      
      await updateUserProfile(formData)
      setSuccess('Profile updated successfully!')
      onSave?.()
    } catch (error: any) {
      setError('Failed to update profile: ' + error.message)
    }
    
    setLoading(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const role = e.target.value as 'buyer' | 'seller' | 'both'
    setFormData({ ...formData, role })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md">
          {success}
        </div>
      )}

      <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-700">
          Username
        </label>
        <input
          type="text"
          id="username"
          name="username"
          value={formData.username}
          onChange={handleInputChange}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-coral-500 focus:border-coral-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
          Bio
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          value={formData.bio}
          onChange={handleInputChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-coral-500 focus:border-coral-500 sm:text-sm"
          placeholder="Tell us about yourself..."
        />
      </div>

      <div>
        <label htmlFor="role" className="block text-sm font-medium text-gray-700">
          Account Type
        </label>
        <select
          id="role"
          name="role"
          value={formData.role}
          onChange={handleRoleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-coral-500 focus:border-coral-500 sm:text-sm"
        >
          <option value="buyer">Buyer Only</option>
          <option value="seller">Seller Only</option>
          <option value="both">Both Buyer & Seller</option>
        </select>
        <p className="mt-1 text-sm text-gray-500">
          Choose "Both" if you want to buy and sell items on CoralCrave
        </p>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="bg-coral-600 hover:bg-coral-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
