import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'

test.setTimeout(240000)

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

test('headless my-books hide/unhide flow with load timing', async ({ page, request }) => {
  if (!SUPABASE_ANON_KEY) {
    throw new Error('Missing SUPABASE anon key (E2E_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY)')
  }

  const apiDurations: Array<{ url: string; status: number; ms: number }> = []
  const requestStart = new Map<string, number>()

  page.on('request', (req) => {
    if (!req.url().includes('/api/books')) return
    const key = `${req.method()} ${req.url()} ${Math.random().toString(36).slice(2)}`
    requestStart.set(key, Date.now())
  })

  page.on('response', async (res) => {
    const url = res.url()
    if (!url.includes('/api/books')) return
    const method = res.request().method()
    const candidates = [...requestStart.keys()].filter((k) => k.includes(method) && k.includes(url))
    const key = candidates[candidates.length - 1]
    const started = key ? requestStart.get(key) : undefined
    apiDurations.push({ url, status: res.status(), ms: started ? Date.now() - started : -1 })
    if (key) requestStart.delete(key)
  })

  const email = `headless_ui_${Date.now()}@example.com`
  const password = 'DebugPass123!'

  const signup = await request.post(`${SUPABASE_URL}/auth/v1/signup`, {
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    data: { email, password },
  })
  const signupJson = await signup.json()
  let accessToken = signupJson?.access_token ?? signupJson?.session?.access_token

  if (!accessToken) {
    const tokenRes = await request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      data: { email, password },
    })
    const tokenJson = await tokenRes.json()
    accessToken = tokenJson?.access_token
  }

  expect(accessToken).toBeTruthy()

  const title = `HDBG-${Date.now()}`
  const createRes = await request.post(`${API_BASE}/api/books`, {
    headers: {
      Authorization: `Bearer ${accessToken as string}`,
      'Content-Type': 'application/json',
    },
    data: { title, author: 'Ray Dalio' },
  })
  expect(createRes.ok()).toBeTruthy()
  const createdBook = await createRes.json()
  const bookId = createdBook.id as string
  expect(bookId).toBeTruthy()

  const t0 = Date.now()
  await page.goto('http://localhost:3000/auth?next=/my-books', { waitUntil: 'domcontentloaded' })
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL('**/my-books', { timeout: 90000 })
  const firstNavMs = Date.now() - t0

  const t1 = Date.now()
  await page.goto('http://localhost:3000/my-books', { waitUntil: 'domcontentloaded' })
  await expect(page.locator(`a[href="/reader/${bookId}"]`).first()).toBeVisible({ timeout: 120000 })
  const listLoadMs = Date.now() - t1

  await page.locator(`a[href="/reader/${bookId}"]`).locator('xpath=ancestor::div[1]/preceding-sibling::div//button').first().click()
  await page.getByRole('button', { name: 'Hide' }).click()
  await expect(page.locator(`a[href="/reader/${bookId}"]`)).toHaveCount(0, { timeout: 90000 })

  await page.getByRole('button', { name: 'Hidden' }).click()
  await expect(page.locator(`a[href="/reader/${bookId}"]`).first()).toBeVisible({ timeout: 120000 })

  await page.getByRole('button', { name: 'All' }).click()
  await expect(page.locator(`a[href="/reader/${bookId}"]`).first()).toBeVisible({ timeout: 120000 })

  await page.locator('div.absolute.top-1.right-1 button').first().click()
  await page.getByRole('button', { name: 'Unhide' }).click()

  await page.getByRole('button', { name: 'Visible' }).click()
  await expect(page.locator(`a[href="/reader/${bookId}"]`).first()).toBeVisible({ timeout: 120000 })

  const t2 = Date.now()
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator(`a[href="/reader/${bookId}"]`).first()).toBeVisible({ timeout: 120000 })
  const reloadMs = Date.now() - t2

  console.log(`TIMING first_auth_to_my_books_ms=${firstNavMs}`)
  console.log(`TIMING my_books_with_data_ms=${listLoadMs}`)
  console.log(`TIMING reload_my_books_ms=${reloadMs}`)
  console.log(`BOOK id=${bookId} title=${title}`)
  for (const entry of apiDurations) {
    console.log(`API ${entry.status} ${entry.ms}ms ${entry.url}`)
  }
})
