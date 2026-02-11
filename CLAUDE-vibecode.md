# Vibecode Workspace - KitchenSync Admin Console

This workspace contains the KitchenSync admin dashboard and backend server.

## Platform Overview
KitchenSync is a social culinary platform where food enthusiasts connect, share recipes, and discover new flavors. This admin console manages content, users, and analytics.

## Implemented Features

### Phase 1: MVP Admin Console (Complete)
- **Dashboard** (`/`) - Platform statistics, recent recipes, featured content
- **Shared Recipes** (`/recipes`) - CRUD with bulk actions, CSV export, activity logging
- **Tips & Tutorials** (`/tips`) - Content management for tips, tutorials, announcements
- **Users** (`/users`) - User directory with suspension management
- **Admins** (`/admins`) - Admin user management (superadmin only)

### Phase 2: Analytics & Moderation (Complete)
- **Analytics** (`/analytics`) - User growth charts, engagement metrics, top recipes
- **Activity Log** (`/activity`) - Admin action audit trail with filtering
- **User Suspension** - Suspend/unsuspend users with reason tracking
- **Bulk Actions** - Activate, deactivate, feature, delete multiple recipes
- **CSV Export** - Export recipes to spreadsheet

### Phase 3: Social Management (Complete)
- **Featured Curation** (`/featured`) - Manage featured recipes with reordering
- **Moderation Queue** (`/moderation`) - Review and act on content reports

### Phase 4: Creator Tools (Complete)
- **Creator Verification** (`/creators`) - Review and process verification requests

### Phase 5: Marketplace (Complete)
- **Products** (`/products`) - View and moderate creator products
- **Orders** (`/orders`) - Manage orders, update status, view details
- **Payouts** (`/payouts`) - Process creator payouts, track earnings

### Phase 6: Commercial Business Management (Complete)
- **Businesses** (`/businesses`) - View and manage all registered commercial businesses
  - Table listing all businesses with name, type, status, owner, created date
  - Filter by business type (restaurant, cafe, farm, etc.)
  - Search by business name
  - View business details dialog
  - **Business Verification** - Verify or reject businesses with admin notes
  - **Business Deletion** - Soft delete (archive) or hard delete with safeguards:
    - Shows related data counts before deletion (menu items, orders, customers, etc.)
    - Soft delete sets `deleted_at` timestamp (recoverable)
    - Hard delete requires typing business name to confirm
    - Hard delete requires `ALLOW_HARD_DELETE=true` environment variable
    - Superadmin only
  - Activity logging for verification/deletion decisions
  - Quick link to open Business Console
- **Business Console Access** - Direct link to `/business` console from admin sidebar

## Database Tables Required in Supabase
- `user_profiles` - with `is_suspended`, `suspended_at`, `suspended_reason`, `suspended_until` fields
- `shared_recipes` - curated recipes with `view_count`, `save_count`
- `new_content` - tips, tutorials, announcements
- `admin_activity_log` - audit trail for admin actions
- `content_views` - engagement tracking
- `content_reports` - user reports for moderation
- `creator_verification_requests` - creator verification requests
- `creator_profiles` - verified creator profiles
- `products` - marketplace products
- `product_variants` - product variants
- `orders` - customer orders
- `order_items` - items in orders
- `creator_payouts` - payout records
- `creator_earnings` - earnings per order

## SQL Migration Files

### Admin Console (Existing)
- `docs/migration-step1.sql` through `migration-step4.sql` - Core admin tables
- `docs/marketplace-migrations.sql` - Marketplace tables (Phase 5)

### Commercial Platform (New - Run in Order)
- `docs/migrations/001_commercial_platform.sql` - Business accounts, team, hours, reservations
- `docs/migrations/002_menu_orders.sql` - Menu system and order management
- `docs/migrations/003_customer_loyalty.sql` - Customer CRM and loyalty program
- `docs/migrations/004_seed_data.sql` - Sample businesses and menus
- `docs/migrations/005_verification_notes.sql` - Add verification_notes column to business_accounts
- `docs/migrations/006_cascade_delete.sql` - Add CASCADE DELETE to all business foreign keys

## Database Architecture
- **Supabase (PostgreSQL)** - All production data: business_accounts, menu_items, orders, reservations, customers, etc.
- **Prisma/SQLite (local)** - Legacy, only used for Better Auth user sessions. Business data is NOT in SQLite.
- All business-related API routes use the Supabase client directly (`backend/src/supabase.ts`)

