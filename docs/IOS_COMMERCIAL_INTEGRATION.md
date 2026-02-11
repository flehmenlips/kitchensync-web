# KitchenSync iOS Integration Guide - Commercial Platform

## Overview

This document provides the iOS development team with specifications for implementing the consumer-facing commercial features in the KitchenSync mobile app. The backend API is fully implemented and ready for integration.

**Backend Base URL:** Use the `BACKEND_URL` environment variable (e.g., `https://[id].vibecode.run`)

---

## Platform Status

### Implemented (Ready for iOS Integration)
- Business Discovery & Profiles
- Restaurant Reservations (full flow)
- Menu Browsing
- Order Placement (dine-in, takeout, delivery)
- Customer Loyalty Program
- Business Analytics (admin only)

### Not Yet Implemented
- Payment Processing (Stripe integration)
- Push Notifications
- Real-time Order Updates (WebSocket)
- Customer Following System
- Customer Account Management (addresses, payment methods)

---

## New User Flows

### 1. Business Discovery

**Entry Points:**
- "Explore" tab → Businesses section
- Search with filters (type, location)
- Map view with nearby businesses

**Business Card Components:**
- Cover image
- Logo/avatar
- Business name
- Type badge (Restaurant, Farm, etc.)
- Distance (if location available)
- Quick actions: Reserve, Order

### 2. Business Profile Screen

**Sections:**
```
┌─────────────────────────────────┐
│ [Cover Image]                   │
│ [Logo] Business Name            │
│ Type • Verified Badge           │
│ [Reserve] [Order]               │
├─────────────────────────────────┤
│ About                           │
│ Description text...             │
├─────────────────────────────────┤
│ Hours                           │
│ Mon-Fri: 9am-5pm               │
│ Sat-Sun: Closed                 │
├─────────────────────────────────┤
│ Location                        │
│ [Map Preview]                   │
│ 123 Main St, City, ST 12345    │
│ [Directions]                    │
├─────────────────────────────────┤
│ Menu                            │
│ [Menu Category Cards...]        │
└─────────────────────────────────┘
```

### 3. Reservation Flow

**Screen Sequence:**
1. **Select Date** - Calendar picker with availability indicators
2. **Select Time** - Available time slots for selected date (from API)
3. **Party Size** - Number picker (respects business min/max limits)
4. **Guest Info** - Name, email, phone
5. **Preferences** - Seating preference, special requests, occasion
6. **Confirm** - Review details
7. **Success** - Confirmation with add to calendar option

**API Endpoints:**
```
GET  /api/reservations/:businessId/settings    → Get booking rules (min/max party, advance time)
GET  /api/reservations/:businessId/availability?date=YYYY-MM-DD&partySize=N
POST /api/reservations/:businessId             → Create reservation
```

### 4. Ordering Flow

**Screen Sequence:**
1. **Menu Browser** - Categories, items with dietary info
2. **Item Detail** - Full description, modifiers, add to cart
3. **Cart** - Review items, quantities, special instructions
4. **Order Type** - Dine-in (table), Takeout, or Delivery
5. **Customer Info** - Name, contact, delivery address (if applicable)
6. **Confirm** - Review total, submit order
7. **Order Tracking** - Status display (pending → confirmed → preparing → ready)

**Cart State:**
- Persist locally per business
- Clear on order completion
- Prompt if switching businesses with items in cart

---

## Data Models (TypeScript → Swift)

### Business

```swift
struct Business: Codable, Identifiable {
    let id: String
    let slug: String
    let businessName: String
    let businessType: BusinessType
    let description: String?

    // Branding
    let logoUrl: String?
    let coverImageUrl: String?
    let brandColor: String?

    // Location
    let addressLine1: String?
    let city: String?
    let state: String?
    let postalCode: String?

    // Contact
    let phone: String?
    let email: String?

    // Status
    let isVerified: Bool
    let isActive: Bool

    // Hours (when included)
    let hours: [BusinessHours]?

    // Owner info (admin only)
    let owner: BusinessOwner?
}

struct BusinessOwner: Codable {
    let id: String
    let email: String
    let name: String?
}

struct BusinessHours: Codable, Identifiable {
    let id: String
    let dayOfWeek: Int  // 0=Sunday, 1=Monday, etc.
    let openTime: String?  // "HH:mm"
    let closeTime: String?  // "HH:mm"
    let isClosed: Bool
    let notes: String?
}

enum BusinessType: String, Codable {
    case restaurant
    case cafe
    case farm
    case farmstand
    case farmersMarket = "farmers_market"
    case foodProducer = "food_producer"
    case foodStore = "food_store"
    case catering
    case foodTruck = "food_truck"
}
```

### Reservation

