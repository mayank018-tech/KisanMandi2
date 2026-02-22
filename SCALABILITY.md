# KisanMandi Scalability & Performance Planning

This document outlines the architecture, optimization strategies, and scaling plan for KisanMandi to support 10,000+ concurrent users and millions of transactions.

---

## 1. Current Architecture Overview

### Technology Stack
- **Frontend:** React 18.3.1, TypeScript, Vite 5.4.2, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Database:** PostgreSQL 15+
- **Storage:** Supabase Storage (AWS S3 backend)
- **Real-time:** Supabase Realtime (WebSocket-based)
- **Auth:** Supabase Auth (JWT-based)

### Current Limitations & Bottlenecks
1. **Database Queries:** Missing indexes on frequently queried fields
2. **Real-time Subscriptions:** Unoptimized Realtime channels (posts, likes)
3. **Image Handling:** No image compression or CDN caching
4. **Pagination:** Manual offset-based pagination (not cursor-based)
5. **API Calls:** No response caching or client-side state management
6. **Bundle Size:** No code splitting or dynamic imports

---

## 2. Database Optimization

### 2.1 Critical Indexes to Create

```sql
-- User-related indexes
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);

-- Listings indexes
CREATE INDEX idx_crop_listings_farmer_id ON crop_listings(farmer_id);
CREATE INDEX idx_crop_listings_status ON crop_listings(status);
CREATE INDEX idx_crop_listings_created_at ON crop_listings(created_at DESC);
CREATE INDEX idx_crop_listings_location ON crop_listings(location);
CREATE INDEX idx_crop_listings_crop_name ON crop_listings USING GIN (to_tsvector('english', crop_name));

-- Community indexes
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_post_likes_user_post ON post_likes(user_id, post_id);
CREATE INDEX idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX idx_follows_from_to ON follows(from_user_id, to_user_id);

-- Chat indexes
CREATE INDEX idx_conversations_user_ids ON conversation_participants(user_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- Ratings indexes
CREATE INDEX idx_ratings_farmer_id ON ratings(farmer_id);
CREATE INDEX idx_ratings_rater_id ON ratings(rater_id);
CREATE INDEX idx_ratings_created_at ON ratings(created_at DESC);

-- Saves/Bookmarks indexes
CREATE INDEX idx_saves_user_listing ON saves(user_id, listing_id);
CREATE INDEX idx_saves_created_at ON saves(created_at DESC);

-- Deals indexes
CREATE INDEX idx_deals_farmer_id ON deals(farmer_id);
CREATE INDEX idx_deals_buyer_id ON deals(buyer_id);
CREATE INDEX idx_deals_status_date ON deals(status, created_at DESC);
```

### 2.2 Query Optimization

#### Problem: N+1 Queries in Listings
**Current Approach:**
```typescript
const listings = await fetchAllListings(); // Fetches listings
for (const listing of listings) {
  const images = await getListingImages(listing.id); // N queries!
}
```

**Solution: Use Joins in Supabase**
```typescript
const { data } = await supabase
  .from('crop_listings')
  .select(`
    *,
    listing_images(*),
    user_profiles:farmer_id(full_name, rating, verified),
    _count: saved_count:saves(count)
  `)
  .eq('status', 'active');
```

#### Problem: Slow Text Search
**Current:** Using `.ilike()` for crop name search
**Solution:** Full-text search with GIN index
```typescript
const { data } = await supabase
  .from('crop_listings')
  .select('*')
  .textSearch('crop_name', 'wheat -rice'); // Full-text search
```

### 2.3 Caching Strategy

#### Redis/Memcached Integration
**Use case:** Cache frequently accessed data
```
- Farmer stats (ratings, deal count) → 1 hour TTL
- Popular listings (trending) → 30 min TTL
- User profiles → 2 hour TTL
- Mandi prices → 15 min TTL
```

#### Implementation with Supabase
```typescript
// Cache layer before DB query
const cacheKey = `listings:${filters.cropName}:${filters.location}`;
let listings = await redisClient.get(cacheKey);
if (!listings) {
  listings = await supabase.from('crop_listings').select(...);
  await redisClient.setex(cacheKey, 1800, JSON.stringify(listings)); // 30 min
}
```

---

## 3. Real-time Optimization

### 3.1 Realtime Subscription Strategy (Current Issues)

**Problem:** Subscribing to entire `posts` table is inefficient
**Solution:** Narrow down subscriptions
```typescript
// ❌ Don't do this
supabase
  .channel('posts')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, handler)
  .subscribe();

// ✅ Do this instead
supabase
  .channel(`posts:user_${userId}`)
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'posts', filter: `user_id=eq.${userId}` }, 
    handler
  )
  .subscribe();
```

### 3.2 Message Queue for Real-time Events
For high-volume events (likes, comments, follows), use message queue:
```
User Action → Job Queue → Batch Process → Broadcast to Subscribed Clients
```

**Benefits:**
- Reduces WebSocket pressure
- Enables eventual consistency
- Allows rate  limiting

---

## 4. Frontend Performance

### 4.1 Code Splitting & Lazy Loading

