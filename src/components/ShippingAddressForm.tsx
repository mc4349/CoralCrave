import React, { useState } from 'react'

export interface ShippingAddress {
  fullName: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  zipCode: string
  country: string
}

interface ShippingAddressFormProps {
  onSubmit: (address: ShippingAddress) => void
  onCancel: () => void
  initialAddress?: Partial<ShippingAddress>
}

export default function ShippingAddressForm({
  onSubmit,
  onCancel,
  initialAddress = {}
}: ShippingAddressFormProps) {
  const [address, setAddress] = useState<ShippingAddress>({
    fullName: initialAddress.fullName || '',
    addressLine1: initialAddress.addressLine1 || '',
    addressLine2: initialAddress.addressLine2 || '',
    city: initialAddress.city || '',
    state: initialAddress.state || '',
    zipCode: initialAddress.zipCode || '',
    country: initialAddress.country || 'US',
  })

  const [errors, setErrors] = useState<Partial<ShippingAddress>>({})

  const validateForm = (): boolean => {
    const newErrors: Partial<ShippingAddress> = {}

    if (!address.fullName.trim()) {
      newErrors.fullName = 'Full name is required'
    }

    if (!address.addressLine1.trim()) {
      newErrors.addressLine1 = 'Address is required'
    }

    if (!address.city.trim()) {
      newErrors.city = 'City is required'
    }

    if (!address.state.trim()) {
      newErrors.state = 'State is required'
    }

    if (!address.zipCode.trim()) {
      newErrors.zipCode = 'ZIP code is required'
    } else if (!/^\d{5}(-\d{4})?$/.test(address.zipCode)) {
      newErrors.zipCode = 'Invalid ZIP code format'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      onSubmit(address)
    }
  }

  const handleChange = (field: keyof ShippingAddress, value: string) => {
    setAddress(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold text-white mb-6">Shipping Address</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              value={address.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              placeholder="John Doe"
              className={`w-full bg-slate-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                errors.fullName ? 'border border-red-500' : ''
              }`}
              required
            />
            {errors.fullName && (
              <p className="text-red-400 text-xs mt-1">{errors.fullName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Address Line 1 *
            </label>
            <input
              type="text"
              value={address.addressLine1}
              onChange={(e) => handleChange('addressLine1', e.target.value)}
              placeholder="123 Main Street"
              className={`w-full bg-slate-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                errors.addressLine1 ? 'border border-red-500' : ''
              }`}
              required
            />
            {errors.addressLine1 && (
              <p className="text-red-400 text-xs mt-1">{errors.addressLine1}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Address Line 2
            </label>
            <input
              type="text"
              value={address.addressLine2}
              onChange={(e) => handleChange('addressLine2', e.target.value)}
              placeholder="Apartment, suite, etc. (optional)"
              className="w-full bg-slate-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                City *
              </label>
              <input
                type="text"
                value={address.city}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="New York"
                className={`w-full bg-slate-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                  errors.city ? 'border border-red-500' : ''
                }`}
                required
              />
              {errors.city && (
                <p className="text-red-400 text-xs mt-1">{errors.city}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                State *
              </label>
              <input
                type="text"
                value={address.state}
                onChange={(e) => handleChange('state', e.target.value)}
                placeholder="NY"
                className={`w-full bg-slate-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                  errors.state ? 'border border-red-500' : ''
                }`}
                required
              />
              {errors.state && (
                <p className="text-red-400 text-xs mt-1">{errors.state}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                ZIP Code *
              </label>
              <input
                type="text"
                value={address.zipCode}
                onChange={(e) => handleChange('zipCode', e.target.value)}
                placeholder="10001"
                className={`w-full bg-slate-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                  errors.zipCode ? 'border border-red-500' : ''
                }`}
                required
              />
              {errors.zipCode && (
                <p className="text-red-400 text-xs mt-1">{errors.zipCode}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Country *
              </label>
              <select
                value={address.country}
                onChange={(e) => handleChange('country', e.target.value)}
                className="w-full bg-slate-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                required
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="GB">United Kingdom</option>
                <option value="AU">Australia</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-6">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-slate-600 hover:bg-slate-700 text-white px-4 py-3 rounded font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded font-semibold transition-colors"
            >
              Continue to Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