```swift
struct Reservation: Codable, Identifiable {
    let id: String
    let businessId: String
    let reservationDate: String  // "YYYY-MM-DD"
    let reservationTime: String  // "HH:mm"
    let partySize: Int
    let durationMinutes: Int
    let status: ReservationStatus

    // Customer info
    let customerName: String
    let customerEmail: String
    let customerPhone: String?

    // Preferences
    let seatingPreference: String?
    let specialRequests: String?
    let occasion: String?

    // Table assignment (if any)
    let table: TableInfo?

    // Timestamps
    let createdAt: String
    let confirmedAt: String?
    let seatedAt: String?
    let completedAt: String?
    let cancelledAt: String?
    let cancellationReason: String?
}

struct TableInfo: Codable {
    let id: String
    let tableNumber: String
    let section: String?
}

enum ReservationStatus: String, Codable {
    case pending
    case confirmed
    case seated
    case completed
    case cancelled
    case noShow = "no_show"
}

struct ReservationSettings: Codable {
    let minPartySize: Int
    let maxPartySize: Int
    let bookingWindowDays: Int
    let minAdvanceHours: Int
    let slotDurationMinutes: Int
    let defaultDiningDuration: Int
    let allowWaitlist: Bool
    let autoConfirm: Bool
}

struct AvailabilitySlot: Codable {
    let time: String  // "HH:mm"
    let available: Bool
    let remainingCapacity: Int?
}

struct CreateReservationRequest: Codable {
    let reservationDate: String  // "YYYY-MM-DD"
    let reservationTime: String  // "HH:mm"
    let partySize: Int
    let customerName: String
    let customerEmail: String
    let customerPhone: String?
    let seatingPreference: String?
    let specialRequests: String?
    let occasion: String?
    let source: String?  // "app", "website", "phone"
}
```

### Menu

```swift
struct MenuCategory: Codable, Identifiable {
    let id: String
    let businessId: String
    let name: String
    let description: String?
    let imageUrl: String?
    let displayOrder: Int
    let isActive: Bool
    let availableStartTime: String?
    let availableEndTime: String?
    let items: [MenuItem]?
}

struct MenuItem: Codable, Identifiable {
    let id: String
    let categoryId: String
    let businessId: String
    let name: String
    let description: String?
    let imageUrl: String?
    let price: Double
    let displayOrder: Int
    let isActive: Bool
    let isAvailable: Bool

    // Dietary info
    let isVegetarian: Bool
    let isVegan: Bool
    let isGlutenFree: Bool
    let containsNuts: Bool
    let containsDairy: Bool
    let spiceLevel: Int?
    let calories: Int?
    let prepTimeMinutes: Int?

    // Modifier groups
    let modifierGroups: [ModifierGroup]?
    let category: MenuCategory?
}

struct ModifierGroup: Codable, Identifiable {
    let id: String
    let name: String
    let description: String?
    let isRequired: Bool
    let minSelections: Int
    let maxSelections: Int
    let modifiers: [Modifier]
}

struct Modifier: Codable, Identifiable {
    let id: String
    let name: String
    let priceAdjustment: Double
    let isDefault: Bool
    let isAvailable: Bool
}
```

### Orders

```swift
struct Order: Codable, Identifiable {
    let id: String
    let businessId: String
    let orderNumber: String
    let orderType: OrderType
    let status: OrderStatus
    let paymentStatus: PaymentStatus

    // Customer
    let customerName: String
    let customerEmail: String?
    let customerPhone: String?

    // Delivery (if applicable)
    let deliveryAddress: String?
    let deliveryNotes: String?
    let deliveryFee: Double?

    // Table (if dine-in)
    let table: TableInfo?
    let reservationId: String?

    // Amounts
    let subtotal: Double
    let taxAmount: Double
    let tipAmount: Double
    let discountAmount: Double
    let totalAmount: Double

    // Items
    let items: [OrderItem]

    // Timing
    let scheduledFor: String?
    let estimatedReady: String?
    let source: String  // "app", "website", "pos", "phone"

    // Timestamps
    let createdAt: String
    let confirmedAt: String?
    let preparingAt: String?
    let readyAt: String?
    let completedAt: String?
    let cancelledAt: String?
    let paidAt: String?
}

struct OrderItem: Codable, Identifiable {
    let id: String
    let menuItemId: String
    let itemName: String
    let itemPrice: Double
    let quantity: Int
    let modifiers: String?  // JSON string of selected modifiers
    let modifiersTotal: Double
    let totalPrice: Double
    let specialRequests: String?
    let status: OrderItemStatus
}

enum OrderType: String, Codable {
    case dineIn = "dine_in"
    case takeout
    case delivery
}

enum OrderStatus: String, Codable {
    case pending
    case confirmed
    case preparing
    case ready
    case completed
    case cancelled
}

enum PaymentStatus: String, Codable {
    case pending
    case paid
    case refunded
    case failed
}

enum OrderItemStatus: String, Codable {
    case pending
    case preparing
    case ready
    case served
}

struct CreateOrderRequest: Codable {
    let orderType: String  // "dine_in", "takeout", "delivery"
    let customerName: String
    let customerEmail: String?
    let customerPhone: String?
    let tableId: String?  // For dine-in
    let reservationId: String?
    let deliveryAddress: String?
    let deliveryNotes: String?
    let scheduledFor: String?  // ISO date for scheduled orders
    let tipAmount: Double?
    let paymentMethod: String?
    let specialInstructions: String?
    let source: String?  // "app"
    let items: [CreateOrderItemRequest]
}

struct CreateOrderItemRequest: Codable {
    let menuItemId: String
    let quantity: Int
    let modifiers: [SelectedModifier]?
    let specialRequests: String?
}

struct SelectedModifier: Codable {
    let id: String
    let name: String
    let priceAdjustment: Double
}
```

