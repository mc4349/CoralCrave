import { useState } from 'react'

const SellerHub = () => {
  const [activeTimeFilter, setActiveTimeFilter] = useState('Daily')
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false)
  const [customDateRange, setCustomDateRange] = useState({
    startDate: '',
    endDate: ''
  })
  const [analyticsData, setAnalyticsData] = useState({
    revenue: 1234,
    itemsSold: 45,
    avgBids: 8.2,
    totalViewers: 156
  })

  const handleTimeFilterClick = (filter: string) => {
    if (filter === 'Custom') {
      setShowCustomDatePicker(true)
      setActiveTimeFilter(filter)
    } else {
      setShowCustomDatePicker(false)
      setActiveTimeFilter(filter)
      // Simulate data update based on filter
      updateAnalyticsData(filter)
    }
  }

  const handleCustomDateSubmit = () => {
    if (customDateRange.startDate && customDateRange.endDate) {
      setShowCustomDatePicker(false)
      // Calculate days between dates for data simulation
      const start = new Date(customDateRange.startDate)
      const end = new Date(customDateRange.endDate)
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      updateAnalyticsData('Custom', daysDiff)
    }
  }

  const handleCustomDateCancel = () => {
    setShowCustomDatePicker(false)
    setActiveTimeFilter('Daily') // Reset to Daily if cancelled
  }

  const formatCustomDateRange = () => {
    if (customDateRange.startDate && customDateRange.endDate) {
      const start = new Date(customDateRange.startDate).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
      const end = new Date(customDateRange.endDate).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
      return `${start} - ${end}`
    }
    return 'Custom'
  }

  const updateAnalyticsData = (filter: string, customDays?: number) => {
    // Simulate different data based on time filter
    const multipliers: { [key: string]: number } = {
      'Hourly': 0.1,
      'Daily': 1,
      'Weekly': 7,
      'Monthly': 30,
      'YTD': 365,
      'Custom': customDays || 1
    }
    
    const multiplier = multipliers[filter] || 1
    setAnalyticsData({
      revenue: Math.round(1234 * multiplier),
      itemsSold: Math.round(45 * multiplier),
      avgBids: parseFloat((8.2 + Math.random() * 2).toFixed(1)),
      totalViewers: Math.round(156 * multiplier)
    })
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Seller Hub</h1>
      
      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card text-center">
          <div className="text-2xl font-bold text-coral-500 mb-2">${analyticsData.revenue.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Total Revenue</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-ocean-500 mb-2">{analyticsData.itemsSold}</div>
          <div className="text-sm text-gray-600">Items Sold</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-500 mb-2">{analyticsData.avgBids}</div>
          <div className="text-sm text-gray-600">Avg Bids/Item</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-purple-500 mb-2">{analyticsData.totalViewers.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Total Viewers</div>
        </div>
      </div>

      {/* Time Filters */}
      <div className="flex space-x-4 mb-8">
        {['Hourly', 'Daily', 'Weekly', 'Monthly', 'YTD', 'Custom'].map((filter) => (
          <button
            key={filter}
            onClick={() => handleTimeFilterClick(filter)}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              activeTimeFilter === filter
                ? 'bg-coral-500 text-white border-coral-500'
                : 'bg-white border-gray-300 hover:bg-gray-50'
            }`}
          >
            {filter === 'Custom' && customDateRange.startDate && customDateRange.endDate 
              ? formatCustomDateRange() 
              : filter
            }
          </button>
        ))}
      </div>

      {/* Custom Date Picker Modal */}
      {showCustomDatePicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-90vw">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Custom Date Range</h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  id="startDate"
                  value={customDateRange.startDate}
                  onChange={(e) => setCustomDateRange((prev: { startDate: string; endDate: string }) => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-coral-500 focus:border-coral-500"
                />
              </div>
              
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  id="endDate"
                  value={customDateRange.endDate}
                  onChange={(e) => setCustomDateRange((prev: { startDate: string; endDate: string }) => ({ ...prev, endDate: e.target.value }))}
                  min={customDateRange.startDate}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-coral-500 focus:border-coral-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={handleCustomDateCancel}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCustomDateSubmit}
                disabled={!customDateRange.startDate || !customDateRange.endDate}
                className="px-4 py-2 bg-coral-500 text-white rounded-md hover:bg-coral-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Revenue Over Time ({activeTimeFilter === 'Custom' && customDateRange.startDate && customDateRange.endDate 
              ? formatCustomDateRange() 
              : activeTimeFilter
            })
          </h3>
          <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <span className="text-gray-500 block">Chart Placeholder</span>
              <span className="text-sm text-gray-400 mt-2 block">
                Showing {activeTimeFilter === 'Custom' && customDateRange.startDate && customDateRange.endDate 
                  ? 'custom date range' 
                  : activeTimeFilter.toLowerCase()
                } data
              </span>
            </div>
          </div>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Mode Breakdown ({activeTimeFilter === 'Custom' && customDateRange.startDate && customDateRange.endDate 
              ? formatCustomDateRange() 
              : activeTimeFilter
            })
          </h3>
          <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <span className="text-gray-500 block">Chart Placeholder</span>
              <span className="text-sm text-gray-400 mt-2 block">Classic vs Speed auctions</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stream Queue */}
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Stream Queue</h3>
          <button className="btn-primary">+ Add Item</button>
        </div>
        
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
              <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">Coral Frag #{i}</h4>
                <p className="text-gray-600 text-sm">Starting at ${20 + i * 5}</p>
              </div>
              <div className="flex space-x-2">
                <button className="btn-secondary text-sm">Edit</button>
                <button className="text-red-600 hover:text-red-700 text-sm">Remove</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SellerHub
