import { useState, useEffect } from 'react'
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

  const purchases = [
    {
      id: 1,
      item: 'Coral Frag #1',
      price: 45.50,
      date: '2 days ago',
      status: 'Delivered',
      seller: '@coralmaster',
      orderId: 'CC-2024-001',
      shippingAddress: '123 Ocean Ave, Miami, FL 33101',
      paymentMethod: '**** 4242'
    },
    {
      id: 2,
      item: 'Coral Frag #2',
      price: 32.75,
      date: '5 days ago',
      status: 'Shipped',
      seller: '@reefkeeper',
      orderId: 'CC-2024-002',
      shippingAddress: '123 Ocean Ave, Miami, FL 33101',
      paymentMethod: '**** 4242'
    },
    {
      id: 3,
      item: 'Coral Frag #3',
      price: 67.25,
      date: '1 week ago',
      status: 'Processing',
      seller: '@aquarist',
      orderId: 'CC-2024-003',
      shippingAddress: '123 Ocean Ave, Miami, FL 33101',
      paymentMethod: '**** 4242'
    }
  ]

  const messages = [
    {
      id: 1,
      user: '@coralmaster',
      lastMessage: 'Thanks for the purchase! Your coral is on the way.',
      time: '2 hours ago',
      unread: true
    },
    {
      id: 2,
      user: '@reefkeeper',
      lastMessage: 'Do you have any questions about care instructions?',
      time: '1 day ago',
      unread: false
    },
    {
      id: 3,
      user: '@aquarist',
      lastMessage: 'Your order has been processed and will ship tomorrow.',
      time: '3 days ago',
      unread: false
    }
  ]

  const handlePurchaseClick = (purchaseId: number) => {
    const purchaseIdStr = purchaseId.toString()
    setSelectedPurchase(selectedPurchase === purchaseIdStr ? null : purchaseIdStr)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Activity</h1>
      
      <div className="flex space-x-8 mb-8">
        <button 
          onClick={() => setActiveTab('purchases')}
          className={`px-4 py-2 rounded-lg ${
            activeTab === 'purchases' 
              ? 'bg-coral-500 text-white' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Purchases
        </button>
        <button 
          onClick={() => setActiveTab('messages')}
          className={`px-4 py-2 rounded-lg ${
            activeTab === 'messages' 
              ? 'bg-coral-500 text-white' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Messages
        </button>
      </div>

      {activeTab === 'purchases' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading your purchases...</p>
            </div>
          ) : orders.length > 0 ? (
            orders.map((order) => (
              <div key={order.id}>
                <div 
                  className="card cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handlePurchaseClick(parseInt(order.id || '0'))}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {order.itemTitle || 'Item'}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Won for ${order.amount.toFixed(2)} from {order.sellerId}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {order.createdAt?.toDate().toLocaleDateString() || 'Recently'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        order.status === 'captured' ? 'bg-green-100 text-green-800' :
                        order.status === 'requires_capture' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.status === 'captured' ? 'Completed' : 'Processing'}
                      </span>
                      <div className="mt-1">
                        <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Order Details */}
                {selectedPurchase === order.id && (
                  <div className="mt-4 bg-gray-50 rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Order Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Order Information</h5>
                        <div className="space-y-1 text-sm">
                          <p><span className="text-gray-500">Order ID:</span> {order.id}</p>
                          <p><span className="text-gray-500">Item:</span> {order.itemTitle || 'Item'}</p>
                          <p><span className="text-gray-500">Seller:</span> {order.sellerId}</p>
                          <p><span className="text-gray-500">Date:</span> {order.createdAt?.toDate().toLocaleDateString()}</p>
                          <p><span className="text-gray-500">Status:</span> {order.status}</p>
                        </div>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Payment & Shipping</h5>
                        <div className="space-y-1 text-sm">
                          <p><span className="text-gray-500">Amount:</span> ${order.amount.toFixed(2)}</p>
                          <p><span className="text-gray-500">Payment:</span> Card ending in ****</p>
                          <p><span className="text-gray-500">Shipping to:</span></p>
                          <p className="text-gray-700 ml-4">
                            {order.shippingAddress ? 
                              `${order.shippingAddress.line1}, ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}` : 
                              'Address on file'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-200 flex space-x-4">
                      <button className="btn-secondary text-sm">Contact Seller</button>
                      <button className="btn-secondary text-sm">Leave Review</button>
                      <button className="btn-secondary text-sm">Download Invoice</button>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            purchases.map((purchase) => (
            <div key={purchase.id}>
              <div 
                className="card cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handlePurchaseClick(purchase.id)}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {purchase.item}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Won for ${purchase.price.toFixed(2)} from {purchase.seller}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {purchase.date}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      purchase.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                      purchase.status === 'Shipped' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {purchase.status}
                    </span>
                    <div className="mt-1">
                      <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Invoice Details */}
              {selectedPurchase === purchase.id.toString() && (
                <div className="mt-4 bg-gray-50 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Order Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Order Information</h5>
                      <div className="space-y-1 text-sm">
                        <p><span className="text-gray-500">Order ID:</span> {purchase.orderId}</p>
                        <p><span className="text-gray-500">Item:</span> {purchase.item}</p>
                        <p><span className="text-gray-500">Seller:</span> {purchase.seller}</p>
                        <p><span className="text-gray-500">Date:</span> {purchase.date}</p>
                        <p><span className="text-gray-500">Status:</span> {purchase.status}</p>
                      </div>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Payment & Shipping</h5>
                      <div className="space-y-1 text-sm">
                        <p><span className="text-gray-500">Amount:</span> ${purchase.price.toFixed(2)}</p>
                        <p><span className="text-gray-500">Payment:</span> {purchase.paymentMethod}</p>
                        <p><span className="text-gray-500">Shipping to:</span></p>
                        <p className="text-gray-700 ml-4">{purchase.shippingAddress}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200 flex space-x-4">
                    <button className="btn-secondary text-sm">Contact Seller</button>
                    <button className="btn-secondary text-sm">Leave Review</button>
                    <button className="btn-secondary text-sm">Download Invoice</button>
                  </div>
                </div>
              )}
            </div>
          ))
          )}
        </div>
      )}

      {activeTab === 'messages' && (
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="card cursor-pointer hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-coral-100 rounded-full flex items-center justify-center">
                  <span className="text-coral-600 font-medium">
                    {message.user.charAt(1).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-gray-900">{message.user}</h3>
                    {message.unread && (
                      <span className="w-2 h-2 bg-coral-500 rounded-full"></span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm">{message.lastMessage}</p>
                  <p className="text-gray-500 text-xs">{message.time}</p>
                </div>
                <div className="text-right">
                  <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Activity
