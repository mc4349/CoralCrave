import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, limit, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'

interface LiveStream {
  id: string
  title: string
  hostId: string
  hostUsername: string
  viewerCount: number
  status: 'live' | 'offline' | 'ended'
  categories: string[]
  startedAt: any
}

const Explore = () => {
  const [activeFilter, setActiveFilter] = useState<string | null>('For You')
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLiveStreams = async () => {
      try {
        console.log('🔍 Explore: Fetching live streams from Firestore only...')
        
        // Direct Firestore query - no offline fallback
        const liveQuery = query(
          collection(db, 'livestreams'),
          where('status', '==', 'live'),
          limit(20)
        )
        
        const snapshot = await getDocs(liveQuery)
        const streams = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as LiveStream[]
        
        console.log('✅ Explore: Found', streams.length, 'live streams in Firestore')
        setLiveStreams(streams)
      } catch (error) {
        console.error('❌ Explore: Error fetching live streams from Firestore:', error)
        console.error('❌ This means no streams will be visible to viewers!')
        setLiveStreams([]) // Clear streams on error - don't show offline streams
      } finally {
        setLoading(false)
      }
    }

    fetchLiveStreams()
  }, [])

  const handleFilterClick = (filter: string) => {
    if (activeFilter === filter) {
      setActiveFilter(null)
    } else {
      setActiveFilter(filter)
    }
  }

  const getFilteredStreams = () => {
    if (!activeFilter || activeFilter === 'For You') {
      return liveStreams
    }
    
    return liveStreams.filter(stream => {
      switch (activeFilter) {
        case 'Coral':
          return stream.categories?.includes('coral')
        case 'Fish':
          return stream.categories?.includes('fish')
        case 'Both':
          return stream.categories?.includes('coral') && stream.categories?.includes('fish')
        default:
          return true
      }
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
            {activeFilter ? (
              <>Explore <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">{activeFilter}</span> Streams</>
            ) : (
              <>Discover <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Live</span> Auctions</>
            )}
          </h1>
          <p className="text-2xl text-blue-100 mb-12 max-w-3xl mx-auto leading-relaxed">
            Join live auctions featuring rare corals, exotic fish, and marine treasures from passionate sellers worldwide.
          </p>
        </div>
        
        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-4 mb-8 justify-center">
          {['For You', 'Followed', 'Coral', 'Fish', 'Both'].map((filter) => (
            <button
              key={filter}
              onClick={() => handleFilterClick(filter)}
              className={`px-6 py-3 rounded-lg border transition-all duration-300 font-medium ${
                activeFilter === filter
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-cyan-400 shadow-lg shadow-cyan-500/25 transform scale-105'
                  : 'bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:border-cyan-400/50 hover:text-cyan-300 backdrop-blur-sm'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Live Streams */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-100">
              {activeFilter ? `${activeFilter} Streams` : 'Live Now'}
            </h2>
            <span className="text-slate-400 text-sm">
              {getFilteredStreams().length} live streams
            </span>
          </div>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              <p className="text-slate-400 mt-4">Loading live streams...</p>
            </div>
          ) : getFilteredStreams().length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getFilteredStreams().map((stream) => (
                <Link 
                  key={stream.id} 
                  to={`/live/${stream.id}`}
                  className="bg-slate-700/50 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/20 hover:border-cyan-400/40 transition-all duration-300 hover:transform hover:scale-105 group block"
                >
                  <div className="aspect-video bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg mb-4 relative overflow-hidden">
                    {/* Animated water effect */}
                    <div className="absolute inset-0 bg-gradient-to-t from-blue-900/20 to-transparent"></div>
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent animate-pulse"></div>
                    
                    <div className="absolute top-3 left-3 bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                      LIVE
                    </div>
                    <div className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-sm text-slate-100 px-3 py-1 rounded-full text-sm border border-slate-700">
                      {stream.viewerCount || 0} viewers
                    </div>
                    
                    {/* Floating bubbles effect */}
                    <div className="absolute bottom-4 left-4 w-2 h-2 bg-cyan-400/40 rounded-full animate-bounce"></div>
                    <div className="absolute bottom-8 left-8 w-1 h-1 bg-blue-400/60 rounded-full animate-pulse"></div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-slate-100 mb-2 group-hover:text-cyan-300 transition-colors duration-300">
                      {stream.title}
                    </h3>
                    <p className="text-slate-400 text-sm mb-3">by @{stream.hostUsername || stream.hostId}</p>
                    <div className="flex justify-between items-center">
                      <div className="flex space-x-1">
                        {stream.categories?.map((category) => (
                          <span key={category} className="text-xs px-2 py-1 bg-slate-800/50 text-slate-300 rounded-full border border-slate-600">
                            {category}
                          </span>
                        ))}
                      </div>
                      <span className="text-sm text-slate-500 bg-slate-800/50 px-2 py-1 rounded-full">
                        Live
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-100 mb-2">No Live Streams</h3>
              <p className="text-slate-400 mb-6">
                {activeFilter ? `No ${activeFilter.toLowerCase()} streams are currently live.` : 'No streams are currently live.'}
              </p>
              <Link to="/go-live" className="btn-primary">
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
