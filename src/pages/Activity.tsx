import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { orderService, type Order } from '../services/orderService'

const Activity = () => {
  const { currentUser } = useAuth()
  const [activeTab, setActiveTab] = useState<'purchases' | 'messages'>('purchases')
  const [selectedPurchase, setSelectedPurchase] = useState<string | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser) return

    const loadOrders = async () => {
      try {
        const userOrders = await orderService.getUserOrders(currentUser.uid)
        setOrders(userOrders)
      } catch (error) {
        console.error('Error loading orders:', error)
      } finally {
        setLoading(false)
      }
    }

    loadOrders()
  }, [currentUser])

  const handlePurchaseClick = (purchaseId: number) => {
    const purchaseIdStr = purchaseId.toString()
    setSelectedPurchase(selectedPurchase === purchaseIdStr ? null : purchaseIdStr)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      {/* Floating ocean elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-4 h-4 bg-cyan-400/20 rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-20 w-6 h-6 bg-blue-400/20 rounded-full animate-bounce"></div>
        <div className="absolute bottom-40 left-1/4 w-3 h-3 bg-cyan-300/30 rounded-full animate-pulse"></div>
        <div className="absolute bottom-60 right-1/3 w-5 h-5 bg-blue-300/20 rounded-full animate-bounce"></div>
        <div className="absolute top-1/3 left-1/2 w-2 h-2 bg-cyan-500/30 rounded-full animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-4 h-4 bg-blue-400/20 rounded-full animate-bounce"></div>
      </div>
      
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-slate-100 mb-8">Activity</h1>
        
        <div className="flex space-x-8 mb-8">
          <button 
            onClick={() => setActiveTab('purchases')}
            className={`px-4 py-2 rounded-lg transition-all duration-300 ${
              activeTab === 'purchases' 
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25' 
                : 'text-slate-300 hover:text-cyan-300 hover:bg-slate-700/50'
            }`}
          >
            Purchases
          </button>
          <button 
            onClick={() => setActiveTab('messages')}
            className={`px-4 py-2 rounded-lg transition-all duration-300 ${
              activeTab === 'messages' 
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25' 
                : 'text-slate-300 hover:text-cyan-300 hover:bg-slate-700/50'
            }`}
          >
            Messages
          </button>
        </div>

        {activeTab === 'purchases' && (
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <p className="text-slate-400">Loading your purchases...</p>
              </div>
            ) : orders.length > 0 ? (
              orders.map((order) => (
                <div key={order.id}>
                  <div 
                    className="card cursor-pointer hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300"
                    onClick={() => handlePurchaseClick(parseInt(order.id || '0'))}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-slate-700/50 rounded-lg flex items-center justify-center">
                        <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-100">
                          {order.itemTitle || 'Item'}
                        </h3>
                        <p className="text-slate-300 text-sm">
                          Won for ${order.amount.toFixed(2)} from {order.sellerId}
                        </p>
                        <p className="text-slate-400 text-xs">
                          {order.createdAt?.toDate().toLocaleDateString() || 'Recently'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          order.status === 'captured' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                          order.status === 'requires_capture' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                          'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                        }`}>
                          {order.status === 'captured' ? 'Completed' : 'Processing'}
                        </span>
                        <div className="mt-1">
                          <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Order Details */}
                  {selectedPurchase === order.id && (
                    <div className="mt-4 bg-slate-800/30 backdrop-blur-sm rounded-lg p-6 border border-slate-700/50">
                      <h4 className="text-lg font-semibold text-slate-100 mb-4">Order Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h5 className="font-medium text-slate-100 mb-2">Order Information</h5>
                          <div className="space-y-1 text-sm">
                            <p><span className="text-slate-400">Order ID:</span> <span className="text-slate-200">{order.id}</span></p>
                            <p><span className="text-slate-400">Item:</span> <span className="text-slate-200">{order.itemTitle || 'Item'}</span></p>
                            <p><span className="text-slate-400">Seller:</span> <span className="text-slate-200">{order.sellerId}</span></p>
                            <p><span className="text-slate-400">Date:</span> <span className="text-slate-200">{order.createdAt?.toDate().toLocaleDateString()}</span></p>
                            <p><span className="text-slate-400">Status:</span> <span className="text-slate-200">{order.status}</span></p>
                          </div>
                        </div>
                        <div>
                          <h5 className="font-medium text-slate-100 mb-2">Payment & Shipping</h5>
                          <div className="space-y-1 text-sm">
                            <p><span className="text-slate-400">Amount:</span> <span className="text-slate-200">${order.amount.toFixed(2)}</span></p>
                            <p><span className="text-slate-400">Payment:</span> <span className="text-slate-200">Card ending in ****</span></p>
                            <p><span className="text-slate-400">Shipping to:</span></p>
                            <p className="text-slate-200 ml-4">
                              {order.shippingAddress ? 
                                `${order.shippingAddress.line1}, ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}` : 
                                'Address on file'
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-slate-700/50 flex space-x-4">
                        <button className="btn-secondary text-sm">Contact Seller</button>
                        <button className="btn-secondary text-sm">Leave Review</button>
                        <button className="btn-secondary text-sm">Download Invoice</button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-100 mb-2">No Purchases Yet</h3>
                <p className="text-slate-400 mb-6">
                  You haven't won any auctions yet. Start bidding on live streams to see your purchases here.
                </p>
                <Link to="/explore" className="btn-primary">
                  Explore Live Auctions
                </Link>
              </div>
            )}
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="space-y-4">
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-100 mb-2">No Messages</h3>
              <p className="text-slate-400 mb-6">
                Your conversations with sellers will appear here. Start bidding on auctions to connect with sellers.
              </p>
              <Link to="/explore" className="btn-primary">
                Explore Live Auctions
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Activity
