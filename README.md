# 🌾 KisanMandi - Farmer + Trader Social Marketplace Platform

A modern, fully-featured agricultural marketplace connecting farmers and traders with a built-in social community, messaging system, and trust network.

---

## 🚀 Features

### 👨‍🌾 For Farmers
- **Create Listings** - Add crops with multiple images (up to 6), set quality grades, and manage inventory
- **Community Feed** - Share harvest updates, connect with other farmers, follow trusted sources
- **Get Ratings** - Build reputation through buyer reviews and ratings (displayed publicly)
- **Messaging** - Direct messages with interested buyers and traders
- **Dashboard** - Manage all listings, view offers, track communications

### 🤝 For Traders & Buyers
- **Browse Listings** - Search and filter available crops by name, location, price range
- **Smart Marketplace** - See farmer profiles with ratings and review history
- **Bookmarks** - Save listings for later and manage favorites
- **Direct Contact** - Call farmers directly or send detailed offer messages
- **Community Feed** - Network, follow farmers, and stay updated on market trends

### ⭐ For Everyone
- **Trust System** - 5-star ratings, verified badges, completed deals tracker
- **Real-time Updates** - Instant notifications for posts, likes, comments, and messages
- **Mobile-First** - Optimized for all devices with bottom navigation on mobile
- **Multi-Language** - English, Hindi, Gujarati support
- **Secure** - JWT-based authentication, Supabase security features

---

## 🛠️ Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS 3
- **Icons:** Lucide React
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Realtime WebSockets)
- **Hosting:** Vercel (frontend), Supabase Cloud (backend)
- **Database:** PostgreSQL 15+

---

## 📦 Project Structure