## Environment Variables
- `ALLOW_HARD_DELETE=true` - Required to enable permanent business deletion (disabled by default for safety)

## Supabase Storage Buckets
- `business-assets` - Business logos, cover images, and other media (public bucket)

## All Phases Complete!
The KitchenSync Admin Console is fully implemented with all features from PLATFORM_SPEC.md.

## Commercial Platform Expansion (In Progress)

A major expansion to support commercial food businesses (restaurants, cafés, farms, food producers, etc.) with their own business console.

### Planning Documents
- `docs/COMMERCIAL_PLATFORM_PLAN.md` - Comprehensive technical plan with database schemas, API endpoints, and implementation phases
- `docs/IOS_COMMERCIAL_INTEGRATION.md` - iOS-specific integration guide with data models and API reference

### Phase 1: Foundation (Complete)
- **Business Console** at `/business/*` - Dashboard, reservations, orders, menu, customers, team, settings pages
- **Business Account Types** - restaurant, cafe, farm, farmstand, farmers_market, food_producer, food_store, catering, food_truck
- **Database Tables** - All business data stored in Supabase (PostgreSQL), not local SQLite
- **Business Onboarding with Email Verification**:
  - `/business/signup` - Create account with email/password
  - Supabase sends verification email
  - `/business/verify-email` - Handles email verification callback
  - `/business/register` - Complete business registration after verification
  - `/business/login` - Sign in to existing account
- **API Endpoints**:
  - `POST /api/business/register` - Register new business
  - `GET /api/business` - List all businesses
  - `GET /api/business/:id` - Get business by ID
  - `GET /api/business/:id/related-counts` - Get counts of related data (for deletion preview)
  - `DELETE /api/business/:id` - Delete business (soft delete by default, `?hard=true` for permanent)
  - `GET /api/business/slug/:slug` - Get business by slug (public)
  - `PUT /api/business/:id` - Update business
  - `PUT /api/business/:id/verify` - Verify a business (admin only)
  - `PUT /api/business/:id/reject` - Reject/revoke business verification (admin only)
  - `PUT /api/business/:id/toggle-active` - Activate/deactivate a business (admin only)
  - `GET /api/business/:id/team` - Get team members
  - `POST /api/business/:id/team/invite` - Invite team member
  - `PUT /api/business/:id/hours` - Update business hours

### Test Business Accounts
- The Golden Fork (restaurant) - demo@kitchensync.com
- Sunrise Farm (farm) - farmer@kitchensync.com
- Bean & Leaf Cafe (cafe) - barista@kitchensync.com

### Phase 2: Reservation System (Complete)
- **Database Tables** - RestaurantTable, ReservationSettings, Reservation
- **API Endpoints**:
  - `POST /api/reservations/:businessId` - Create reservation
  - `GET /api/reservations/:businessId` - List reservations (with date/status filters)
  - `GET /api/reservations/:businessId/:id` - Get reservation details
  - `PUT /api/reservations/:businessId/:id` - Update reservation
  - `PUT /api/reservations/:businessId/:id/status` - Update status (confirm, seat, complete, cancel)
  - `GET /api/reservations/:businessId/tables` - List tables
  - `POST /api/reservations/:businessId/tables` - Create table
  - `PUT /api/reservations/:businessId/tables/:id` - Update table
  - `DELETE /api/reservations/:businessId/tables/:id` - Delete table
  - `GET /api/reservations/:businessId/settings` - Get reservation settings
  - `PUT /api/reservations/:businessId/settings` - Update settings
  - `GET /api/reservations/:businessId/availability` - Check available time slots
- **UI Features**:
  - Full reservation management page at `/business/reservations`
  - Date picker, status filters, reservation list
  - Reservation details panel with status actions
  - New reservation dialog with availability checking
  - Table assignment
- **Customer-Facing Features**:
  - Public reservation booking page at `/reserve/:businessSlug`
  - Multi-step booking flow (date/time, guest info, confirmation)
  - Embeddable widget at `/widget/reservations.js` for external websites

### Reservation Widget for External Websites
Restaurants can embed a reservation widget on their own website:
```html
<div id="kitchensync-reservations"></div>
<script src="https://[YOUR_DOMAIN]/widget/reservations.js"
        data-business-slug="coq-au-vin-j7t0"
        data-theme="light"
        data-accent-color="#8B4513">
</script>
```
Widget options:
- `data-business-slug` (required): Business URL slug
- `data-theme`: "light" or "dark"
- `data-accent-color`: Brand color (hex)
- `data-button-only`: "true" for button-only mode (opens modal)
- `data-button-text`: Custom button text