**Current:** All pages imported at top level
**Solution:** Dynamic imports for routes

```typescript
// App.tsx - use React.lazy()
const Community = lazy(() => import('./pages/Community'));
const TraderDashboard = lazy(() => import('./pages/TraderDashboard'));
const FarmerDashboard = lazy(() => import('./pages/FarmerDashboard'));

// Pre-load routes on user click
const handleNavigate = (page: string) => {
  import(`./pages/${page}`); // Pre-load next page
  setCurrentPage(page);
};
```

### 4.2 Image Optimization

**Current:** Using raw Supabase Storage URLs
**Solution:** Implement image transformations

```typescript
// Use Supabase image transformation
const imageUrl = `${SUPABASE_URL}/storage/v1/render/image/public/posts/${fileName}?width=800&quality=80`;

// Or use external CDN (Cloudinary, imgix)
const imageUrl = `https://res.cloudinary.com/your-cloud/image/fetch/w_800,q_80,f_auto/${supabaseImageUrl}`;
```

### 4.3 Bundle Size Reduction

**Current Bundle Analysis:**
```bash
# Run: npm run build -- --analyze
# Look for large dependencies:
- React: ~42KB (gzipped)
- Supabase client: ~85KB (can be optimized)
- Tailwind: included via CDN/PurgeCSS
- Lucide Icons: ~15KB (import only used icons)
```

**Optimizations:**
```typescript
// ❌ Bad: imports entire Lucide library
import * as Icons from 'lucide-react';

// ✅ Good: import specific icons
import { Home, Users, MessageSquare } from 'lucide-react';

// ✅ Better: use CSS icon library (6KB vs 15KB)
// Switch to Feather Icons or similar
```

### 4.4 State Management & Caching

**Current:** Component-level state with refetch on navigation
**Solution:** Implement React Query/SWR for automatic caching

```typescript
// Add SWR or React Query
import useSWR from 'swr';

export function useListings(filters) {
  const { data, error } = useSWR(
    [`listings`, filters],
    ([_, f]) => fetchAllListings(f),
    {
      dedupingInterval: 60000, // Cache for 1 minute
      focusThrottleInterval: 300000, // Revalidate on window focus after 5 min
    }
  );
  return { listings: data || [], loading: !error && !data, error };
}
```

---

## 5. Backend/API Optimization

### 5.1 Rate Limiting

**Implementation using Supabase Edge Functions:**
```typescript
// Setup per-user rate limits
const rateLimitByUser = async (userId: string, limit = 100, window = 60000) => {
  const key = `ratelimit:${userId}`;
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, Math.ceil(window / 1000));
  }
  return current <= limit;
};

// Apply to API endpoints
export const POST = async (req) => {
  const userId = getUserId(req);
  if (!await rateLimitByUser(userId)) {
    return new Response('Too Many Requests', { status: 429 });
  }
  // ... process request
};
```

### 5.2 Compression & Pagination

**Enable GZIP compression:**
```typescript
// vercel.json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "redirects": [{
    "source": "/(.*)",
    "middleware": "middleware"
  }]
}
```

**Cursor-based pagination (replaces offset):**
```typescript
// Old: offset-based (slow for large datasets)
const listings = await supabase
  .from('crop_listings')
  .select('*')
  .range(offset, offset + limit);

// New: cursor-based (fast)
const listings = await supabase
  .from('crop_listings')
  .select('*')
  .lt('created_at', cursor) // Only return items before cursor
  .order('created_at', { ascending: false })
  .limit(limit);
```

---

## 6. Infrastructure & Cloud Scaling

### 6.1 Supabase Scaling

**Database:**
- Current: Shared tier (suitable for <1K users)
- For 10K+ users: Upgrade to Dedicated postgres
- Auto-scaling: Enable connection pooling via PgBouncer

**Configuration for Scalability:**
```sql
-- PostgreSQL tuning (supabase dashboard)
- max_connections: 200 (from 100)
- shared_buffers: 256MB (25% of RAM)
- effective_cache_size: 1GB
- work_mem: 4MB
- maintenance_work_mem: 64MB
```

**Storage:**
- Enable Supabase CDN for faster image delivery
- Set up CloudFront as additional CDN layer
- Implement image versioning for cache invalidation

### 6.2 Frontend Deployment

**Current:** Vercel (good for small apps)
**For 10K+ users:**
- Stick with Vercel (auto-scales)
- Or use: AWS CloudFront + S3 + Lambda@Edge

**Edge Computing:**
```typescript
// Deploy API logic to edge functions (Vercel/CloudFlare)
// Sub-100ms latency globally
export default function handler(req, res) {
  // Executed at edge (closest to user)
  const region = req.headers['x-vercel-edge-region'];
  res.json({ message: 'Hello from edge', region });
}
```

### 6.3 Load Balancing Strategy

```
Users
  ├─ Vercel CDN (static assets + pages)
  ├─ Supabase API (database queries)
  ├─ Supabase Storage CDN (images)
  └─ Real-time WebSocket (Supabase Realtime)
