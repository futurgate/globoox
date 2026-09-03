# Quick Reference

## Essential Commands
```bash
# Development
npm run dev              # Start dev server (localhost:3000)
npm run build            # Production build
npm run start            # Production server
npm run lint             # ESLint check

# Type Checking
npx tsc --noEmit         # TypeScript validation
```

## Common Issues

| Problem | Solution |
|---------|----------|
| Port 3000 already in use | `lsof -ti:3000 \| xargs kill -9` |
| Hydration mismatch | Add `'use client'` to component |
| Supabase auth error | Check `.env.local` has correct keys |
| shadcn component missing | `npx shadcn@latest add <component>` |
| Type errors | `npx tsc --noEmit` |
| API CORS error | Verify backend allows origin |
| Missing deps | `rm -rf node_modules && npm install` |
| Library stuck after login | Check browser console for `[api] /api/books responded as unauthenticated` |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 |
| Frontend | React 19 + TypeScript |
| State | Zustand |
| Auth | Supabase SSR |
| UI | shadcn/ui + Tailwind |
| Icons | Lucide |
| Animations | Framer Motion |

## Project Structure
```
src/app/
  page.tsx               # Home page
  auth/
    callback/route.ts    # OAuth callback
  layout.tsx             # Root layout
components/
  ui/                    # shadcn components
public/
  covers/                # Book covers
docs/
  api-architecture.md    # Full API spec
```

## Critical Rules
- ✅ Use Server Components by default
- ✅ Add `'use client'` only when needed
- ✅ Use `@supabase/ssr` for server auth
- ❌ Never commit `.env.local`
- ❌ Never modify `components/ui/` directly
- ✅ All data from parent Nuxt API

## API Integration
```typescript
const API = 'https://globooks.onrender.com'

// Books
GET  ${API}/api/books
GET  ${API}/api/books/{id}/chapters
GET  ${API}/api/books/{id}/reading-position
PUT  ${API}/api/books/{id}/reading-position

// Chapters
GET  ${API}/api/chapters/{id}/content?lang=XX
POST ${API}/api/chapters/{id}/translate

// Translation
POST ${API}/api/translate
POST ${API}/api/detect-language
```

## My Books Auth-Race Checklist

If user logs in and still sees no books:

1. Open browser console and check for warning:
   - `[api] /api/books responded as unauthenticated`
2. Verify response header on `GET /api/books?status=all`:
   - `x-authenticated: true` is expected for signed-in users.
3. Confirm UI behavior:
   - skeleton shows while first books fetch is unresolved;
   - one automatic retry runs on first empty authenticated response.
4. If still empty, force a full reload and re-check headers.

## Known Limitations

- Frontend mitigations do not fully replace a deterministic backend/proxy auth fix.
- Occasional post-login guest responses are still possible while server session propagation is unstable.

## shadcn/ui Commands
```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add scroll-area
npx shadcn@latest add separator
```

## Links
- **API Architecture:** `docs/api-architecture.md`
- **Parent API:** `../BACKEND_API.md`
- **Parent DB Schema:** `../supabase/schema.sql`
- **shadcn config:** `components.json`
