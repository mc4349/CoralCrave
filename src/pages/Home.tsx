import { Link } from 'react-router-dom'

const Home = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to <span className="text-coral-500">CoralCrave</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          The only marketplace where you can truly buy your dream while seeing it in real time!
        </p>
        <div className="flex justify-center space-x-4">
          <Link to="/explore" className="btn-primary">
            Explore Live Streams
          </Link>
          <Link to="/go-live" className="btn-secondary">
            Start Selling Live
          </Link>
        </div>
      </div>

      {/* Live Streams Grid */}
      <div className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Live Now</h2>
          <Link to="/explore" className="text-coral-500 hover:text-coral-600 font-medium">
            View All
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Placeholder Live Stream Cards */}
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Link 
              key={i} 
              to={`/live/stream-${i}`}
              className="card hover:shadow-md transition-shadow cursor-pointer block"
            >
              <div className="aspect-video bg-gray-200 rounded-lg mb-4 relative">
                <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-sm font-medium">
                  LIVE
                </div>
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                  {Math.floor(Math.random() * 500) + 50} viewers
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Amazing Coral Collection #{i}
              </h3>
              <p className="text-gray-600 text-sm mb-2">
                by @seller{i}
              </p>
              <div className="flex justify-between items-center">
                <span className="text-coral-500 font-medium">
                  Current bid: ${(Math.random() * 100 + 20).toFixed(2)}
                </span>
                <span className="text-sm text-gray-500">
                  {Math.floor(Math.random() * 60)}s left
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Browse Categories</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card text-center hover:shadow-md transition-shadow cursor-pointer">
            <div className="w-16 h-16 bg-coral-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">🪸</span>
            </div>
            <h3 className="font-semibold text-gray-900">Coral</h3>
          </div>
          <div className="card text-center hover:shadow-md transition-shadow cursor-pointer">
            <div className="w-16 h-16 bg-ocean-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">🐠</span>
            </div>
            <h3 className="font-semibold text-gray-900">Fish</h3>
          </div>
          <div className="card text-center hover:shadow-md transition-shadow cursor-pointer">
            <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">🌿</span>
            </div>
            <h3 className="font-semibold text-gray-900">Plants</h3>
          </div>
          <div className="card text-center hover:shadow-md transition-shadow cursor-pointer">
            <div className="w-16 h-16 bg-purple-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">🔧</span>
            </div>
            <h3 className="font-semibold text-gray-900">Equipment</h3>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