```
src/
├── pages/              # Route pages (Community, Chat, Dashboards)
├── features/           # Feature-specific API helpers (community, trader, ratings)
├── components/         # Reusable UI components
├── contexts/           # Auth and Language context
├── lib/                # Supabase client and types
└── [styles, config]    # CSS and configuration files
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- Supabase account (free tier available)
- Vercel account (optional, for deployment)

### Setup Local Development

1. **Clone and install:**
   ```bash
   cd KisanMandi
   npm install
   ```

2. **Set up environment variables** (.env.local):
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

3. **Run migrations** (one-time):
   ```bash
   # Use Supabase Dashboard or:
   supabase db push
   ```

4. **Start dev server:**
   ```bash
   npm run dev
   ```

5. **Open browser:**
   ```
   http://localhost:5174
   ```

---

## 📚 Documentation

### [IMPLEMENTATION.md](./IMPLEMENTATION.md)
Complete overview of all features built, file structure, database schema, and testing checklist.

**Read this if you want to:**
- Understand what features exist
- See the database schema
- Check mobile-first responsiveness
- Plan next-phase features

### [SCALABILITY.md](./SCALABILITY.md)
Production-ready performance and scalability guide for 10,000+ concurrent users.

**Read this if you want to:**
- Optimize database performance (indexes, caching)
- Improve frontend load times (code splitting, images)
- Set up monitoring and alerts
- Scale to enterprise levels
- Implement security best practices

---

## 🎯 Core Use Cases

### Farmer Workflow
1. **Sign up** as a Farmer
2. **Create listings** with crop details, images, and quality grades
3. **Monitor community** for relevant discussions
4. **Receive messages** from interested buyers
5. **Get rated** after successful deals
6. **Build reputation** to attract more buyers

### Trader Workflow
1. **Sign up** as a Buyer/Trader
2. **Browse listings** with filters (crop, location, price)
3. **View farmer profiles** with ratings and reviews
4. **Bookmark** favorite listings
5. **Send offers** to farmers
6. **Rate farmers** after purchases
7. **Follow** trusted farmers for updates

### Community Engagement
1. **Create posts** about farming, weather, or harvests
2. **Like and comment** on posts
3. **Follow farmers** to see their updates
4. **Receive real-time** notifications
5. **Build trust** through engagement

---

## 📊 Database Structure

**13 New Tables (Migration: 20260222090000):**
- Posts, Post Images, Post Likes, Post Comments
- Follows, Conversations, Messages
- Conversation Participants, Listings Images, Saves
- Deals, Ratings

**Key Features:**
- Row-level security (RLS) for data privacy
- Real-time subscriptions on posts and likes
- Automatic timestamps (created_at, updated_at)
- Referential integrity with foreign keys

See **SCALABILITY.md > Section 2** for database optimization guide.

---

## 🎨 Design Highlights

✅ **Mobile-First Design**
- Bottom navigation on phones
- Touch-friendly buttons (44x44px minimum)
- Responsive grid layouts
- Proper viewport spacing

✅ **Real-time Features**
- Instant post updates
- Live like counts
- Real-time comment notifications
- WebSocket-powered messaging

✅ **Trust Indicators**
- 5-star farmer ratings
- Verified badges (4.0+ rating & 5+ reviews)
- Completed deals counter
- Review history display

✅ **Image Handling**
- Multi-image upload (up to 6 per listing)
- Image preview before upload
- Responsive image gallery
- Optimized storage via Supabase

---

## 🔐 Security

- **Authentication:** Supabase Auth (JWT tokens, HTTP-only cookies)
- **Database:** Row-Level Security (RLS) on all sensitive tables
- **Queries:** Parameterized (SQL injection prevention)
- **Storage:** Supabase Storage with bucket policies
- **HTTPS:** Automatic on Vercel deployment

**To add in production:**
- Rate limiting on API endpoints
- Advanced DDoS protection
- Content security policy headers
- Regular security audits

See **SCALABILITY.md > Section 8** for detailed security guide.

---

## 📈 Roadmap & Enhancements

### 📍 Current (Completed)
- ✅ Community feed with real-time updates
- ✅ Multi-image listings with quality grades
- ✅ Trader dashboard with search/filter
- ✅ Trust & rating system
- ✅ Mobile-optimized UI
- ✅ Performance & scalability documentation

### 🚀 Phase 2 (Optional)
- [ ] Notifications (push, in-app)
- [ ] Full-text search
- [ ] Advanced filters (quality grade, certified, organic)
- [ ] Payment integration (Razorpay/Stripe)
- [ ] Direct negotiations in chat
- [ ] Deal completion workflow

### 📊 Phase 3 (Enterprise)
- [ ] Admin dashboard
- [ ] Seller verification process
- [ ] Analytics dashboard
- [ ] White-label options
- [ ] API for third-party apps
- [ ] Advanced reporting

---

## 🤝 Contributing

We welcome contributions! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## 📞 Support

### Common Issues

**"Supabase connection error"**
- Check .env.local has correct VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
- Verify Supabase project is active
- Check browser Network tab for CORS issues

**"Image upload fails"**
- Verify Supabase Storage bucket exists (posts, listings)
- Check bucket RLS policies allow uploads
- Ensure file size < 10MB

**"Mobile nav not showing"**
- Check you're on a device or browser width < 768px
- Verify MobileBottomNav is imported in App.tsx
- Clear browser cache

### Getting Help
1. Check **IMPLEMENTATION.md** for feature details
2. Review **SCALABILITY.md** for performance issues
3. Check Supabase logs in dashboard
4. Open an issue with reproduction steps

---

## 📄 License

Open source (MIT License) - Feel free to fork and customize

---

## 🎯 Key Metrics for Success

| Metric | Target | Status |
|--------|--------|--------|
| Page Load Time | < 3 seconds | ✅ |
| Mobile Usability | 100% | ✅ |
| Database Queries | < 100ms | 📋 Optimize |
| Image Load Time | < 1 second | 📋 Add CDN |
| Uptime | 99.9% | ✅ Supabase |
| Support 10K+ users | By Phase 3 | 📋 Follow SCALABILITY.md |

---

## 🙏 Acknowledgments

Built with:
- **Supabase** - Open-source Firebase alternative
- **React** - UI framework
- **Tailwind CSS** - Utility-first CSS
- **Vercel** - Deployment platform

---

**Last Updated:** February 22, 2026  
**Version:** 1.0.0  
**Status:** Production Ready ✅

For detailed implementation details, see [IMPLEMENTATION.md](./IMPLEMENTATION.md)  
For scaling & performance, see [SCALABILITY.md](./SCALABILITY.md)
