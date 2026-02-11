# KitchenSync Business Console

Business dashboard for restaurants, cafes, farms, and food businesses on KitchenSync.

## Stack
- React 18 with Vite
- Use bun (not npm)
- React Router v6 for routing
- React Query for server/async state
- Tailwind v3 + shadcn/ui for styling and components
- Framer Motion for animations
- lucide-react for icons

## Structure
```
src/
  pages/         - Page components (routed in App.tsx)
  components/
    ui/          - shadcn/ui components
    layout/      - Layout components (DashboardLayout)
  contexts/      - React contexts (AuthContext, BusinessContext)
  hooks/         - Custom React hooks
  lib/           - Utilities (utils.ts, supabase.ts)
```

## Routes
- `/` - Dashboard (overview with stats, reservations, orders)
- `/reservations` - Reservation management
- `/orders` - Order management (dine-in, takeout, delivery)
- `/menu` - Menu builder (categories, items, pricing)
- `/customers` - Customer CRM and loyalty
- `/team` - Staff management and schedules
- `/settings` - Business settings and preferences

## Design Theme
- Warm amber/orange primary color (--primary: 32 95% 55%)
- Dark background theme matching admin console
- "KitchenSync for Business" branding
- Differentiated from admin console (which uses cyan/purple)

## Context
- `AuthContext` - Business user authentication
- `BusinessContext` - Current business data and state

## Backend
- Uses same Supabase instance as admin console
- API base URL via `VITE_BACKEND_URL`
- Shared types from `../backend/src/types.ts`

## Adding New Pages
1. Create page in `src/pages/`
2. Import in `src/App.tsx`
3. Add Route inside the DashboardLayout route
4. Add navigation link in `src/components/layout/DashboardLayout.tsx`

## Notes
- Currently uses mock data for demo purposes
- Authentication is stubbed - shows dashboard without login
- In production, will require business account verification
