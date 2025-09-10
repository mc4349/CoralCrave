import OpenAI from 'openai'
import { collection, addDoc, doc, updateDoc, getDoc } from 'firebase/firestore'

import { db } from '../lib/firebase'

export interface InvoiceData {
  invoiceId: string
  type: 'seller' | 'buyer'
  auctionId: string
  itemTitle: string
  itemDescription: string
  finalPrice: number
  shippingPrice: number
  totalPrice: number
  sellerId: string
  sellerUsername: string
  buyerId: string
  buyerUsername: string
  shippingAddress: {
    fullName: string
    addressLine1: string
    addressLine2?: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  paymentDetails: {
    paypalOrderId: string
    paypalPayerId: string
    paidAt: Date
  }
  trackingNumber?: string
  createdAt: Date
  htmlContent?: string
}

export class InvoiceService {
  private static instance: InvoiceService
  private openai: OpenAI

  constructor() {
    this.openai = new OpenAI({
      apiKey: import.meta.env.VITE_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true,
    })
  }

  static getInstance(): InvoiceService {
    if (!InvoiceService.instance) {
      InvoiceService.instance = new InvoiceService()
    }
    return InvoiceService.instance
  }

  // Generate professional invoice HTML using OpenAI
  async generateInvoiceHTML(invoiceData: InvoiceData): Promise<string> {
    const isSellerInvoice = invoiceData.type === 'seller'

    const prompt = `
Generate a professional HTML invoice for ${isSellerInvoice ? 'the seller' : 'the buyer'} with the following details:

INVOICE DETAILS:
- Invoice ID: ${invoiceData.invoiceId}
- Date: ${invoiceData.createdAt.toLocaleDateString()}
- ${isSellerInvoice ? 'Seller' : 'Buyer'}: ${isSellerInvoice ? invoiceData.sellerUsername : invoiceData.buyerUsername}
- Item: ${invoiceData.itemTitle}
- Description: ${invoiceData.itemDescription}
- Item Price: $${invoiceData.finalPrice.toFixed(2)}
- Shipping: $${invoiceData.shippingPrice.toFixed(2)}
- Total: $${invoiceData.totalPrice.toFixed(2)}
- Payment Method: PayPal
- Transaction ID: ${invoiceData.paymentDetails.paypalOrderId}

${
  !isSellerInvoice
    ? `
SHIPPING ADDRESS:
${invoiceData.shippingAddress.fullName}
${invoiceData.shippingAddress.addressLine1}
${invoiceData.shippingAddress.addressLine2 ? invoiceData.shippingAddress.addressLine2 + '\n' : ''}${invoiceData.shippingAddress.city}, ${invoiceData.shippingAddress.state} ${invoiceData.shippingAddress.zipCode}
${invoiceData.shippingAddress.country}
`
    : ''
}

${invoiceData.trackingNumber ? `TRACKING NUMBER: ${invoiceData.trackingNumber}` : ''}

Please generate clean, professional HTML with:
- Modern styling with Tailwind CSS classes
- Company branding (use "CoralCrave" as the company name)
- Clear sections for billing, items, and totals
- Professional color scheme (slate/grays with accent colors)
- Responsive design
- Include a QR code placeholder for payment verification
- Professional footer with terms and contact info

Make it look like a real business invoice.
`

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              'You are a professional invoice generator. Generate clean, modern HTML invoices with proper styling.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 2000,
        temperature: 0.7,
      })

      const htmlContent = completion.choices[0]?.message?.content || ''

