# KitchenSync Commercial Platform Expansion Plan

## Executive Summary

This document outlines the comprehensive plan to expand KitchenSync from a consumer-focused recipe and social platform into a full B2B2C ecosystem that supports commercial food businesses (restaurants, cafés, farms, food producers, farmers markets, etc.) while maintaining the seamless consumer experience.

**Key Stakeholders:**
- **KitchenSync (Superadmin)**: Platform owner managing the global ecosystem
- **Business Owners**: Restaurants, cafés, farms, food stores, producers who manage their business on the platform
- **Business Employees**: Staff members with delegated access to business tools
- **Consumers**: End users who discover, follow, and transact with businesses

---

## Part 1: Architecture Overview

### 1.1 Account Type Hierarchy

```
┌─────────────────────────────────────────────────────────────────────┐
│                    KITCHENSYNC PLATFORM                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐       │
│  │  SUPERADMIN   │    │   BUSINESS    │    │   CONSUMER    │       │
│  │   CONSOLE     │    │    CONSOLE    │    │   MOBILE APP  │       │
│  │  (This repo)  │    │  (New clone)  │    │   (iOS app)   │       │
│  └───────────────┘    └───────────────┘    └───────────────┘       │
│         │                    │                    │                 │
│         └────────────────────┼────────────────────┘                 │
│                              │                                      │
│                    ┌─────────▼─────────┐                           │
│                    │   SHARED BACKEND  │                           │
│                    │   (Hono + Prisma) │                           │
│                    └─────────┬─────────┘                           │
│                              │                                      │
│                    ┌─────────▼─────────┐                           │
│                    │     SUPABASE      │                           │
│                    │  (Auth + Database)│                           │
│                    └───────────────────┘                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 User Account Types

| Account Type | Description | Access |
|-------------|-------------|--------|
| `consumer` | Standard platform user | Mobile app, social features, following businesses |
| `business_owner` | Commercial account owner | Business Console + Mobile app |
| `business_employee` | Staff with delegated access | Limited Business Console access |
| `creator` | Content creators (existing) | Creator tools + Mobile app |
| `admin` | Platform administrators | Superadmin Console only |
| `superadmin` | Platform owner | Full Superadmin Console access |

### 1.3 Business Types

| Business Type | Description | Features |
|--------------|-------------|----------|
| `restaurant` | Dine-in establishments | Reservations, menus, online ordering |
| `cafe` | Coffee shops, bakeries | Menus, online ordering, pickup |
| `farm` | Agricultural producers | Product sales, CSA subscriptions |
| `farmstand` | Farm retail locations | Inventory, seasonal availability |
| `farmers_market` | Market venues | Vendor management, booth reservations |
| `food_producer` | Packaged food makers | Product catalog, wholesale/retail |
| `food_store` | Retail food shops | Inventory, online ordering |
| `catering` | Catering services | Event booking, menus, quotes |
| `food_truck` | Mobile food vendors | Location tracking, menus, ordering |

---

## Part 2: Database Schema Design

### 2.1 New Tables Required

#### Core Business Tables

```sql
-- Business accounts (one per commercial entity)
CREATE TABLE business_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Business identity
  business_name TEXT NOT NULL,
  business_type TEXT NOT NULL CHECK (business_type IN (
    'restaurant', 'cafe', 'farm', 'farmstand', 'farmers_market',
    'food_producer', 'food_store', 'catering', 'food_truck'
  )),
  slug TEXT UNIQUE NOT NULL, -- URL-friendly identifier

  -- Contact & Location
  email TEXT NOT NULL,
  phone TEXT,
  website_url TEXT,

  -- Address
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'US',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Branding
  logo_url TEXT,
  cover_image_url TEXT,
  brand_color TEXT DEFAULT '#000000',
  description TEXT,

  -- Business details
  tax_id TEXT, -- EIN for US businesses
  business_license TEXT,

  -- Platform settings
  subscription_tier TEXT DEFAULT 'starter' CHECK (subscription_tier IN (
    'starter', 'professional', 'enterprise'
  )),
  subscription_status TEXT DEFAULT 'trialing' CHECK (subscription_status IN (
    'trialing', 'active', 'past_due', 'canceled', 'paused'
  )),
  trial_ends_at TIMESTAMPTZ,

  -- Payment processing
  stripe_account_id TEXT, -- Stripe Connect account
  stripe_account_status TEXT DEFAULT 'pending',
  commission_rate DECIMAL(5, 4) DEFAULT 0.0500, -- 5% default

  -- Status
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Business team members
CREATE TABLE business_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Role & permissions
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN (
    'owner', 'manager', 'staff', 'accountant', 'marketing'
  )),

  -- Granular permissions (JSON for flexibility)
  permissions JSONB DEFAULT '{}',

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_id, user_id)
);

-- Business operating hours
CREATE TABLE business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_accounts(id) ON DELETE CASCADE,

  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  open_time TIME,
  close_time TIME,
  is_closed BOOLEAN DEFAULT FALSE,

  -- Special notes (e.g., "Kitchen closes at 9pm")
  notes TEXT,

  UNIQUE(business_id, day_of_week)
);

-- Business locations (for multi-location businesses)
CREATE TABLE business_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_accounts(id) ON DELETE CASCADE,

  name TEXT NOT NULL, -- "Downtown", "Airport", etc.
  is_primary BOOLEAN DEFAULT FALSE,

  -- Address
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT DEFAULT 'US',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Contact
  phone TEXT,
  email TEXT,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Reservation System Tables

