import { useState } from 'react'
import { Link } from 'react-router-dom'

const Explore = () => {
  const [activeFilter, setActiveFilter] = useState<string | null>('For You')
  const [expandedSections, setExpandedSections] = useState<string[]>([])

  const handleFilterClick = (filter: string) => {
    // If clicking the same filter, deselect it
    if (activeFilter === filter) {
      setActiveFilter(null)
    } else {
      setActiveFilter(filter)
    }
    // Reset expanded sections when changing filters
    setExpandedSections([])
  }

  const getFilteredSections = () => {
    if (!activeFilter) {
      // Default explore sections when no filter is active
      return ['Recommended', 'Popular', 'Fish Only', 'Coral', 'Both', 'Sit & Talk']
    }
    
    // When a filter is active, show sections related to that filter
    const filterSections: { [key: string]: string[] } = {
      'For You': ['For You Recommended', 'For You Popular', 'For You Recent', 'For You Trending'],
      'Followed': ['Followed Live Now', 'Followed Recent', 'Followed Popular', 'Followed Upcoming'],
      'Coral': ['Coral Live', 'Coral Popular', 'Coral New Arrivals', 'Coral Rare Finds'],
      'Fish': ['Fish Live', 'Fish Popular', 'Fish New Arrivals', 'Fish Rare Species'],
      'Both': ['Both Live', 'Both Popular', 'Both Mixed Collections', 'Both Featured']
    }
    
    return filterSections[activeFilter] || ['Recommended', 'Popular', 'Fish Only', 'Coral', 'Both', 'Sit & Talk']
  }

  const handleSeeMore = (section: string) => {
    setExpandedSections((prev: string[]) => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    )
  }

  const getItemsToShow = (section: string) => {
    return expandedSections.includes(section) ? 6 : 3
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        {activeFilter ? `${activeFilter} Live Streams` : 'Explore Live Streams'}
      </h1>
      
      {/* Filter Tabs */}
      <div className="flex space-x-4 mb-8">
        {['For You', 'Followed', 'Coral', 'Fish', 'Both'].map((filter) => (
          <button
            key={filter}
            onClick={() => handleFilterClick(filter)}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              activeFilter === filter
                ? 'bg-coral-500 text-white border-coral-500'
                : 'bg-white border-gray-300 hover:bg-gray-50'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Sections */}
      {getFilteredSections().map((section) => (
        <div key={section} className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{section}</h2>
            <button 
              onClick={() => handleSeeMore(section)}
              className="text-coral-500 hover:text-coral-600 font-medium transition-colors"
            >
              {expandedSections.includes(section) ? 'Show less' : 'See more'}
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: getItemsToShow(section) }, (_, i) => i + 1).map((i) => (
              <Link 
                key={i} 
                to={`/live/${section.toLowerCase().replace(' ', '-')}-${i}`}
                className="card hover:shadow-md transition-shadow cursor-pointer block"
              >
                <div className="aspect-video bg-gray-200 rounded-lg mb-4 relative">
                  <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-sm font-medium">
                    LIVE
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                    {Math.floor(Math.random() * 300) + 25} viewers
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  {section} Stream #{i}
                </h3>
                <p className="text-gray-600 text-sm mb-2">by @seller{i}</p>
                <div className="flex justify-between items-center">
                  <span className="text-coral-500 font-medium">
                    Current bid: ${(Math.random() * 80 + 15).toFixed(2)}
                  </span>
                  <span className="text-sm text-gray-500">
                    {Math.floor(Math.random() * 120)}s left
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default Explore
