# KitchenSync Data Connection Plan

## Current State Analysis

### Web Console (This Repo)
- **Backend**: Hono server on port 3000
- **Database**: SQLite via Prisma (`backend/prisma/dev.db`)
- **Auth**: Better Auth (local)
- **Sample Data**: Businesses like "Coq au Vin", "The Golden Fork" created in local SQLite

### iOS Mobile App (Separate Repo)
- **Backend**: Likely has its own local database or mock data
- **Database**: Unknown - may be using separate Prisma/SQLite instance
- **Problem**: Not connected to the same backend/database as web console

### Admin Console (Supabase)
- **Database**: Supabase/PostgreSQL
- **Tables**: `user_profiles`, `shared_recipes`, `new_content`, etc.
- **Purpose**: Original recipe/social platform data

---

## The Problem

There are currently **three disconnected data sources**:

1. **Supabase (PostgreSQL)** - Original recipe platform data
2. **Local SQLite (Web Console)** - Commercial platform data (businesses, reservations, orders)
3. **iOS App** - Likely its own mock/sample data

The iOS app needs to read from the same commercial data that the web console creates.

---

## Solution Options

### Option A: Shared Backend API (Recommended)
**Connect iOS app to the existing Hono backend**

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Admin     │     │  Business   │     │   iOS App   │
│   Console   │     │   Console   │     │   (Mobile)  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                    ┌──────▼──────┐
                    │ Hono Backend │
                    │  Port 3000   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   SQLite    │
                    │  (Prisma)   │
                    └─────────────┘
```

**Pros:**
- Simple - just point iOS app to same backend URL
- Single source of truth
- No data migration needed
- Works immediately

**Cons:**
- SQLite not ideal for production scale
- No real-time subscriptions

**Implementation:**
1. Configure iOS app to use `BACKEND_URL` from environment
2. Ensure CORS allows iOS app origin
3. Test API connectivity

---

### Option B: Migrate to Supabase (Production-Ready)
**Move all commercial data to Supabase PostgreSQL**

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Admin     │     │  Business   │     │   iOS App   │
│   Console   │     │   Console   │     │   (Mobile)  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                    ┌──────▼──────┐
                    │ Hono Backend │ (optional - can go direct)
                    │  Port 3000   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   Supabase  │
                    │ (PostgreSQL)│
                    │ + Real-time │
                    └─────────────┘
```

**Pros:**
- Production-ready PostgreSQL
- Real-time subscriptions for order/reservation updates
- Scalable
- Already have Supabase for recipe data

**Cons:**
- Requires migration of Prisma schema to Supabase
- Need to create SQL migration files
- More work upfront

**Implementation:**
1. Create Supabase SQL migrations for all commercial tables
2. Update Prisma to use PostgreSQL/Supabase connection string
3. Migrate existing sample data
4. Update iOS app to use Supabase client or backend API

---

### Option C: Hybrid Approach
**Keep Hono backend but switch database to Supabase**

This combines the benefits of both:
- Keep Hono API layer for business logic
- Use Supabase PostgreSQL as the database
- Enable real-time features via Supabase Realtime

---

## Recommended Approach: Option A (Short-term) + Option B (Long-term)

### Phase 1: Quick Connection (Now)
1. **Verify iOS app backend URL** - Ensure it points to the Vibecode backend
2. **Add CORS for iOS** - Allow mobile app origin
3. **Test API calls** - Verify businesses, menu, reservations work

### Phase 2: Supabase Migration (Future)
1. Generate SQL migrations from Prisma schema
2. Create tables in Supabase
3. Set up Row Level Security (RLS) policies
4. Migrate sample data
5. Switch Prisma connection string to Supabase
6. Enable real-time subscriptions for orders/reservations

---

## Immediate Action Items

### 1. Check iOS App Configuration
The iOS app should be configured to call the same backend:
```
BACKEND_URL=https://[vibecode-id].vibecode.run
```

### 2. Verify CORS Settings
In `backend/src/index.ts`, ensure mobile origins are allowed:
```typescript
const allowedOrigins = [
  'http://localhost:*',
  'https://*.vibecode.run',
  'https://*.vibecodeapp.com',
  // iOS app origin if needed
];
```

### 3. Test Connectivity
The iOS app should be able to call:
- `GET /api/business` - List all businesses
- `GET /api/business/slug/:slug` - Get business by slug
- `GET /api/menu/:businessId/public` - Get menu
- `GET /api/reservations/:businessId/availability` - Check availability
- `POST /api/reservations/:businessId` - Create reservation
- `POST /api/orders/:businessId` - Create order

---

## Supabase Migration SQL (For Phase 2)

When ready to migrate to Supabase, create this migration:

```sql
-- Commercial Platform Tables for Supabase
-- Run in Supabase SQL Editor

-- ============================================
-- Business Accounts
-- ============================================

CREATE TABLE IF NOT EXISTS business_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID REFERENCES auth.users(id),

  business_name TEXT NOT NULL,
  business_type TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,

  email TEXT NOT NULL,
  phone TEXT,
  website_url TEXT,

  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'US',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  logo_url TEXT,
  cover_image_url TEXT,
  brand_color TEXT DEFAULT '#000000',
  description TEXT,

  subscription_tier TEXT DEFAULT 'starter',
  subscription_status TEXT DEFAULT 'trialing',
  trial_ends_at TIMESTAMPTZ,

  stripe_account_id TEXT,
  stripe_account_status TEXT DEFAULT 'pending',
  commission_rate DECIMAL(5, 4) DEFAULT 0.0500,

  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- (Additional tables: business_hours, restaurant_tables,
--  reservations, menu_categories, menu_items, orders, etc.)
-- See backend/prisma/schema.prisma for full schema

-- Enable RLS
ALTER TABLE business_accounts ENABLE ROW LEVEL SECURITY;

-- Public read for active businesses
CREATE POLICY "Public can view active businesses"
  ON business_accounts FOR SELECT
  USING (is_active = TRUE);

-- Owners can manage their businesses
CREATE POLICY "Owners can manage their businesses"
  ON business_accounts FOR ALL
  USING (owner_user_id = auth.uid());
```

---

## Summary

| Phase | Action | Timeline | Effort |
|-------|--------|----------|--------|
| 1 | Connect iOS to existing backend | Immediate | Low |
| 2 | Verify API connectivity | Immediate | Low |
| 3 | Add missing CORS if needed | If needed | Low |
| 4 | Supabase migration | Future | Medium |
| 5 | Real-time subscriptions | Future | Medium |

The quickest path is to ensure the iOS app is configured to call the same Hono backend API that the web console uses. This requires no database changes - just proper configuration.