```sql
-- Restaurant/venue reservations
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_accounts(id),
  location_id UUID REFERENCES business_locations(id),
  customer_user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Reservation details
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  party_size INTEGER NOT NULL CHECK (party_size > 0),
  duration_minutes INTEGER DEFAULT 90,

  -- Customer info (cached for quick access)
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,

  -- Special requests
  special_requests TEXT,
  occasion TEXT, -- 'birthday', 'anniversary', 'business', etc.

  -- Table assignment
  table_id UUID REFERENCES restaurant_tables(id),
  seating_preference TEXT, -- 'indoor', 'outdoor', 'bar', 'private'

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'
  )),
  confirmed_at TIMESTAMPTZ,
  seated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  -- Source tracking
  source TEXT DEFAULT 'app' CHECK (source IN (
    'app', 'website', 'phone', 'walk_in', 'third_party'
  )),

  -- Reminders
  reminder_sent_at TIMESTAMPTZ,
  confirmation_sent_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Restaurant tables/seating
CREATE TABLE restaurant_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_accounts(id) ON DELETE CASCADE,
  location_id UUID REFERENCES business_locations(id),

  table_number TEXT NOT NULL,
  capacity_min INTEGER DEFAULT 1,
  capacity_max INTEGER NOT NULL,

  section TEXT, -- 'main', 'patio', 'private', 'bar'
  is_active BOOLEAN DEFAULT TRUE,

  -- Position for visual layout
  position_x INTEGER,
  position_y INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reservation settings per business
CREATE TABLE reservation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID UNIQUE NOT NULL REFERENCES business_accounts(id) ON DELETE CASCADE,

  -- Booking rules
  min_party_size INTEGER DEFAULT 1,
  max_party_size INTEGER DEFAULT 20,
  booking_window_days INTEGER DEFAULT 30, -- How far ahead can book
  min_advance_hours INTEGER DEFAULT 2, -- Minimum notice required

  -- Time slots
  slot_duration_minutes INTEGER DEFAULT 15, -- Reservation time slots
  default_dining_duration INTEGER DEFAULT 90,

  -- Capacity
  allow_waitlist BOOLEAN DEFAULT TRUE,
  max_reservations_per_slot INTEGER,

  -- Cancellation
  cancellation_policy TEXT,
  cancellation_deadline_hours INTEGER DEFAULT 24,

  -- Confirmations
  require_confirmation BOOLEAN DEFAULT FALSE,
  auto_confirm BOOLEAN DEFAULT TRUE,
  send_reminders BOOLEAN DEFAULT TRUE,
  reminder_hours_before INTEGER DEFAULT 24,

  -- Deposits (optional)
  require_deposit BOOLEAN DEFAULT FALSE,
  deposit_amount DECIMAL(10, 2),
  deposit_policy TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Menu & Product Tables

```sql
-- Business menus
CREATE TABLE business_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_accounts(id) ON DELETE CASCADE,

  name TEXT NOT NULL, -- 'Dinner', 'Lunch', 'Brunch', 'Drinks'
  description TEXT,

  -- Availability
  is_active BOOLEAN DEFAULT TRUE,
  available_days INTEGER[] DEFAULT ARRAY[0,1,2,3,4,5,6], -- Days of week
  available_start_time TIME,
  available_end_time TIME,

  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Menu categories
CREATE TABLE menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES business_menus(id) ON DELETE CASCADE,

  name TEXT NOT NULL, -- 'Appetizers', 'Entrees', 'Desserts'
  description TEXT,
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Menu items
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES business_accounts(id), -- Denormalized for queries

  name TEXT NOT NULL,
  description TEXT,

  -- Pricing
  price DECIMAL(10, 2) NOT NULL,
  compare_at_price DECIMAL(10, 2), -- Original price if on sale

  -- Images
  image_url TEXT,
  image_urls TEXT[], -- Multiple images

  -- Details
  calories INTEGER,
  prep_time_minutes INTEGER,

  -- Dietary info
  dietary_tags TEXT[], -- 'vegetarian', 'vegan', 'gluten-free', etc.
  allergens TEXT[], -- 'nuts', 'dairy', 'shellfish', etc.
  spice_level INTEGER CHECK (spice_level BETWEEN 0 AND 5),

  -- Availability
  is_available BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  is_seasonal BOOLEAN DEFAULT FALSE,
  available_quantity INTEGER, -- NULL = unlimited

  -- Modifiers allowed
  allows_modifiers BOOLEAN DEFAULT TRUE,

  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Menu item modifiers/options
CREATE TABLE menu_item_modifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,

  name TEXT NOT NULL, -- 'Size', 'Add-ons', 'Cooking preference'
  is_required BOOLEAN DEFAULT FALSE,
  min_selections INTEGER DEFAULT 0,
  max_selections INTEGER DEFAULT 1,

  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Modifier options
CREATE TABLE menu_modifier_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modifier_id UUID NOT NULL REFERENCES menu_item_modifiers(id) ON DELETE CASCADE,

  name TEXT NOT NULL, -- 'Small', 'Medium', 'Large' or 'Extra cheese'
  price_adjustment DECIMAL(10, 2) DEFAULT 0, -- Can be negative

  is_default BOOLEAN DEFAULT FALSE,
  is_available BOOLEAN DEFAULT TRUE,

  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Order System Tables

