# KitchenSync Web App

## Stack
- React 18 with Vite
- Use bun (not npm)
- React Router v6 for routing
- React Query (@tanstack/react-query) for server/async state
- Tailwind v3 + shadcn/ui for styling and components
- Framer Motion for animations
- lucide-react for icons
- Pre-installed shadcn/ui components

## Environment
- **IDE**: Cursor (developer has full access to code and terminal)
- **Dev server**: `bun run dev` on port 8000
- **Production**: Deployed to Vercel at https://www.cookbook.farm
- **Backend**: Hono/Bun API at https://kitchensync-backend-2h5n.onrender.com
- **Database/Auth**: Supabase (PostgreSQL + Auth + Storage)
- **Git**: Managed by the developer; commit and push when asked

## Structure
```
src/pages/          — Page components (manually routed in App.tsx)
  app/              — Customer web app pages (/app/*)
  business/         — Business console pages (/business/*)
src/components/
  ui/               — shadcn/ui components (pre-built, use these first)
  layout/           — Layout components (CustomerLayout, DashboardLayout, etc.)
src/contexts/       — Auth contexts (AuthContext for admin, CustomerAuthContext for users)
src/hooks/          — Custom React hooks
src/lib/            — Utilities: supabase.ts, queryClient.ts, api.ts, utils.ts
src/types/          — TypeScript type definitions
```

Create small, focused components instead of monolithic files.
Extract components into separate files.

## TypeScript
- Explicit type annotations for useState: `useState<Type[]>([])` not `useState([])`
- Null/undefined handling: use optional chaining `?.` and nullish coalescing `??`
- Include ALL required properties when creating objects

## Routing
React Router v6. Routes are manually registered in `src/App.tsx`.

**Adding routes:**
1. Create a new page component in `src/pages/` (e.g., `src/pages/app/NewPage.tsx`)
2. Lazy-import it in `src/App.tsx`
3. Add a Route inside the appropriate route group (admin, business, or customer app)
4. Customer app routes go under `/app/*` in `CustomerAppRoutes`

**Navigation:**
- `<Link to="/path">` for navigation links
- `useNavigate()` for programmatic navigation
- `useParams()` for URL params, `useSearchParams()` for query strings
- `<Outlet />` for nested layouts

**Rules:**
- The `*` catch-all route must always be LAST
- Customer app routes: `/app/*` (CustomerAuthProvider)
- Admin routes: `/admin/*` (AuthProvider)
- Business routes: `/business/*` (AuthProvider + BusinessProvider)

## State Management
- React Query for server/async state. Always use object API: `useQuery({ queryKey, queryFn })`
- `useMutation` for async operations — no manual `setIsLoading` patterns
- Reuse query keys across components to share cached data
- Local state: React hooks (useState, useReducer)

## Authentication
- **Admin/Business**: `AuthContext` — checks `user_profiles.is_admin` via Supabase
- **Customer app**: `CustomerAuthContext` — uses `onAuthStateChange` only (never call `getSession()` directly to avoid AbortError corruption). Profile fetched via raw `fetch()`.
- Both share the SAME single Supabase client instance. NEVER create multiple clients.

## Backend API
API base URL: `import.meta.env.VITE_BACKEND_URL`

```typescript
const baseUrl = import.meta.env.VITE_BACKEND_URL!;
const response = await fetch(`${baseUrl}/api/your-endpoint`);
```

All endpoints use the `/api/` prefix.

## Design
- Design for desktop and mobile responsiveness
- Inspiration: Linear, Vercel, Stripe, Notion
- Use shadcn/ui components as building blocks
- Dark-first theme with cohesive colors and sharp accents
- Mobile-first: use Tailwind responsive classes (sm:, md:, lg:, xl:)
- Touch targets at least 44px on mobile

## Styling
- Tailwind for styling. `cn()` helper from `src/lib/utils.ts` for conditional classNames
- All shadcn/ui components support className prop
- Use Button, Dialog, AlertDialog from shadcn/ui — not raw HTML
- Framer Motion for complex animations; Tailwind transitions for simple ones