### Test Business: Coq au Vin
- Business ID: `cmldgqfh90002z5kfeq7bcy54`
- Slug: `coq-au-vin-j7t0`
- Booking URL: `/reserve/coq-au-vin-j7t0`
- 10 tables configured (main, window, private, bar, patio sections)
- Settings: 1-8 party size, 60-day booking window, 30-min slots
- Sample menu: Appetizers (3 items), Main Courses (4 items), Desserts, Beverages

### Phase 3: Menu Builder (Complete)
- **Database Tables** - MenuCategory, MenuItem, MenuModifierGroup, MenuModifier
- **API Endpoints**:
  - `GET /api/menu/:businessId/categories` - List categories with items
  - `POST /api/menu/:businessId/categories` - Create category
  - `PUT /api/menu/:businessId/categories/:id` - Update category
  - `DELETE /api/menu/:businessId/categories/:id` - Delete category
  - `GET /api/menu/:businessId/items` - List all items
  - `POST /api/menu/:businessId/items` - Create item
  - `PUT /api/menu/:businessId/items/:id` - Update item
  - `DELETE /api/menu/:businessId/items/:id` - Delete item
  - `POST /api/menu/:businessId/modifier-groups` - Create modifier group
  - `PUT /api/menu/:businessId/modifier-groups/:id` - Update modifier group
  - `DELETE /api/menu/:businessId/modifier-groups/:id` - Delete modifier group
  - `POST /api/menu/:businessId/modifiers` - Create modifier
  - `PUT /api/menu/:businessId/modifiers/:id` - Update modifier
  - `DELETE /api/menu/:businessId/modifiers/:id` - Delete modifier
  - `GET /api/menu/:businessId/public` - Public menu (active items only)
- **UI Features**:
  - Full menu management page at `/business/menu`
  - Category CRUD with collapsible sections
  - Item CRUD with dietary info (vegetarian, vegan, gluten-free, nuts, dairy)
  - Quick availability toggle
  - Search/filter items
  - Stats dashboard (categories, items, available/unavailable)

### Phase 4: Order Management (Complete)
- **Database Tables** - Order, OrderItem
- **API Endpoints**:
  - `GET /api/orders/:businessId` - List orders (with filters: status, orderType, date)
  - `GET /api/orders/:businessId/:orderId` - Get order details
  - `POST /api/orders/:businessId` - Create order
  - `PUT /api/orders/:businessId/:orderId` - Update order
  - `PUT /api/orders/:businessId/:orderId/status` - Update order status
  - `PUT /api/orders/:businessId/:orderId/items/:itemId/status` - Update item status
  - `GET /api/orders/:businessId/stats/summary` - Get order statistics
- **Order Types** - dine_in, takeout, delivery
- **Order Status Flow** - pending → confirmed → preparing → ready → completed
- **Payment Status** - pending, paid, refunded, failed
- **UI Features**:
  - Full order management page at `/business/orders`
  - Filter by order type (dine-in, takeout, delivery)
  - Filter by status
  - Quick status update buttons
  - Order details dialog with item breakdown
  - Payment status management
  - Today's stats (orders, revenue, pending, preparing)
- **Loyalty Integration**: When orders are marked as completed, loyalty points are automatically awarded to customers

### Phase 5: Customer CRM (Complete)
- **Database Tables** - Customer, CustomerActivity, LoyaltyPoints, LoyaltyTransaction, LoyaltySettings
- **API Endpoints**:
  - `GET /api/customers/:businessId` - List customers (with filters: search, tag, tier, sortBy)
  - `GET /api/customers/:businessId/:customerId` - Get customer details
  - `POST /api/customers/:businessId` - Create customer
  - `PUT /api/customers/:businessId/:customerId` - Update customer
  - `DELETE /api/customers/:businessId/:customerId` - Delete customer
  - `GET /api/customers/:businessId/:customerId/activities` - Get activity history
  - `POST /api/customers/:businessId/:customerId/activities` - Add activity/note
  - `GET /api/customers/:businessId/:customerId/loyalty` - Get loyalty points and transactions
  - `POST /api/customers/:businessId/:customerId/loyalty/adjust` - Adjust points manually
  - `POST /api/customers/:businessId/:customerId/loyalty/redeem` - Redeem points
  - `GET /api/customers/:businessId/settings/loyalty` - Get loyalty program settings
  - `PUT /api/customers/:businessId/settings/loyalty` - Update loyalty settings
  - `GET /api/customers/:businessId/stats/summary` - Get customer stats
  - `POST /api/customers/:businessId/find-or-create` - Find or create customer by email/phone
