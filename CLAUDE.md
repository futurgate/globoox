# Globoox Preview

## 🎯 Overview
Next.js 16 frontend for Globooks. Modern React reader UI consuming the Nuxt backend API. Supabase auth with shadcn/ui components.

**Tech:** Next.js 16, React 19, TypeScript, Supabase SSR, shadcn/ui, Tailwind, Zustand  
**Backend:** `../` (Nuxt API at https://globooks.onrender.com)

## 🚨 Critical Rules
1. **Never commit `.env.local`** - Contains Supabase secrets
2. **Use server components** - Default to RSC, add 'use client' only when needed
3. **Supabase SSR** - Use `@supabase/ssr` for server-side auth
4. **shadcn/ui** - Components in `components/ui/`, don't modify directly
5. **Backend API** - All data from parent Nuxt API, not direct DB access
6. **Safari/Canvas** - Before writing any `canvas.drawImage()` code, read `docs/safari-bugs.md`. Always use `img.decode()` instead of `img.onload` before canvas operations.

## 🚀 Quick Start
```bash
npm install                    # Install deps
# Create .env.local with:
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# API_URL=https://globooks.onrender.com  # Backend API endpoint
npm run dev                    # http://localhost:3000
```

## 🐛 Troubleshooting
| Issue | Fix |
|-------|-----|
| Auth not working | Check env vars, verify callback route |
| Hydration error | Mark component with 'use client' |
| shadcn missing | Run `npx shadcn@latest add <component>` |
| API errors | Verify backend is running, check CORS |
| 503 Backend not configured | Set `API_URL` in `.env.local` |

## 📂 Key Structure
```
src/app/           → App router pages
  auth/callback/   → OAuth callback handler
components/ui/     → shadcn/ui components
docs/              → Architecture docs
public/            → Static assets, covers
```

## 📞 Where to Find More
- **API architecture:** `docs/api-architecture.md`
- **Fast start (RU):** `docs/faststart.md`
- **Parent API:** `../BACKEND_API.md`
- **DB schema:** `../supabase/schema.sql`
- **shadcn config:** `components.json`
- **Safari bugs:** `docs/safari-bugs.md` (read before touching image/canvas code)

---

# Tier 2: Contextual Details

## Auth Callback Flow
```typescript
// src/app/auth/callback/route.ts
// Handles OAuth redirect from Supabase
// Exchanges code for session, redirects to app
```

## State Management
- **Zustand** for client state
- **React Query** pattern for server state (if added)
- **Supabase realtime** for live updates (if needed)

## UI Components
- **Radix UI** primitives via shadcn
- **Framer Motion** for animations
- **Lucide** for icons
- **next-themes** for dark mode

## API Integration
All API calls go through Next.js API routes which proxy to the backend:

**Architecture:**
```
Browser → /api/* (Next.js routes) → Backend API (with auth injection)
Server-side → Direct backend calls (SSR/SSG)
```

**Environment Variables:**
- `API_URL` - Backend API endpoint (server-side only, recommended)
- `NEXT_PUBLIC_API_URL` - Alternative (exposed to browser, fallback)

**Example:**
```env
API_URL=https://globooks.onrender.com
```

**API Routes:**
```typescript
// Client calls Next.js routes (relative paths)
GET /api/books
GET /api/books/{id}/chapters
GET /api/chapters/{id}/content?lang=XX
POST /api/chapters/{id}/translate

// Next.js routes proxy to backend with auth headers
// Backend: ${API_URL}/api/books, etc.
```
