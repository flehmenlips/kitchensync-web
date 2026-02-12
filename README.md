# KitchenSync Web

Web consoles for the KitchenSync platform: admin dashboard and business dashboard for restaurants, cafes, farms, and food businesses.

## Overview

This repository contains two React applications:

| App | Description |
|-----|-------------|
| **webapp** | Admin console — business management, verification, analytics, users |
| **business-console** | Business dashboard — reservations, orders, menu, customers, team |

Both apps share the same backend API and Supabase instance.

## Tech Stack

- **React 18** + **TypeScript**
- **Vite 5** — build tool and dev server
- **React Router v6** — routing
- **TanStack Query** — server state and caching
- **Tailwind CSS** + **shadcn/ui** (Radix) — styling and components
- **Supabase** — auth and database
- **Framer Motion** — animations
- **Zod** — validation
- **Bun** — package manager (npm/yarn also supported)

## Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node 18+
- Supabase project
- Backend API (see [kitchensync-backend](https://github.com/flehmenlips/kitchensync-backend))

## Run Locally

### 1. Clone and install

```bash
git clone https://github.com/flehmenlips/kitchensync-web.git
cd kitchensync-web
```

### 2. Configure environment

Copy the example env file into each app and add your values:

```bash
# Admin console (webapp)
cp webapp/.env.example webapp/.env

# Business console
cp business-console/.env.example business-console/.env
```

Required variables:

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous (public) key |
| `VITE_BACKEND_URL` | Backend API URL (e.g. `https://kitchensync-backend-2h5n.onrender.com`) |

### 3. Run the admin console

```bash
cd webapp
bun install
bun run dev
```

Open [http://localhost:5173](http://localhost:5173) (or the port Vite prints).

### 4. Run the business console

In a new terminal:

```bash
cd business-console
bun install
bun run dev
```

Open [http://localhost:5173](http://localhost:5173) (or the alternate port if webapp is using 5173).

## Deploy

### Vercel (recommended)

1. Connect this repo to [Vercel](https://vercel.com)
2. Configure two projects (or two root directories):
   - **Admin**: Root directory `webapp`, build command `bun run build`, output directory `dist`
   - **Business console**: Root directory `business-console`, build command `bun run build`, output directory `dist`
3. Add environment variables in Vercel project settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_BACKEND_URL`

Custom domains can be set in Vercel (e.g. `cookbook.farm` for admin, subdomain for business).

### Build commands

```bash
# Admin console
cd webapp && bun run build

# Business console
cd business-console && bun run build
```

## Current Status

| Component | Status |
|-----------|--------|
| **Backend API** | Deployed on [Render](https://render.com) |
| **Admin console (webapp)** | Deployed on Vercel → [cookbook.farm](https://cookbook.farm) |
| **Business console** | Deployed on Vercel |
| **Database** | Supabase |

## Related Repositories

- [kitchensync-backend](https://github.com/flehmenlips/kitchensync-backend) — Hono API server
- [kitchensync-mobile](https://github.com/flehmenlips/kitchensync-mobile) — Expo iOS/Android app

## License

Private — Cookbook Farm / KitchenSync
