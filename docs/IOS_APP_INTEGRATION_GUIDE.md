# KitchenSync iOS App Integration Guide

> **For: iOS Development Team**
> **Platform:** KitchenSync - Social Culinary Platform
> **Admin Console:** kitchensync.vibecode.run
> **Last Updated:** February 2026

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Authentication (Supabase Auth)](#2-authentication-supabase-auth)
3. [Database Schema & Tables](#3-database-schema--tables)
4. [API Endpoints (Backend Server)](#4-api-endpoints-backend-server)
5. [Supabase Direct Access (Client-Side)](#5-supabase-direct-access-client-side)
6. [Row Level Security (RLS) Policies](#6-row-level-security-rls-policies)
7. [Storage Buckets](#7-storage-buckets)
8. [TypeScript Types (Reference for Swift Models)](#8-typescript-types-reference-for-swift-models)
9. [User Flows & Screens](#9-user-flows--screens)
10. [Real-Time Features](#10-real-time-features)
11. [Marketplace Integration](#11-marketplace-integration)
12. [Environment Configuration](#12-environment-configuration)
13. [Error Handling Conventions](#13-error-handling-conventions)
14. [Implementation Phases](#14-implementation-phases)

---

## 1. Architecture Overview

### System Architecture

```
iOS App (Swift/SwiftUI)
    |
    ├── Supabase Client SDK (direct DB access with RLS)
    │     ├── Authentication (sign up, sign in, sessions)
    │     ├── Database queries (PostgreSQL via PostgREST)
    │     ├── Realtime subscriptions (WebSocket)
    │     └── Storage (file uploads/downloads)
    |
    └── Backend API (Hono on Bun, port 3000)
          ├── Admin-only endpoints (/api/admin/*)
          ├── Stripe payment processing
          └── Server-side business logic
```

### Key Architectural Decisions

1. **Primary data access** is through the **Supabase Client SDK** with Row Level Security (RLS). The iOS app should use the `supabase-swift` SDK to query tables directly.
2. **Authentication** is handled by **Supabase Auth** (email/password, with potential OAuth expansion).
3. **Admin operations** go through the **backend API** at `https://kitchensync.vibecode.run` but regular user operations go directly through Supabase.
4. **RLS enforces authorization** at the database level - the iOS app doesn't need to implement most access control logic.
5. **Payments** use **Stripe Connect** for creator marketplace transactions.

### Supabase Project

| Property | Value |
|----------|-------|
| **Project URL** | `https://zzbkcusgonruqnvhuffv.supabase.co` |
| **Anon Key** | See environment configuration section |
| **Region** | Check Supabase dashboard |
| **Database** | PostgreSQL 15 |

---

## 2. Authentication (Supabase Auth)

### SDK Setup (supabase-swift)

```swift
import Supabase

let supabase = SupabaseClient(
    supabaseURL: URL(string: "https://zzbkcusgonruqnvhuffv.supabase.co")!,
    supabaseKey: "YOUR_ANON_KEY"  // See env config section
)
```

### Auth Methods

#### Sign Up
```
POST https://zzbkcusgonruqnvhuffv.supabase.co/auth/v1/signup
Content-Type: application/json

{
    "email": "user@example.com",
    "password": "securepassword"
}
```

**Behavior:** On signup, a database trigger automatically creates a `user_profiles` row for the new user with defaults:
- `kitchen_name`: "My Kitchen"
- `is_admin`: false
- `is_public`: true
- `measurement_system`: "imperial"
- `temperature_unit`: "fahrenheit"
- `default_servings`: 4

#### Sign In
```
POST https://zzbkcusgonruqnvhuffv.supabase.co/auth/v1/token?grant_type=password
Content-Type: application/json

{
    "email": "user@example.com",
    "password": "securepassword"
}
```

**Response:**
```json
{
    "access_token": "eyJ...",
    "token_type": "bearer",
    "expires_in": 3600,
    "refresh_token": "abc123",
    "user": {
        "id": "uuid",
        "email": "user@example.com",
        "created_at": "2026-01-01T00:00:00Z"
    }
}
```

#### Sign Out
```
POST https://zzbkcusgonruqnvhuffv.supabase.co/auth/v1/logout
Authorization: Bearer <access_token>
```

#### Session Management
- Access tokens expire after 1 hour
- Use refresh tokens to obtain new access tokens
- The Supabase Swift SDK handles token refresh automatically
- Listen for `onAuthStateChange` events to react to session changes

#### Admin Detection
After authentication, query `user_profiles` to check admin status:
```sql
SELECT is_admin FROM user_profiles WHERE user_id = <auth.uid()>
```

### User Roles

| Role | `is_admin` | How Identified |
|------|-----------|----------------|
| Regular User | `false` | Default for all users |
| Admin/Superadmin | `true` | Set manually in DB |
| Creator | `false` | Has row in `creator_profiles` with `is_verified = true` |

---

## 3. Database Schema & Tables

### 3.1 Core User Tables

#### `user_profiles`

Auto-created on signup via trigger. This is the primary user data table.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | auto | Primary key |
| `user_id` | UUID | - | References `auth.users(id)`, UNIQUE |
| `kitchen_name` | TEXT | "My Kitchen" | User's kitchen name |
| `display_name` | TEXT | null | Display name |
| `avatar_url` | TEXT | null | Profile image URL |
| `is_admin` | BOOLEAN | false | Admin flag |
| `bio` | TEXT | null | User bio (280 char max) |
| `website_url` | TEXT | null | Personal website link |
| `instagram_handle` | TEXT | null | Instagram username |
| `tiktok_handle` | TEXT | null | TikTok username |
| `youtube_handle` | TEXT | null | YouTube username |
| `is_public` | BOOLEAN | true | Profile visibility |
| `follower_count` | INTEGER | 0 | Cached follower count |
| `following_count` | INTEGER | 0 | Cached following count |
| `shared_recipe_count` | INTEGER | 0 | Cached shared recipe count |
| `measurement_system` | TEXT | "imperial" | "metric" or "imperial" |
| `prefer_weight_over_volume` | BOOLEAN | false | Weight preference |
| `temperature_unit` | TEXT | "fahrenheit" | "celsius" or "fahrenheit" |
| `show_nutritional_info` | BOOLEAN | true | Show nutrition toggle |
| `default_servings` | INTEGER | 4 | Default serving size |
| `enable_cooking_timers` | BOOLEAN | true | Timer feature toggle |
| `enable_shopping_reminders` | BOOLEAN | true | Reminder toggle |
| `is_suspended` | BOOLEAN | false | Suspension status |
| `suspended_at` | TIMESTAMPTZ | null | When suspended |
| `suspended_reason` | TEXT | null | Why suspended |
| `suspended_until` | TIMESTAMPTZ | null | Suspension expiry (null = permanent) |
| `last_content_viewed_at` | TIMESTAMPTZ | null | Last viewed content timestamp |
| `last_shared_recipes_viewed_at` | TIMESTAMPTZ | null | Last viewed shared recipes |
| `created_at` | TIMESTAMPTZ | NOW() | Account creation |
| `updated_at` | TIMESTAMPTZ | NOW() | Last profile update |

---

### 3.2 Recipe Tables

#### `recipes` (User Personal Recipes)

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | auto | Primary key |
| `user_id` | UUID | - | Owner (references `auth.users`) |
| `title` | VARCHAR(255) | - | Recipe title (required) |
| `description` | TEXT | null | Recipe description |
| `prep_time` | VARCHAR(50) | null | e.g., "15 min" |
| `cook_time` | VARCHAR(50) | null | e.g., "30 min" |
| `servings` | INTEGER | 4 | Serving count |
| `difficulty` | VARCHAR(20) | "Medium" | "Easy", "Medium", "Hard" |
| `image_url` | TEXT | null | Main recipe image |
| `is_ai_generated` | BOOLEAN | false | AI-generated flag |
| `created_at` | TIMESTAMPTZ | NOW() | Created timestamp |
| `updated_at` | TIMESTAMPTZ | NOW() | Updated timestamp |

#### `ingredients`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `recipe_id` | UUID | FK to `recipes(id)` ON DELETE CASCADE |
| `content` | TEXT | Ingredient text (required) |
| `sort_order` | INTEGER | Display order (default 0) |
| `created_at` | TIMESTAMPTZ | Created timestamp |

#### `instructions`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `recipe_id` | UUID | FK to `recipes(id)` ON DELETE CASCADE |
| `content` | TEXT | Instruction text (required) |
| `step_number` | INTEGER | Step number (required) |
| `created_at` | TIMESTAMPTZ | Created timestamp |

#### `recipe_photos`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `recipe_id` | UUID | FK to `recipes(id)` ON DELETE CASCADE |
| `url` | TEXT | Photo URL (required) |
| `sort_order` | INTEGER | Display order (default 0) |
| `created_at` | TIMESTAMPTZ | Created timestamp |

#### `tags` & `recipe_tags`

```
tags: id (UUID), name (VARCHAR(100) UNIQUE), created_at
recipe_tags: recipe_id (UUID), tag_id (UUID) — composite PK
```

---

### 3.3 Admin-Curated Content Tables

#### `shared_recipes` (Admin-Curated Recipes)

These are recipes curated/created by admins and shown to all users in the "Discover" or "Featured" sections.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | auto | Primary key |
| `title` | VARCHAR(255) | - | Required |
| `description` | TEXT | null | Recipe description |
| `prep_time` | VARCHAR(50) | null | Prep time string |
| `cook_time` | VARCHAR(50) | null | Cook time string |
| `servings` | INTEGER | 4 | Serving count |
| `difficulty` | VARCHAR(20) | "Medium" | "Easy", "Medium", "Hard" |
| `ingredients` | TEXT[] | {} | Array of ingredient strings |
| `instructions` | TEXT[] | {} | Array of instruction strings |
| `image_url` | TEXT | null | Primary image URL |
| `image_urls` | TEXT[] | {} | Additional image URLs |
| `tags` | TEXT[] | {} | Tag strings |
| `category` | VARCHAR(100) | null | See categories below |
| `is_featured` | BOOLEAN | false | Featured on homepage |
| `is_active` | BOOLEAN | true | Published status |
| `release_date` | TIMESTAMPTZ | NOW() | When to show to users |
| `view_count` | INTEGER | 0 | Total views |
| `save_count` | INTEGER | 0 | Total saves |
| `created_by` | UUID | - | Admin who created it |
| `created_at` | TIMESTAMPTZ | NOW() | Created timestamp |
| `updated_at` | TIMESTAMPTZ | NOW() | Updated timestamp |

**Categories:** `Weekly Pick`, `Seasonal`, `Quick & Easy`, `Holiday Special`, `Comfort Food`, `Healthy`, `Budget-Friendly`

#### `user_saved_shared_recipes`

Tracks which users have saved which admin-curated recipes.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK to `auth.users(id)` |
| `shared_recipe_id` | UUID | FK to `shared_recipes(id)` |
| `saved_at` | TIMESTAMPTZ | When saved |

UNIQUE constraint on `(user_id, shared_recipe_id)`.

#### `new_content` (Tips, Tutorials, Announcements)

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | auto | Primary key |
| `title` | VARCHAR(255) | - | Required |
| `description` | TEXT | - | Content body (required) |
| `video_url` | TEXT | null | Video link |
| `thumbnail_url` | TEXT | null | Thumbnail image |
| `content_type` | VARCHAR(50) | - | "tutorial", "tip", "feature", "announcement" |
| `is_active` | BOOLEAN | true | Published status |
| `created_at` | TIMESTAMPTZ | NOW() | Created timestamp |

---

### 3.4 Social Platform Tables

#### `user_follows`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `follower_id` | UUID | The user who follows |
| `following_id` | UUID | The user being followed |
| `created_at` | TIMESTAMPTZ | When followed |

UNIQUE on `(follower_id, following_id)`. Indexed on both columns.

#### `user_shared_recipes` (User-Shared to Community)

When a user shares their personal recipe to the community feed.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | auto | Primary key |
| `recipe_id` | UUID | - | FK to `recipes(id)`, UNIQUE |
| `user_id` | UUID | - | FK to `auth.users(id)` |
| `caption` | TEXT | null | Share caption |
| `is_public` | BOOLEAN | true | Visibility |
| `view_count` | INTEGER | 0 | Total views |
| `save_count` | INTEGER | 0 | Total saves |
| `like_count` | INTEGER | 0 | Total likes |
| `comment_count` | INTEGER | 0 | Total comments |
| `created_at` | TIMESTAMPTZ | NOW() | Shared timestamp |
| `updated_at` | TIMESTAMPTZ | NOW() | Updated timestamp |

#### `recipe_likes`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Who liked |
| `shared_recipe_id` | UUID | FK to `user_shared_recipes(id)` |
| `created_at` | TIMESTAMPTZ | When liked |

UNIQUE on `(user_id, shared_recipe_id)`.

#### `recipe_saves`

Same structure as `recipe_likes` — tracks saves/bookmarks.

#### `recipe_comments`

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | auto | Primary key |
| `shared_recipe_id` | UUID | - | FK to `user_shared_recipes(id)` |
| `user_id` | UUID | - | FK to `auth.users(id)` |
| `parent_comment_id` | UUID | null | FK to self (threaded replies) |
| `content` | TEXT | - | Comment text (required) |
| `like_count` | INTEGER | 0 | Cached like count |
| `is_edited` | BOOLEAN | false | Edited flag |
| `is_deleted` | BOOLEAN | false | Soft delete flag |
| `created_at` | TIMESTAMPTZ | NOW() | Created |
| `updated_at` | TIMESTAMPTZ | NOW() | Updated |

#### `comment_likes`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Who liked |
| `comment_id` | UUID | FK to `recipe_comments(id)` |
| `created_at` | TIMESTAMPTZ | When liked |

UNIQUE on `(user_id, comment_id)`.

#### `recipe_ratings`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `shared_recipe_id` | UUID | FK to `user_shared_recipes(id)` |
| `user_id` | UUID | FK to `auth.users(id)` |
| `rating` | INTEGER | 1-5 (CHECK constraint) |
| `review` | TEXT | Optional review text |
| `created_at` | TIMESTAMPTZ | Created |
| `updated_at` | TIMESTAMPTZ | Updated |

UNIQUE on `(user_id, shared_recipe_id)`.

#### `notifications`

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | auto | Primary key |
| `user_id` | UUID | - | Notification recipient |
| `type` | TEXT | - | "follow", "like", "comment", "mention", "repost", "new_recipe" |
| `actor_id` | UUID | null | Who triggered the notification |
| `target_type` | TEXT | null | "recipe", "user", "comment" |
| `target_id` | UUID | null | ID of the target |
| `message` | TEXT | null | Display message |
| `is_read` | BOOLEAN | false | Read status |
| `created_at` | TIMESTAMPTZ | NOW() | Created |

Indexed on `(user_id, is_read, created_at DESC)`.

#### `recipe_collections`

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | auto | Primary key |
| `user_id` | UUID | - | Collection owner |
| `title` | TEXT | - | Collection name (required) |
| `description` | TEXT | null | Description |
| `cover_image_url` | TEXT | null | Cover image |
| `is_public` | BOOLEAN | true | Visibility |
| `save_count` | INTEGER | 0 | Times saved by others |
| `created_at` | TIMESTAMPTZ | NOW() | Created |
| `updated_at` | TIMESTAMPTZ | NOW() | Updated |

#### `collection_items`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `collection_id` | UUID | FK to `recipe_collections(id)` |
| `shared_recipe_id` | UUID | FK to `user_shared_recipes(id)` |
| `sort_order` | INTEGER | Display order (default 0) |
| `created_at` | TIMESTAMPTZ | Created |

#### `hashtags` & `recipe_hashtags`

```
hashtags: id, tag (TEXT UNIQUE), use_count (INTEGER), trending_score (FLOAT), created_at
recipe_hashtags: id, shared_recipe_id (UUID), hashtag_id (UUID) — UNIQUE pair
```

#### `feed_events`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | User who created the event |
| `event_type` | TEXT | "shared_recipe", "liked_recipe", "new_follower", "comment" |
| `target_type` | TEXT | "recipe", "user", "comment" |
| `target_id` | UUID | ID of the target |
| `metadata` | JSONB | Additional event data |
| `created_at` | TIMESTAMPTZ | Event timestamp |

Indexed on `user_id` and `created_at DESC`.

---

### 3.5 Creator & Marketplace Tables

#### `creator_profiles`

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | auto | Primary key |
| `user_id` | UUID | - | FK to `auth.users(id)`, UNIQUE |
| `is_verified` | BOOLEAN | false | Verification status |
| `verification_date` | TIMESTAMPTZ | null | When verified |
| `creator_tier` | TEXT | "basic" | "basic", "pro", "partner" |
| `specialty_tags` | TEXT[] | null | Creator specialties |
| `featured_recipe_id` | UUID | null | Pinned recipe |
| `about_text` | TEXT | null | Extended bio |
| `banner_image_url` | TEXT | null | Profile banner |
| `contact_email` | TEXT | null | Business email |
| `business_name` | TEXT | null | Business/brand name |
| `stripe_account_id` | TEXT | null | Stripe Connect ID |
| `commission_rate` | DECIMAL | 0.15 | Platform commission (15%) |
| `created_at` | TIMESTAMPTZ | NOW() | Created |
| `updated_at` | TIMESTAMPTZ | NOW() | Updated |

#### `creator_verification_requests`

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | auto | Primary key |
| `user_id` | UUID | - | Requesting user |
| `status` | TEXT | "pending" | "pending", "approved", "rejected" |
| `portfolio_url` | TEXT | null | Link to work |
| `social_proof` | TEXT | null | Social media evidence |
| `reason` | TEXT | null | Why they want verification |
| `admin_notes` | TEXT | null | Admin review notes |
| `reviewed_by` | UUID | null | Admin who reviewed |
| `created_at` | TIMESTAMPTZ | NOW() | Submitted |
| `reviewed_at` | TIMESTAMPTZ | null | When reviewed |

#### `products`

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | auto | Primary key |
| `creator_id` | UUID | - | FK to `creator_profiles(id)` |
| `title` | TEXT | - | Product name (required) |
| `description` | TEXT | null | Full description |
| `short_description` | TEXT | null | Brief description |
| `price_cents` | INTEGER | - | Price in cents (required) |
| `currency` | TEXT | "USD" | Currency code |
| `image_urls` | TEXT[] | null | Product images |
| `category` | TEXT | null | "spice", "sauce", "tool", "book", "course", "kit" |
| `tags` | TEXT[] | null | Product tags |
| `inventory_count` | INTEGER | null | Stock level |
| `is_active` | BOOLEAN | true | Published status |
| `is_digital` | BOOLEAN | false | Digital product flag |
| `digital_download_url` | TEXT | null | Download link |
| `created_at` | TIMESTAMPTZ | NOW() | Created |
| `updated_at` | TIMESTAMPTZ | NOW() | Updated |

#### `product_variants`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `product_id` | UUID | FK to `products(id)` |
| `name` | TEXT | Variant name (required) |
| `price_cents` | INTEGER | Variant price (required) |
| `inventory_count` | INTEGER | Variant stock |
| `sku` | TEXT | Stock keeping unit |

#### `cart_items`

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | auto | Primary key |
| `user_id` | UUID | - | Cart owner |
| `product_id` | UUID | - | FK to `products(id)` |
| `variant_id` | UUID | null | FK to `product_variants(id)` |
| `quantity` | INTEGER | 1 | Item quantity |
| `created_at` | TIMESTAMPTZ | NOW() | Added to cart |

#### `orders`

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | auto | Primary key |
| `order_number` | TEXT | - | Unique order number |
| `user_id` | UUID | - | Customer |
| `creator_id` | UUID | - | FK to `creator_profiles(id)` |
| `status` | TEXT | "pending" | "pending", "paid", "shipped", "delivered", "cancelled" |
| `subtotal_cents` | INTEGER | null | Subtotal |
| `shipping_cents` | INTEGER | null | Shipping cost |
| `tax_cents` | INTEGER | null | Tax amount |
| `total_cents` | INTEGER | null | Grand total |
| `shipping_address` | JSONB | null | See ShippingAddress type |
| `stripe_payment_intent_id` | TEXT | null | Stripe PI ID |
| `created_at` | TIMESTAMPTZ | NOW() | Order placed |
| `updated_at` | TIMESTAMPTZ | NOW() | Last status update |

**`shipping_address` JSONB shape:**
```json
{
    "name": "John Doe",
    "line1": "123 Main St",
    "line2": "Apt 4B",
    "city": "New York",
    "state": "NY",
    "postal_code": "10001",
    "country": "US"
}
```

#### `order_items`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `order_id` | UUID | FK to `orders(id)` |
| `product_id` | UUID | FK to `products(id)` |
| `variant_id` | UUID | FK to `product_variants(id)` |
| `quantity` | INTEGER | Item quantity |
| `price_cents` | INTEGER | Price at time of purchase |

#### `creator_payouts`

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | auto | Primary key |
| `creator_id` | UUID | - | FK to `creator_profiles(id)` |
| `amount_cents` | INTEGER | null | Payout amount |
| `currency` | TEXT | "USD" | Currency |
| `status` | TEXT | "pending" | "pending", "processing", "completed", "failed" |
| `stripe_transfer_id` | TEXT | null | Stripe Transfer ID |
| `period_start` | TIMESTAMPTZ | null | Earnings period start |
| `period_end` | TIMESTAMPTZ | null | Earnings period end |
| `processed_by` | UUID | null | Admin who processed |
| `failure_reason` | TEXT | null | Reason for failure |
| `created_at` | TIMESTAMPTZ | NOW() | Created |
| `processed_at` | TIMESTAMPTZ | null | When processed |

#### `creator_earnings`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `creator_id` | UUID | FK to `creator_profiles(id)` |
| `order_id` | UUID | FK to `orders(id)` |
| `gross_amount_cents` | INTEGER | Total before fees |
| `platform_fee_cents` | INTEGER | Platform commission |
| `net_amount_cents` | INTEGER | Creator receives |
| `payout_id` | UUID | FK to `creator_payouts(id)`, null until paid |
| `created_at` | TIMESTAMPTZ | Earned timestamp |

---

### 3.6 Analytics & Moderation Tables

#### `content_views`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Who viewed |
| `content_type` | TEXT | Type of content viewed |
| `content_id` | UUID | ID of content viewed |
| `viewed_at` | TIMESTAMPTZ | View timestamp |
| `source` | TEXT | "auto_popup", "tips_screen", "bell_icon" |
| `duration_seconds` | INTEGER | Time spent viewing |

#### `content_reports`

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | auto | Primary key |
| `reporter_id` | UUID | - | Who reported |
| `content_type` | TEXT | - | "recipe", "comment", "user", "product" |
| `content_id` | UUID | - | ID of reported content |
| `reason` | TEXT | - | "spam", "inappropriate", "copyright", "harassment", "other" |
| `description` | TEXT | null | Additional details |
| `status` | TEXT | "pending" | "pending", "reviewed", "actioned", "dismissed" |
| `reviewed_by` | UUID | null | Admin reviewer |
| `action_taken` | TEXT | null | What was done |
| `created_at` | TIMESTAMPTZ | NOW() | Reported |
| `reviewed_at` | TIMESTAMPTZ | null | When reviewed |

#### `admin_activity_log`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `admin_user_id` | UUID | Admin who acted |
| `action` | TEXT | Action type (see enum below) |
| `target_type` | TEXT | "recipe", "content", "user", "admin", "report", "product", "order", "payout" |
| `target_id` | TEXT | ID of target |
| `target_name` | TEXT | Human-readable target name |
| `metadata` | JSONB | Additional action data |
| `created_at` | TIMESTAMPTZ | Action timestamp |

#### `user_suspensions`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Suspended user |
| `reason` | TEXT | Suspension reason |
| `suspended_by` | UUID | Admin who suspended |
| `suspended_at` | TIMESTAMPTZ | When suspended |
| `expires_at` | TIMESTAMPTZ | null = permanent |
| `lifted_at` | TIMESTAMPTZ | null if still suspended |
| `lifted_by` | UUID | Admin who lifted |

#### `user_onboarding`

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | auto | Primary key |
| `user_id` | UUID | - | User |
| `completed_at` | TIMESTAMPTZ | null | When completed |
| `skipped` | BOOLEAN | false | If onboarding was skipped |
| `created_at` | TIMESTAMPTZ | NOW() | Created |

#### `platform_settings`

```
key (TEXT PK), value (JSONB), updated_by (UUID), updated_at (TIMESTAMPTZ)
```

#### `feature_flags`

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | auto | Primary key |
| `name` | TEXT | - | Flag name (UNIQUE) |
| `description` | TEXT | null | What it controls |
| `is_enabled` | BOOLEAN | false | Global toggle |
| `rollout_percentage` | INTEGER | 0 | Gradual rollout (0-100) |
| `target_users` | UUID[] | null | Specific user targeting |
| `created_at` | TIMESTAMPTZ | NOW() | Created |
| `updated_at` | TIMESTAMPTZ | NOW() | Updated |

---

## 4. API Endpoints (Backend Server)

**Base URL:** `https://kitchensync.vibecode.run`

### Health Check
```
GET /health
Response: { "status": "ok" }
```

### Response Envelope Convention

All API endpoints (except auth) return responses in this envelope:
```json
{
    "data": <T>
}
```

Errors return:
```json
{
    "error": {
        "message": "Human-readable error message",
        "code": "ERROR_CODE"
    }
}
```

### Admin Endpoints (Not Used by iOS App Directly)

These are consumed by the admin web console. Listed for reference:

```
POST   /api/auth/admin/login
POST   /api/auth/admin/logout
GET    /api/auth/admin/me

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

GET    /api/admin/users
GET    /api/admin/users/:id
PUT    /api/admin/users/:id
POST   /api/admin/users/:id/suspend
POST   /api/admin/users/:id/unsuspend
DELETE /api/admin/users/:id

GET    /api/admin/analytics/overview
GET    /api/admin/analytics/users
GET    /api/admin/analytics/content
GET    /api/admin/analytics/revenue

GET    /api/admin/moderation/queue
POST   /api/admin/moderation/reports/:id/action

GET    /api/admin/creators
GET    /api/admin/creators/verification
POST   /api/admin/creators/verification/:id/approve
POST   /api/admin/creators/verification/:id/reject

GET    /api/admin/products
GET    /api/admin/orders
PUT    /api/admin/orders/:id/status
GET    /api/admin/payouts
POST   /api/admin/payouts/process
```

### iOS App Endpoints (To Be Built)

The iOS app should primarily use Supabase direct access. Backend endpoints for iOS would be needed for:

1. **Stripe Payment Processing** - Creating payment intents, checkout sessions
2. **Order Processing** - Server-side order validation and creation
3. **Push Notifications** - Registering device tokens, sending notifications
4. **Image Processing** - Server-side image resizing/optimization

Suggested iOS-facing API routes to implement:

```
POST   /api/checkout/create-payment-intent
POST   /api/checkout/confirm-order
POST   /api/notifications/register-device
POST   /api/notifications/preferences
GET    /api/feed/personalized          (algorithmically ranked)
GET    /api/search/recipes?q=          (full-text search)
GET    /api/search/users?q=            (user search)
GET    /api/trending/hashtags          (trending content)
```

---

## 5. Supabase Direct Access (Client-Side)

The iOS app should use the **Supabase Swift SDK** for most data operations. Here are the key query patterns:

### Profile Operations

```swift
// Get current user profile
let profile = try await supabase
    .from("user_profiles")
    .select()
    .eq("user_id", userId)
    .single()
    .execute()

// Update profile
try await supabase
    .from("user_profiles")
    .update(["display_name": "New Name", "bio": "New bio"])
    .eq("user_id", userId)
    .execute()
```

### Recipe Operations

```swift
// Get user's personal recipes with ingredients and instructions
let recipes = try await supabase
    .from("recipes")
    .select("*, ingredients(*), instructions(*), recipe_photos(*), recipe_tags(tag_id, tags(name))")
    .eq("user_id", userId)
    .order("created_at", ascending: false)
    .execute()

// Create a recipe
let newRecipe = try await supabase
    .from("recipes")
    .insert(["title": "My Recipe", "user_id": userId, "description": "..."])
    .select()
    .single()
    .execute()
```

### Social Feed

```swift
// Get community feed (shared recipes from followed users)
let feed = try await supabase
    .from("user_shared_recipes")
    .select("*, recipes(*, ingredients(*), instructions(*)), user_profiles!user_id(display_name, avatar_url)")
    .eq("is_public", true)
    .order("created_at", ascending: false)
    .limit(20)
    .execute()

// Like a recipe
try await supabase
    .from("recipe_likes")
    .insert(["user_id": userId, "shared_recipe_id": recipeId])
    .execute()

// Unlike (delete)
try await supabase
    .from("recipe_likes")
    .delete()
    .eq("user_id", userId)
    .eq("shared_recipe_id", recipeId)
    .execute()
```

### Follow System

```swift
// Follow a user
try await supabase
    .from("user_follows")
    .insert(["follower_id": currentUserId, "following_id": targetUserId])
    .execute()

// Get followers
let followers = try await supabase
    .from("user_follows")
    .select("follower_id, user_profiles!follower_id(display_name, avatar_url)")
    .eq("following_id", userId)
    .execute()

// Check if following
let isFollowing = try await supabase
    .from("user_follows")
    .select("id", head: true, count: .exact)
    .eq("follower_id", currentUserId)
    .eq("following_id", targetUserId)
    .execute()
```

### Discover (Admin-Curated Content)

```swift
// Get active shared recipes (visible to all users)
let featured = try await supabase
    .from("shared_recipes")
    .select()
    .eq("is_active", true)
    .lte("release_date", Date().ISO8601Format())
    .order("is_featured", ascending: false)
    .order("created_at", ascending: false)
    .execute()

// Save a shared recipe
try await supabase
    .from("user_saved_shared_recipes")
    .insert(["user_id": userId, "shared_recipe_id": recipeId])
    .execute()

// Get tips and tutorials
let tips = try await supabase
    .from("new_content")
    .select()
    .eq("is_active", true)
    .order("created_at", ascending: false)
    .execute()
```

### Notifications

```swift
// Get unread notifications
let notifications = try await supabase
    .from("notifications")
    .select("*, user_profiles!actor_id(display_name, avatar_url)")
    .eq("user_id", userId)
    .order("created_at", ascending: false)
    .limit(50)
    .execute()

// Mark as read
try await supabase
    .from("notifications")
    .update(["is_read": true])
    .eq("id", notificationId)
    .execute()

// Get unread count
let count = try await supabase
    .from("notifications")
    .select("id", head: true, count: .exact)
    .eq("user_id", userId)
    .eq("is_read", false)
    .execute()
```

### Content Reporting

```swift
// Report content
try await supabase
    .from("content_reports")
    .insert([
        "reporter_id": userId,
        "content_type": "recipe",
        "content_id": recipeId,
        "reason": "spam",
        "description": "Optional details"
    ])
    .execute()
```

### Content View Tracking

```swift
// Track a content view
try await supabase
    .from("content_views")
    .insert([
        "user_id": userId,
        "content_type": "shared_recipe",
        "content_id": contentId,
        "source": "tips_screen",
        "duration_seconds": 15
    ])
    .execute()
```

### Marketplace Browsing

```swift
// Browse active products
let products = try await supabase
    .from("products")
    .select("*, product_variants(*), creator_profiles!creator_id(user_id, user_profiles!user_id(display_name, avatar_url))")
    .eq("is_active", true)
    .order("created_at", ascending: false)
    .execute()

// Get user's orders
let orders = try await supabase
    .from("orders")
    .select("*, order_items(*, products(title, image_urls))")
    .eq("user_id", userId)
    .order("created_at", ascending: false)
    .execute()

// Cart management
try await supabase
    .from("cart_items")
    .insert(["user_id": userId, "product_id": productId, "quantity": 1])
    .execute()

let cartItems = try await supabase
    .from("cart_items")
    .select("*, products(title, price_cents, image_urls, creator_id)")
    .eq("user_id", userId)
    .execute()
```

---

## 6. Row Level Security (RLS) Policies

All tables have RLS enabled. Here's a summary of what each user role can do:

### Regular Users Can:

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `user_profiles` | Own profile + public profiles | Auto (trigger) | Own profile only | No |
| `recipes` | Own recipes | Own recipes | Own recipes | Own recipes |
| `ingredients` | Own recipe's | Own recipe's | Own recipe's | Own recipe's |
| `instructions` | Own recipe's | Own recipe's | Own recipe's | Own recipe's |
| `shared_recipes` | Active + released only | No | No | No |
| `new_content` | Active only | No | No | No |
| `user_follows` | All | Own follows | No | Own follows |
| `user_shared_recipes` | Public ones | Own | Own | Own |
| `recipe_likes` | All | Own | No | Own |
| `recipe_saves` | All | Own | No | Own |
| `recipe_comments` | All | Own | Own | Own (soft delete) |
| `notifications` | Own | System only | Own (mark read) | No |
| `content_views` | No | Own | No | No |
| `content_reports` | No | Own (reporter_id = self) | No | No |
| `products` | Active only | No (creators via own policy) | No | No |
| `cart_items` | Own | Own | Own | Own |
| `orders` | Own | Via backend only | No | No |
| `creator_profiles` | Verified only | No | No | No |

### Key RLS Helper Function

```sql
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
```

### Suspension Check

The iOS app should check `is_suspended` on the user's profile after login. If `true`:
- Show a suspension message with `suspended_reason`
- If `suspended_until` is set and in the past, the suspension may have expired
- Prevent posting, commenting, and social interactions while suspended

---

## 7. Storage Buckets

All buckets are public (readable without auth). Uploads require authentication.

| Bucket | Purpose | Path Pattern |
|--------|---------|-------------|
| `avatars` | Profile pictures | `avatars/{user_id}/{filename}` |
| `recipe-photos` | User recipe images | `recipe-photos/{user_id}/{recipe_id}/{filename}` |
| `recipe-assets` | Admin shared recipe images | `recipe-assets/{filename}` |
| `videos` | Tutorial/tip videos | `videos/{filename}` |
| `products` | Marketplace product images | `products/{creator_id}/{product_id}/{filename}` |

### Upload Example

```swift
let imageData: Data = // ... image data
let filePath = "avatars/\(userId)/avatar.jpg"

try await supabase.storage
    .from("avatars")
    .upload(
        path: filePath,
        file: imageData,
        options: FileOptions(contentType: "image/jpeg", upsert: true)
    )

// Get public URL
let publicURL = supabase.storage
    .from("avatars")
    .getPublicURL(path: filePath)
```

---

## 8. TypeScript Types (Reference for Swift Models)

Use these to create corresponding Swift `Codable` structs. All IDs are UUIDs. All timestamps are ISO 8601 strings.

### Enums

```swift
// Admin roles
enum AdminRole: String, Codable {
    case superadmin, admin, content_editor
}

// Recipe difficulty
enum RecipeDifficulty: String, Codable {
    case easy = "Easy"
    case medium = "Medium"
    case hard = "Hard"
}

// Shared recipe categories
enum RecipeCategory: String, Codable {
    case weeklyPick = "Weekly Pick"
    case seasonal = "Seasonal"
    case quickAndEasy = "Quick & Easy"
    case holidaySpecial = "Holiday Special"
    case comfortFood = "Comfort Food"
    case healthy = "Healthy"
    case budgetFriendly = "Budget-Friendly"
}

// Content types
enum ContentType: String, Codable {
    case tutorial, tip, feature, announcement
}

// Report reasons
enum ReportReason: String, Codable {
    case spam, inappropriate, copyright, harassment, other
}

// Report status
enum ReportStatus: String, Codable {
    case pending, reviewed, actioned, dismissed
}

// Product categories
enum ProductCategory: String, Codable {
    case spice, sauce, tool, book, course, kit
}

// Order status
enum OrderStatus: String, Codable {
    case pending, paid, shipped, delivered, cancelled
}

// Payout status
enum PayoutStatus: String, Codable {
    case pending, processing, completed, failed
}

// Notification types
enum NotificationType: String, Codable {
    case follow, like, comment, mention, repost, new_recipe
}

// Creator tiers
enum CreatorTier: String, Codable {
    case basic, pro, partner
}

// Measurement system
enum MeasurementSystem: String, Codable {
    case metric, imperial
}

// Temperature unit
enum TemperatureUnit: String, Codable {
    case celsius, fahrenheit
}
```

---

## 9. User Flows & Screens

### Recommended iOS Screen Architecture

```
TabBar
├── Home (Feed)
│   ├── Following Feed
│   ├── Explore/Discover Feed
│   └── Recipe Detail
│       ├── Comments
│       ├── Ratings
│       └── Related Products
│
├── Search
│   ├── Recipe Search
│   ├── User Search
│   ├── Hashtag Search
│   └── Trending
│
├── Create (+)
│   ├── New Recipe
│   │   ├── Title/Description
│   │   ├── Ingredients Editor
│   │   ├── Instructions Editor
│   │   ├── Photos
│   │   └── Tags/Difficulty
│   └── Share to Community
│
├── Notifications
│   ├── Activity List
│   └── Notification Preferences
│
└── Profile
    ├── My Recipes
    ├── Saved Recipes
    ├── Collections
    ├── Followers/Following
    ├── Settings
    │   ├── Profile Edit
    │   ├── Kitchen Settings
    │   ├── Measurement Preferences
    │   └── Privacy Settings
    └── Creator Dashboard (if verified)
        ├── Analytics
        ├── Products
        └── Earnings

+ Marketplace (could be tab or section)
    ├── Product Browse
    ├── Product Detail
    ├── Cart
    ├── Checkout (Stripe)
    └── Order History
```

### Key User Flows

#### 1. Onboarding Flow
1. Sign up with email/password
2. Profile setup (display name, avatar, kitchen name)
3. Preferences (measurement system, temperature unit)
4. Interest selection (follow suggested creators/topics)
5. Mark onboarding complete in `user_onboarding` table

#### 2. Recipe Creation Flow
1. Enter title, description
2. Add ingredients (ordered list)
3. Add instructions (numbered steps)
4. Add photos (main + additional)
5. Set difficulty, servings, prep/cook time
6. Add tags
7. Save to `recipes` table
8. Optionally share to community (`user_shared_recipes`)

#### 3. Social Interaction Flow
1. View community feed (`user_shared_recipes` + `recipes` join)
2. Like/save/comment on recipes
3. View user profiles, follow/unfollow
4. Receive notifications for interactions
5. Report inappropriate content

#### 4. Marketplace Purchase Flow
1. Browse products from creator profiles or recipe pages
2. Add to cart (`cart_items`)
3. Checkout via backend API (creates Stripe payment intent)
4. Backend creates `order` and `order_items`
5. Creator fulfills order
6. Track order status

#### 5. Creator Verification Flow
1. User submits verification request with portfolio and social proof
2. Admin reviews in admin console
3. On approval: `creator_profiles` row created, `is_verified = true`
4. Creator can now add products and access creator dashboard

---

## 10. Real-Time Features

Supabase Realtime can be used for live updates:

### Recommended Subscriptions

```swift
// Listen for new notifications
let notificationChannel = supabase.realtime
    .channel("notifications:\(userId)")
    .onPostgresChange(
        event: .insert,
        schema: "public",
        table: "notifications",
        filter: "user_id=eq.\(userId)"
    ) { change in
        // Update notification badge, show in-app alert
    }
    .subscribe()

// Listen for new comments on a recipe you're viewing
let commentChannel = supabase.realtime
    .channel("comments:\(sharedRecipeId)")
    .onPostgresChange(
        event: .insert,
        schema: "public",
        table: "recipe_comments",
        filter: "shared_recipe_id=eq.\(sharedRecipeId)"
    ) { change in
        // Append new comment to list
    }
    .subscribe()

// Listen for like count updates
let likeChannel = supabase.realtime
    .channel("likes:\(sharedRecipeId)")
    .onPostgresChange(
        event: .all,
        schema: "public",
        table: "recipe_likes",
        filter: "shared_recipe_id=eq.\(sharedRecipeId)"
    ) { change in
        // Update like count UI
    }
    .subscribe()
```

### When to Use Realtime vs Polling

| Feature | Approach |
|---------|----------|
| Notifications badge | Realtime subscription |
| Recipe detail (comments, likes) | Realtime while viewing |
| Feed | Polling with pull-to-refresh |
| Order status | Realtime subscription on active orders |
| Profile counters | Polling on profile view |

---

## 11. Marketplace Integration

### Stripe Setup

- **Platform:** Stripe Connect (Standard accounts for creators)
- **Creator onboarding:** Stripe Connect onboarding URL generated by backend
- **Payments:** PaymentIntent API via backend

### Payment Flow

```
iOS App                     Backend                      Stripe
   |                           |                           |
   |-- POST /checkout/create --|                           |
   |   { items, shipping }     |-- Create PaymentIntent --|
   |                           |                           |
   |<- { clientSecret, orderId }                           |
   |                           |                           |
   |-- Stripe SDK confirm -----|--------------------------|
   |   (card details)          |                           |
   |                           |<-- Webhook: payment ----  |
   |                           |    succeeded               |
   |                           |-- Update order status     |
   |                           |-- Create creator_earnings |
   |<- Order confirmation      |                           |
```

### Commission Structure

| Creator Tier | Commission Rate | Creator Receives |
|-------------|----------------|-----------------|
| Basic | 15% | 85% of sale |
| Pro | 12% | 88% of sale |
| Partner | 10% | 90% of sale |

---

## 12. Environment Configuration

### Supabase Credentials

| Variable | Value |
|----------|-------|
| **Supabase URL** | `https://zzbkcusgonruqnvhuffv.supabase.co` |
| **Anon Key (Dev)** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6YmtjdXNnb25ydXFudmh1ZmZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNzkzMDIsImV4cCI6MjA4MjY1NTMwMn0.4_5rwiRhqlr8MsEaHeBGEzAD5tvV_6VuXd-GhA-kqkQ` |
| **Anon Key (Prod)** | `sb_publishable_upGYZ4OH8bpt8wDA2oCejw_Ct07_8st` |

> **Note:** The anon key is safe to embed in client apps. It only grants access permitted by RLS policies. Never embed the service_role key in client apps.

### Backend API

| Variable | Value |
|----------|-------|
| **Backend URL (Prod)** | `https://kitchensync.vibecode.run` |
| **Backend URL (Dev)** | `http://localhost:3000` |

### CORS

The backend allows these origins:
- `http://localhost:*`
- `http://127.0.0.1:*`
- `https://*.dev.vibecode.run`
- `https://*.vibecode.run`

For the iOS app, requests to the backend should include `credentials: include` equivalent (cookies). The Supabase SDK handles its own authentication headers.

---

## 13. Error Handling Conventions

### Supabase Errors

The Supabase SDK returns errors in this shape:
```json
{
    "message": "new row violates row-level security policy for table \"recipes\"",
    "code": "42501",
    "hint": null,
    "details": null
}
```

Common error codes:
- `42501` - RLS policy violation (unauthorized)
- `23505` - Unique constraint violation (duplicate)
- `23503` - Foreign key violation
- `PGRST116` - No rows found (when using `.single()`)

### Backend API Errors

```json
{
    "error": {
        "message": "Unauthorized",
        "code": "UNAUTHORIZED"
    }
}
```

HTTP status codes:
- `200` - Success
- `201` - Created
- `204` - No Content (no body)
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict (duplicate)
- `422` - Validation Error
- `500` - Server Error

### Suspension Handling

After login, always check:
```swift
if profile.is_suspended == true {
    if let until = profile.suspended_until, until < Date() {
        // Suspension expired - may need backend to clear it
    } else {
        // Show suspension screen with reason
        showSuspensionScreen(reason: profile.suspended_reason)
    }
}
```

---

## 14. Implementation Phases

### Phase 1: Core (MVP)
- [ ] Supabase auth (signup, signin, signout, session management)
- [ ] User profile CRUD
- [ ] Personal recipe CRUD (with ingredients, instructions, photos, tags)
- [ ] View admin-curated shared recipes
- [ ] Save shared recipes
- [ ] View tips & tutorials (`new_content`)
- [ ] Kitchen settings (measurement, temperature preferences)
- [ ] Onboarding flow

### Phase 2: Social Foundation
- [ ] Follow/unfollow users
- [ ] Share recipes to community
- [ ] Community feed (following + explore)
- [ ] Like recipes
- [ ] Save/bookmark recipes
- [ ] View counts tracking
- [ ] User search and discovery
- [ ] Public profile pages

### Phase 3: Engagement
- [ ] Comments (threaded)
- [ ] Ratings & reviews
- [ ] In-app notifications (with realtime)
- [ ] @mentions
- [ ] Content reporting
- [ ] Recipe collections

### Phase 4: Discovery
- [ ] Hashtags
- [ ] Trending content
- [ ] Full-text search
- [ ] Personalized feed algorithm (backend)
- [ ] Featured creators section

### Phase 5: Marketplace
- [ ] Browse products
- [ ] Product detail pages
- [ ] Shopping cart
- [ ] Stripe checkout integration
- [ ] Order tracking
- [ ] Order history
- [ ] Creator stores

### Phase 6: Creator Tools
- [ ] Creator verification request submission
- [ ] Creator dashboard (analytics)
- [ ] Product management (create/edit/delete)
- [ ] Earnings view
- [ ] Payout history
- [ ] Stripe Connect onboarding

---

## Appendix: Database RPC Functions

### `get_admin_dashboard_stats()`

Admin-only function. Returns platform statistics:

```json
{
    "total_users": 1000,
    "total_recipes": 5000,
    "shared_recipes": 200,
    "active_tips": 15,
    "total_menus": 0,
    "total_lists": 0,
    "suspended_users": 5,
    "active_users": 995
}
```

### `is_admin()`

Returns `boolean`. Checks if the current authenticated user has `is_admin = true` in `user_profiles`. Used internally by RLS policies.

---

## Appendix: Recommended Swift Dependencies

| Package | Purpose |
|---------|---------|
| `supabase-swift` | Supabase client SDK (auth, database, storage, realtime) |
| `stripe-ios` | Stripe payments SDK |
| `Kingfisher` or `SDWebImageSwiftUI` | Async image loading/caching |
| `swift-dependencies` | Dependency injection |

---

*This document is a living reference. As new backend endpoints and database tables are added, this guide should be updated accordingly.*
