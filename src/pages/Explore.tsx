import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../contexts/AuthContext'
import { livestreamService, Livestream } from '../services/livestreamService'
import { StreamCardSkeleton } from '../components/LoadingSkeleton'
import LiveCard, { LiveStream } from '../components/LiveCard'

// Convert service Livestream to UI LiveStream format
function convertToUILiveStream(serviceStream: Livestream): LiveStream {
  return {
    id: serviceStream.id,
    title: serviceStream.title || undefined,
    hostId: serviceStream.hostId || undefined,
    hostUsername: serviceStream.hostUsername || undefined,
    channelName: serviceStream.channelName,
    viewerCount: serviceStream.viewerCount || 0,
    status: serviceStream.status,
    categories: serviceStream.categories || [],
    startedAt: serviceStream.startedAt,
    previewUrl: serviceStream.previewUrl || null,
  }
}

const Explore = () => {
  const { loading: authLoading } = useAuth()
  const [activeFilter, setActiveFilter] = useState<string | null>('For You')
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<
    'newest' | 'oldest' | 'most-viewed' | 'least-viewed'
  >('newest')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    // Wait for authentication to complete before setting up Firestore listener
    if (authLoading) {
      console.log('🔍 Explore: Waiting for authentication to complete...')
      return
    }

    console.log('🔍 Explore: Setting up real-time listener for live streams...')

    // Use the livestream service for real-time updates
    const unsubscribe = livestreamService.subscribeToActiveLivestreams(
      (serviceStreams: Livestream[]) => {
        console.log(
          '✅ Explore: Real-time update - Found',
          serviceStreams.length,
          'live streams from service'
        )

        // Convert service streams to UI format
        const uiStreams = serviceStreams.map(convertToUILiveStream)

        console.log(
          '🔄 Explore: Converted to UI format -',
          uiStreams.length,
          'streams'
        )

        setLiveStreams(uiStreams)
        setLoading(false)
      }
    )

    // Cleanup subscription on unmount
    return () => {
      console.log('🔄 Explore: Cleaning up real-time listener')
      unsubscribe()
    }
  }, [authLoading])

  const handleFilterClick = (filter: string) => {
    if (activeFilter === filter) {
      setActiveFilter(null)
    } else {
      setActiveFilter(filter)
    }
  }

  const getFilteredStreams = () => {
    let filtered = liveStreams

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        stream =>
          stream.title?.toLowerCase().includes(query) ||
          stream.hostUsername?.toLowerCase().includes(query) ||
          stream.categories?.some(cat => cat.toLowerCase().includes(query))
      )
    }

    // Apply category filters
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(stream =>
        selectedCategories.some(cat => stream.categories?.includes(cat))
      )
    }

    // Apply legacy filter tabs (for backward compatibility)
    if (activeFilter && activeFilter !== 'For You') {
      switch (activeFilter) {
        case 'Coral':
          filtered = filtered.filter(stream =>
            stream.categories?.includes('coral')
          )
          break
        case 'Fish':
          filtered = filtered.filter(stream =>
            stream.categories?.includes('fish')
          )
          break
        case 'Both':
          filtered = filtered.filter(
            stream =>
              stream.categories?.includes('coral') &&
              stream.categories?.includes('fish')
          )
          break
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return (
            (b.startedAt?.toMillis?.() || 0) - (a.startedAt?.toMillis?.() || 0)
          )
        case 'oldest':
          return (
            (a.startedAt?.toMillis?.() || 0) - (b.startedAt?.toMillis?.() || 0)
          )
        case 'most-viewed':
          return (b.viewerCount || 0) - (a.viewerCount || 0)
        case 'least-viewed':
          return (a.viewerCount || 0) - (b.viewerCount || 0)
        default:
          return 0
      }
    })

    return filtered
  }

  return (
    <div className='min-h-screen bg-gradient-to-b from-slate-900 via-blue-900 to-slate-800'>
      {/* Animated Background Elements */}
      <div className='absolute inset-0 opacity-10 overflow-hidden pointer-events-none'>
        <div className='absolute top-20 left-10 w-32 h-32 bg-blue-400 rounded-full animate-pulse'></div>
        <div className='absolute top-40 right-20 w-24 h-24 bg-teal-400 rounded-full animate-bounce'></div>
        <div className='absolute bottom-20 left-1/4 w-20 h-20 bg-cyan-400 rounded-full animate-pulse'></div>
        <div className='absolute bottom-40 right-1/3 w-28 h-28 bg-blue-300 rounded-full animate-bounce'></div>
      </div>

      <div className='relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20'>
        <div className='text-center mb-16'>
          <h1 className='text-6xl font-bold text-white mb-6 leading-tight'>
            {activeFilter ? (
              <>
                Explore{' '}
                <span className='text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400'>
                  {activeFilter}
                </span>{' '}
                Streams
              </>
            ) : (
              <>
                Discover{' '}
                <span className='text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400'>
                  Live
                </span>{' '}
                Auctions
              </>
            )}
          </h1>
          <p className='text-2xl text-blue-100 mb-12 max-w-3xl mx-auto leading-relaxed'>
            Join live auctions featuring rare corals, exotic fish, and marine
            treasures from passionate sellers worldwide.
          </p>
        </div>

        {/* Advanced Filters Panel */}
        <div className='mb-8'>
          <div className='flex flex-col gap-4 mb-6'>
            {/* Search Bar - Mobile responsive */}
            <div className='w-full max-w-md mx-auto lg:mx-0'>
              <div className='relative'>
                <input
                  type='text'
                  placeholder='Search streams...'
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className='w-full px-4 py-3 pl-12 bg-slate-800/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent backdrop-blur-sm text-base'
                />
                <div className='absolute left-4 top-1/2 transform -translate-y-1/2'>
                  <svg
                    className='w-4 h-4 text-slate-400'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Filter Controls - Mobile responsive */}
            <div className='flex flex-col sm:flex-row gap-4 items-center justify-center lg:justify-between'>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className='w-full sm:w-auto px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent backdrop-blur-sm text-base min-h-[44px]'
              >
                <option value='newest'>Newest First</option>
                <option value='oldest'>Oldest First</option>
                <option value='most-viewed'>Most Viewed</option>
                <option value='least-viewed'>Least Viewed</option>
              </select>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`w-full sm:w-auto px-6 py-3 rounded-xl border transition-all duration-300 font-medium min-h-[44px] flex items-center justify-center ${
                  showFilters
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-cyan-400 shadow-lg shadow-cyan-500/25'
                    : 'bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:border-cyan-400/50 hover:text-cyan-300 backdrop-blur-sm'
                }`}
              >
                <svg
                  className='w-4 h-4 mr-2 flex-shrink-0'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z'
                  />
                </svg>
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className='bg-slate-800/30 backdrop-blur-sm rounded-2xl p-6 border border-slate-600/50 mb-6'>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
                {/* Categories */}
                <div>
                  <h3 className='text-sm font-semibold text-slate-300 mb-3'>
                    Categories
                  </h3>
                  <div className='space-y-2'>
                    {['coral', 'fish', 'equipment', 'plants'].map(category => (
                      <label key={category} className='flex items-center'>
                        <input
                          type='checkbox'
                          checked={selectedCategories.includes(category)}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedCategories([
                                ...selectedCategories,
                                category,
                              ])
                            } else {
                              setSelectedCategories(
                                selectedCategories.filter(c => c !== category)
                              )
                            }
                          }}
                          className='mr-2 rounded border-slate-600 text-cyan-500 focus:ring-cyan-400 focus:ring-2'
                        />
                        <span className='text-slate-300 capitalize'>
                          {category}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <h3 className='text-sm font-semibold text-slate-300 mb-3'>
                    Price Range
                  </h3>
                  <div className='space-y-3'>
                    <div className='flex items-center space-x-2'>
                      <span className='text-slate-400 text-sm'>$</span>
                      <input
                        type='number'
                        value={priceRange[0]}
                        onChange={e =>
                          setPriceRange([Number(e.target.value), priceRange[1]])
                        }
                        className='flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400'
                        placeholder='Min'
                        min='0'
                        max='10000'
                      />
                    </div>
                    <div className='flex items-center space-x-2'>
                      <span className='text-slate-400 text-sm'>$</span>
                      <input
                        type='number'
                        value={priceRange[1]}
                        onChange={e =>
                          setPriceRange([priceRange[0], Number(e.target.value)])
                        }
                        className='flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400'
                        placeholder='Max'
                        min='0'
                        max='10000'
                      />
                    </div>
                    <div className='text-xs text-slate-500 mt-2'>
                      Current range: ${priceRange[0]} - ${priceRange[1]}
                    </div>
                  </div>
                </div>

                {/* Quick Filters */}
                <div>
                  <h3 className='text-sm font-semibold text-slate-300 mb-3'>
                    Quick Filters
                  </h3>
                  <div className='space-y-2'>
                    {['For You', 'Followed', 'Coral', 'Fish', 'Both'].map(
                      filter => (
                        <button
                          key={filter}
                          onClick={() => handleFilterClick(filter)}
                          className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-300 text-sm ${
                            activeFilter === filter
                              ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25'
                              : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-cyan-300'
                          }`}
                        >
                          {filter}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Clear Filters */}
                <div>
                  <h3 className='text-sm font-semibold text-slate-300 mb-3'>
                    Actions
                  </h3>
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setSelectedCategories([])
                      setPriceRange([0, 1000])
                      setActiveFilter('For You')
                      setSortBy('newest')
                    }}
                    className='w-full px-4 py-2 bg-red-600/20 border border-red-500/50 text-red-300 rounded-lg hover:bg-red-600/30 transition-colors duration-300 text-sm font-medium'
                  >
                    Clear All Filters
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Live Streams */}
        <div className='mb-12'>
          <div className='flex justify-between items-center mb-6'>
            <h2 className='text-2xl font-bold text-slate-100'>
              {activeFilter ? `${activeFilter} Streams` : 'Live Now'}
            </h2>
            <span className='text-slate-400 text-sm'>
              {getFilteredStreams().length} live streams
            </span>
          </div>

          {loading ? (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
              {Array.from({ length: 6 }).map((_, index) => (
                <StreamCardSkeleton key={index} />
              ))}
            </div>
          ) : getFilteredStreams().length > 0 ? (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
              {getFilteredStreams().map(stream => (
                <LiveCard key={stream.id} stream={stream} />
              ))}
            </div>
          ) : (
            <div className='text-center py-12'>
              <div className='w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4'>
                <svg
                  className='w-8 h-8 text-slate-400'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'
                  />
                </svg>
              </div>
              <h3 className='text-xl font-semibold text-slate-100 mb-2'>
                No Live Streams
              </h3>
              <p className='text-slate-400 mb-6'>
                {activeFilter
                  ? `No ${activeFilter.toLowerCase()} streams are currently live.`
                  : 'No streams are currently live.'}
              </p>
              <Link to='/go-live' className='btn-primary'>
                Start Your Stream
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Explore