```sql
-- Customer orders (for businesses)
CREATE TABLE business_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_accounts(id),
  location_id UUID REFERENCES business_locations(id),
  customer_user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Order identifiers
  order_number TEXT NOT NULL, -- Human-readable: "KS-1234"

  -- Order type
  order_type TEXT NOT NULL CHECK (order_type IN (
    'dine_in', 'takeout', 'delivery', 'pickup', 'catering'
  )),

  -- Customer info (cached)
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,

  -- Delivery/pickup details
  delivery_address JSONB, -- Full address object
  delivery_instructions TEXT,
  scheduled_time TIMESTAMPTZ, -- For scheduled orders

  -- Table (for dine-in)
  table_id UUID REFERENCES restaurant_tables(id),
  reservation_id UUID REFERENCES reservations(id),

  -- Pricing
  subtotal DECIMAL(10, 2) NOT NULL,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  tip_amount DECIMAL(10, 2) DEFAULT 0,
  delivery_fee DECIMAL(10, 2) DEFAULT 0,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,

  -- Discount/promo
  promo_code TEXT,
  promo_id UUID REFERENCES business_promotions(id),

  -- Payment
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN (
    'pending', 'authorized', 'captured', 'refunded', 'failed'
  )),
  payment_method TEXT, -- 'card', 'apple_pay', 'google_pay', 'cash'
  stripe_payment_intent_id TEXT,

  -- Order status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'confirmed', 'preparing', 'ready',
    'out_for_delivery', 'delivered', 'completed', 'cancelled'
  )),

  -- Timestamps
  confirmed_at TIMESTAMPTZ,
  preparing_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  -- Estimated times
  estimated_ready_time TIMESTAMPTZ,
  estimated_delivery_time TIMESTAMPTZ,

  -- Notes
  kitchen_notes TEXT,
  customer_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order line items
CREATE TABLE business_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES business_orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id),

  -- Item details (cached at time of order)
  item_name TEXT NOT NULL,
  item_description TEXT,

  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL, -- unit_price * quantity + modifiers

  -- Modifiers selected
  modifiers JSONB DEFAULT '[]', -- [{name, option, price_adjustment}]

  -- Special instructions
  special_instructions TEXT,

  -- Status (for kitchen display)
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'preparing', 'ready', 'served'
  )),

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Customer Relationship Tables

```sql
-- Customer follows/memberships to businesses
CREATE TABLE customer_business_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_user_id UUID NOT NULL REFERENCES auth.users(id),
  business_id UUID NOT NULL REFERENCES business_accounts(id),

  -- Relationship type
  relationship_type TEXT DEFAULT 'follower' CHECK (relationship_type IN (
    'follower', 'member', 'vip', 'subscriber'
  )),

  -- Membership details (if applicable)
  membership_tier TEXT,
  membership_started_at TIMESTAMPTZ,
  membership_expires_at TIMESTAMPTZ,

  -- Preferences
  notifications_enabled BOOLEAN DEFAULT TRUE,
  marketing_opted_in BOOLEAN DEFAULT FALSE,

  -- Stats (cached)
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(12, 2) DEFAULT 0,
  last_order_at TIMESTAMPTZ,
  last_visit_at TIMESTAMPTZ,

  -- Loyalty
  loyalty_points INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(customer_user_id, business_id)
);

-- Customer saved payment methods (per business or global)
CREATE TABLE customer_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_user_id UUID NOT NULL REFERENCES auth.users(id),
  business_id UUID REFERENCES business_accounts(id), -- NULL = global

  -- Stripe
  stripe_payment_method_id TEXT NOT NULL,

  -- Display info
  card_brand TEXT, -- 'visa', 'mastercard', etc.
  card_last_four TEXT,
  card_exp_month INTEGER,
  card_exp_year INTEGER,

  -- Status
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer addresses
CREATE TABLE customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_user_id UUID NOT NULL REFERENCES auth.users(id),

  label TEXT, -- 'Home', 'Work', etc.

  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT DEFAULT 'US',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  delivery_instructions TEXT,

  is_default BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Analytics & Metrics Tables

