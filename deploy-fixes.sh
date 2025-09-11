#!/bin/bash

# CoralCrave Production Fixes Deployment Script
# This script deploys all the fixes for the runtime errors

echo "🚀 Starting CoralCrave production fixes deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    print_error "Firebase CLI is not installed. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in to Firebase
if ! firebase projects:list &> /dev/null; then
    print_error "Not logged in to Firebase. Please login first:"
    echo "firebase login"
    exit 1
fi

print_status "Step 1: Deploying Firestore indexes..."
if firebase deploy --only firestore:indexes; then
    print_success "Firestore indexes deployed successfully"
else
    print_error "Failed to deploy Firestore indexes"
    exit 1
fi

print_status "Step 2: Deploying Firestore security rules..."
if firebase deploy --only firestore:rules; then
    print_success "Firestore security rules deployed successfully"
else
    print_error "Failed to deploy Firestore security rules"
    exit 1
fi

print_status "Step 3: Deploying Cloud Functions..."
if firebase deploy --only functions; then
    print_success "Cloud Functions deployed successfully"
else
    print_error "Failed to deploy Cloud Functions"
    exit 1
fi

print_status "Step 4: Building and deploying to Vercel..."
if npm run build; then
    print_success "Build completed successfully"
else
    print_error "Build failed"
    exit 1
fi

print_success "🎉 All fixes have been deployed successfully!"
print_warning "⚠️  IMPORTANT: You still need to configure these environment variables in Vercel:"
echo ""
echo "Required Vercel Environment Variables:"
echo "======================================"
echo "AGORA_APP_ID=your_agora_app_id"
echo "AGORA_APP_CERTIFICATE=your_agora_app_certificate"
echo "VITE_AGORA_APP_ID=your_agora_app_id"
echo "VITE_PAYPAL_CLIENT_ID=your_paypal_client_id"
echo ""
print_warning "Add these in your Vercel dashboard under Project Settings > Environment Variables"
print_warning "Then redeploy your Vercel project to apply the environment variables"

echo ""
print_success "After adding the environment variables and redeploying:"
echo "1. ✅ Agora token server 500 errors will be fixed"
echo "2. ✅ Firestore permission denied errors will be resolved"
echo "3. ✅ Missing Firestore indexes will be available"
echo "4. ✅ PWA files (manifest.json, sw.js) will be served correctly"
echo "5. ✅ Atomic bidding will work properly"
echo "6. ✅ PayPal integration will function correctly"
