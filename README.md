This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### 1. Environment Setup

Create a `.env.local` file with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google One Tap
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_oauth_client_id
# Optional: comma-separated list of origins where One Tap may initialize.
# Example: NEXT_PUBLIC_GOOGLE_ALLOWED_ORIGINS=http://localhost:3000,https://globoox.com

# Backend API Configuration
API_URL=https://globooks.onrender.com
# Or use NEXT_PUBLIC_API_URL if you need it exposed to the browser
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Production deployments are triggered from commits on `main`.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Client Caching (Front-end)

We cache some user data client-side to reduce backend load and avoid loading states during in-app navigation.

- Books list (`GET /api/books?status=active`) — in-memory stale-while-revalidate cache in `src/lib/useBooks.ts` (TTL ~5 minutes).
- Reading position (`GET /api/books/:id/reading-position`) — in-memory per-book cache in `src/lib/api.ts` (TTL ~30 seconds).
- Chapter content blocks (`GET /api/chapters/:id/content?lang=XX`) — persistent cache in IndexedDB via `src/lib/contentCache.ts`:
  - `chapter_skeleton` (chapter structure)
  - `block_text` (per-block text by `(blockId, lang)`)

Debug / reset:
- Chrome DevTools → Application → Storage → IndexedDB → `globoox-cache` (clear stores), or “Clear site data”.