### Customer & Loyalty (Future)

```swift
struct Customer: Codable, Identifiable {
    let id: String
    let businessId: String
    let firstName: String
    let lastName: String
    let email: String?
    let phone: String?
    let totalVisits: Int
    let totalSpent: Double
    let averageSpend: Double
    let lastVisitAt: String?
}

struct LoyaltyPoints: Codable {
    let id: String
    let customerId: String
    let pointsBalance: Int
    let lifetimeEarned: Int
    let lifetimeRedeemed: Int
    let tier: String  // "bronze", "silver", "gold", "platinum"
}
```

---

## API Reference

### Response Format

All endpoints return data wrapped in a `data` envelope:

```json
{
  "data": { ... }
}
```

Errors return:
```json
{
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE"
  }
}
```

### Business Discovery

```http
# List all businesses (with optional filters)
GET /api/business
Query params:
  - type: BusinessType (optional)
  - active: "true" (optional, only active businesses)

Response: { data: Business[] }

# Get business by ID
GET /api/business/:id
Response: { data: Business }

# Get business by slug (public)
GET /api/business/slug/:slug
Response: { data: Business }
```

### Reservations

```http
# Get reservation settings
GET /api/reservations/:businessId/settings
Response: { data: ReservationSettings }

# Check availability for a date
GET /api/reservations/:businessId/availability
Query params:
  - date: "YYYY-MM-DD" (required)
  - partySize: number (optional, default 2)
Response: { data: AvailabilitySlot[] }

# Create reservation
POST /api/reservations/:businessId
Body: CreateReservationRequest
Response: { data: Reservation }

# Get reservation details
GET /api/reservations/:businessId/:reservationId
Response: { data: Reservation }

# Cancel reservation (customer-initiated)
PUT /api/reservations/:businessId/:reservationId/status
Body: { "status": "cancelled", "cancellationReason": "Customer request" }
Response: { data: Reservation }
```

### Menu

```http
# Get full menu (public, active items only)
GET /api/menu/:businessId/public
Response: {
  data: {
    businessId: string,
    businessName: string,
    categories: MenuCategory[]
  }
}

# Get all categories with items
GET /api/menu/:businessId/categories
Response: { data: MenuCategory[] }

# Get single item details
GET /api/menu/:businessId/items/:itemId
Response: { data: MenuItem }
```

### Orders

```http
# Create order
POST /api/orders/:businessId
Body: CreateOrderRequest
Response: { data: Order }

# Get order details
GET /api/orders/:businessId/:orderId
Response: { data: Order }

# Get order stats (for business dashboard)
GET /api/orders/:businessId/stats/summary
Query params:
  - date: "YYYY-MM-DD" (optional, defaults to all time)
Response: {
  data: {
    totalOrders: number,
    pendingOrders: number,
    preparingOrders: number,
    completedOrders: number,
    cancelledOrders: number,
    totalRevenue: number,
    averageOrderValue: number
  }
}
```

### Tables (for dine-in ordering)

```http
# Get available tables
GET /api/reservations/:businessId/tables
Response: { data: RestaurantTable[] }
```

---

## Test Business Accounts

| Business | ID | Slug | Type |
|----------|-----|------|------|
| Coq au Vin | `cmldgqfh90002z5kfeq7bcy54` | `coq-au-vin-j7t0` | restaurant |
| The Golden Fork | (varies) | (varies) | restaurant |
| Sunrise Farm | (varies) | (varies) | farm |
| Bean & Leaf Cafe | (varies) | (varies) | cafe |

### Test Reservation Flow

