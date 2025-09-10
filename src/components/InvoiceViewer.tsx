import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'

import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import { invoiceService, InvoiceData } from '../services/invoiceService'

interface InvoiceViewerProps {
  userType: 'buyer' | 'seller'
  className?: string
}

export default function InvoiceViewer({
  userType,
  className = '',
}: InvoiceViewerProps) {
  const [invoices, setInvoices] = useState<InvoiceData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(
    null
  )
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [trackingNumber, setTrackingNumber] = useState('')
  const [updatingTracking, setUpdatingTracking] = useState(false)
  const { currentUser } = useAuth()

  useEffect(() => {
    if (!currentUser) return

    const invoicesQuery = query(
      collection(db, 'invoices'),
      where(
        userType === 'buyer' ? 'buyerId' : 'sellerId',
        '==',
        currentUser.uid
      )
    )

    const unsubscribe = onSnapshot(invoicesQuery, snapshot => {
      const invoiceList: InvoiceData[] = []
      snapshot.forEach(doc => {
        const data = doc.data()
        invoiceList.push({
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          paymentDetails: {
            ...data.paymentDetails,
            paidAt: data.paymentDetails?.paidAt?.toDate() || new Date(),
          },
        } as InvoiceData)
      })
      setInvoices(
        invoiceList.sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        )
      )
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [currentUser, userType])

  const viewInvoice = (invoice: InvoiceData) => {
    setSelectedInvoice(invoice)
    setShowInvoiceModal(true)
  }

  const updateTracking = async () => {
    if (!selectedInvoice || !trackingNumber.trim()) return

    setUpdatingTracking(true)
    try {
      await invoiceService.updateTrackingNumber(
        selectedInvoice.invoiceId,
        trackingNumber.trim()
      )
      setTrackingNumber('')
      alert('Tracking number updated successfully!')
    } catch (error) {
      console.error('Error updating tracking number:', error)
      alert('Failed to update tracking number. Please try again.')
    } finally {
      setUpdatingTracking(false)
    }
  }

  const downloadInvoice = () => {
    if (!selectedInvoice) return

    // Create a blob with the HTML content and download it
    const blob = new Blob([selectedInvoice.htmlContent || ''], {
      type: 'text/html',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `invoice-${selectedInvoice.invoiceId}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!currentUser) {
    return (
      <div className={`bg-slate-800 rounded-lg p-4 ${className}`}>
        <p className='text-slate-400 text-center'>
          Please log in to view invoices
        </p>
      </div>
    )
  }

  return (
    <div className={`bg-slate-800 rounded-lg flex flex-col ${className}`}>
      {/* Header */}
      <div className='p-4 border-b border-slate-700'>
        <h3 className='text-white font-semibold text-lg'>
          {userType === 'buyer' ? 'My Invoices' : 'Sales Invoices'}
        </h3>
        <p className='text-slate-400 text-sm'>
          {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Content */}
      <div className='flex-1 overflow-y-auto p-4'>
        {isLoading ? (
          <div className='text-center text-slate-400'>Loading invoices...</div>
        ) : invoices.length === 0 ? (
          <div className='text-center text-slate-400'>
            <p className='text-lg mb-2'>No invoices yet</p>
            <p className='text-sm'>
              {userType === 'buyer'
                ? 'Invoices will appear here after you make purchases'
                : 'Invoices will appear here after your items are sold'}
            </p>
          </div>
        ) : (
          <div className='space-y-3'>
            {invoices.map(invoice => (
              <div
                key={invoice.invoiceId}
                className='bg-slate-700 rounded-lg p-4'
              >
                <div className='flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3'>
                  <div className='flex-1'>
                    <div className='flex items-center gap-2 mb-2'>
                      <h4 className='text-white font-semibold'>
                        {invoice.itemTitle}
                      </h4>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          invoice.type === 'buyer'
                            ? 'bg-blue-600 text-white'
                            : 'bg-green-600 text-white'
                        }`}
                      >
                        {invoice.type === 'buyer' ? 'Purchase' : 'Sale'}
                      </span>
                    </div>
                    <p className='text-slate-300 text-sm mb-2'>
                      {invoice.itemDescription}
                    </p>
                    <div className='text-sm text-slate-400 space-y-1'>
                      <p>Invoice ID: {invoice.invoiceId}</p>
                      <p>Date: {invoice.createdAt.toLocaleDateString()}</p>
                      <p>Total: ${invoice.totalPrice.toFixed(2)}</p>
                      {invoice.trackingNumber && (
                        <p className='text-green-400'>
                          Tracking: {invoice.trackingNumber}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className='flex flex-col gap-2 min-w-[120px]'>
                    <button
                      onClick={() => viewInvoice(invoice)}
                      className='bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors'
                    >
                      View Invoice
                    </button>
                    {userType === 'seller' && !invoice.trackingNumber && (
                      <button
                        onClick={() => viewInvoice(invoice)}
                        className='bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors'
                      >
                        Add Tracking
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invoice Modal */}
      {showInvoiceModal && selectedInvoice && (
        <div className='fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4'>
          <div className='bg-slate-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden'>
            {/* Modal Header */}
            <div className='p-4 border-b border-slate-700 flex justify-between items-center'>
              <h3 className='text-white font-semibold text-lg'>
                Invoice {selectedInvoice.invoiceId}
              </h3>
              <div className='flex gap-2'>
                <button
                  onClick={downloadInvoice}
                  className='bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors'
                >
                  Download
                </button>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className='bg-slate-600 hover:bg-slate-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors'
                >
                  Close
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className='flex-1 overflow-y-auto p-4'>
              {selectedInvoice.htmlContent ? (
                <div
                  className='bg-white rounded p-4'
                  dangerouslySetInnerHTML={{
                    __html: selectedInvoice.htmlContent,
                  }}
                />
              ) : (
                <div className='text-center text-slate-400'>
                  Invoice content not available
                </div>
              )}

              {/* Tracking Number Section (for sellers) */}
              {userType === 'seller' && (
                <div className='mt-6 bg-slate-700 rounded-lg p-4'>
                  <h4 className='text-white font-semibold mb-3'>
                    Shipping Information
                  </h4>
                  {selectedInvoice.trackingNumber ? (
                    <div className='text-green-400'>
                      <p className='font-medium'>
                        Tracking Number: {selectedInvoice.trackingNumber}
                      </p>
                      <p className='text-sm text-green-300 mt-1'>
                        Tracking information has been provided to the buyer.
                      </p>
                    </div>
                  ) : (
                    <div className='space-y-3'>
                      <p className='text-slate-300 text-sm'>
                        Add a tracking number to notify the buyer when their
                        item ships.
                      </p>
                      <div className='flex gap-2'>
                        <input
                          type='text'
                          value={trackingNumber}
                          onChange={e => setTrackingNumber(e.target.value)}
                          placeholder='Enter tracking number...'
                          className='flex-1 bg-slate-600 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500'
                        />
                        <button
                          onClick={updateTracking}
                          disabled={!trackingNumber.trim() || updatingTracking}
                          className='bg-orange-600 hover:bg-orange-700 disabled:bg-slate-600 text-white px-4 py-2 rounded font-medium transition-colors disabled:cursor-not-allowed'
                        >
                          {updatingTracking ? 'Updating...' : 'Add Tracking'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
