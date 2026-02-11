# KitchenSync Commercial Platform - Supabase Migrations

## Overview

These SQL migration files add the commercial platform tables to your existing Supabase database. They integrate with your existing `auth.users` and `user_profiles` tables.

## Migration Files

Run these **in order** in the Supabase SQL Editor:

| File | Description | Status |
|------|-------------|--------|
| `001_commercial_platform.sql` | Business accounts, team members, hours, tables, reservations | Ready |
| `002_menu_orders.sql` | Menu categories, items, modifiers, orders | Ready |
| `003_customer_loyalty.sql` | Customer CRM, activity tracking, loyalty program | Ready |
| `004_seed_data.sql` | Sample businesses, menus, and test data | Ready |

## Prerequisites

- Existing Supabase project with auth enabled
- Existing `user_profiles` table (from recipe platform)
- At least one user in `auth.users` (for seeding business owners)

## Running the Migrations

### Step 1: Run in Supabase SQL Editor

1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Copy and paste each file **in order**
4. Click **Run**

```
001_commercial_platform.sql  →  Run first (business & reservations)
002_menu_orders.sql          →  Run second (menus & orders)
003_customer_loyalty.sql     →  Run third (customers & loyalty)
004_seed_data.sql            →  Run last (sample data)
```

### Step 2: Verify

```sql
-- Check tables created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('business_accounts', 'reservations', 'menu_items', 'orders', 'customers')
ORDER BY table_name;

-- Check sample businesses
SELECT business_name, slug, business_type FROM business_accounts;
```

## Tables Created

### Phase 1: Business Foundation (001)
- `business_accounts` - Commercial entities (restaurants, cafes, farms, etc.)
- `business_team_members` - Staff with roles (owner, manager, staff)
- `business_hours` - Operating hours per day of week
- `business_activity_log` - Audit trail for actions
- `restaurant_tables` - Table/seating configuration
- `reservation_settings` - Booking rules (party size, advance time, etc.)
- `reservations` - Customer bookings

### Phase 2: Menu & Orders (002)
- `menu_categories` - Menu sections (Appetizers, Main Courses, etc.)
- `menu_items` - Food/drink items with dietary info
- `menu_modifier_groups` - Customization options (Size, Toppings, etc.)
- `menu_modifiers` - Individual modifier choices
- `orders` - Customer orders (dine-in, takeout, delivery)
- `order_items` - Order line items with modifiers

### Phase 3: Customer CRM (003)
- `customers` - Customer profiles per business
- `customer_activities` - Activity history (orders, visits, notes)
- `loyalty_points` - Points balance and tier
- `loyalty_transactions` - Points earned/redeemed history
- `loyalty_settings` - Loyalty program configuration

## User Profiles Extension

Migration 001 adds these columns to your existing `user_profiles`:
- `account_type` - 'consumer', 'business_owner', 'business_employee', 'admin'
- `primary_business_id` - Default business for business owners
- `stripe_customer_id` - For payment processing

## Sample Data (004)

After running the seed script, you'll have:

| Business | Type | Slug |
|----------|------|------|
| Coq au Vin | restaurant | `coq-au-vin` |
| The Golden Fork | restaurant | `golden-fork` |
| Sunrise Farm | farm | `sunrise-farm` |
| Bean & Leaf Cafe | cafe | `bean-leaf-cafe` |

Plus:
- Business hours for each
- 10 restaurant tables at Coq au Vin
- Full French menu (5 categories, 15+ items)
- Cafe menu (coffee + pastries)
- Reservation settings
- Loyalty program settings

## Row Level Security

All tables have RLS enabled with policies for:

| Access Level | Description |
|-------------|-------------|
| **Public** | View active businesses, menus, hours, settings |
| **Customer** | View/create own reservations and orders |
| **Team** | Manage data for their assigned business |
| **Owner** | Full control of owned businesses |

## iOS App Integration

After running these migrations, the iOS app can:

1. **Discover businesses** via Supabase client
   ```swift
   supabase.from("business_accounts").select().eq("is_active", true)
   ```

2. **View menus**
   ```swift
   supabase.from("menu_categories").select("*, menu_items(*)").eq("business_id", businessId)
   ```

3. **Make reservations**
   ```swift
   supabase.from("reservations").insert(reservationData)
   ```

4. **Place orders**
   ```swift
   supabase.from("orders").insert(orderData)
   ```

See `docs/IOS_COMMERCIAL_INTEGRATION.md` for complete API reference.

## Rollback

To remove all commercial platform tables:

```sql
-- Drop in reverse dependency order
DROP TABLE IF EXISTS loyalty_transactions CASCADE;
DROP TABLE IF EXISTS loyalty_points CASCADE;
DROP TABLE IF EXISTS loyalty_settings CASCADE;
DROP TABLE IF EXISTS customer_activities CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS menu_modifiers CASCADE;
DROP TABLE IF EXISTS menu_modifier_groups CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS menu_categories CASCADE;
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS reservation_settings CASCADE;
DROP TABLE IF EXISTS restaurant_tables CASCADE;
DROP TABLE IF EXISTS business_activity_log CASCADE;
DROP TABLE IF EXISTS business_hours CASCADE;
DROP TABLE IF EXISTS business_team_members CASCADE;
DROP TABLE IF EXISTS business_accounts CASCADE;

-- Remove columns added to user_profiles
ALTER TABLE user_profiles DROP COLUMN IF EXISTS account_type;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS primary_business_id;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS stripe_customer_id;
```

## Notes

- Migrations are idempotent (use `IF NOT EXISTS`)
- All timestamps use `TIMESTAMPTZ` for timezone awareness
- Foreign keys reference `auth.users(id)` for user associations
- JSON fields use `JSONB` for efficient querying
