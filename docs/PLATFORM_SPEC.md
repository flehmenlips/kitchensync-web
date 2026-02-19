# KitchenSync Platform Specification

> **Consolidated Reference Document for Admin Dashboard Development**
> This document combines all schema, roadmap, and API specifications for the KitchenSync platform.
> Target: www.cookbook.farm (Admin Web Console)
> Last Updated: February 2026

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Database Schema](#2-database-schema)
3. [Admin Dashboard Requirements](#3-admin-dashboard-requirements)
4. [API Endpoints](#4-api-endpoints)
5. [Role-Based Access Control](#5-role-based-access-control)
6. [Social Platform Features](#6-social-platform-features)
7. [Creator Economy](#7-creator-economy)
8. [Marketplace](#8-marketplace)
9. [Moderation & Safety](#9-moderation--safety)
10. [Technical Stack](#10-technical-stack)
11. [Implementation Phases](#11-implementation-phases)

---

## 1. Platform Overview

### Vision

KitchenSync is evolving from a personal recipe management app into a social culinary platform where food enthusiasts connect, share recipes, and discover new flavors—while enabling content creators to build audiences and monetize through product sales.

### User Tiers

| Role | Description | Access Level |
|------|-------------|--------------|
| **Superadmin** | Platform operators | Full system access |
| **Creator** | Verified content creators | Own content + analytics + store |
| **Account Manager** | Brand/agency managers | Delegated creator access |
| **User** | Regular app users | Personal content only |

### Current State

| Feature | Status |
|---------|--------|
| `is_admin` flag on user_profiles | Implemented |
| RLS policies for shared_recipes | Implemented |
| RLS policies for new_content | Implemented |
| Content view metrics | Implemented |
| User saved recipes tracking | Implemented |

---

## 2. Database Schema

### 2.1 Core User Tables

#### `user_profiles`

User profile information and settings. Auto-created on signup via trigger.

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  kitchen_name TEXT DEFAULT 'My Kitchen',
  display_name TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT false,
  bio TEXT,                              -- Social: 280 char max
  website_url TEXT,                      -- Social: personal link
  instagram_handle TEXT,                 -- Social
  tiktok_handle TEXT,                    -- Social
  youtube_handle TEXT,                   -- Social
  is_public BOOLEAN DEFAULT true,        -- Social: profile visibility
  follower_count INTEGER DEFAULT 0,      -- Social: cached count
  following_count INTEGER DEFAULT 0,     -- Social: cached count
  shared_recipe_count INTEGER DEFAULT 0, -- Social: cached count
  measurement_system TEXT DEFAULT 'imperial',
  prefer_weight_over_volume BOOLEAN DEFAULT false,
  temperature_unit TEXT DEFAULT 'fahrenheit',
  show_nutritional_info BOOLEAN DEFAULT true,
  default_servings INTEGER DEFAULT 4,
  enable_cooking_timers BOOLEAN DEFAULT true,
  enable_shopping_reminders BOOLEAN DEFAULT true,
  last_content_viewed_at TIMESTAMPTZ,
  last_shared_recipes_viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_is_admin ON user_profiles(is_admin) WHERE is_admin = true;
```

**TypeScript Type:**
```typescript
interface UserProfile {
  id: string;
  user_id: string;
  kitchen_name: string;
  display_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  bio: string | null;
  website_url: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  youtube_handle: string | null;
  is_public: boolean;
  follower_count: number;
  following_count: number;
  shared_recipe_count: number;
  measurement_system: 'metric' | 'imperial';
  prefer_weight_over_volume: boolean;
  temperature_unit: 'celsius' | 'fahrenheit';
  show_nutritional_info: boolean;
  default_servings: number;
  enable_cooking_timers: boolean;
  enable_shopping_reminders: boolean;
  last_content_viewed_at: string | null;
  last_shared_recipes_viewed_at: string | null;
  created_at: string;
  updated_at: string;
}
```

---

### 2.2 Recipe Tables

#### `recipes` (User Personal Recipes)

```sql
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  prep_time VARCHAR(50),
  cook_time VARCHAR(50),
  servings INTEGER DEFAULT 4,
  difficulty VARCHAR(20) DEFAULT 'Medium', -- 'Easy', 'Medium', 'Hard'
  image_url TEXT,
  is_ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `ingredients`

```sql
CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `instructions`

```sql
CREATE TABLE instructions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  step_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `recipe_photos`

```sql
CREATE TABLE recipe_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `tags` & `recipe_tags`

```sql
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE recipe_tags (
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, tag_id)
);
```

---

### 2.3 Admin Content Tables

#### `shared_recipes` (Admin-Curated)

```sql
CREATE TABLE shared_recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  prep_time VARCHAR(50),
  cook_time VARCHAR(50),
  servings INTEGER DEFAULT 4,
  difficulty VARCHAR(20) DEFAULT 'Medium',
  ingredients TEXT[] DEFAULT '{}',
  instructions TEXT[] DEFAULT '{}',
  image_url TEXT,
  image_urls TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  category VARCHAR(100),  -- 'Weekly Pick', 'Seasonal', 'Quick & Easy', etc.
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  release_date TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Categories:** `Weekly Pick`, `Seasonal`, `Quick & Easy`, `Holiday Special`, `Comfort Food`, `Healthy`, `Budget-Friendly`

**TypeScript Type:**
```typescript
interface SharedRecipe {
  id: string;
  title: string;
  description: string | null;
  prep_time: string | null;
  cook_time: string | null;
  servings: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  ingredients: string[];
  instructions: string[];
  image_url: string | null;
  image_urls: string[];
  tags: string[];
  category: string | null;
  is_featured: boolean;
  is_active: boolean;
  release_date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}
```

#### `user_saved_shared_recipes`

```sql
CREATE TABLE user_saved_shared_recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_recipe_id UUID REFERENCES shared_recipes(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, shared_recipe_id)
);
```

#### `new_content` (Tips, Tutorials, Announcements)

```sql
CREATE TABLE new_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  video_url TEXT,
  thumbnail_url TEXT,
  content_type VARCHAR(50) NOT NULL, -- 'tutorial', 'tip', 'feature', 'announcement'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**TypeScript Type:**
```typescript
interface NewContent {
  id: string;
  title: string;
  description: string;
  video_url: string | null;
  thumbnail_url: string | null;
  content_type: 'tutorial' | 'tip' | 'feature' | 'announcement';
  is_active: boolean;
  created_at: string;
}
```

---

### 2.4 Social Platform Tables

#### `user_follows`

```sql
CREATE TABLE user_follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

CREATE INDEX idx_follows_follower ON user_follows(follower_id);
CREATE INDEX idx_follows_following ON user_follows(following_id);
```

#### `user_shared_recipes` (User-Shared to Community)

```sql
CREATE TABLE user_shared_recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  caption TEXT,
  is_public BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  save_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `recipe_likes`

```sql
CREATE TABLE recipe_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_recipe_id UUID REFERENCES user_shared_recipes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, shared_recipe_id)
);
```

#### `recipe_saves`

```sql
CREATE TABLE recipe_saves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_recipe_id UUID REFERENCES user_shared_recipes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, shared_recipe_id)
);
```

#### `recipe_comments`

```sql
CREATE TABLE recipe_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shared_recipe_id UUID REFERENCES user_shared_recipes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES recipe_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  like_count INTEGER DEFAULT 0,
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `comment_likes`

```sql
CREATE TABLE comment_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES recipe_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, comment_id)
);
```

#### `recipe_ratings`

```sql
CREATE TABLE recipe_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shared_recipe_id UUID REFERENCES user_shared_recipes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, shared_recipe_id)
);
```

#### `notifications`

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'follow', 'like', 'comment', 'mention', 'repost', 'new_recipe'
  actor_id UUID REFERENCES auth.users(id),
  target_type TEXT,   -- 'recipe', 'user', 'comment'
  target_id UUID,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
```

#### `recipe_collections`

```sql
CREATE TABLE recipe_collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  is_public BOOLEAN DEFAULT true,
  save_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE collection_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id UUID REFERENCES recipe_collections(id) ON DELETE CASCADE,
  shared_recipe_id UUID REFERENCES user_shared_recipes(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `hashtags`

```sql
CREATE TABLE hashtags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tag TEXT UNIQUE NOT NULL,
  use_count INTEGER DEFAULT 0,
  trending_score FLOAT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE recipe_hashtags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shared_recipe_id UUID REFERENCES user_shared_recipes(id) ON DELETE CASCADE,
  hashtag_id UUID REFERENCES hashtags(id) ON DELETE CASCADE,
  UNIQUE(shared_recipe_id, hashtag_id)
);
```

#### `feed_events`

```sql
CREATE TABLE feed_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'shared_recipe', 'liked_recipe', 'new_follower', 'comment'
  target_type TEXT,         -- 'recipe', 'user', 'comment'
  target_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feed_user ON feed_events(user_id);
CREATE INDEX idx_feed_created ON feed_events(created_at DESC);
```

---

### 2.5 Creator & Marketplace Tables

#### `creator_profiles`

```sql
CREATE TABLE creator_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  is_verified BOOLEAN DEFAULT false,
  verification_date TIMESTAMPTZ,
  creator_tier TEXT DEFAULT 'basic', -- 'basic', 'pro', 'partner'
  specialty_tags TEXT[],
  featured_recipe_id UUID,
  about_text TEXT,
  banner_image_url TEXT,
  contact_email TEXT,
  business_name TEXT,
  stripe_account_id TEXT,
  commission_rate DECIMAL DEFAULT 0.15,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `creator_verification_requests`

```sql
CREATE TABLE creator_verification_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  portfolio_url TEXT,
  social_proof TEXT,
  reason TEXT,
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);
```

#### `products`

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creator_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  short_description TEXT,
  price_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',
  image_urls TEXT[],
  category TEXT, -- 'spice', 'sauce', 'tool', 'book', 'course'
  tags TEXT[],
  inventory_count INTEGER,
  is_active BOOLEAN DEFAULT true,
  is_digital BOOLEAN DEFAULT false,
  digital_download_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `product_variants`

```sql
CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  inventory_count INTEGER,
  sku TEXT
);
```

#### `recipe_products`

```sql
CREATE TABLE recipe_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shared_recipe_id UUID REFERENCES user_shared_recipes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  context TEXT, -- 'ingredient', 'tool', 'recommended'
  sort_order INTEGER DEFAULT 0
);
```

#### `cart_items`

```sql
CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id),
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `orders`

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE,
  user_id UUID REFERENCES auth.users(id),
  creator_id UUID REFERENCES creator_profiles(id),
  status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'shipped', 'delivered', 'cancelled'
  subtotal_cents INTEGER,
  shipping_cents INTEGER,
  tax_cents INTEGER,
  total_cents INTEGER,
  shipping_address JSONB,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `order_items`

```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  quantity INTEGER,
  price_cents INTEGER
);
```

#### `creator_payouts`

```sql
CREATE TABLE creator_payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creator_profiles(id) ON DELETE CASCADE,
  amount_cents INTEGER,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  stripe_transfer_id TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);
```

#### `creator_earnings`

```sql
CREATE TABLE creator_earnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creator_profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id),
  gross_amount_cents INTEGER,
  platform_fee_cents INTEGER,
  net_amount_cents INTEGER,
  payout_id UUID REFERENCES creator_payouts(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 2.6 Admin & Moderation Tables

#### `admin_activity_log`

```sql
CREATE TABLE admin_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,    -- 'create_recipe', 'delete_user', etc.
  target_type TEXT,        -- 'recipe', 'user', 'content'
  target_id UUID,
  metadata JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_log_admin ON admin_activity_log(admin_user_id);
CREATE INDEX idx_admin_log_created ON admin_activity_log(created_at DESC);
```

#### `content_reports`

```sql
CREATE TABLE content_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID REFERENCES auth.users(id),
  content_type TEXT NOT NULL, -- 'recipe', 'comment', 'user', 'product'
  content_id UUID NOT NULL,
  reason TEXT NOT NULL,       -- 'spam', 'inappropriate', 'copyright', 'harassment', 'other'
  description TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'actioned', 'dismissed'
  reviewed_by UUID REFERENCES auth.users(id),
  action_taken TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);
```

#### `user_suspensions`

```sql
CREATE TABLE user_suspensions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  suspended_by UUID REFERENCES auth.users(id),
  suspended_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- NULL = permanent
  lifted_at TIMESTAMPTZ,
  lifted_by UUID REFERENCES auth.users(id)
);
```

#### `moderation_log`

```sql
CREATE TABLE moderation_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  moderator_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `platform_settings`

```sql
CREATE TABLE platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `feature_flags`

```sql
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  is_enabled BOOLEAN DEFAULT false,
  rollout_percentage INTEGER DEFAULT 0,
  target_users UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 2.7 Analytics Tables

#### `content_views`

```sql
CREATE TABLE content_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id UUID REFERENCES new_content(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL,
  source TEXT, -- 'auto_popup', 'tips_screen', 'bell_icon'
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `user_onboarding`

```sql
CREATE TABLE user_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ,
  skipped BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 2.8 Storage Buckets

| Bucket | Purpose | Public |
|--------|---------|--------|
| `avatars` | User profile avatars | Yes |
| `recipe-photos` | User recipe photos | Yes |
| `recipe-assets` | Shared recipe images | Yes |
| `videos` | Tutorial/tip videos | Yes |
| `products` | Product images | Yes |

---

## 3. Admin Dashboard Requirements

### 3.1 Content Management

**Shared Recipes (`/admin/recipes`)**

| Feature | Description |
|---------|-------------|
| Data grid view | Sortable, filterable table |
| Search | By title, tags, category |
| Filters | Status, featured, category, date range |
| Bulk actions | Activate/deactivate, feature/unfeature, delete |
| Quick edit | Inline toggle for is_active, is_featured |
| Export | CSV export |

**Recipe Editor Fields:**

| Field | Type | Required |
|-------|------|----------|
| Title | Text | Yes |
| Description | Textarea | No |
| Ingredients | Array editor | Yes |
| Instructions | Array editor | Yes |
| Prep Time | Text | No |
| Cook Time | Text | No |
| Servings | Number | Yes |
| Difficulty | Select | Yes |
| Category | Select | No |
| Tags | Multi-select | No |
| Primary Image | Image upload | No |
| Additional Images | Multi-image upload | No |
| Is Featured | Toggle | No |
| Is Active | Toggle | No |
| Release Date | DateTime | Yes |

**New Content (`/admin/content`)**

| Field | Type | Required |
|-------|------|----------|
| Title | Text | Yes |
| Description | Rich text | Yes |
| Content Type | Select | Yes |
| Video | Video upload | No |
| Thumbnail | Image upload | No |
| Is Active | Toggle | Yes |
| Priority | Number | No |
| Publish Date | DateTime | No |
| Expire Date | DateTime | No |

### 3.2 User Management

**User Directory (`/admin/users`)**

| Column | Description |
|--------|-------------|
| Avatar | Profile image |
| Name | Display name, kitchen name |
| Email | User email |
| Recipes | Recipe count |
| Joined | Registration date |
| Last Active | Last login |
| Status | Active/suspended |
| Actions | View, suspend, delete |

**User Detail Sections:**
- Profile info
- Account info
- Activity metrics
- Social stats (followers, following)
- Admin actions

### 3.3 Social Management

**Social Dashboard (`/admin/social`)**

| Metric | Description |
|--------|-------------|
| Daily Active Users | Users with activity |
| New Follows | Follow relationships |
| Recipes Shared | Public shares |
| Likes | Total likes |
| Comments | Total comments |
| Engagement Rate | Interactions / users |

**Featured Curation (`/admin/social/featured`):**
- Featured Recipes
- Featured Creators
- Featured Collections
- Featured Hashtags

### 3.4 Analytics

**Platform Overview (`/admin/analytics`)**

| Section | Metrics |
|---------|---------|
| Users | Total, DAU, WAU, MAU, growth |
| Engagement | Sessions, time in app |
| Content | Views, saves, likes |
| Social | Follows, comments, shares |
| Marketplace | GMV, orders, AOV |

---

## 4. API Endpoints

### Authentication
```
POST   /api/auth/admin/login
POST   /api/auth/admin/logout
GET    /api/auth/admin/me
```

### Content Management
```
GET    /api/admin/recipes
POST   /api/admin/recipes
GET    /api/admin/recipes/:id
PUT    /api/admin/recipes/:id
DELETE /api/admin/recipes/:id
POST   /api/admin/recipes/:id/feature
POST   /api/admin/recipes/:id/publish

GET    /api/admin/content
POST   /api/admin/content
GET    /api/admin/content/:id
PUT    /api/admin/content/:id
DELETE /api/admin/content/:id
POST   /api/admin/content/upload-video
```

### User Management
```
GET    /api/admin/users
GET    /api/admin/users/:id
PUT    /api/admin/users/:id
POST   /api/admin/users/:id/suspend
POST   /api/admin/users/:id/unsuspend
DELETE /api/admin/users/:id

GET    /api/admin/admins
POST   /api/admin/admins
DELETE /api/admin/admins/:id
```

### Creator Management
```
GET    /api/admin/creators
GET    /api/admin/creators/:id
PUT    /api/admin/creators/:id
GET    /api/admin/creators/verification
POST   /api/admin/creators/verification/:id/approve
POST   /api/admin/creators/verification/:id/reject
```

### Marketplace
```
GET    /api/admin/products
GET    /api/admin/products/:id
PUT    /api/admin/products/:id
GET    /api/admin/orders
GET    /api/admin/orders/:id
PUT    /api/admin/orders/:id/status
GET    /api/admin/payouts
POST   /api/admin/payouts/process
```

### Analytics
```
GET    /api/admin/analytics/overview
GET    /api/admin/analytics/users
GET    /api/admin/analytics/content
GET    /api/admin/analytics/revenue
GET    /api/admin/analytics/reports
POST   /api/admin/analytics/reports
```

### Moderation
```
GET    /api/admin/moderation/queue
GET    /api/admin/moderation/reports/:id
POST   /api/admin/moderation/reports/:id/action
GET    /api/admin/moderation/log
```

---

## 5. Role-Based Access Control

### Permission Matrix

| Permission | Superadmin | Creator | Account Manager |
|------------|------------|---------|-----------------|
| View all users | Yes | No | No |
| Manage admins | Yes | No | No |
| View all recipes | Yes | Own only | Managed only |
| Manage shared recipes | Yes | No | No |
| Manage content | Yes | No | No |
| View analytics | Yes | Own only | Managed only |
| Verify creators | Yes | No | No |
| Manage products | Yes | Own only | Managed only |
| Process payouts | Yes | No | No |
| Moderate content | Yes | No | No |
| Platform settings | Yes | No | No |

### RBAC Implementation

```sql
-- User roles enum
CREATE TYPE user_role AS ENUM ('user', 'creator', 'account_manager', 'admin', 'superadmin');

-- Add role to user_profiles
ALTER TABLE user_profiles ADD COLUMN role user_role DEFAULT 'user';

-- Role check function
CREATE OR REPLACE FUNCTION has_role(required_role user_role)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND role >= required_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Account manager assignments
CREATE TABLE account_manager_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manager_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES creator_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(manager_id, creator_id)
);
```

### Admin RLS Policies

```sql
-- Helper function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND is_admin = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Shared recipes policies
CREATE POLICY "Admins can insert shared recipes" ON shared_recipes
    FOR INSERT TO authenticated
    WITH CHECK (is_admin());

CREATE POLICY "Admins can update shared recipes" ON shared_recipes
    FOR UPDATE TO authenticated
    USING (is_admin());

CREATE POLICY "Admins can delete shared recipes" ON shared_recipes
    FOR DELETE TO authenticated
    USING (is_admin());

CREATE POLICY "View shared recipes" ON shared_recipes
    FOR SELECT TO authenticated
    USING (is_admin() OR (is_active = true AND release_date <= NOW()));

-- New content policies
CREATE POLICY "Anyone can view active content" ON new_content
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage content" ON new_content
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());
```

---

## 6. Social Platform Features

### Phase 1: Foundation
- Enhanced public profiles (bio, links, visibility)
- Follow/unfollow system
- User discovery and search
- Follower/following lists

### Phase 2: Recipe Sharing
- Share recipes to community
- Activity feed (following + explore)
- Likes and saves
- View counts

### Phase 3: Engagement
- Comments (threaded)
- Ratings & reviews
- Reposts
- @mentions

### Phase 4: Notifications
- In-app notifications
- Notification preferences
- Real-time updates via Supabase Realtime

### Phase 7: Advanced (Future)
- Direct messaging
- Hashtags & trends
- Stories (ephemeral content)

---

## 7. Creator Economy

### Creator Tiers

| Tier | Requirements | Commission |
|------|--------------|------------|
| Basic | Verification approved | 15% |
| Pro | 1K followers, $1K GMV | 12% |
| Partner | 10K followers, $10K GMV | 10% |

### Creator Features
- Verified badge
- Extended bio & banner
- Specialty tags
- Featured recipe spotlight
- Analytics dashboard
- Product catalog
- Payout management

### Verification Workflow
1. User submits request with portfolio URL, social proof
2. Admin reviews follower count, content quality
3. Approve/reject with notes
4. On approval: create creator_profile, set is_verified

---

## 8. Marketplace

### Product Categories
- Spices & Seasonings
- Sauces & Condiments
- Kitchen Tools
- Cookbooks & eBooks
- Online Courses
- Ingredient Kits

### Order Flow
1. Add to cart from recipes
2. Checkout with Stripe
3. Order confirmation
4. Creator fulfillment
5. Digital delivery (if applicable)

### Payout System
- Earnings tracked per order
- Platform fee deducted
- Stripe Connect for creator accounts
- Weekly/monthly payout schedule

---

## 9. Moderation & Safety

### Report Types
- Spam
- Inappropriate content
- Copyright violation
- Harassment
- Other

### Moderation Actions
- Approve (clear report)
- Remove content
- Warn user
- Suspend user (temporary/permanent)
- Escalate to legal

### Automated Safety
- AI image moderation
- Text filtering (profanity, spam)
- Duplicate detection
- Bot detection

---

## 10. Technical Stack

### Admin Console (Web)
- **Framework:** Next.js 14 (App Router)
- **UI:** Tailwind CSS + shadcn/ui
- **State:** TanStack Query (React Query)
- **Forms:** React Hook Form + Zod
- **Tables:** TanStack Table
- **Charts:** Recharts or Chart.js
- **Auth:** Supabase Auth SSR

### Backend
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Storage:** Supabase Storage
- **Edge Functions:** Supabase Edge Functions
- **Payments:** Stripe Connect

### Mobile App (Reference)
- **Framework:** Expo SDK 53
- **UI:** NativeWind (Tailwind)
- **State:** React Query + Zustand
- **Navigation:** Expo Router

### Environment Variables

**Admin Console:**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ... (server-side only)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 11. Implementation Phases

### Phase 1: MVP Admin Console
1. Authentication with Supabase
2. Shared recipe CRUD
3. New content CRUD
4. Basic user list view

### Phase 2: User & Analytics
1. User management screens
2. Admin management
3. Basic analytics dashboard
4. Activity logging

### Phase 3: Social Management
1. Social activity dashboard
2. Featured content curation
3. Content moderation queue

### Phase 4: Creator Tools
1. Creator verification workflow
2. Creator management
3. Creator analytics

### Phase 5: Marketplace
1. Product management
2. Order management
3. Payout processing
4. Revenue analytics

### Phase 6: Advanced Features
1. Custom report builder
2. A/B testing tools
3. Automated moderation
4. Mobile admin app

---

## Quick Reference

### Make User Admin
```sql
UPDATE user_profiles
SET is_admin = true
WHERE user_id = 'USER_UUID_HERE';
```

### Verify Admin Status
```sql
SELECT user_id, display_name, is_admin
FROM user_profiles
WHERE is_admin = true;
```

### Find User by Email
```sql
SELECT u.id, u.email, p.display_name, p.is_admin
FROM auth.users u
JOIN user_profiles p ON p.user_id = u.id
WHERE u.email = 'user@example.com';
```

---

*This document consolidates SOCIAL_PLATFORM_ROADMAP.md, ADMIN_DASHBOARD_ROADMAP.md, and SUPABASE_SCHEMA.md for admin dashboard development.*
 