```sql
-- Business analytics (aggregated daily)
CREATE TABLE business_analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_accounts(id),
  date DATE NOT NULL,

  -- Traffic
  profile_views INTEGER DEFAULT 0,
  menu_views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,

  -- Engagement
  new_followers INTEGER DEFAULT 0,
  unfollows INTEGER DEFAULT 0,

  -- Reservations
  reservations_made INTEGER DEFAULT 0,
  reservations_cancelled INTEGER DEFAULT 0,
  reservations_completed INTEGER DEFAULT 0,
  no_shows INTEGER DEFAULT 0,
  total_covers INTEGER DEFAULT 0, -- Total guests served

  -- Orders
  orders_placed INTEGER DEFAULT 0,
  orders_completed INTEGER DEFAULT 0,
  orders_cancelled INTEGER DEFAULT 0,

  -- Revenue
  gross_revenue DECIMAL(12, 2) DEFAULT 0,
  net_revenue DECIMAL(12, 2) DEFAULT 0, -- After refunds
  tips_collected DECIMAL(10, 2) DEFAULT 0,
  average_order_value DECIMAL(10, 2),

  -- Top items (JSONB for flexibility)
  top_menu_items JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_id, date)
);

-- Business activity log (audit trail)
CREATE TABLE business_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_accounts(id),
  user_id UUID NOT NULL REFERENCES auth.users(id), -- Who performed action

  action TEXT NOT NULL, -- 'order.confirmed', 'menu.updated', etc.
  entity_type TEXT, -- 'order', 'reservation', 'menu_item', etc.
  entity_id UUID,

  -- Details
  description TEXT,
  metadata JSONB DEFAULT '{}',

  -- Context
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2 User Profile Extensions

```sql
-- Add to existing user_profiles table
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'consumer'
  CHECK (account_type IN ('consumer', 'business_owner', 'business_employee', 'creator', 'admin', 'superadmin'));

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS primary_business_id UUID REFERENCES business_accounts(id);

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
```

---

## Part 3: Business Console Features

### 3.1 Console Routes & Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Dashboard | Business overview, today's stats, alerts |
| `/reservations` | Reservations | Calendar view, list view, manage bookings |
| `/reservations/settings` | Settings | Booking rules, capacity, policies |
| `/orders` | Orders | Live orders, order history |
| `/orders/:id` | Order Detail | Single order management |
| `/menu` | Menu Builder | Manage menus, categories, items |
| `/menu/:menuId` | Menu Editor | Edit specific menu |
| `/products` | Products | Non-menu products (retail, merchandise) |
| `/customers` | Customers | Customer directory, CRM |
| `/customers/:id` | Customer Profile | Individual customer view |
| `/team` | Team | Manage employees and roles |
| `/analytics` | Analytics | Charts, reports, exports |
| `/marketing` | Marketing | Promotions, campaigns, social |
| `/reviews` | Reviews | Customer feedback management |
| `/settings` | Settings | Business profile, payments, integrations |
| `/settings/payments` | Payments | Stripe Connect, payout settings |
| `/settings/notifications` | Notifications | Alert preferences |

### 3.2 Permission Matrix

| Permission | Owner | Manager | Staff | Accountant | Marketing |
|------------|-------|---------|-------|------------|-----------|
| View Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| Manage Reservations | ✓ | ✓ | ✓ | - | - |
| Manage Orders | ✓ | ✓ | ✓ | - | - |
| Edit Menu | ✓ | ✓ | - | - | - |
| View Customers | ✓ | ✓ | ✓ | ✓ | ✓ |
| Export Data | ✓ | ✓ | - | ✓ | - |
| View Analytics | ✓ | ✓ | - | ✓ | ✓ |
| Manage Team | ✓ | - | - | - | - |
| Payment Settings | ✓ | - | - | ✓ | - |
| Marketing/Promos | ✓ | ✓ | - | - | ✓ |
| Business Settings | ✓ | - | - | - | - |

---

## Part 4: iOS Mobile App Features

### 4.1 Consumer Features

#### Business Discovery
- Browse businesses by type (restaurants, farms, etc.)
- Search by location, cuisine, dietary preferences
- View business profiles with menus, hours, photos
- Follow businesses for updates

#### Reservations
- Browse available time slots
- Make reservations with party size, preferences
- Manage upcoming reservations
- Receive confirmation and reminder notifications
- Cancel or modify reservations

#### Ordering
- Browse menus with full item details
- Add items to cart with modifiers
- Checkout with saved payment methods
- Track order status in real-time
- View order history

#### Account Management
- Manage followed businesses
- View reservation history
- Manage saved payment methods
- Manage delivery addresses
- Loyalty points and rewards

### 4.2 Consumer UI Screens

| Screen | Description |
|--------|-------------|
| Business Feed | Discover businesses near you |
| Business Profile | Full business page with menu, hours, reviews |
| Menu Browser | Browse and add items to cart |
| Cart | Review order before checkout |
| Checkout | Payment and delivery options |
| Order Tracking | Real-time order status |
| Reservations | Make and manage reservations |
| My Account | Profile, payment methods, addresses |
| Following | List of followed businesses |
| Order History | Past orders with reorder option |

### 4.3 Business Owner Mobile Features

Business owners should be able to perform critical tasks from mobile:

- View today's reservations and orders
- Confirm/cancel reservations
- Update order status
- View daily revenue summary
- Receive push notifications for new orders/reservations
- Quick menu item availability toggle

---

## Part 5: API Endpoints

### 5.1 Business Account APIs

```
POST   /api/business/register         # Create business account
GET    /api/business/me               # Get current business
PUT    /api/business/me               # Update business profile
POST   /api/business/verify           # Submit for verification

# Team management
GET    /api/business/team             # List team members
POST   /api/business/team/invite      # Invite team member
PUT    /api/business/team/:id         # Update member role
DELETE /api/business/team/:id         # Remove team member

# Locations
GET    /api/business/locations        # List locations
POST   /api/business/locations        # Add location
PUT    /api/business/locations/:id    # Update location
DELETE /api/business/locations/:id    # Remove location

# Hours
GET    /api/business/hours            # Get operating hours
PUT    /api/business/hours            # Update hours
```

### 5.2 Reservation APIs

```
# Business-side
GET    /api/business/reservations              # List reservations
GET    /api/business/reservations/:id          # Get reservation
PUT    /api/business/reservations/:id          # Update status
GET    /api/business/reservations/calendar     # Calendar view
GET    /api/business/reservations/availability # Check availability

# Settings
GET    /api/business/reservations/settings     # Get settings
PUT    /api/business/reservations/settings     # Update settings

# Tables
GET    /api/business/tables                    # List tables
POST   /api/business/tables                    # Add table
PUT    /api/business/tables/:id                # Update table
DELETE /api/business/tables/:id                # Remove table

# Consumer-side
GET    /api/businesses/:slug/availability      # Check availability
POST   /api/businesses/:slug/reservations      # Make reservation
GET    /api/me/reservations                    # My reservations
PUT    /api/me/reservations/:id                # Modify reservation
DELETE /api/me/reservations/:id                # Cancel reservation
```

### 5.3 Menu & Order APIs

```
# Menu management (business)
GET    /api/business/menus                     # List menus
POST   /api/business/menus                     # Create menu
PUT    /api/business/menus/:id                 # Update menu
DELETE /api/business/menus/:id                 # Delete menu