1. Get settings: `GET /api/reservations/cmldgqfh90002z5kfeq7bcy54/settings`
2. Check availability: `GET /api/reservations/cmldgqfh90002z5kfeq7bcy54/availability?date=2026-02-15&partySize=4`
3. Create reservation:
```json
POST /api/reservations/cmldgqfh90002z5kfeq7bcy54
{
  "reservationDate": "2026-02-15",
  "reservationTime": "19:00",
  "partySize": 4,
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "customerPhone": "+1234567890",
  "occasion": "Birthday",
  "source": "app"
}
```

### Test Order Flow

1. Get menu: `GET /api/menu/cmldgqfh90002z5kfeq7bcy54/public`
2. Create order:
```json
POST /api/orders/cmldgqfh90002z5kfeq7bcy54
{
  "orderType": "takeout",
  "customerName": "Jane Smith",
  "customerEmail": "jane@example.com",
  "customerPhone": "+1234567890",
  "source": "app",
  "items": [
    {
      "menuItemId": "(menu item id from step 1)",
      "quantity": 2,
      "modifiers": [],
      "specialRequests": "Extra sauce"
    }
  ]
}
```

---

## UI/UX Guidelines

### Business Type Icons

| Type | SF Symbol |
|------|-----------|
| Restaurant | `fork.knife` |
| Cafe | `cup.and.saucer.fill` |
| Farm | `leaf.fill` |
| Farmstand | `storefront.fill` |
| Farmers Market | `basket.fill` |
| Food Producer | `shippingbox.fill` |
| Food Store | `cart.fill` |
| Catering | `tray.full.fill` |
| Food Truck | `bus.fill` |

### Reservation Status Colors

| Status | Color |
|--------|-------|
| Pending | Yellow/Warning |
| Confirmed | Blue/Info |
| Seated | Green/Success |
| Completed | Gray/Muted |
| Cancelled | Red/Destructive |
| No Show | Red/Destructive |

### Order Status Colors

| Status | Color |
|--------|-------|
| Pending | Yellow/Warning |
| Confirmed | Blue/Info |
| Preparing | Orange |
| Ready | Green/Success |
| Completed | Gray/Muted |
| Cancelled | Red/Destructive |

### Dietary Icons

| Tag | Icon |
|-----|------|
| Vegetarian | `leaf.fill` (green) |
| Vegan | `leaf.circle.fill` (green) |
| Gluten-Free | `g.circle` |
| Contains Nuts | `exclamationmark.triangle` |
| Contains Dairy | `drop.fill` |
| Spicy | `flame.fill` |

### Empty States

- No nearby businesses → Expand search area prompt
- No reservations → Browse restaurants prompt
- No orders → Browse menu prompt
- Cart empty → Discover menu prompt

---

## Error Handling

### Common Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `NOT_FOUND` | 404 | Business, reservation, or order not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `INVALID_PARTY_SIZE` | 400 | Party size outside allowed range |
| `ITEM_UNAVAILABLE` | 400 | Menu item not available |
| `DUPLICATE` | 400 | Duplicate entry (e.g., table number) |
| `HAS_RESERVATIONS` | 400 | Cannot delete table with active reservations |
| `CREATE_FAILED` | 500 | Failed to create resource |
| `UPDATE_FAILED` | 500 | Failed to update resource |

### Error Response Example

```json
{
  "error": {
    "code": "INVALID_PARTY_SIZE",
    "message": "Party size must be between 1 and 8"
  }
}
```

---

## Integration Checklist

### Phase 1: Business Discovery
- [ ] List businesses endpoint integration
- [ ] Business profile screen
- [ ] Business hours display
- [ ] Map integration for location

### Phase 2: Reservations
- [ ] Reservation settings fetch
- [ ] Availability calendar
- [ ] Time slot selection
- [ ] Reservation creation
- [ ] Reservation confirmation screen
- [ ] Reservation management (view, cancel)

### Phase 3: Menu & Ordering
- [ ] Menu browsing by category
- [ ] Item detail with modifiers
- [ ] Cart management (local storage)
- [ ] Order creation
- [ ] Order confirmation
- [ ] Order status tracking

### Phase 4: Account Features (Future)
- [ ] Customer account creation
- [ ] Loyalty points display
- [ ] Order history
- [ ] Saved payment methods
- [ ] Saved addresses

---

## Admin Console Connection

The KitchenSync superadmin console at `/` provides oversight of all commercial businesses:

- **Businesses Page** (`/businesses`) - View all registered businesses, filter by type, search, view details
- **Business Console** (`/business`) - Full business management dashboard

From the admin console, superadmins can:
- View all registered businesses
- See business status (active, verified, pending)
- Access any business's management console
- Monitor platform-wide analytics

---

*Document Version: 2.0*
*Last Updated: 2026-02-08*
*Backend API: Fully Implemented*
