import { PayPalButtons } from '@paypal/react-paypal-js'

import { paypalService } from '../services/paypalService'

export interface PayPalButtonProps {
  amount: number
  itemName: string
  auctionId: string
  sellerId: string
  buyerId: string
  onSuccess: (details: any) => void
  onError: (error: any) => void
  disabled?: boolean
}

export default function PayPalButton({
  amount,
  itemName,
  auctionId,
  sellerId,
  buyerId,
  onSuccess,
  onError,
  disabled = false,
}: PayPalButtonProps) {
  const createOrder = async () => {
    try {
      const order = await paypalService.createOrder(
        amount,
        'USD',
        itemName,
        auctionId,
        sellerId,
        buyerId
      )
      return order.id
    } catch (error) {
      console.error('Error creating PayPal order:', error)
      onError(error)
      throw error
    }
  }

  const onApprove = async (data: any) => {
    try {
      const order = await paypalService.capturePayment(data.orderID)
      onSuccess({
        orderID: data.orderID,
        payerID: data.payerID,
        order,
      })
    } catch (error) {
      console.error('Error capturing PayPal payment:', error)
      onError(error)
    }
  }

  if (!paypalService.isConfigured()) {
    return (
      <div className='text-center p-4 bg-yellow-50 border border-yellow-200 rounded'>
        <p className='text-yellow-800 text-sm'>
          PayPal payment is not configured. Please contact support.
        </p>
      </div>
    )
  }

  return (
    <PayPalButtons
      createOrder={createOrder}
      onApprove={onApprove}
      onError={onError}
      disabled={disabled}
      style={{
        layout: 'vertical',
        color: 'blue',
        shape: 'rect',
        label: 'paypal',
      }}
    />
  )
}