- **Customer Features**:
  - Customer profiles with contact info, preferences, dietary restrictions
  - Visit and spending tracking (totalVisits, totalSpent, averageSpend)
  - Customer tagging system
  - Internal notes
  - Marketing opt-in tracking
- **Loyalty Program Features**:
  - Configurable points per dollar spent
  - Tiered membership (bronze, silver, gold, platinum)
  - Points redemption for rewards
  - Transaction history
  - Automatic point earning on order completion
  - Manual point adjustments
  - Tier thresholds configuration
- **UI Features**:
  - Full customer management page at `/business/customers`
  - Customer search and filtering
  - Customer details dialog with tabs (Info, Loyalty, Activity)
  - Create new customer dialog
  - Loyalty settings configuration
  - Stats dashboard (total customers, new this month, active customers, average spend)

### Phase 6: Analytics Dashboard (Complete)
- **API Endpoints**:
  - `GET /api/analytics/:businessId/dashboard` - Comprehensive dashboard data
  - `GET /api/analytics/:businessId/revenue` - Revenue summary with date range filters
  - `GET /api/analytics/:businessId/orders` - Order analytics by status, type, source
  - `GET /api/analytics/:businessId/customers` - Customer metrics and lifetime value
  - `GET /api/analytics/:businessId/menu` - Menu performance and popular items
  - `GET /api/analytics/:businessId/reservations` - Reservation stats and no-show rates
- **UI Features**:
  - Full analytics dashboard at `/business/analytics`
  - Key metrics cards (revenue, orders, customers, average order value)
  - Revenue trend line chart (7-day view)
  - Orders by status pie chart
  - Orders by hour bar chart (peak hours)
  - Popular menu items table
  - Top spending customers table
  - Reservation statistics
  - Date range selector (7d, 14d, 30d, 90d)

### All Commercial Platform Phases Complete!
The KitchenSync Business Console is fully implemented with:
- Phase 1: Foundation (business accounts, team management)
- Phase 2: Reservation System (tables, bookings, customer-facing widget)
- Phase 3: Menu Builder (categories, items, modifiers, dietary info)
- Phase 4: Order Management (dine-in, takeout, delivery, status tracking)
- Phase 5: Customer CRM (profiles, loyalty program, activity tracking)
- Phase 6: Analytics Dashboard (revenue, orders, customers, menu, reservations)

### iOS Mobile Features (Planned)
- Business discovery and profiles
- Reservation booking flow
- Menu browsing and ordering
- Order tracking
- Customer account management (payment methods, addresses, following)

<projects>
  webapp/    — React app (port 8000, environment variable VITE_BASE_URL)
  backend/   — Hono API server (port 3000, environment variable VITE_BACKEND_URL)
</projects>

<agents>
  Use subagents for project-specific work:
  - backend-developer: Changes to the backend API
  - webapp-developer: Changes to the webapp frontend

  Each agent reads its project's CLAUDE.md for detailed instructions.
</agents>

<coordination>
  When a feature needs both frontend and backend:
  1. Define Zod schemas for request/response in backend/src/types.ts (shared contracts)
  2. Implement backend route using the schemas
  3. Test backend with cURL (use $BACKEND_URL, never localhost)
  4. Implement frontend, importing schemas from backend/src/types.ts to parse responses
  5. Test the integration

  <shared_types>
    All API contracts live in backend/src/types.ts as Zod schemas.
    Both backend and frontend can import from this file — single source of truth.
  </shared_types>
</coordination>

<skills>
  Shared skills in .claude/skills/:
  - database-auth: Set up Prisma + Better Auth for user accounts and data persistence
  - ai-apis-like-chatgpt: Use this skill when the user asks you to make an app that requires an AI API.

  Frontend only skills:
  - frontend-app-design: Create distinctive, production-grade web interfaces using React, Tailwind, and shadcn/ui. Use when building pages, components, or styling any web UI.
</skills>

<environment>
  System manages git and dev servers. DO NOT manage these.
  The user views the app through Vibecode Mobile App with a webview preview or Vibecode Web App with an iframe preview.
  The user cannot see code or terminal. Do everything for them.
  Write one-off scripts to achieve tasks the user asks for.
  Communicate in an easy to understand manner for non-technical users.
  Be concise and don't talk too much.
</environment>
