// Frontend liveness probe — confirms the Next.js app (Vercel) is serving.
//
// Unlike the sibling routes under /api, this does NOT proxy to the Nuxt
// backend: it answers locally so it isolates FRONTEND health from backend/DB
// health (those have their own probes on the Nuxt side: /api/health and
// /api/health/deep). The healthcheck cron pings this via FRONTEND_URL.
//
// force-dynamic so it always runs on the server instead of being prerendered
// to a static asset — a liveness check must exercise the running deployment.
export const dynamic = 'force-dynamic'

export function GET() {
  return Response.json({ status: 'ok' })
}
