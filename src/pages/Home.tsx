import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'

const oceanFacts = [
  "🌊 The ocean covers more than 70% of Earth's surface and contains 99% of the planet's living space.",
  "🪸 Coral reefs support 25% of all marine species despite covering less than 1% of the ocean floor.",
  "🐠 There are over 65,000 known species of fish, with new species discovered regularly.",
  "🌊 The ocean produces over 50% of the world's oxygen and absorbs 25% of all CO2 emissions.",
  "🪸 A single coral polyp can live for thousands of years, creating massive reef structures.",
  "🐠 Some fish can change their gender based on environmental conditions and social needs.",
  "🌊 The deepest part of the ocean, the Mariana Trench, is deeper than Mount Everest is tall.",
  "🪸 Coral reefs are often called the 'rainforests of the sea' due to their incredible biodiversity.",
  "🐠 Many fish species exhibit complex social behaviors and can recognize individual faces.",
  "🌊 Ocean currents act like a global conveyor belt, distributing heat around the planet."
]

interface LiveStream {
  id: string
  hostId: string
  hostUsername: string
  title: string
  status: 'offline' | 'live' | 'ended'
  viewerCount: number
  startedAt?: Date
  categories: string[]
  agora: {
    channel: string
    broadcasterUid: string
  }
}

