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
        <div className="bg-red-900/20 border border-red-500/30 text-red-300 px-4 py-3 rounded-md">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-900/20 border border-green-500/30 text-green-300 px-4 py-3 rounded-md">
          {success}
        </div>
      )}

      <div>
        <label htmlFor="username" className="block text-sm font-medium text-slate-200 mb-2">
          Username
        </label>
        <input
          type="text"
          id="username"
          name="username"
          value={formData.username}
          onChange={handleInputChange}
          required
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
          placeholder="Enter your username"
        />
      </div>

      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-slate-200 mb-2">
          Bio
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          value={formData.bio}
          onChange={handleInputChange}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
          placeholder="Tell us about yourself..."
        />
      </div>

      <div>
        <label htmlFor="role" className="block text-sm font-medium text-slate-200 mb-2">
          Account Type
        </label>
        <select
          id="role"
          name="role"
          value={formData.role}
          onChange={handleRoleChange}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
        >
          <option value="buyer">Buyer Only</option>
          <option value="seller">Seller Only</option>
          <option value="both">Both Buyer & Seller</option>
        </select>
        <p className="mt-1 text-sm text-slate-400">
          Choose "Both" if you want to buy and sell items on CoralCrave
        </p>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-6 py-2 rounded-md text-sm font-medium disabled:opacity-50 transition-all duration-300"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