# Categories
POST   /api/business/menus/:id/categories      # Add category
PUT    /api/business/categories/:id            # Update category
DELETE /api/business/categories/:id            # Delete category

# Items
POST   /api/business/categories/:id/items      # Add item
PUT    /api/business/items/:id                 # Update item
DELETE /api/business/items/:id                 # Delete item
PUT    /api/business/items/:id/availability    # Toggle availability

# Consumer-side
GET    /api/businesses/:slug/menus             # Get public menus
GET    /api/businesses/:slug/menu-items        # Get all items

# Orders (business)
GET    /api/business/orders                    # List orders
GET    /api/business/orders/:id                # Get order
PUT    /api/business/orders/:id/status         # Update status
POST   /api/business/orders/:id/refund         # Process refund

# Orders (consumer)
POST   /api/businesses/:slug/orders            # Place order
GET    /api/me/orders                          # My orders
GET    /api/me/orders/:id                      # Order details
```

### 5.4 Customer APIs

```
# Business CRM
GET    /api/business/customers                 # List customers
GET    /api/business/customers/:id             # Customer details
GET    /api/business/customers/:id/orders      # Customer orders
GET    /api/business/customers/:id/reservations # Customer reservations

# Consumer account
GET    /api/me/following                       # Followed businesses
POST   /api/me/following/:businessId           # Follow business
DELETE /api/me/following/:businessId           # Unfollow business
GET    /api/me/payment-methods                 # Saved cards
POST   /api/me/payment-methods                 # Add card
DELETE /api/me/payment-methods/:id             # Remove card
GET    /api/me/addresses                       # Saved addresses
POST   /api/me/addresses                       # Add address
PUT    /api/me/addresses/:id                   # Update address
DELETE /api/me/addresses/:id                   # Remove address
```

### 5.5 Analytics APIs

```
GET    /api/business/analytics/overview        # Dashboard stats
GET    /api/business/analytics/revenue         # Revenue charts
GET    /api/business/analytics/orders          # Order analytics
GET    /api/business/analytics/reservations    # Reservation stats
GET    /api/business/analytics/customers       # Customer insights
GET    /api/business/analytics/menu            # Menu performance
GET    /api/business/analytics/export          # Export reports
```

---

## Part 6: Implementation Phases

### Phase 1: Foundation (Weeks 1-2)

**Database & Auth**
- [ ] Add account_type to user_profiles
- [ ] Create business_accounts table
- [ ] Create business_team_members table
- [ ] Create business_hours table
- [ ] Set up RLS policies for business data
- [ ] Implement business registration flow
- [ ] Implement team invitation system

**Backend APIs**
- [ ] Business registration endpoint
- [ ] Business profile CRUD
- [ ] Team management endpoints
- [ ] Business hours endpoints

**Business Console**
- [ ] Clone admin console for business console
- [ ] Create business auth context
- [ ] Build business dashboard
- [ ] Build settings pages
- [ ] Build team management page

### Phase 2: Reservations (Weeks 3-4)

**Database**
- [ ] Create reservations table
- [ ] Create restaurant_tables table
- [ ] Create reservation_settings table

**Backend APIs**
- [ ] Reservation CRUD endpoints
- [ ] Availability checking logic
- [ ] Table management endpoints
- [ ] Reservation settings endpoints

**Business Console**
- [ ] Reservation calendar view
- [ ] Reservation list view
- [ ] Table layout editor
- [ ] Reservation settings page

**iOS App**
- [ ] Business discovery screen
- [ ] Business profile screen
- [ ] Reservation booking flow
- [ ] My reservations screen

### Phase 3: Menu & Ordering (Weeks 5-7)

**Database**
- [ ] Create business_menus table
- [ ] Create menu_categories table
- [ ] Create menu_items table
- [ ] Create menu modifiers tables
- [ ] Create business_orders table
- [ ] Create business_order_items table

**Backend APIs**
- [ ] Menu management endpoints
- [ ] Item management endpoints
- [ ] Order creation endpoint
- [ ] Order status management
- [ ] Stripe payment integration

**Business Console**
- [ ] Menu builder interface
- [ ] Item editor with modifiers
- [ ] Order management dashboard
- [ ] Order detail view

**iOS App**
- [ ] Menu browser
- [ ] Cart functionality
- [ ] Checkout flow
- [ ] Order tracking screen

### Phase 4: Customer Management (Weeks 8-9)

**Database**
- [ ] Create customer_business_follows table
- [ ] Create customer_payment_methods table
- [ ] Create customer_addresses table

**Backend APIs**
- [ ] Customer CRM endpoints
- [ ] Follow/unfollow endpoints
- [ ] Payment method management
- [ ] Address management

**Business Console**
- [ ] Customer directory
- [ ] Customer profile view
- [ ] Customer insights

**iOS App**
- [ ] My account section
- [ ] Payment methods management
- [ ] Address management
- [ ] Following list

### Phase 5: Analytics & Polish (Weeks 10-11)

**Database**
- [ ] Create business_analytics_daily table
- [ ] Create business_activity_log table
- [ ] Set up analytics aggregation jobs

**Backend APIs**
- [ ] Analytics endpoints
- [ ] Report generation
- [ ] Export functionality

**Business Console**
- [ ] Analytics dashboard
- [ ] Revenue charts
- [ ] Performance reports
- [ ] Activity log

**iOS App**
- [ ] Polish and bug fixes
- [ ] Performance optimization
- [ ] Push notification setup

### Phase 6: Launch Prep (Week 12)

- [ ] Security audit
- [ ] Performance testing
- [ ] Documentation
- [ ] Beta testing
- [ ] Production deployment

---

## Part 7: Superadmin Console Updates

The existing superadmin console needs updates to manage commercial accounts:

### New Routes

| Route | Description |
|-------|-------------|
| `/businesses` | List all business accounts |
| `/businesses/:id` | Business detail view |
| `/businesses/pending` | Pending verification requests |
| `/businesses/analytics` | Platform-wide business metrics |

### New Features

- Approve/reject business verification requests
- Suspend/unsuspend business accounts
- View business performance metrics
- Manage commission rates
- Process business disputes
- Export business reports

---

## Part 8: Integration Points

### 8.1 Stripe Connect

Business accounts will use Stripe Connect for payment processing:

1. **Onboarding**: Business owner completes Stripe Connect onboarding
2. **Payments**: Customer payments go through connected accounts
3. **Fees**: Platform takes commission on each transaction
4. **Payouts**: Automatic payouts to business bank accounts

### 8.2 Push Notifications

Both business owners and consumers receive push notifications:

**Business Owners:**
- New reservation
- Reservation cancellation
- New order
- Order update requests

**Consumers:**
- Reservation confirmation
- Reservation reminder
- Order status updates
- Business updates from followed accounts

### 8.3 Email Notifications

Transactional emails for:
- Business account verification
- Team member invitations
- Reservation confirmations
- Order receipts
- Password resets

---

## Part 9: Multi-Tenancy Architecture & Security

This platform operates as a **multi-tenant B2B2C system** where data isolation, access control, and security are critical. Every business is a tenant with complete data isolation from other businesses.

### 9.1 Tenant Isolation Model

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PLATFORM LAYER                                  │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    SUPERADMIN ACCESS                             │   │
│  │  - Platform-wide analytics                                       │   │
│  │  - Business account management                                   │   │
│  │  - Cross-tenant reporting (aggregated only)                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────┤
│                         TENANT LAYER                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │  Business A  │  │  Business B  │  │  Business C  │   ...            │
│  │  ──────────  │  │  ──────────  │  │  ──────────  │                  │
│  │  - Orders    │  │  - Orders    │  │  - Orders    │   ISOLATED       │
│  │  - Menus     │  │  - Menus     │  │  - Menus     │   DATA           │
│  │  - Customers │  │  - Customers │  │  - Customers │                  │
│  │  - Revenue   │  │  - Revenue   │  │  - Revenue   │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
│         ▲                 ▲                 ▲                           │
│         │                 │                 │                           │
│         └────────┬────────┴────────┬────────┘                          │
│                  │                 │                                    │
├──────────────────┼─────────────────┼────────────────────────────────────┤
│                         CONSUMER LAYER                                  │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Consumer sees: Public profiles, menus, own orders/reservations │   │
│  │  Consumer CANNOT see: Other customers, business financials      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 9.2 Row-Level Security (RLS) Policies

Every table with `business_id` MUST have RLS policies enforced at the database level.

#### Business Data Isolation

```sql
-- Enable RLS on all business tables
ALTER TABLE business_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_analytics_daily ENABLE ROW LEVEL SECURITY;