const Home = () => {
  const [currentFactIndex, setCurrentFactIndex] = useState(0)
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([])
  const [loadingStreams, setLoadingStreams] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFactIndex((prev) => (prev + 1) % oceanFacts.length)
    }, 5000) // Change fact every 5 seconds

    return () => clearInterval(interval)
  }, [])

  // Listen for live streams - ONLY from Firestore (no offline fallback)
  useEffect(() => {
    console.log('🔍 Home: Fetching live streams from Firestore only...')
    
    const q = query(
      collection(db, 'livestreams'),
      where('status', '==', 'live')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const streams: LiveStream[] = []
      snapshot.forEach((doc) => {
        streams.push({ id: doc.id, ...doc.data() } as LiveStream)
      })
      console.log('✅ Home: Found', streams.length, 'live streams in Firestore')
      setLiveStreams(streams)
      setLoadingStreams(false)
    }, (error) => {
      console.error('❌ Home: Error fetching live streams from Firestore:', error)
      console.error('❌ This means no streams will be visible to viewers!')
      setLiveStreams([]) // Clear streams on error - don't show offline streams
      setLoadingStreams(false)
    })

    return () => unsubscribe()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-900 to-slate-800">
      {/* Hero Section with Ocean Theme */}
      <div className="relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-32 h-32 bg-blue-400 rounded-full animate-pulse"></div>
          <div className="absolute top-40 right-20 w-24 h-24 bg-teal-400 rounded-full animate-bounce"></div>
          <div className="absolute bottom-20 left-1/4 w-20 h-20 bg-cyan-400 rounded-full animate-pulse"></div>
          <div className="absolute bottom-40 right-1/3 w-28 h-28 bg-blue-300 rounded-full animate-bounce"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          {/* Main Hero Content */}
          <div className="text-center py-16">
            <div className="mb-8">
              <h1 className="text-6xl font-bold text-white mb-6 leading-tight">
                Dive into <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">CoralCrave</span>
              </h1>
              <p className="text-2xl text-blue-100 mb-8 max-w-3xl mx-auto leading-relaxed">
                Where the ocean's treasures come alive through live auctions. 
                Discover rare corals, exotic fish, and marine wonders in real-time.
              </p>
            </div>

            {/* Ocean Fact Rotation */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 mb-12 max-w-4xl mx-auto border border-blue-500/20">
              <h3 className="text-lg font-semibold text-cyan-300 mb-4">🌊 Ocean Fact of the Moment</h3>
              <p className="text-xl text-blue-100 leading-relaxed transition-all duration-500 ease-in-out">
                {oceanFacts[currentFactIndex]}
              </p>
              <div className="flex justify-center mt-4 space-x-2">
                {oceanFacts.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      index === currentFactIndex ? 'bg-cyan-400' : 'bg-slate-600'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Call to Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <Link 
                to="/explore" 
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-cyan-500/25"
              >
                🔍 Explore Marine Auctions
              </Link>
              <Link 
                to="/go-live" 
                className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-teal-500/25"
              >
                🎥 Start Live Selling
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Live Now Section */}
      <div className="relative py-20 bg-slate-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              🔴 Live Now
            </h2>
            <p className="text-xl text-blue-200">
              Join active auctions happening right now
            </p>
          </div>

          {loadingStreams ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
              <span className="ml-4 text-blue-200">Loading live streams...</span>
            </div>
          ) : liveStreams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {liveStreams.slice(0, 6).map((stream) => (
                <Link
                  key={stream.id}
                  to={`/live/${stream.id}`}
                  className="group bg-slate-700/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-blue-500/20 hover:border-cyan-400/40 transition-all duration-300 hover:transform hover:scale-105"
                >
                  {/* Stream Preview Placeholder */}
                  <div className="relative h-48 bg-gradient-to-br from-blue-600/30 to-cyan-600/30 flex items-center justify-center">
                    <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center">
                      <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                      LIVE
                    </div>
                    <div className="absolute top-4 right-4 bg-black/50 text-white px-2 py-1 rounded text-sm">
                      👥 {stream.viewerCount}
                    </div>
                    <div className="text-6xl opacity-50">🎥</div>
                  </div>
                  
                  {/* Stream Info */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                      {stream.title}
                    </h3>
                    <p className="text-blue-200 mb-3">
                      by {stream.hostUsername}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {stream.categories.map((category) => (
                        <span
                          key={category}
                          className="px-3 py-1 bg-blue-500/20 text-blue-200 rounded-full text-sm capitalize"
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4 opacity-50">🌊</div>
              <h3 className="text-2xl font-bold text-white mb-4">No Live Streams Right Now</h3>
              <p className="text-blue-200 mb-8 max-w-2xl mx-auto">
                Be the first to go live! Start streaming your marine treasures and connect with buyers in real-time.
              </p>
              <Link 
                to="/go-live" 
                className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-teal-500/25 inline-block"
              >
                🎥 Start Your First Stream
              </Link>
            </div>
          )}

          {liveStreams.length > 6 && (
            <div className="text-center mt-12">
              <Link 
                to="/explore" 
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-cyan-500/25 inline-block"
              >
                View All Live Streams ({liveStreams.length})
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="relative py-20 bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">Why Choose CoralCrave?</h2>
            <p className="text-xl text-blue-200 max-w-3xl mx-auto">
              Experience the future of marine commerce with live, interactive auctions
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-700/50 backdrop-blur-sm rounded-2xl p-8 border border-blue-500/20 hover:border-cyan-400/40 transition-all duration-300 hover:transform hover:scale-105">
              <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full mx-auto mb-6 flex items-center justify-center">
                <span className="text-3xl">🎥</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 text-center">Live Streaming</h3>
              <p className="text-blue-200 text-center leading-relaxed">
                See every detail in real-time. Watch corals sway, fish swim, and equipment in action before you bid.
              </p>
            </div>

            <div className="bg-slate-700/50 backdrop-blur-sm rounded-2xl p-8 border border-blue-500/20 hover:border-cyan-400/40 transition-all duration-300 hover:transform hover:scale-105">
              <div className="w-16 h-16 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full mx-auto mb-6 flex items-center justify-center">
                <span className="text-3xl">⚡</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 text-center">Real-Time Bidding</h3>
              <p className="text-blue-200 text-center leading-relaxed">
                Fast-paced auctions with instant updates. Experience the thrill of live bidding from anywhere.
              </p>
            </div>

            <div className="bg-slate-700/50 backdrop-blur-sm rounded-2xl p-8 border border-blue-500/20 hover:border-cyan-400/40 transition-all duration-300 hover:transform hover:scale-105">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto mb-6 flex items-center justify-center">
                <span className="text-3xl">🛡️</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 text-center">Trusted Community</h3>
              <p className="text-blue-200 text-center leading-relaxed">
                Verified sellers, secure payments, and a community of passionate marine enthusiasts.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Section */}
      <div className="relative py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">Discover Marine Categories</h2>
            <p className="text-xl text-blue-200 max-w-3xl mx-auto">
              From vibrant corals to exotic fish, find exactly what you're looking for
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Link to="/explore?category=coral" className="group">
              <div className="bg-gradient-to-br from-pink-500/20 to-orange-500/20 backdrop-blur-sm rounded-2xl p-8 border border-pink-500/30 hover:border-pink-400/60 transition-all duration-300 hover:transform hover:scale-105 text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-pink-500 to-orange-500 rounded-full mx-auto mb-6 flex items-center justify-center group-hover:animate-pulse">
                  <span className="text-4xl">🪸</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Coral</h3>
                <p className="text-pink-200 text-sm">Living reef builders</p>
              </div>
            </Link>

            <Link to="/explore?category=fish" className="group">
              <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-sm rounded-2xl p-8 border border-blue-500/30 hover:border-blue-400/60 transition-all duration-300 hover:transform hover:scale-105 text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full mx-auto mb-6 flex items-center justify-center group-hover:animate-pulse">
                  <span className="text-4xl">🐠</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Fish</h3>
                <p className="text-blue-200 text-sm">Exotic marine life</p>
              </div>
            </Link>

            <Link to="/explore?category=plants" className="group">
              <div className="bg-gradient-to-br from-green-500/20 to-teal-500/20 backdrop-blur-sm rounded-2xl p-8 border border-green-500/30 hover:border-green-400/60 transition-all duration-300 hover:transform hover:scale-105 text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-teal-500 rounded-full mx-auto mb-6 flex items-center justify-center group-hover:animate-pulse">
                  <span className="text-4xl">🌱</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Plants</h3>
                <p className="text-green-200 text-sm">Aquatic vegetation</p>
              </div>
            </Link>

            <Link to="/explore?category=equipment" className="group">
              <div className="bg-gradient-to-br from-purple-500/20 to-indigo-500/20 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/30 hover:border-purple-400/60 transition-all duration-300 hover:transform hover:scale-105 text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full mx-auto mb-6 flex items-center justify-center group-hover:animate-pulse">
                  <span className="text-4xl">⚙️</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Equipment</h3>
                <p className="text-purple-200 text-sm">Tank essentials</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom CTA Section */}
      <div className="relative py-20 bg-gradient-to-r from-slate-800 to-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to Dive In?</h2>
          <p className="text-xl text-blue-200 mb-8 leading-relaxed">
            Join thousands of marine enthusiasts buying and selling the ocean's most beautiful treasures
          </p>
          <Link 
            to="/auth/signup" 
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-10 py-4 rounded-xl font-semibold text-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-cyan-500/25 inline-block"
          >
            🌊 Join CoralCrave Today
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Home
