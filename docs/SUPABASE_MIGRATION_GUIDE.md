# KitchenSync Supabase Migration Guide

## Overview

This guide walks through migrating the KitchenSync commercial platform from local SQLite to Supabase PostgreSQL, enabling both the web console and iOS app to share the same database.

## Prerequisites

- Supabase project (create at https://supabase.com)
- Supabase project URL and anon key
- Access to Supabase SQL Editor

## Step 1: Create Database Tables

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Copy the contents of `docs/commercial-platform-migration.sql`
4. Paste into the SQL Editor
5. Click **Run** to execute

This creates all 19 tables:
- `commercial_users`
- `business_accounts`
- `business_team_members`
- `business_hours`
- `business_activity_log`
- `restaurant_tables`
- `reservation_settings`
- `reservations`
- `menu_categories`
- `menu_items`
- `menu_modifier_groups`
- `menu_modifiers`
- `orders`
- `order_items`
- `customers`
- `customer_activities`
- `loyalty_points`
- `loyalty_transactions`
- `loyalty_settings`

## Step 2: Seed Sample Data

1. In Supabase SQL Editor
2. Copy contents of `docs/commercial-platform-seed.sql`
3. Paste and **Run**

This creates:
- 4 sample users
- 4 businesses (Coq au Vin, Golden Fork, Sunrise Farm, Bean & Leaf)
- Business hours for each
- 10 restaurant tables
- Reservation settings
- Full menus with categories, items, and modifiers
- Loyalty program settings

## Step 3: Get Supabase Connection Details

1. Go to **Settings** > **Database**
2. Find the **Connection string** section
3. Copy the **URI** (starts with `postgresql://`)

Example:
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

## Step 4: Update Backend Configuration

### Option A: Direct Supabase Connection (Recommended)

Update `backend/.env`:

```env
# Change from SQLite to PostgreSQL
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Add Supabase keys (for future direct client usage)
SUPABASE_URL="https://[PROJECT-REF].supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

### Update Prisma Schema

Edit `backend/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"  // Changed from "sqlite"
  url      = env("DATABASE_URL")
}

// Update model names to match Supabase snake_case tables
// Add @@map directives to each model

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String?
  avatarUrl     String?  @map("avatar_url")
  accountType   String   @default("consumer") @map("account_type")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  ownedBusinesses    BusinessAccount[] @relation("BusinessOwner")
  teamMemberships    BusinessTeamMember[]
  businessActivityLogs BusinessActivityLog[]

  @@map("commercial_users")
}

model BusinessAccount {
  id              String   @id @default(cuid())
  ownerId         String   @map("owner_id")
  owner           User     @relation("BusinessOwner", fields: [ownerId], references: [id])

  businessName    String   @map("business_name")
  businessType    String   @map("business_type")
  slug            String   @unique

  email           String
  phone           String?
  websiteUrl      String?  @map("website_url")
  addressLine1    String?  @map("address_line1")
  addressLine2    String?  @map("address_line2")
  city            String?
  state           String?
  postalCode      String?  @map("postal_code")
  country         String   @default("US")
  latitude        Float?
  longitude       Float?

  logoUrl         String?  @map("logo_url")
  coverImageUrl   String?  @map("cover_image_url")
  brandColor      String   @default("#000000") @map("brand_color")
  description     String?

  subscriptionTier   String @default("starter") @map("subscription_tier")
  subscriptionStatus String @default("trialing") @map("subscription_status")
  trialEndsAt        DateTime? @map("trial_ends_at")

  stripeAccountId     String? @map("stripe_account_id")
  stripeAccountStatus String @default("pending") @map("stripe_account_status")
  commissionRate      Float  @default(0.05) @map("commission_rate")

  isVerified    Boolean  @default(false) @map("is_verified")
  verifiedAt    DateTime? @map("verified_at")
  isActive      Boolean  @default(true) @map("is_active")
  isFeatured    Boolean  @default(false) @map("is_featured")

  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  teamMembers   BusinessTeamMember[]
  hours         BusinessHours[]
  activityLogs  BusinessActivityLog[]
  tables        RestaurantTable[]
  reservations  Reservation[]
  reservationSettings ReservationSettings?
  menuCategories MenuCategory[]
  orders        Order[]
  customers     Customer[]
  loyaltySettings LoyaltySettings?

  @@map("business_accounts")
}

// ... Continue for all other models with @@map directives
```

### Regenerate Prisma Client

```bash
cd backend
bunx prisma generate
```

## Step 5: Test the Connection

```bash
cd backend
bunx prisma db pull  # Verify connection works
bun run dev          # Start the server
```

Test API endpoints:
```bash
curl $BACKEND_URL/api/business
# Should return the seeded businesses
```

## Step 6: iOS App Configuration

The iOS app needs to call the same API endpoints. Update the iOS app's configuration:

```swift
// Config.swift
struct Config {
    static let backendURL = "https://[YOUR-BACKEND-URL]"

    // Or for direct Supabase access:
    static let supabaseURL = "https://[PROJECT-REF].supabase.co"
    static let supabaseAnonKey = "your-anon-key"
}
```

## API Endpoints Available

Once migrated, these endpoints work with shared data:

| Endpoint | Description |
|----------|-------------|
| `GET /api/business` | List all businesses |
| `GET /api/business/:id` | Get business by ID |
| `GET /api/business/slug/:slug` | Get business by slug |
| `GET /api/reservations/:businessId/settings` | Reservation settings |
| `GET /api/reservations/:businessId/availability` | Check availability |
| `POST /api/reservations/:businessId` | Create reservation |
| `GET /api/menu/:businessId/public` | Get public menu |
| `POST /api/orders/:businessId` | Create order |

## Sample Business IDs (After Seeding)

| Business | ID | Slug |
|----------|-----|------|
| Coq au Vin | `biz_coq_au_vin` | `coq-au-vin` |
| Golden Fork | `biz_golden_fork` | `golden-fork` |
| Sunrise Farm | `biz_sunrise_farm` | `sunrise-farm` |
| Bean & Leaf | `biz_bean_leaf` | `bean-leaf-cafe` |

## Troubleshooting

### "relation does not exist" error
- Run the migration SQL first before seeding
- Check that all tables were created in Supabase Table Editor

### Connection refused
- Verify DATABASE_URL is correct
- Check Supabase project is active (not paused)
- Ensure IP is allowed in Supabase network settings

### Prisma client errors
- Run `bunx prisma generate` after schema changes
- Restart the backend server

### RLS (Row Level Security) blocking access
- The migration includes permissive RLS policies
- For development, you can disable RLS in Supabase dashboard

## Production Considerations

1. **Environment Variables**: Use different Supabase projects for dev/staging/prod
2. **RLS Policies**: Tighten RLS policies for production security
3. **Connection Pooling**: Use Supabase connection pooler for high traffic
4. **Backups**: Enable Point-in-Time Recovery in Supabase

## Files Reference

| File | Purpose |
|------|---------|
| `docs/commercial-platform-migration.sql` | Creates all database tables |
| `docs/commercial-platform-seed.sql` | Inserts sample data |
| `docs/IOS_COMMERCIAL_INTEGRATION.md` | iOS app integration guide |
| `docs/DATA_CONNECTION_PLAN.md` | Architecture overview |
