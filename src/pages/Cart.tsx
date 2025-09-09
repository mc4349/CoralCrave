import React, { useState, useEffect } from 'react'
import { db } from '../lib/firebase'
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { useAuth } from '../contexts/AuthContext'
import { PayPalScriptProvider } from '@paypal/react-paypal-js'
import PayPalButton from '../components/PayPalButton'
import ShippingAddressForm, { ShippingAddress } from '../components/ShippingAddressForm'
import { invoiceService } from '../services/invoiceService'

interface CartItem {
  id: string
  auctionId: string
  itemTitle: string
  itemDescription: string
  finalPrice: number
  shippingPrice?: number
  sellerId: string
  purchasedAt: Date
  status: 'pending_payment' | 'paid' | 'cancelled'
  shippingAddress?: ShippingAddress
  addressProvided?: boolean
}

export default function Cart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const { currentUser } = useAuth()

  useEffect(() => {
    if (!currentUser) return

    const cartQuery = query(
      collection(db, 'users', currentUser.uid, 'cart'),
      where('status', '==', 'pending_payment')
    )

    const unsubscribe = onSnapshot(cartQuery, (snapshot) => {
      const items: CartItem[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        items.push({
          id: doc.id,
          ...data,
          purchasedAt: data.purchasedAt?.toDate() || new Date(),
        } as CartItem)
      })
      setCartItems(items)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [currentUser])

  const handlePaymentSuccess = async (details: any, itemId: string) => {
    try {
      const cartItem = cartItems.find(item => item.id === itemId)
      if (!cartItem || !cartItem.shippingAddress) {
        throw new Error('Cart item or shipping address not found')
      }

      const paymentDetails = {
        paypalOrderId: details.orderID,
        paypalPayerId: details.payerID,
        paidAt: new Date(),
      }

      // Update cart item status to paid
      await updateDoc(doc(db, 'users', currentUser!.uid, 'cart', itemId), {
        status: 'paid',
        paymentDetails,
      })

      // Generate buyer invoice
      const buyerInvoiceData = {
        invoiceId: `INV-B-${Date.now()}`,
        type: 'buyer' as const,
        auctionId: cartItem.auctionId,
        itemTitle: cartItem.itemTitle,
        itemDescription: cartItem.itemDescription,
        finalPrice: cartItem.finalPrice,
        shippingPrice: cartItem.shippingPrice || 0,
        totalPrice: cartItem.finalPrice + (cartItem.shippingPrice || 0),
        sellerId: cartItem.sellerId,
        sellerUsername: 'Seller', // We'll need to get this from user profile
        buyerId: currentUser!.uid,
        buyerUsername: 'Buyer', // We'll need to get this from user profile
        shippingAddress: cartItem.shippingAddress,
        paymentDetails,
        createdAt: new Date(),
      }

      // Generate seller invoice
      const sellerInvoiceData = {
        invoiceId: `INV-S-${Date.now()}`,
        type: 'seller' as const,
        auctionId: cartItem.auctionId,
        itemTitle: cartItem.itemTitle,
        itemDescription: cartItem.itemDescription,
        finalPrice: cartItem.finalPrice,
        shippingPrice: cartItem.shippingPrice || 0,
        totalPrice: cartItem.finalPrice + (cartItem.shippingPrice || 0),
        sellerId: cartItem.sellerId,
        sellerUsername: 'Seller',
        buyerId: currentUser!.uid,
        buyerUsername: 'Buyer',
        shippingAddress: cartItem.shippingAddress,
        paymentDetails,
        createdAt: new Date(),
      }

      // Generate and store invoices
      try {
        const buyerInvoiceId = await invoiceService.generateInvoice(buyerInvoiceData)
        const sellerInvoiceId = await invoiceService.generateInvoice(sellerInvoiceData)

        console.log('Invoices generated:', { buyerInvoiceId, sellerInvoiceId })

        // Update cart item with invoice IDs
        await updateDoc(doc(db, 'users', currentUser!.uid, 'cart', itemId), {
          buyerInvoiceId,
          sellerInvoiceId,
        })
      } catch (invoiceError) {
        console.error('Error generating invoices:', invoiceError)
        // Don't fail the payment if invoice generation fails
      }

      console.log('Payment successful:', details)
      alert('Payment successful! Your item will be shipped soon. Invoices have been generated.')
    } catch (error) {
      console.error('Error updating payment status:', error)
      alert('Payment was successful but there was an error updating your order. Please contact support.')
    }
  }

  const handlePaymentError = (error: any) => {
    console.error('Payment error:', error)
    alert('Payment failed. Please try again.')
  }

  const removeFromCart = async (itemId: string) => {
    if (!currentUser) return

    try {
      await deleteDoc(doc(db, 'users', currentUser.uid, 'cart', itemId))
    } catch (error) {
      console.error('Error removing item from cart:', error)
      alert('Failed to remove item from cart.')
    }
  }

  const handleAddressSubmit = async (address: ShippingAddress) => {
    if (!currentUser || !selectedItemId) return

    try {
      await updateDoc(doc(db, 'users', currentUser.uid, 'cart', selectedItemId), {
        shippingAddress: address,
        addressProvided: true,
      })
      setShowAddressForm(false)
      setSelectedItemId(null)
    } catch (error) {
      console.error('Error saving shipping address:', error)
      alert('Failed to save shipping address. Please try again.')
    }
  }

  const handleAddressCancel = () => {
    setShowAddressForm(false)
    setSelectedItemId(null)
  }

  const initiatePayment = (itemId: string) => {
    setSelectedItemId(itemId)
    setShowAddressForm(true)
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-slate-400">Please log in to view your cart</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Your Cart</h1>

        {isLoading ? (
          <div className="text-center text-slate-400">Loading your cart...</div>
        ) : cartItems.length === 0 ? (
          <div className="text-center text-slate-400">
            <p className="text-xl mb-4">Your cart is empty</p>
            <p>Items you win in auctions will appear here for payment</p>
          </div>
        ) : (
          <div className="space-y-6">
            {cartItems.map((item) => {
              const totalPrice = item.finalPrice + (item.shippingPrice || 0)

              return (
                <div key={item.id} className="bg-slate-800 rounded-lg p-6">
                  <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">{item.itemTitle}</h3>
                      <p className="text-slate-300 mb-4">{item.itemDescription}</p>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Item Price:</span>
                          <span>${item.finalPrice.toFixed(2)}</span>
                        </div>
                        {item.shippingPrice && item.shippingPrice > 0 && (
                          <div className="flex justify-between">
                            <span>Shipping:</span>
                            <span>${item.shippingPrice.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-semibold text-lg border-t border-slate-600 pt-2">
                          <span>Total:</span>
                          <span>${totalPrice.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 min-w-[200px]">
                      {item.addressProvided ? (
                        <PayPalScriptProvider
                          options={{
                            clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || 'test',
                            currency: 'USD',
                          }}
                        >
                          <PayPalButton
                            amount={totalPrice}
                            itemName={item.itemTitle}
                            auctionId={item.auctionId}
                            sellerId={item.sellerId}
                            buyerId={currentUser.uid}
                            onSuccess={(details) => handlePaymentSuccess(details, item.id)}
                            onError={handlePaymentError}
                          />
                        </PayPalScriptProvider>
                      ) : (
                        <button
                          onClick={() => initiatePayment(item.id)}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium transition-colors"
                        >
                          Add Shipping Address
                        </button>
                      )}

                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium transition-colors"
                      >
                        Remove from Cart
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Shipping Address Form Modal */}
        {showAddressForm && (
          <ShippingAddressForm
            onSubmit={handleAddressSubmit}
            onCancel={handleAddressCancel}
          />
        )}
      </div>
    </div>
  )
}