      // Wrap the generated HTML in a proper document structure
      return this.wrapInvoiceHTML(htmlContent, invoiceData)
    } catch (error) {
      console.error('Error generating invoice HTML:', error)
      // Fallback to a basic HTML template
      return this.generateFallbackInvoiceHTML(invoiceData)
    }
  }

  // Wrap generated HTML in proper document structure
  private wrapInvoiceHTML(content: string, invoiceData: InvoiceData): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${invoiceData.invoiceId}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; }
        .invoice-container { max-width: 800px; margin: 0 auto; padding: 20px; }
        .invoice-header { border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px; }
        .invoice-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .invoice-table th, .invoice-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        .invoice-table th { background-color: #f9fafb; font-weight: 600; }
        .total-row { background-color: #f3f4f6; font-weight: 600; }
        .qr-placeholder { width: 100px; height: 100px; background-color: #e5e7eb; display: flex; align-items: center; justify-content: center; border: 1px dashed #9ca3af; }
    </style>
</head>
<body class="bg-gray-50">
    <div class="invoice-container bg-white shadow-lg rounded-lg">
        ${content}
    </div>
</body>
</html>
`
  }

  // Fallback invoice HTML if OpenAI fails
  private generateFallbackInvoiceHTML(invoiceData: InvoiceData): string {
    const isSellerInvoice = invoiceData.type === 'seller'

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${invoiceData.invoiceId}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; }
    </style>
</head>
<body class="bg-gray-50 p-8">
    <div class="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8">
        <!-- Header -->
        <div class="text-center mb-8">
            <h1 class="text-4xl font-bold text-gray-800 mb-2">CoralCrave</h1>
            <p class="text-gray-600">Premium Live Auction Platform</p>
        </div>

        <!-- Invoice Details -->
        <div class="grid grid-cols-2 gap-8 mb-8">
            <div>
                <h2 class="text-xl font-semibold text-gray-800 mb-4">Invoice Details</h2>
                <p><strong>Invoice ID:</strong> ${invoiceData.invoiceId}</p>
                <p><strong>Date:</strong> ${invoiceData.createdAt.toLocaleDateString()}</p>
                <p><strong>Status:</strong> ${isSellerInvoice ? 'Seller Invoice' : 'Buyer Invoice'}</p>
            </div>
            <div>
                <h2 class="text-xl font-semibold text-gray-800 mb-4">${isSellerInvoice ? 'Seller' : 'Buyer'} Information</h2>
                <p><strong>Name:</strong> ${isSellerInvoice ? invoiceData.sellerUsername : invoiceData.buyerUsername}</p>
                <p><strong>User ID:</strong> ${isSellerInvoice ? invoiceData.sellerId : invoiceData.buyerId}</p>
            </div>
        </div>

        <!-- Item Details -->
        <div class="mb-8">
            <h2 class="text-xl font-semibold text-gray-800 mb-4">Item Details</h2>
            <div class="bg-gray-50 p-4 rounded-lg">
                <h3 class="text-lg font-medium text-gray-800 mb-2">${invoiceData.itemTitle}</h3>
                <p class="text-gray-600 mb-4">${invoiceData.itemDescription}</p>
                <div class="grid grid-cols-3 gap-4 text-sm">
                    <div>
                        <strong>Item Price:</strong><br>
                        $${invoiceData.finalPrice.toFixed(2)}
                    </div>
                    <div>
                        <strong>Shipping:</strong><br>
                        $${invoiceData.shippingPrice.toFixed(2)}
                    </div>
                    <div>
                        <strong>Total:</strong><br>
                        $${invoiceData.totalPrice.toFixed(2)}
                    </div>
                </div>
            </div>
        </div>

        ${
          !isSellerInvoice
            ? `
        <!-- Shipping Address -->
        <div class="mb-8">
            <h2 class="text-xl font-semibold text-gray-800 mb-4">Shipping Address</h2>
            <div class="bg-gray-50 p-4 rounded-lg">
                <p>${invoiceData.shippingAddress.fullName}</p>
                <p>${invoiceData.shippingAddress.addressLine1}</p>
                ${invoiceData.shippingAddress.addressLine2 ? `<p>${invoiceData.shippingAddress.addressLine2}</p>` : ''}
                <p>${invoiceData.shippingAddress.city}, ${invoiceData.shippingAddress.state} ${invoiceData.shippingAddress.zipCode}</p>
                <p>${invoiceData.shippingAddress.country}</p>
            </div>
        </div>
        `
            : ''
        }

        <!-- Payment Details -->
        <div class="mb-8">
            <h2 class="text-xl font-semibold text-gray-800 mb-4">Payment Details</h2>
            <div class="bg-gray-50 p-4 rounded-lg">
                <p><strong>Payment Method:</strong> PayPal</p>
                <p><strong>Transaction ID:</strong> ${invoiceData.paymentDetails.paypalOrderId}</p>
                <p><strong>Payment Date:</strong> ${invoiceData.paymentDetails.paidAt.toLocaleDateString()}</p>
            </div>
        </div>

        ${
          invoiceData.trackingNumber
            ? `
        <!-- Tracking Information -->
        <div class="mb-8">
            <h2 class="text-xl font-semibold text-gray-800 mb-4">Tracking Information</h2>
            <div class="bg-green-50 border border-green-200 p-4 rounded-lg">
                <p><strong>Tracking Number:</strong> ${invoiceData.trackingNumber}</p>
                <p class="text-green-700 mt-2">Your item has been shipped and is on its way!</p>
            </div>
        </div>
        `
            : ''
        }

        <!-- QR Code Placeholder -->
        <div class="text-center mb-8">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">Payment Verification</h3>
            <div class="inline-block p-4 bg-gray-100 rounded-lg">
                <div class="w-24 h-24 bg-gray-300 flex items-center justify-center rounded">
                    <span class="text-gray-600 text-sm">QR Code</span>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="text-center text-gray-600 text-sm border-t pt-8">
            <p><strong>CoralCrave Live Auctions</strong></p>
            <p>Thank you for using our platform!</p>
            <p class="mt-4">For support, contact us at support@coralcrave.com</p>
        </div>
    </div>
</body>
</html>
`
  }

  // Generate and store invoice
  async generateInvoice(invoiceData: InvoiceData): Promise<string> {
    try {
      // Generate HTML content
      const htmlContent = await this.generateInvoiceHTML(invoiceData)

      // Store invoice in Firestore
      const invoiceDoc = {
        ...invoiceData,
        htmlContent,
        createdAt: new Date(),
      }

      const docRef = await addDoc(collection(db, 'invoices'), invoiceDoc)

      console.log('Invoice generated and stored:', docRef.id)
      return docRef.id
    } catch (error) {
      console.error('Error generating invoice:', error)
      throw error
    }
  }

  // Update invoice with tracking number
  async updateTrackingNumber(
    invoiceId: string,
    trackingNumber: string
  ): Promise<void> {
    try {
      const invoiceRef = doc(db, 'invoices', invoiceId)
      await updateDoc(invoiceRef, {
        trackingNumber,
        updatedAt: new Date(),
      })

      // Regenerate HTML content with tracking number
      const invoiceDoc = await getDoc(invoiceRef)
      if (invoiceDoc.exists()) {
        const invoiceData = invoiceDoc.data() as InvoiceData
        invoiceData.trackingNumber = trackingNumber

        const updatedHtml = await this.generateInvoiceHTML(invoiceData)
        await updateDoc(invoiceRef, {
          htmlContent: updatedHtml,
        })
      }

      console.log('Tracking number updated for invoice:', invoiceId)
    } catch (error) {
      console.error('Error updating tracking number:', error)
      throw error
    }
  }

  // Get invoice by ID
  async getInvoice(invoiceId: string): Promise<InvoiceData | null> {
    try {
      const invoiceDoc = await getDoc(doc(db, 'invoices', invoiceId))
      if (invoiceDoc.exists()) {
        return invoiceDoc.data() as InvoiceData
      }
      return null
    } catch (error) {
      console.error('Error getting invoice:', error)
      throw error
    }
  }
}

export const invoiceService = InvoiceService.getInstance()