-- Business owners/team can only see their own business data
CREATE POLICY "business_isolation" ON business_orders
  FOR ALL
  USING (
    business_id IN (
      SELECT business_id FROM business_team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Consumers can only see their own orders
CREATE POLICY "customer_own_orders" ON business_orders
  FOR SELECT
  USING (customer_user_id = auth.uid());

-- Public business profiles (read-only for discovery)
CREATE POLICY "public_business_profiles" ON business_accounts
  FOR SELECT
  USING (is_active = TRUE AND is_verified = TRUE);

-- Business team can modify their own business
CREATE POLICY "team_business_access" ON business_accounts
  FOR ALL
  USING (
    id IN (
      SELECT business_id FROM business_team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
```

#### Customer Data Privacy

```sql
-- Customers can only see their own data
CREATE POLICY "customer_own_addresses" ON customer_addresses
  FOR ALL
  USING (customer_user_id = auth.uid());

CREATE POLICY "customer_own_payment_methods" ON customer_payment_methods
  FOR ALL
  USING (customer_user_id = auth.uid());

-- Businesses can see customer info ONLY for their own orders
CREATE POLICY "business_customer_view" ON customer_business_follows
  FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM business_team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
```

### 9.3 API-Level Authorization

RLS is the last line of defense. Authorization MUST also be enforced at the API layer.

#### Middleware Pattern

```typescript
// Business context middleware - REQUIRED for all /api/business/* routes
export const requireBusinessAccess = async (c: Context, next: Next) => {
  const userId = c.get('userId'); // From auth middleware
  const businessId = c.req.header('X-Business-ID');

  if (!businessId) {
    return c.json({ error: { code: 'MISSING_BUSINESS_CONTEXT', message: 'Business ID required' } }, 400);
  }

  // Verify user has access to this business
  const membership = await db.businessTeamMember.findFirst({
    where: {
      businessId,
      userId,
      status: 'active'
    }
  });

  if (!membership) {
    return c.json({ error: { code: 'FORBIDDEN', message: 'No access to this business' } }, 403);
  }

  // Attach to context for downstream use
  c.set('businessId', businessId);
  c.set('businessRole', membership.role);
  c.set('businessPermissions', membership.permissions);

  await next();
};

// Permission check helper
export const requirePermission = (permission: string) => {
  return async (c: Context, next: Next) => {
    const role = c.get('businessRole');
    const permissions = c.get('businessPermissions');

    if (!hasPermission(role, permissions, permission)) {
      return c.json({ error: { code: 'INSUFFICIENT_PERMISSIONS', message: `Requires ${permission}` } }, 403);
    }

    await next();
  };
};
```

#### Route Protection Example

```typescript
// All business routes require business context
const businessRoutes = new Hono()
  .use('/*', requireAuth)
  .use('/*', requireBusinessAccess);

// Specific permissions per route
businessRoutes.get('/orders', requirePermission('orders.view'), listOrders);
businessRoutes.put('/orders/:id', requirePermission('orders.manage'), updateOrder);
businessRoutes.get('/analytics', requirePermission('analytics.view'), getAnalytics);
businessRoutes.post('/team/invite', requirePermission('team.manage'), inviteTeamMember);
businessRoutes.put('/settings', requirePermission('settings.manage'), updateSettings);
```

### 9.4 Cross-Tenant Data Access Rules

| Data Type | Business A Access | Business B Access | Consumer Access | Superadmin Access |
|-----------|-------------------|-------------------|-----------------|-------------------|
| Business A orders | ✓ Full | ✗ None | Own orders only | ✓ Full |
| Business A revenue | ✓ Full | ✗ None | ✗ None | ✓ Aggregated |
| Business A menu | ✓ Full | ✗ None | ✓ Public items | ✓ Full |
| Business A customers | ✓ Their customers | ✗ None | ✗ None | ✓ Aggregated |
| Consumer X addresses | ✗ None | ✗ None | ✓ Own only | ✗ None |
| Consumer X payment methods | ✗ None | ✗ None | ✓ Own only | ✗ None |
| Platform analytics | ✗ None | ✗ None | ✗ None | ✓ Full |

### 9.5 Sensitive Data Handling

#### Data Classification

| Classification | Examples | Storage | Access |
|---------------|----------|---------|--------|
| **Critical** | Stripe tokens, API keys | Encrypted, env vars only | Backend only |
| **Sensitive** | Tax IDs, bank info, full addresses | Encrypted at rest | Owner + Accountant |
| **Internal** | Revenue, analytics, customer emails | Standard storage | Team with permission |
| **Public** | Business name, menu, hours | Standard storage | Anyone |

#### Encryption Requirements

```sql
-- Sensitive fields should use pgcrypto for encryption at rest
-- Tax ID, business license stored encrypted
ALTER TABLE business_accounts
  ADD COLUMN tax_id_encrypted BYTEA,
  ADD COLUMN business_license_encrypted BYTEA;

-- Function to encrypt/decrypt sensitive data
CREATE OR REPLACE FUNCTION encrypt_sensitive(data TEXT, key TEXT)
RETURNS BYTEA AS $$
  SELECT pgp_sym_encrypt(data, key);
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION decrypt_sensitive(data BYTEA, key TEXT)
RETURNS TEXT AS $$
  SELECT pgp_sym_decrypt(data, key);
$$ LANGUAGE SQL;
```

### 9.6 Payment Security (PCI Compliance)

#### Never Store Card Data

```typescript
// WRONG - Never do this
const order = {
  cardNumber: req.body.cardNumber,  // ❌ NEVER
  cvv: req.body.cvv,                // ❌ NEVER
};

// CORRECT - Use Stripe tokens only
const order = {
  stripePaymentIntentId: paymentIntent.id,  // ✓ Safe reference
  // Stripe handles all card data
};
```

#### Stripe Connect Flow

```
Consumer                    Platform                    Business
   │                           │                           │
   │ 1. Add card               │                           │
   ├──────────────────────────►│                           │
   │   (Stripe.js)             │                           │
   │                           │                           │
   │ 2. Payment Intent         │                           │
   │◄──────────────────────────┤                           │
   │   (client_secret)         │                           │
   │                           │                           │
   │ 3. Confirm Payment        │                           │
   ├──────────────────────────►│                           │
   │   (Stripe.js)             │                           │
   │                           │                           │
   │                           │ 4. Webhook: payment_intent.succeeded
   │                           │◄──────────────────────────┤
   │                           │                           │
   │                           │ 5. Transfer to Connected Account
   │                           ├──────────────────────────►│
   │                           │   (minus platform fee)    │
```

### 9.7 Authentication & Session Security

#### Token Management

```typescript
// JWT claims for business users
interface BusinessUserClaims {
  sub: string;           // User ID
  email: string;
  accountType: 'business_owner' | 'business_employee';
  businesses: {
    id: string;
    role: string;
    permissions: string[];
  }[];
  iat: number;
  exp: number;           // Max 1 hour for business tokens
}

// Refresh token rotation
const refreshToken = async (oldToken: string) => {
  // Invalidate old refresh token
  await db.refreshToken.update({
    where: { token: oldToken },
    data: { revoked: true, revokedAt: new Date() }
  });

  // Issue new pair
  return generateTokenPair(userId);
};
```

#### Session Security Rules

| Rule | Implementation |
|------|----------------|
| Max session age | 24 hours for consumers, 8 hours for business |
| Concurrent sessions | Allow multiple devices, track all |
| Session revocation | On password change, revoke all sessions |
| IP tracking | Log IP per session for audit |
| Device fingerprinting | Optional MFA trigger on new device |

### 9.8 Audit Trail Requirements

Every sensitive action MUST be logged:

```sql
CREATE TABLE security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- 'auth.login', 'business.access', 'data.export', etc.
  user_id UUID REFERENCES auth.users(id),
  business_id UUID REFERENCES business_accounts(id),

  -- Event details
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,

  -- Context
  ip_address INET NOT NULL,
  user_agent TEXT,
  geo_location JSONB, -- {country, region, city}

  -- Outcome
  success BOOLEAN NOT NULL,
  failure_reason TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for security queries
CREATE INDEX idx_security_audit_user ON security_audit_log(user_id, created_at DESC);
CREATE INDEX idx_security_audit_business ON security_audit_log(business_id, created_at DESC);
CREATE INDEX idx_security_audit_event ON security_audit_log(event_type, created_at DESC);
```

#### Required Audit Events

| Event | Trigger | Data Captured |
|-------|---------|---------------|
| `auth.login` | User logs in | IP, device, success/failure |
| `auth.logout` | User logs out | Session duration |
| `auth.password_change` | Password changed | IP, method |
| `business.access` | User accesses business | Business ID, role |
| `business.settings_change` | Settings modified | Before/after diff |
| `team.invite` | Team member invited | Invitee email, role |
| `team.remove` | Team member removed | Member ID, reason |
| `data.export` | Data exported | Export type, row count |
| `payment.processed` | Payment completed | Amount, method |
| `payment.refunded` | Refund issued | Amount, reason |

### 9.9 Rate Limiting & Abuse Prevention

```typescript
// Rate limit configuration by endpoint type
const rateLimits = {
  // Auth endpoints - strict limits
  'POST /api/auth/login': { window: '15m', max: 5 },
  'POST /api/auth/register': { window: '1h', max: 3 },
  'POST /api/auth/reset-password': { window: '1h', max: 3 },

  // Business write operations
  'POST /api/business/orders': { window: '1m', max: 60 },
  'PUT /api/business/*': { window: '1m', max: 100 },

  // Data export - prevent scraping
  'GET /api/business/customers/export': { window: '1h', max: 5 },
  'GET /api/business/analytics/export': { window: '1h', max: 10 },

  // Consumer ordering
  'POST /api/businesses/*/orders': { window: '1m', max: 10 },

  // Public discovery - generous but limited
  'GET /api/businesses': { window: '1m', max: 100 },
};
```

### 9.10 Security Checklist for Implementation

#### Phase 1 (Foundation)
- [ ] RLS enabled on all business tables
- [ ] Business context middleware implemented
- [ ] API authorization checks on all routes
- [ ] Audit logging for auth events
- [ ] Rate limiting on auth endpoints

#### Phase 2 (Reservations)
- [ ] RLS on reservations table
- [ ] Customer can only see own reservations
- [ ] Business can only see their reservations
- [ ] Audit log for reservation changes

#### Phase 3 (Orders & Payments)
- [ ] Stripe Connect integration (no raw card data)
- [ ] RLS on orders table
- [ ] Payment audit trail
- [ ] Refund authorization checks

#### Phase 4 (Customer Data)
- [ ] Address data encryption
- [ ] Payment method RLS
- [ ] Customer data export limitations
- [ ] GDPR/CCPA compliance hooks

#### Phase 5 (Analytics)
- [ ] Aggregation-only for cross-tenant queries
- [ ] Export rate limiting
- [ ] PII redaction in reports

---

## Part 10: iOS Developer Handoff Checklist

### Required Information for iOS Team

1. **API Documentation**
   - Base URL: `{BACKEND_URL}/api`
   - Auth: Bearer token from Supabase
   - All endpoints listed in Part 5

2. **Authentication Flow**
   - Consumer: Standard Supabase auth
   - Business: Supabase auth + business context

3. **Data Models**
   - All TypeScript types in `backend/src/types.ts`
   - Zod schemas for validation

4. **Real-time Updates**
   - Supabase realtime for order/reservation updates
   - WebSocket for live order tracking

5. **Assets**
   - Image upload via signed URLs
   - CDN for static assets

6. **Testing**
   - Staging environment available
   - Test business accounts provided

---

## Appendix A: File Structure

```
/home/user/workspace/
├── webapp/                      # Superadmin Console (existing)
│   └── ...
├── business-console/            # Business Console (new)
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   │   └── BusinessContext.tsx
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Reservations/
│   │   │   ├── Orders/
│   │   │   ├── Menu/
│   │   │   ├── Customers/
│   │   │   ├── Team/
│   │   │   ├── Analytics/
│   │   │   └── Settings/
│   │   └── types/
│   └── ...
├── backend/                     # Shared Backend
│   ├── src/
│   │   ├── routes/
│   │   │   ├── business/        # Business account routes
│   │   │   ├── reservations/    # Reservation routes
│   │   │   ├── menus/           # Menu routes
│   │   │   ├── orders/          # Order routes
│   │   │   ├── customers/       # Customer routes
│   │   │   └── analytics/       # Analytics routes
│   │   ├── services/
│   │   ├── middleware/
│   │   └── types.ts
│   └── prisma/
│       └── schema.prisma
└── docs/
    ├── COMMERCIAL_PLATFORM_PLAN.md  # This document
    ├── API_REFERENCE.md
    └── migrations/
```

---

## Appendix B: Success Metrics

### Platform Metrics
- Number of registered businesses
- Business activation rate
- Monthly transaction volume
- Platform commission revenue

### Business Metrics
- Reservations per month
- Orders per month
- Average order value
- Customer retention rate

### Consumer Metrics
- Businesses followed
- Reservations made
- Orders placed
- Return rate

---

*Document Version: 1.0*
*Last Updated: 2026-02-08*
*Author: KitchenSync Development Team*
