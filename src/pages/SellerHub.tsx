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
      updateAnalyticsData(filter)
    }
  }

  const handleCustomDateSubmit = () => {
    if (customDateRange.startDate && customDateRange.endDate) {
      setShowCustomDatePicker(false)
      const start = new Date(customDateRange.startDate)
      const end = new Date(customDateRange.endDate)
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      updateAnalyticsData('Custom', daysDiff)
    }
  }

  const handleCustomDateCancel = () => {
    setShowCustomDatePicker(false)
    setActiveTimeFilter('Daily')
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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-900 to-slate-800">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 opacity-10 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-blue-400 rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-teal-400 rounded-full animate-bounce"></div>
        <div className="absolute bottom-20 left-1/4 w-20 h-20 bg-cyan-400 rounded-full animate-pulse"></div>
        <div className="absolute bottom-40 right-1/3 w-28 h-28 bg-blue-300 rounded-full animate-bounce"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-white mb-6 leading-tight">
            Seller <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Analytics</span>
          </h1>
          <p className="text-2xl text-blue-100 mb-12 max-w-3xl mx-auto leading-relaxed">
            Track your performance, analyze your sales, and grow your marine business with detailed insights.
          </p>
        </div>
        
        {/* Analytics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-slate-700/50 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/20 hover:border-cyan-400/40 transition-all duration-300 hover:transform hover:scale-105 text-center">
            <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 mb-2">
              ${analyticsData.revenue.toLocaleString()}
            </div>
            <div className="text-sm text-slate-300">Total Revenue</div>
          </div>
          <div className="bg-slate-700/50 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/20 hover:border-cyan-400/40 transition-all duration-300 hover:transform hover:scale-105 text-center">
            <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400 mb-2">
              {analyticsData.itemsSold}
            </div>
            <div className="text-sm text-slate-300">Items Sold</div>
          </div>
          <div className="bg-slate-700/50 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/20 hover:border-cyan-400/40 transition-all duration-300 hover:transform hover:scale-105 text-center">
            <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-teal-400 mb-2">
              {analyticsData.avgBids}
            </div>
            <div className="text-sm text-slate-300">Avg Bids/Item</div>
          </div>
          <div className="bg-slate-700/50 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/20 hover:border-cyan-400/40 transition-all duration-300 hover:transform hover:scale-105 text-center">
            <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 mb-2">
              {analyticsData.totalViewers.toLocaleString()}
            </div>
            <div className="text-sm text-slate-300">Total Viewers</div>
          </div>
        </div>

        {/* Time Filters */}
        <div className="flex flex-wrap gap-4 mb-12 justify-center">
          {['Hourly', 'Daily', 'Weekly', 'Monthly', 'YTD', 'Custom'].map((filter) => (
            <button
              key={filter}
              onClick={() => handleTimeFilterClick(filter)}
              className={`px-6 py-3 rounded-lg border transition-all duration-300 font-medium ${
                activeTimeFilter === filter
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-cyan-400 shadow-lg shadow-cyan-500/25 transform scale-105'
                  : 'bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:border-cyan-400/50 hover:text-cyan-300 backdrop-blur-sm'
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
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-xl shadow-2xl border border-slate-700/50 p-6 w-96 max-w-90vw">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">Select Custom Date Range</h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-slate-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    value={customDateRange.startDate}
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    className="input-primary"
                  />
                </div>
                
                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-slate-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    value={customDateRange.endDate}
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    min={customDateRange.startDate}
                    className="input-primary"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={handleCustomDateCancel}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCustomDateSubmit}
                  disabled={!customDateRange.startDate || !customDateRange.endDate}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Charts Placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <div className="bg-slate-700/50 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/20 hover:border-cyan-400/40 transition-all duration-300">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">
              Revenue Over Time ({activeTimeFilter === 'Custom' && customDateRange.startDate && customDateRange.endDate 
                ? formatCustomDateRange() 
                : activeTimeFilter
              })
            </h3>
            <div className="h-64 bg-slate-800/50 rounded-lg flex items-center justify-center border border-slate-600/50">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-cyan-500/30">
                  <svg className="w-8 h-8 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                  </svg>
                </div>
                <span className="text-slate-300 block">Revenue Chart</span>
                <span className="text-sm text-slate-400 mt-2 block">
                  Showing {activeTimeFilter === 'Custom' && customDateRange.startDate && customDateRange.endDate 
                    ? 'custom date range' 
                    : activeTimeFilter.toLowerCase()
                  } data
                </span>
              </div>
            </div>
          </div>
          <div className="bg-slate-700/50 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/20 hover:border-cyan-400/40 transition-all duration-300">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">
              Mode Breakdown ({activeTimeFilter === 'Custom' && customDateRange.startDate && customDateRange.endDate 
                ? formatCustomDateRange() 
                : activeTimeFilter
              })
            </h3>
            <div className="h-64 bg-slate-800/50 rounded-lg flex items-center justify-center border border-slate-600/50">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-teal-500/20 to-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-teal-500/30">
                  <svg className="w-8 h-8 text-teal-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-slate-300 block">Mode Analysis</span>
                <span className="text-sm text-slate-400 mt-2 block">Classic vs Speed auctions</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stream Queue */}
        <div className="bg-slate-700/50 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/20 hover:border-cyan-400/40 transition-all duration-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-slate-100">Stream Queue</h3>
            <button className="btn-primary">+ Add Item</button>
          </div>
          
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4 p-4 bg-slate-800/30 backdrop-blur-sm rounded-lg border border-slate-600/50 hover:border-cyan-400/30 transition-all duration-300">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg flex items-center justify-center border border-slate-600/50">
                  <svg className="w-8 h-8 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-slate-100">Coral Frag #{i}</h4>
                  <p className="text-cyan-400 text-sm">Starting at ${20 + i * 5}</p>
                </div>
                <div className="flex space-x-2">
                  <button className="btn-secondary text-sm">Edit</button>
                  <button className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors duration-300">Remove</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SellerHub