```

---

## 7. Monitoring & Analytics

### 7.1 Performance Monitoring

**Frontend:** Implement Web Vitals
```typescript
// Add to App.tsx
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

**Send to analytics service:**
```typescript
const sendMetric = (name: string, value: number) => {
  navigator.sendBeacon('/api/metrics', JSON.stringify({ name, value }));
};

getLCP(metric => sendMetric('LCP', metric.value));
```

### 7.2 Database Monitoring

**Supabase Dashboard:**
- Monitor slow queries (Dashboard → Logs)
- Track connection count
- Monitor disk usage

**Set up alerts:**
```sql
-- Create monitoring function
CREATE OR REPLACE FUNCTION log_slow_queries()
RETURNS trigger AS $$
BEGIN
  IF query_time > 1000 THEN
    INSERT INTO query_logs(query, duration) VALUES(query, query_time);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

### 7.3 Error Tracking

**Use Sentry for error reporting:**
```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

// Auto-capture unhandled errors
Sentry.captureException(error);
```

---

## 8. Security at Scale

### 8.1 API Security

**Rate Limiting (per IP, per user):**
```typescript
const rateLimit = new Map();

export function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimit.get(identifier) || { count: 0, reset: now + 60000 };
  
  if (now > record.reset) {
    record.count = 0;
    record.reset = now + 60000;
  }
  
  record.count++;
  rateLimit.set(identifier, record);
  return record.count <= 100; // 100 requests per minute
}
```

### 8.2 SQL Injection Prevention

**Current:** Using Supabase client (already parameterized)
**Always verify:**
```typescript
// ✅ Safe (parameterized)
await supabase
  .from('crop_listings')
  .select('*')
  .eq('farmer_id', userId);

// ❌ Unsafe (client-side filters, vulnerable)
const listings = data.filter(l => l.farmer_id === userId);
```

### 8.3 Authentication Security

**Implement token refresh strategy:**
```typescript
const refreshToken = async () => {
  const { data, error } = await supabase.auth.refreshSession();
  if (error) {
    // Redirect to login
    window.location.href = '/login';
  }
  return data.session;
};

// Auto-refresh before expiry
setInterval(() => {
  refreshToken();
}, 50 * 60 * 1000); // Refresh every 50 mins (60 min expiry)
```

---

## 9. Scaling Roadmap (Phases)

### Phase 1: 0-1,000 Users (Current)
- ✅ Database indexes
- ✅ Query optimization
- [ ] Frontend code splitting
- [ ] Image optimization
- **Cost:** $50-100/month (Supabase + Vercel)

### Phase 2: 1,000-5,000 Users (1-3 months)
- [ ] Redis caching layer
- [ ] Cursor-based pagination
- [ ] Dedicated DB instance
- [ ] CDN for static assets
- **Cost:** $200-300/month

### Phase 3: 5,000-10,000 Users (3-6 months)
- [ ] Edge functions for API
- [ ] Realtime optimization (message queue)
- [ ] Database read replicas
- [ ] Advanced monitoring
- **Cost:** $500-800/month

### Phase 4: 10,000+ Users (6+ months)
- [ ] Microservices architecture
- [ ] Multi-region deployment
- [ ] Advanced load balancing
- [ ] Custom analytics
- **Cost:** $1,000-2,000+/month

---

## 10. Quick Wins (Implement First)

1. **Add database indexes** (5 mins) - 10-50x query speedup
2. **Enable full-text search** (10 mins) - Better search UX
3. **Implement lazy loading** (30 mins) - Faster page loads
4. **Compress images** (1 hour) - 60-80% smaller images
5. **Add Web Vitals monitoring** (30 mins) - Track real performance
6. **Implement request deduplication** (1 hour) - Prevent duplicate API calls
7. **Add cursor pagination** (2 hours) - Faster list loading
8. **Rate limiting on API** (1 hour) - Prevent abuse

---

## 11. Testing Performance

### Lighthouse Audit
```bash
# Run locally
npm run build
npx http-server dist
# Open Chrome DevTools → Lighthouse
```

**Target scores for 10K users:**
- Performance: 85+
- Accessibility: 95+
- Best Practices: 90+
- SEO: 90+

### Load Testing with K6
```javascript
// load-test.js
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 100 },   // Ramp to 100 users
    { duration: '1m', target: 1000 },   // Ramp to 1000 users
    { duration: '30s', target: 0 },     // Ramp down
  ],
};

export default function () {
  let res = http.get('https://yourdomain.com');
  check(res, { 'status was 200': (r) => r.status === 200 });
}
```

**Run:** `k6 run load-test.js`

---

## 12. Conclusion

KisanMandi can scale to 10,000+ users with:
1. **Database optimization** (indexes, query tuning)
2. **Caching** (Redis for hot data)
3. **Frontend optimization** (code splitting, lazy loading)
4. **Infrastructure scaling** (dedicated DB, CDN, edge functions)
5. **Monitoring & observability** (Sentry, Web Vitals, Supabase logs)

**Start with Phase 1 optimizations** (indexes + code splitting) to improve performance immediately, then scale strategically based on user growth metrics.
