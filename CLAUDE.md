# KitchenSync Web — Workspace Guide

## Platform Overview
KitchenSync is a social culinary platform where food enthusiasts connect, share recipes, and discover new flavors. This workspace contains the web consoles and customer web app.

**Main Domain**: https://www.cookbook.farm
**Backend API**: https://kitchensync-backend-2h5n.onrender.com
**Tech Stack**: React (web), Hono + Bun (backend), Supabase (PostgreSQL + Auth + Storage)

## Projects

```
webapp/             — Main React app (Admin Console + Business Console + Customer Web App)
                      Dev: bun run dev (port 8000) | Deploy: Vercel
business-console/   — Legacy standalone Business Console (deprecated, merged into webapp)
docs/               — Platform specs, migration files, integration guides
```

Each project has its own `CLAUDE.md` with project-specific instructions.

## Architecture

- **Database & Auth**: Supabase (PostgreSQL + Supabase Auth + Supabase Storage)
- **Backend**: Hono (TypeScript) running on Bun, deployed to Render
- **Web App**: React + Tailwind + shadcn/ui (dark-first design), deployed to Vercel
- **Mobile**: Expo (React Native) iOS app in a separate repository

## Implemented Features

### Admin Console (`/admin/*`)
- **Dashboard** — Platform statistics, recent recipes, featured content
- **Shared Recipes** — CRUD with bulk actions, CSV export, activity logging
- **Tips & Tutorials** — Content management for tips, tutorials, announcements
- **Users** — User directory with suspension management
- **Admins** — Admin user management (superadmin only)
- **Analytics** — User growth charts, engagement metrics, top recipes
- **Activity Log** — Admin action audit trail with filtering
- **Featured Curation** — Manage featured recipes with reordering
- **Moderation Queue** — Review and act on content reports
- **Creator Verification** — Review and process verification requests
- **Products** — View and moderate creator products
- **Orders** — Manage orders, update status, view details
- **Payouts** — Process creator payouts, track earnings
- **Businesses** — View, verify, and manage registered commercial businesses

### Business Console (`/business/*`)
- **Dashboard** — Business overview and key metrics
- **Reservations** — Table management, booking flow, availability checking
- **Orders** — Dine-in, takeout, delivery order management with status tracking
- **Menu Builder** — Categories, items, modifiers, dietary info
- **Customers** — CRM with profiles, loyalty program, activity tracking
- **Team** — Team member management and invites
- **Settings** — Business profile, hours, verification
- **Analytics** — Revenue, orders, customers, menu performance, reservations

### Customer Web App (`/app/*`)
- **Social Feed** — Infinite scroll, trending "For You" tab, following tab
- **Recipe Management** — CRUD, AI generation, URL import, recipe scaling
- **Community** — Shared recipes with likes, saves, comments, ratings
- **Social** — Follow system, follow requests (private accounts), user discovery
- **Lists** — Prep lists, shopping lists with sections, task reordering, duplication
- **Menus** — Personal menus with item reordering and recipe linking
- **Business Discovery** — Browse businesses, view menus, place orders
- **Reservation Booking** — Date/time selection, party size, guest info
- **Featured Recipes** — Curated picks with category browsing
- **AI Features** — AI recipe generation, recipe import from URL, AI menu creation
- **Profile** — Avatar upload, privacy settings, notification preferences
- **Asset Library** — Image upload and management
- **Inbox** — Quick-capture notes
- **Tips & Tutorials** — Content viewing with video support

## Database Tables (Supabase)

### Core
- `user_profiles` — User data with `is_admin`, suspension fields, social counts
- `recipes` — Recipes with ingredients/instructions/tags as JSONB arrays
- `user_shared_recipes` — Community shared recipes with like/comment counts
- `recipe_likes`, `recipe_saves`, `recipe_comments`, `recipe_ratings`
- `user_follows`, `follow_requests` — Social graph
- `notifications`, `inbox_items`
- `prep_lists` — Lists with tasks as JSON array, sections support
- `menus`, `menu_items` — Personal menus with recipe linking
- `new_content`, `content_views` — Tips/tutorials

### Commercial Platform
- `business_accounts` — Restaurant/cafe/farm/etc. profiles
- `reservation_settings`, `reservations` — Booking system
- `menu_categories`, `menu_items` (commercial), `menu_modifier_groups`, `menu_modifiers`
- `orders`, `order_items` — Commercial orders
- `customers`, `customer_activities` — Business CRM
- `loyalty_points`, `loyalty_transactions`, `loyalty_settings`
- `admin_activity_log`, `content_reports`
- `creator_verification_requests`, `creator_profiles`
- `products`, `product_variants`, `creator_payouts`, `creator_earnings`

## SQL Migration Files

### Admin Console
- `docs/migration-step1.sql` through `migration-step4.sql` — Core admin tables
- `docs/marketplace-migrations.sql` — Marketplace tables

### Commercial Platform (run in order)
- `docs/migrations/001_commercial_platform.sql` — Business accounts, team, hours, reservations
- `docs/migrations/002_menu_orders.sql` — Menu system and order management
- `docs/migrations/003_customer_loyalty.sql` — Customer CRM and loyalty program
- `docs/migrations/004_seed_data.sql` — Sample businesses and menus
- `docs/migrations/005_verification_notes.sql` — Verification notes column
- `docs/migrations/006_cascade_delete.sql` — CASCADE DELETE on business foreign keys

## Backend API Endpoints

### Business
- `POST /api/business/register` — Register new business
- `GET /api/business` — List businesses
- `GET /api/business/:id` — Get business by ID
- `GET /api/business/slug/:slug` — Get by slug (public)
- `PUT /api/business/:id` — Update business
- `PUT /api/business/:id/verify` — Verify (admin)
- `PUT /api/business/:id/reject` — Reject (admin)
- `DELETE /api/business/:id` — Delete (soft/hard)

### Reservations
- `POST /api/reservations/:businessId` — Create reservation
- `GET /api/reservations/:businessId` — List reservations
- `GET /api/reservations/:businessId/availability` — Check time slots
- `PUT /api/reservations/:businessId/:id/status` — Update status

### Menu
- `GET /api/menu/:businessId/categories` — List categories with items
- `POST /api/menu/:businessId/items` — Create item
- `GET /api/menu/:businessId/public` — Public menu

### Orders
- `GET /api/orders/:businessId` — List orders
- `POST /api/orders/:businessId` — Create order
- `PUT /api/orders/:businessId/:orderId/status` — Update status

### Customers
- `GET /api/customers/:businessId` — List customers
- `POST /api/customers/:businessId` — Create customer
- `GET /api/customers/:businessId/:customerId/loyalty` — Loyalty points

### Analytics
- `GET /api/analytics/:businessId/dashboard` — Dashboard data
- `GET /api/analytics/:businessId/revenue` — Revenue summary

### AI
- `POST /api/ai/recipe-parse` — Parse recipe from URL
- `POST /api/ai/menu` — Generate menu with AI

## Environment Variables
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anonymous key
- `VITE_BACKEND_URL` — Backend API URL
- `ALLOW_HARD_DELETE=true` — Enable permanent business deletion (admin)

## Supabase Storage Buckets
- `recipe-images` — Recipe photos
- `avatars` — User profile photos
- `user-assets` — User-uploaded images (asset library)
- `business-assets` — Business logos and cover images
