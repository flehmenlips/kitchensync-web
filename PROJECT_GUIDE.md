# KitchenSync Project Guide

**Main Domain**: https://cookbook.farm (web consoles)  
**Short Domain**: https://cook.farm (redirect / future landing)  
**Tech Stack**: React (web), Expo (iOS), Hono + Bun (backend), Supabase (PostgreSQL + Auth + Storage)

## Repository Structure (Recommended)

Create **three separate repositories** for clean ownership and CI/CD:

1. **`kitchensync-web`** → Admin Console + Business Console (React)
2. **`kitchensync-backend`** → Hono API server
3. **`kitchensync-mobile`** → Expo iOS app

(Keep them separate — this is the professional long-term structure.)

## Core Architecture

- **Database & Auth**: Supabase (PostgreSQL + Supabase Auth)
- **Backend**: Hono (TypeScript) running on Bun
- **Web Consoles**: React + Tailwind + shadcn/ui (dark-first design)
- **Mobile**: Expo (React Native) → TestFlight → App Store
- **Hosting**:
  - Web consoles → Vercel (recommended) or Render
  - Backend → Render (or Fly.io / Railway)
  - iOS builds → Expo EAS (GitHub Actions)

## Development Workflow

**Local Development**
```bash
# Terminal 1 - Backend
cd kitchensync-backend
bun install
bun run dev

# Terminal 2 - Web Console
cd kitchensync-web
bun install
bun run dev
