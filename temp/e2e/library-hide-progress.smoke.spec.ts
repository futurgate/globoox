import { expect, test, type APIRequestContext } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const API_BASE = process.env.E2E_API_BASE ?? 'http://localhost:4010'
const SUPABASE_URL = process.env.E2E_SUPABASE_URL ?? 'https://mricrybtjsizqywvyxkr.supabase.co'
function readEnvValue(name: string): string | undefined {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return undefined
  const line = fs
    .readFileSync(envPath, 'utf8')
    .split('\n')
    .find((row) => row.startsWith(`${name}=`))
  return line ? line.slice(name.length + 1).trim() : undefined
}

const SUPABASE_ANON_KEY =
  process.env.E2E_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  readEnvValue('NEXT_PUBLIC_SUPABASE_ANON_KEY')

async function createAccessToken(request: APIRequestContext): Promise<string> {
  if (!SUPABASE_ANON_KEY) {
    throw new Error('Missing SUPABASE anon key for smoke test auth bootstrap')
  }

  const email = `pw_hide_${Date.now()}@example.com`
  const password = 'DebugPass123!'
  const signup = await request.post(`${SUPABASE_URL}/auth/v1/signup`, {
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    data: { email, password },
  })
  const signupJson = await signup.json()
  const access = signupJson?.access_token ?? signupJson?.session?.access_token
  if (access) return access

  const token = await request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    data: { email, password },
  })
  const tokenJson = await token.json()
  if (!tokenJson?.access_token) throw new Error(`Failed to obtain access token: ${JSON.stringify(tokenJson)}`)
  return tokenJson.access_token as string
}

test('hide/unhide contract and list semantics remain consistent', async ({ request }) => {
  const token = await createAccessToken(request)
  const auth = { Authorization: `Bearer ${token}` }

  const createRes = await request.post(`${API_BASE}/api/books`, {
    headers: { ...auth, 'Content-Type': 'application/json' },
    data: { title: 'Большие Долговые Кризисы', author: 'Ray Dalio' },
  })
  expect(createRes.ok()).toBeTruthy()
  const created = await createRes.json()
  const bookId = created.id as string
  expect(bookId).toBeTruthy()

  const patchHide = await request.patch(`${API_BASE}/api/books/${bookId}`, {
    headers: { ...auth, 'Content-Type': 'application/json' },
    data: { status: 'hidden' },
  })
  expect(patchHide.ok()).toBeTruthy()

  const visibleAfterHide = await request.get(`${API_BASE}/api/books`, { headers: auth })
  const allAfterHide = await request.get(`${API_BASE}/api/books?status=all`, { headers: auth })
  const hiddenAfterHide = await request.get(`${API_BASE}/api/books?status=hidden`, { headers: auth })
  const visibleJson = await visibleAfterHide.json()
  const allJson = await allAfterHide.json()
  const hiddenJson = await hiddenAfterHide.json()

  expect(visibleJson.some((b: { id: string }) => b.id === bookId)).toBeFalsy()
  expect(allJson.some((b: { id: string; status: string }) => b.id === bookId && b.status === 'hidden')).toBeTruthy()
  expect(hiddenJson.some((b: { id: string; status: string }) => b.id === bookId && b.status === 'hidden')).toBeTruthy()

  const patchUnhide = await request.patch(`${API_BASE}/api/books/${bookId}`, {
    headers: { ...auth, 'Content-Type': 'application/json' },
    data: { status: 'active' },
  })
  expect(patchUnhide.ok()).toBeTruthy()

  const visibleAfterUnhide = await request.get(`${API_BASE}/api/books`, { headers: auth })
  const visibleAfterUnhideJson = await visibleAfterUnhide.json()
  expect(visibleAfterUnhideJson.some((b: { id: string; status: string }) => b.id === bookId && b.status === 'active')).toBeTruthy()
})
