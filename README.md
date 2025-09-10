# CoralCrave - Live Marketplace

CoralCrave is a livestream-only marketplace where items can be listed and sold exclusively during live streams. Built with React, TypeScript, and modern web technologies.

<!-- Latest Update: Serverless API architecture implemented with Vercel functions for Agora token generation and PayPal payments -->

## 🚀 Features

- **Live-Only Marketplace**: Items can only be listed and purchased during active livestreams
- **Dual Auction Modes**: 
  - Classic: Timer resets on bids (10-20s with 10s minimum reset)
  - Speed: Fixed 10s timer with no resets
- **Proxy Bidding**: Set maximum bid amounts for automatic bidding
- **Real-time Streaming**: Powered by Agora Web SDK
- **Secure Payments**: Stripe Connect integration for marketplace transactions
- **Referral System**: Earn $200 Crave Credit for 5 qualified referrals
- **Analytics Dashboard**: Comprehensive seller analytics and insights

## 🛠 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **React Router v6** for navigation
- **Zustand** for state management
- **React Query** for server state
- **Headless UI** for accessible components

### Backend & Services
- **Firebase** (Auth, Firestore, Storage, Functions)
- **Cloud Run** (Auction Engine with WebSocket)
- **Agora Web SDK** for live streaming
- **Stripe Connect** for payments
- **Firebase Cloud Messaging** for notifications

## 📁 Project Structure

```
src/
├── components/
│   └── Header.tsx              # Main navigation header
├── pages/
│   ├── Home.tsx               # Landing page with live streams
│   ├── Explore.tsx            # Browse streams by category
│   ├── GoLive.tsx             # Seller streaming interface
│   ├── LiveViewer.tsx         # Viewer interface with bidding
│   ├── Activity.tsx           # Purchase history and messages
│   ├── Account.tsx            # Profile management
│   ├── SellerHub.tsx          # Analytics and seller tools
│   └── Auth.tsx               # Authentication screens
├── App.tsx                    # Main app with routing
├── main.tsx                   # App entry point
└── index.css                  # Global styles with Tailwind
```

## 🎯 Implementation Milestones

### ✅ Milestone 1: Project Scaffold & UI Shell
- [x] Vite React TypeScript project setup
- [x] Tailwind CSS configuration with custom coral/ocean theme
- [x] React Router navigation structure
- [x] Header component with search, notifications, profile menu
- [x] All page components with placeholder content
- [x] Responsive design foundation

### 🔄 Milestone 2: Auth & Profiles
- [ ] Firebase Authentication setup
- [ ] Email/password authentication
- [ ] User profile management
- [ ] Email verification flow

### 🔄 Milestone 3: Streaming (Agora)
- [ ] Agora Web SDK integration
- [ ] Go Live broadcaster interface
- [ ] Live viewer playback
- [ ] Token server for secure access

### 🔄 Milestone 4: Auction Engine
- [ ] Cloud Run WebSocket service
- [ ] Classic & Speed auction modes
- [ ] Proxy bidding system
- [ ] Real-time price updates

### 🔄 Milestone 5: Payments (Stripe Connect)
- [ ] Seller onboarding flow
- [ ] Payment processing
- [ ] Order management
- [ ] Payout system

### 🔄 Milestone 6: Messaging & Reviews
- [ ] Real-time chat system
- [ ] Direct messaging
- [ ] Review system for completed orders
- [ ] Moderation tools

### 🔄 Milestone 7: Referrals & Credit System
- [ ] Referral tracking
- [ ] Crave Credit wallet
- [ ] Qualification system
- [ ] Credit application at checkout

### 🔄 Milestone 8: Seller Hub & Analytics
- [ ] Revenue analytics
- [ ] Performance metrics
- [ ] Time-filtered reports
- [ ] Export functionality

### 🔄 Milestone 9: Moderation & Safety
- [ ] Content reporting system
- [ ] Automated moderation
- [ ] User blocking/muting
- [ ] Admin dashboard

### 🔄 Milestone 10: Production Hardening
- [ ] CI/CD pipeline
- [ ] Performance optimization
- [ ] Error monitoring
- [ ] Load testing

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Firebase project
- Agora account
- Stripe account

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd coralcrave
npm install
```

2. **Configure environment variables:**
```bash
cp .env.local.example .env.local
# Edit .env.local with your API keys
```

3. **Install additional dependencies:**
```bash
# Core dependencies
npm install react react-dom react-router-dom firebase @tanstack/react-query zustand

# UI dependencies  
npm install @headlessui/react @heroicons/react

# Development dependencies
npm install -D @types/react @types/react-dom typescript vite @vitejs/plugin-react
npm install -D tailwindcss postcss autoprefixer
```

4. **Start development server:**
```bash
npm run dev
```

### Development Notes

**NPM Configuration for D: Drive:**
The project is configured to use the D: drive for npm cache and global packages to avoid disk space issues on the C: drive:
```bash
npm config set cache "D:/npm-cache"
npm config set prefix "D:/npm-global"
```

**Mock Type Definitions:**
The project includes mock type definitions in `src/types/` to resolve TypeScript errors during development:
- `react.d.ts` - Mock React and React Router types
- `vite.d.ts` - Mock Vite build tool types  
- `css.d.ts` - CSS module declarations

These are automatically overridden when actual packages are installed.

## 🔧 Configuration

### Firebase Setup
1. Create a Firebase project
2. Enable Authentication, Firestore, and Storage
3. Add your config to `.env.local`

### Agora Setup
1. Create an Agora project
2. Get your App ID
3. Set up token server for secure access

### Stripe Setup
1. Create Stripe account
2. Enable Stripe Connect
3. Configure webhooks for payment events

## 🎨 Design System

### Colors
- **Coral**: Primary brand color for CTAs and highlights
- **Ocean**: Secondary color for accents
- **Gray**: Neutral colors for text and backgrounds

### Components
- **btn-primary**: Coral background buttons
- **btn-secondary**: Gray background buttons  
- **card**: White background with subtle shadow

## 📱 Key Features

### Live-Only Rule
Items can only be listed and purchased during active livestreams. This creates urgency and engagement.

### Auction Modes
- **Classic**: 10-20s timer that resets to 10s minimum on new bids
- **Speed**: Fixed 10s timer with no resets for fast-paced auctions

### Proxy Bidding
Users can set maximum bid amounts. The system automatically bids the minimum required amount to maintain the lead, up to the user's maximum.

### Referral System
- Users get a unique referral code
- 5 qualified referrals (sign up + complete paid auction) = $200 Crave Credit
- Credit is non-withdrawable, applied at checkout

## 🔒 Security

- All financial logic is server-side enforced
- Firebase security rules protect user data
- Stripe handles sensitive payment information
- Rate limiting prevents abuse

## 📊 Analytics

Sellers get detailed analytics including:
- Revenue over time
- Items sold and sell-through rate
- Average bids per item
- Viewer engagement metrics
- Mode performance (Classic vs Speed)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, email support@coralcrave.com or join our Discord community.

---

Built with ❤️ for the aquarium community
