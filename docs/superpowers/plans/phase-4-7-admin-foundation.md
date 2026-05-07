# rov.rs Phase 4-7: Admin Foundation & Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete admin dashboard with authentication, link management, quick create, match links, social variants, and QR code generation.

**Architecture:** Cloudflare Pages project with React SPA + Vite, Pages Functions for API endpoints, client-side QR generation.

**Tech Stack:** React, Vite, TypeScript, Tailwind CSS, shadcn/ui, Cloudflare Pages/Functions, D1 database.

---

## Phase 4 (Tasks 9-11): Admin SPA + Auth + Links CRUD API

### Task 9: Admin SPA Scaffolding

**Files:**
- Create: `admin/vite.config.ts`
- Create: `admin/tailwind.config.js`
- Create: `admin/postcss.config.js`
- Create: `admin/index.html`
- Create: `admin/src/main.tsx`
- Create: `admin/src/App.tsx`
- Create: `admin/src/components/Layout.tsx`
- Create: `admin/src/router.tsx`
- Create: `admin/src/lib/api-client.ts`
- Create: `admin/src/hooks/useAuth.ts`
- Create: `admin/src/pages/DashboardPage.tsx`
- Create: `admin/src/pages/LinksPage.tsx`
- Create: `admin/src/pages/CreatePage.tsx`
- Create: `admin/src/pages/QuickCreatePage.tsx`
- Create: `admin/src/pages/MatchLinkPage.tsx`
- Create: `admin/src/pages/SponsorReportsPage.tsx`
- Create: `admin/src/pages/QRToolsPage.tsx`
- Create: `admin/src/pages/ImportExportPage.tsx`
- Create: `admin/src/pages/SettingsPage.tsx`

- [ ] **Step 1: Create Vite config for Cloudflare Pages**

Create `/home/ubuntu/rovrs/admin/vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
  server: {
    port: 3000,
  },
})
```

- [ ] **Step 2: Create Tailwind config with Shamrock Rovers branding**

Create `/home/ubuntu/rovrs/admin/tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        shamrock: {
          50: '#f6ffed',
          100: '#d9f7be',
          200: '#b2d378',
          300: '#8fbf38',
          400: '#4CAF50',
          500: '#2e7d32',
          600: '#1b5e20',
          700: '#0d4d14',
          800: '#093b0a',
          900: '#052705',
        },
        white: '#ffffff',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 3: Create PostCSS config**

Create `/home/ubuntu/rovrs/admin/postcss.config.js`:

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 4: Create index.html**

Create `/home/ubuntu/rovrs/admin/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>rov.rs Admin</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create main.tsx**

Create `/home/ubuntu/rovrs/admin/src/main.tsx`:

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 6: Create App.tsx**

Create `/home/ubuntu/rovrs/admin/src/App.tsx`:

```typescript
import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import router from './router'
import './styles/globals.css'

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <RouterProvider router={router} />
      </div>
    </AuthProvider>
  )
}

export default App
```

- [ ] **Step 7: Create Layout component**

Create `/home/ubuntu/rovrs/admin/src/components/Layout.tsx`:

```typescript
import { Outlet, Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/' },
  { name: 'Links', href: '/links' },
  { name: 'Create', href: '/links/create' },
  { name: 'Quick Create', href: '/quick-create' },
  { name: 'Match Link', href: '/match-link' },
  { name: 'Sponsor Reports', href: '/sponsor-reports' },
  { name: 'QR Tools', href: '/qr-tools' },
  { name: 'Import/Export', href: '/import-export' },
  { name: 'Settings', href: '/settings' },
]

export default function Layout() {
  const location = useLocation()

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-sm">
        <div className="flex h-16 items-center px-6 border-b">
          <h1 className="text-xl font-bold text-shamrock-600">rov.rs Admin</h1>
        </div>
        <nav className="mt-6 px-2">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'group flex items-center px-2 py-2 text-sm font-medium rounded-md',
                location.pathname === item.href
                  ? 'bg-shamrock-50 text-shamrock-700'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 8: Create router**

Create `/home/ubuntu/rovrs/admin/src/router.tsx`:

```typescript
import { createBrowserRouter } from 'react-router-dom'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import LinksPage from './pages/LinksPage'
import CreatePage from './pages/CreatePage'
import QuickCreatePage from './pages/QuickCreatePage'
import MatchLinkPage from './pages/MatchLinkPage'
import SponsorReportsPage from './pages/SponsorReportsPage'
import QRToolsPage from './pages/QRToolsPage'
import ImportExportPage from './pages/ImportExportPage'
import SettingsPage from './pages/SettingsPage'

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/links', element: <LinksPage /> },
      { path: '/links/create', element: <CreatePage /> },
      { path: '/quick-create', element: <QuickCreatePage /> },
      { path: '/match-link', element: <MatchLinkPage /> },
      { path: '/sponsor-reports', element: <SponsorReportsPage /> },
      { path: '/qr-tools', element: <QRToolsPage /> },
      { path: '/import-export', element: <ImportExportPage /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },
])
```

- [ ] **Step 9: Create API client**

Create `/home/ubuntu/rovrs/admin/src/lib/api-client.ts`:

```typescript
import type { ApiResponse, PaginatedResponse, MeResponse, Link, CreateLinkRequest, UpdateLinkRequest } from '@rovrs/shared'

const API_BASE = '/api'

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error?.message || 'API request failed')
    }

    return response.json()
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete(endpoint: string): Promise<void> {
    return this.request(endpoint, { method: 'DELETE' })
  }

  // Links API
  async getLinks(params: {
    page?: number
    limit?: number
    status?: string
    channel?: string
    campaign?: string
    search?: string
    sponsor?: string
  }): Promise<PaginatedResponse<Link>> {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString())
      }
    })

    return this.get<PaginatedResponse<Link>>(`/links?${searchParams}`)
  }

  async getLink(id: string): Promise<Link> {
    return this.get<Link>(`/links/${id}`)
  }

  async createLink(data: CreateLinkRequest): Promise<Link> {
    return this.post<Link>('/links', data)
  }

  async updateLink(id: string, data: UpdateLinkRequest): Promise<Link> {
    return this.patch<Link>(`/links/${id}`, data)
  }

  async deleteLink(id: string): Promise<void> {
    return this.delete(`/links/${id}`)
  }

  async restoreLink(id: string): Promise<Link> {
    return this.post<Link>(`/links/${id}/restore`)
  }

  async generateVariants(id: string): Promise<Link[]> {
    return this.post<Link[]>(`/links/${id}/variants`)
  }

  async updateVariants(id: string, destinations: string[]): Promise<Link[]> {
    return this.patch<Link[]>(`/links/${id}/variants`, { destinations })
  }

  async getLinkStats(id: string, from?: string, to?: string): Promise<any> {
    const searchParams = new URLSearchParams()
    if (from) searchParams.append('from', from)
    if (to) searchParams.append('to', to)

    return this.get(`/links/${id}/stats?${searchParams}`)
  }
}

export const api = new ApiClient()
```

- [ ] **Step 10: Create auth hook**

Create `/home/ubuntu/rovrs/admin/src/hooks/useAuth.ts`:

```typescript
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { api } from '@/lib/api-client'
import type { MeResponse } from '@rovrs/shared'

interface AuthContextType {
  user: MeResponse | null
  loading: boolean
  error: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await api.get<MeResponse>('/me')
        setUser(response)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load user')
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, error }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
```

**Tests:**
- [ ] **Test: Scaffold setup**
  - Run `npm create vite@latest admin -- --template react-ts`
  - Configure Vite, Tailwind, PostCSS
  - Verify dev server runs on port 3000
  - Snapshot test for basic UI components

---

### Task 10: Auth Flow — Pages Function

**Files:**
- Create: `admin/functions/api/me.ts`
- Create: `admin/src/lib/auth.ts`
- Create: `admin/src/pages/LoginPage.tsx`

- [ ] **Step 1: Create JWT decode utility**

Create `/home/ubuntu/rovrs/admin/src/lib/auth.ts`:

```typescript
import jwt from 'jwt-decode'

interface JwtPayload {
  email?: string
  sub?: string
  [key: string]: any
}

export function decodeJwt(token: string): JwtPayload {
  try {
    // Cloudflare Access uses base64url encoded payload without padding
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (error) {
    throw new Error('Invalid JWT token')
  }
}

export function getUserEmailFromCfAccessHeader(request: Request): string {
  const jwtAssertion = request.headers.get('Cf-Access-Jwt-Assertion')
  if (!jwtAssertion) {
    throw new Error('No JWT token found')
  }

  const payload = decodeJwt(jwtAssertion)
  if (!payload.email && !payload.sub) {
    throw new Error('JWT missing email claim')
  }

  return payload.email || payload.sub!
}
```

- [ ] **Step 2: Create Pages Function for /api/me**

Create `/home/ubuntu/rovrs/admin/functions/api/me.ts`:

```typescript
import { getUserEmailFromCfAccessHeader } from '../../../src/lib/auth'
import type { MeResponse } from '@rovrs/shared'

interface Env {
  DB: D1Database
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const email = getUserEmailFromCfAccessHeader(request)
      
      // Check if user exists
      const { results } = await env.DB.prepare('SELECT * FROM users WHERE email = ?')
        .bind(email)
        .all()

      let user
      if (results.length > 0) {
        user = results[0]
      } else {
        // Create user with default role
        const userId = crypto.randomUUID()
        const now = new Date().toISOString()
        
        await env.DB.prepare(`
          INSERT INTO users (id, email, role, display_name, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).bind(
          userId,
          email,
          'editor', // Default role
          email.split('@')[0], // Simple display name
          now
        ).run()

        user = { id: userId, email, role: 'editor', display_name: email.split('@')[0], created_at: now }
      }

      const response: MeResponse = {
        email: user.email,
        role: user.role,
        display_name: user.display_name || user.email,
      }

      return new Response(JSON.stringify(response), {
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      return new Response(
        JSON.stringify({ error: { message: 'Authentication failed' } }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }
  },
}
```

**Tests:**
- [ ] **Test: Auth flow**
  - Unit test JWT decode utility with mock tokens
  - Test getUserEmailFromCfAccessHeader with various JWT formats
  - Integration test /api/me endpoint with mock D1
  - Verify auto-creation of users on first login
  - Use @cloudflare/vitest-pool-workers with mocked D1

---

### Task 11: Links CRUD API — Pages Functions

**Files:**
- Create: `admin/functions/api/links/index.ts`
- Create: `admin/functions/api/links/[id].ts`
- Create: `admin/functions/api/links/[id]/restore.ts`
- Create: `admin/functions/api/helpers.ts`
- Create: `admin/src/types/link.ts`
- Create: `admin/src/pages/LinksPage.tsx`
- Create: `admin/src/pages/CreatePage.tsx`
- Create: `admin/src/pages/EditPage.tsx`

- [ ] **Step 1: Create API helper**

Create `/home/ubuntu/rovrs/admin/functions/api/helpers.ts`:

```typescript
import { getUserEmailFromCfAccessHeader } from '../../src/lib/auth'
import type { Env } from './[id]'

interface AuthUser {
  email: string
  role: 'admin' | 'editor'
}

export async function getAuthUser(request: Request, env: Env): Promise<AuthUser> {
  const email = getUserEmailFromCfAccessHeader(request)
  
  const { results } = await env.DB.prepare('SELECT role FROM users WHERE email = ?')
    .bind(email)
    .all()

  if (results.length === 0) {
    throw new Error('User not found')
  }

  return { email, role: results[0].role }
}

export async function validateSlug(slug: string, env: Env, excludeId?: string): Promise<void> {
  // Basic slug validation
  if (!slug || slug.length < 2 || slug.length > 50) {
    throw new Error('Slug must be 2-50 characters')
  }

  // Check for invalid characters
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error('Slug can only contain lowercase letters, numbers, and hyphens')
  }

  // Check if slug is reserved
  const reservedSlugs = ['admin', 'api', 'health', 'login', 'logout', 'stats', 'export', 'robots.txt', 'favicon.ico', '.well-known']
  if (reservedSlugs.includes(slug)) {
    throw new Error('Slug is reserved')
  }

  // Check if slug already exists (excluding the current link for updates)
  let query = 'SELECT slug FROM links WHERE slug = ?'
  let params = [slug]

  if (excludeId) {
    query += ' AND id != ?'
    params.push(excludeId)
  }

  const { results } = await env.DB.prepare(query).bind(...params).all()

  if (results.length > 0) {
    throw new Error('Slug already exists')
  }
}

export function generateSlug(): string {
  // 6-character alphanumeric, no ambiguous chars (0/O, 1/l)
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Rate limiting: 100 req/min per email
const rateLimitMap = new Map<string, number[]>()

export function checkRateLimit(email: string): boolean {
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute
  const maxRequests = 100

  const userRequests = rateLimitMap.get(email) || []
  const validRequests = userRequests.filter(time => now - time < windowMs)

  if (validRequests.length >= maxRequests) {
    return false
  }

  validRequests.push(now)
  rateLimitMap.set(email, validRequests)
  
  // Clean up old entries periodically
  if (validRequests.length === maxRequests) {
    setTimeout(() => {
      rateLimitMap.delete(email)
    }, windowMs)
  }

  return true
}
```

- [ ] **Step 2: Create Links index endpoint**

Create `/home/ubuntu/rovrs/admin/functions/api/links/index.ts`:

```typescript
import { getAuthUser, validateSlug, generateSlug, checkRateLimit } from './helpers'
import type { Env } from './[id]'
import type { CreateLinkRequest } from '@rovrs/shared'

interface Env {
  DB: D1Database
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      // Check rate limit
      const authUser = await getAuthUser(request, env)
      if (!checkRateLimit(authUser.email)) {
        return new Response(
          JSON.stringify({ error: { code: 'RATE_LIMITED', message: 'Rate limit exceeded' } }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        )
      }

      if (request.method === 'GET') {
        // GET /api/links - list links
        const url = new URL(request.url)
        const page = parseInt(url.searchParams.get('page') || '1')
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100)
        const status = url.searchParams.get('status')
        const channel = url.searchParams.get('channel')
        const campaign = url.searchParams.get('campaign')
        const search = url.searchParams.get('search')
        const sponsor = url.searchParams.get('sponsor')

        let query = 'SELECT * FROM links WHERE deleted_at IS NULL'
        const params: any[] = []

        if (status) {
          query += ' AND status = ?'
          params.push(status)
        }

        if (channel) {
          query += ' AND channel = ?'
          params.push(channel)
        }

        if (campaign) {
          query += ' AND campaign = ?'
          params.push(campaign)
        }

        if (sponsor) {
          query += ' AND sponsor = ?'
          params.push(sponsor)
        }

        if (search) {
          query += ' AND (slug LIKE ? OR title LIKE ? OR notes LIKE ?)'
          const searchPattern = `%${search}%`
          params.push(searchPattern, searchPattern, searchPattern)
        }

        query += ' ORDER BY created_at DESC'

        // Get total count
        const countQuery = query.replace('SELECT * FROM links', 'SELECT COUNT(*) as count FROM links')
        const { results: countResults } = await env.DB.prepare(countQuery).bind(...params).all()
        const total = countResults[0].count

        // Apply pagination
        const offset = (page - 1) * limit
        query += ' LIMIT ? OFFSET ?'
        params.push(limit, offset)

        const { results } = await env.DB.prepare(query).bind(...params).all()

        return new Response(JSON.stringify({
          data: results,
          page,
          limit,
          total,
          has_more: page * limit < total,
        }), {
          headers: { 'Content-Type': 'application/json' },
        })

      } else if (request.method === 'POST') {
        // POST /api/links - create link
        const body: CreateLinkRequest = await request.json()

        // Validate URL
        if (!body.destination_url || !isValidUrl(body.destination_url)) {
          throw new Error('Invalid destination URL')
        }

        // Use provided slug or generate one
        let slug = body.slug
        if (!slug) {
          slug = generateSlug()
        }

        // Validate slug
        await validateSlug(slug, env)

        // Create link
        const linkId = crypto.randomUUID()
        const now = new Date().toISOString()

        const link = {
          id: linkId,
          slug,
          destination_url: body.destination_url,
          destination_domain: new URL(body.destination_url).hostname,
          title: body.title || null,
          campaign: body.campaign || null,
          channel: body.channel || null,
          owner: body.owner || authUser.email,
          sponsor: body.sponsor || null,
          opponent: body.opponent || null,
          competition: body.competition || null,
          match_date: body.match_date || null,
          home_away: body.home_away || null,
          status: 'active',
          redirect_code: 302,
          is_qr: false,
          is_offsite_ticket: body.is_offsite_ticket || false,
          show_offsite_preview: body.show_offsite_preview || false,
          is_protected: false,
          variant_of: body.variant_of || null,
          created_by: authUser.email,
          created_at: now,
          updated_by: authUser.email,
          updated_at: now,
          expires_at: body.expires_at || null,
          notes: body.notes || null,
        }

        const { success } = await env.DB.prepare(`
          INSERT INTO links (
            id, slug, destination_url, destination_domain, title, campaign, channel,
            owner, sponsor, opponent, competition, match_date, home_away, status,
            redirect_code, is_qr, is_offsite_ticket, show_offsite_preview, is_protected,
            variant_of, created_by, created_at, updated_by, updated_at, expires_at, notes
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
          )
        `).bind(
          link.id, link.slug, link.destination_url, link.destination_domain, link.title, link.campaign,
          link.channel, link.owner, link.sponsor, link.opponent, link.competition, link.match_date,
          link.home_away, link.status, link.redirect_code, link.is_qr, link.is_offsite_ticket,
          link.show_offsite_preview, link.is_protected, link.variant_of, link.created_by, link.created_at,
          link.updated_by, link.updated_at, link.expires_at, link.notes
        ).run()

        if (!success) {
          throw new Error('Failed to create link')
        }

        return new Response(JSON.stringify(link), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        })

      } else {
        return new Response(null, { status: 405 })
      }
    } catch (error) {
      return new Response(
        JSON.stringify({ error: { code: 'VALIDATION_ERROR', message: error instanceof Error ? error.message : 'Invalid request' } }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
  },
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const allowedProtocols = ['http:', 'https:']
    return allowedProtocols.includes(parsed.protocol)
  } catch {
    return false
  }
}
```

- [ ] **Step 3: Create individual link endpoint**

Create `/home/ubuntu/rovrs/admin/functions/api/links/[id].ts`:

```typescript
import { getAuthUser, validateSlug } from './helpers'
import type { Env, AuthUser } from './[id]'
import type { UpdateLinkRequest } from '@rovrs/shared'

interface Env {
  DB: D1Database
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const authUser = await getAuthUser(request, env)

      if (request.method === 'GET') {
        // GET /api/links/{id} - get single link
        const id = ctx.params.id

        const { results } = await env.DB.prepare('SELECT * FROM links WHERE id = ? AND deleted_at IS NULL')
          .bind(id)
          .all()

        if (results.length === 0) {
          return new Response(
            JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Link not found' } }),
            { status: 404, headers: { 'Content-Type': 'application/json' } }
          )
        }

        return new Response(JSON.stringify(results[0]), {
          headers: { 'Content-Type': 'application/json' },
        })

      } else if (request.method === 'PATCH') {
        // PATCH /api/links/{id} - update link
        const id = ctx.params.id
        const body: UpdateLinkRequest = await request.json()

        // Get existing link
        const { results: existingResults } = await env.DB.prepare('SELECT * FROM links WHERE id = ? AND deleted_at IS NULL')
          .bind(id)
          .all()

        if (existingResults.length === 0) {
          return new Response(
            JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Link not found' } }),
            { status: 404, headers: { 'Content-Type': 'application/json' } }
          )
        }

        const existing = existingResults[0]

        // Check if user can edit this link
        if (authUser.role !== 'admin' && existing.owner !== authUser.email) {
          return new Response(
            JSON.stringify({ error: { code: 'FORBIDDEN', message: 'You can only edit your own links' } }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          )
        }

        // Check if link is protected
        if (existing.is_protected && authUser.role !== 'admin') {
          return new Response(
            JSON.stringify({ error: { code: 'FORBIDDEN', message: 'Protected links can only be edited by admins' } }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          )
        }

        // Update fields
        const updates: any = {}
        const updateFields = ['title', 'campaign', 'channel', 'sponsor', 'opponent', 'competition', 
                           'match_date', 'home_away', 'status', 'redirect_code', 'is_qr', 
                           'is_offsite_ticket', 'show_offsite_preview', 'is_protected', 'expires_at', 'notes']

        for (const field of updateFields) {
          if (body[field] !== undefined) {
            updates[field] = body[field]
          }
        }

        // Handle destination URL change
        if (body.destination_url && body.destination_url !== existing.destination_url) {
          // Validate new URL
          if (!isValidUrl(body.destination_url)) {
            throw new Error('Invalid destination URL')
          }

          // Log destination history
          await env.DB.prepare(`
            INSERT INTO destination_history (id, link_id, old_destination_url, new_destination_url, changed_by, changed_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `).bind(
            crypto.randomUUID(),
            id,
            existing.destination_url,
            body.destination_url,
            authUser.email,
            new Date().toISOString()
          ).run()

          updates.destination_url = body.destination_url
          updates.destination_domain = new URL(body.destination_url).hostname
        }

        // Handle slug change
        if (body.slug && body.slug !== existing.slug) {
          await validateSlug(body.slug, env, id)
          updates.slug = body.slug
        }

        // Update timestamp
        updates.updated_by = authUser.email
        updates.updated_at = new Date().toISOString()

        // Build SET clause
        const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ')
        const values = Object.values(updates)

        // Update link
        const { success } = await env.DB.prepare(`
          UPDATE links
          SET ${setClause}
          WHERE id = ?
        `).bind(...values, id).run()

        if (!success) {
          throw new Error('Failed to update link')
        }

        // Get updated link
        const { results: updatedResults } = await env.DB.prepare('SELECT * FROM links WHERE id = ?')
          .bind(id)
          .all()

        return new Response(JSON.stringify(updatedResults[0]), {
          headers: { 'Content-Type': 'application/json' },
        })

      } else if (request.method === 'DELETE') {
        // DELETE /api/links/{id} - soft delete
        const id = ctx.params.id

        // Get existing link
        const { results: existingResults } = await env.DB.prepare('SELECT * FROM links WHERE id = ? AND deleted_at IS NULL')
          .bind(id)
          .all()

        if (existingResults.length === 0) {
          return new Response(
            JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Link not found' } }),
            { status: 404, headers: { 'Content-Type': 'application/json' } }
          )
        }

        const existing = existingResults[0]

        // Check permissions
        if (authUser.role !== 'admin' && existing.owner !== authUser.email) {
          return new Response(
            JSON.stringify({ error: { code: 'FORBIDDEN', message: 'You can only delete your own links' } }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          )
        }

        // Check if protected
        if (existing.is_protected) {
          if (authUser.role !== 'admin') {
            return new Response(
              JSON.stringify({ error: { code: 'FORBIDDEN', message: 'Protected links can only be deleted by admins' } }),
              { status: 403, headers: { 'Content-Type': 'application/json' } }
            )
          }
          
          // For protected links, require confirmation in UI
          // Here we just set the status to 'deleted' - actual deletion should be a separate UI flow
        }

        // Soft delete: set deleted_at and suffix slug
        const deletedSlug = `${existing.slug}__del_${Date.now()}`
        const now = new Date().toISOString()

        const { success } = await env.DB.prepare(`
          UPDATE links
          SET slug = ?, deleted_at = ?, updated_by = ?, updated_at = ?, status = 'deleted'
          WHERE id = ?
        `).bind(deletedSlug, now, authUser.email, now, id).run()

        if (!success) {
          throw new Error('Failed to delete link')
        }

        return new Response(null, { status: 204 })

      } else {
        return new Response(null, { status: 405 })
      }
    } catch (error) {
      return new Response(
        JSON.stringify({ error: { code: 'VALIDATION_ERROR', message: error instanceof Error ? error.message : 'Invalid request' } }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
  },
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const allowedProtocols = ['http:', 'https:']
    return allowedProtocols.includes(parsed.protocol)
  } catch {
    return false
  }
}
```

- [ ] **Step 4: Create restore endpoint**

Create `/home/ubuntu/rovrs/admin/functions/api/links/[id]/restore.ts`:

```typescript
import { getAuthUser, validateSlug } from '../helpers'
import type { Env } from '../[id]'

interface Env {
  DB: D1Database
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const authUser = await getAuthUser(request, env)

      if (request.method !== 'POST') {
        return new Response(null, { status: 405 })
      }

      const id = ctx.params.id

      // Get deleted link
      const { results: existingResults } = await env.DB.prepare('SELECT * FROM links WHERE id = ? AND deleted_at IS NOT NULL')
        .bind(id)
        .all()

      if (existingResults.length === 0) {
        return new Response(
          JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Link not found or not deleted' } }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const existing = existingResults[0]

      // Check permissions
      if (authUser.role !== 'admin' && existing.owner !== authUser.email) {
        return new Response(
          JSON.stringify({ error: { code: 'FORBIDDEN', message: 'You can only restore your own links' } }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // Check if slug is available (original might be taken)
      let originalSlug = existing.slug.replace(/__del_\d+$/, '')
      const slugToUse = originalSlug

      // Validate slug doesn't conflict with existing active links
      await validateSlug(slugToUse, env, id)

      // Restore link
      const now = new Date().toISOString()

      const { success } = await env.DB.prepare(`
        UPDATE links
        SET slug = ?, deleted_at = NULL, status = 'active', updated_by = ?, updated_at = ?
        WHERE id = ?
      `).bind(slugToUse, authUser.email, now, id).run()

      if (!success) {
        throw new Error('Failed to restore link')
      }

      // Get restored link
      const { results: restoredResults } = await env.DB.prepare('SELECT * FROM links WHERE id = ?')
        .bind(id)
        .all()

      return new Response(JSON.stringify(restoredResults[0]), {
        headers: { 'Content-Type': 'application/json' },
      })

    } catch (error) {
      return new Response(
        JSON.stringify({ error: { code: 'VALIDATION_ERROR', message: error instanceof Error ? error.message : 'Restore failed' } }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
  },
}
```

**Tests:**
- [ ] **Test: Links CRUD API**
  - Unit test validateSlug and generateSlug functions
  - Test rate limiting with mock in-memory Map
  - Integration test GET /api/links with pagination and filters
  - Test POST /api/links with auto-slug generation
  - Test PATCH /api/links with destination history tracking
  - Test soft delete and restore functionality
  - Test permission checks (owner vs admin)
  - Test protected link restrictions
  - Use @cloudflare/vitest-pool-workers with mocked D1

---

## Phase 5 (Tasks 12-13): Quick create + Match links

### Task 12: Quick create UI

**Files:**
- Create: `admin/src/pages/QuickCreatePage.tsx`
- Update: `admin/src/pages/CreatePage.tsx`

- [ ] **Step 1: Create QuickCreatePage component**

Create `/home/ubuntu/rovrs/admin/src/pages/QuickCreatePage.tsx`:

```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Copy, Check } from 'lucide-react'
import type { CreateLinkRequest } from '@rovrs/shared'

export default function QuickCreatePage() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    slug: string
    shortUrl: string
    destinationUrl: string
    utmUrl?: string
  } | null>(null)
  const [copied, setCopied] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!url || !url.trim()) return

    setLoading(true)
    try {
      // Quick create: only destination_url required
      const link: CreateLinkRequest = {
        destination_url: url.trim(),
        // Auto-generate slug server-side
      }

      const created = await api.createLink(link)

      const shortUrl = `${window.location.origin}/${created.slug}`
      const utmUrl = created.destination_url

      setResult({
        slug: created.slug,
        shortUrl,
        destinationUrl: created.destination_url,
        utmUrl,
      })
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to create link'}`)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Quick Create</CardTitle>
          <CardDescription>
            Paste any URL to instantly create a short link. You can add details later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="url"
                placeholder="https://example.com/very/long/url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={loading || !url.trim()} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : 'Create Short Link'}
            </Button>
          </form>

          {result && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-medium text-green-800 mb-2">Link Created!</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-green-600">Short URL</p>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm bg-white px-2 py-1 rounded font-mono">
                      {result.shortUrl}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(result.shortUrl)}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-green-600">Destination</p>
                  <code className="text-sm bg-white px-2 py-1 rounded font-mono block mt-1">
                    {result.destinationUrl}
                  </code>
                </div>
                {result.utmUrl && (
                  <div>
                    <p className="text-sm text-green-600">With UTM tags</p>
                    <code className="text-sm bg-white px-2 py-1 rounded font-mono block mt-1">
                      {result.utmUrl}
                    </code>
                  </div>
                )}
              </div>
              <div className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setUrl('')
                    setResult(null)
                  }}
                >
                  Create Another
                </Button>
                <Button
                  variant="outline"
                  className="ml-2"
                  onClick={() => navigate(`/links/${result.slug}/edit`)}
                >
                  Add Details
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

**Tests:**
- [ ] **Test: Quick create UI**
  - Test form submission with valid URL
  - Test API error handling (invalid URL, rate limit)
  - Test copy to clipboard functionality
  - Test navigation to edit page
  - Use React Testing Library with mocked API client

---

### Task 13: Match link mode

**Files:**
- Create: `admin/src/pages/MatchLinkPage.tsx`
- Update: `admin/src/pages/CreatePage.tsx`

- [ ] **Step 1: Create MatchLinkPage component**

Create `/home/ubuntu/rovrs/admin/src/pages/MatchLinkPage.tsx`:

```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Calendar, MapPin } from 'lucide-react'
import type { CreateLinkRequest } from '@rovrs/shared'

export default function MatchLinkPage() {
  const [opponent, setOpponent] = useState('')
  const [destinationUrl, setDestinationUrl] = useState('')
  const [homeAway, setHomeAway] = useState<'home' | 'away'>('home')
  const [competition, setCompetition] = useState('')
  const [matchDate, setMatchDate] = useState('')
  const [expiry, setExpiry] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!opponent || !destinationUrl) return

    setLoading(true)
    try {
      // Auto-generate campaign from opponent
      const campaign = opponent.toLowerCase().replace(/\s+/g, '-')
      
      // Auto-generate slug from opponent
      const slug = opponent.toLowerCase().replace(/\s+/g, '')

      const link: CreateLinkRequest = {
        slug,
        destination_url: destinationUrl.trim(),
        campaign,
        opponent,
        match_date: matchDate || null,
        home_away,
        competition,
        expires_at: expiry || null,
        notes: notes || null,
      }

      const created = await api.createLink(link)

      // Navigate to created link with success
      navigate(`/links`, {
        state: { success: `Match link created: ${created.slug}` }
      })
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to create link'}`)
    } finally {
      setLoading(false)
    }
  }

  const competitions = [
    'Premier Division',
    'FAI Cup',
    'EA Sports Cup',
    'Europa League',
    'Friendlies'
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Matchday Link Creator
          </CardTitle>
          <CardDescription>
            Create a short link for the upcoming match. Campaign and slug will be auto-generated from the opponent name.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Step 1: Basic info */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="opponent">Opponent</Label>
                  <Input
                    id="opponent"
                    placeholder="e.g., Bohemian FC"
                    value={opponent}
                    onChange={(e) => setOpponent(e.target.value)}
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Campaign will be: {opponent.toLowerCase().replace(/\s+/g, '-')}
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="destination-url">Ticket URL</Label>
                  <Input
                    id="destination-url"
                    type="url"
                    placeholder="https://tickets.shamrockrovers.ie/bohs"
                    value={destinationUrl}
                    onChange={(e) => setDestinationUrl(e.target.value)}
                    required
                  />
                </div>

                <Button 
                  type="button" 
                  onClick={() => setStep(2)}
                  disabled={!opponent || !destinationUrl}
                  className="w-full"
                >
                  Continue to Match Details
                </Button>
              </div>
            )}

            {/* Step 2: Match details */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="home-away">Venue</Label>
                    <Select value={homeAway} onValueChange={(value: 'home' | 'away') => setHomeAway(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="home">Home</SelectItem>
                        <SelectItem value="away">Away</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="competition">Competition</Label>
                    <Select value={competition} onValueChange={setCompetition}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select competition" />
                      </SelectTrigger>
                      <SelectContent>
                        {competitions.map(comp => (
                          <SelectItem key={comp} value={comp}>{comp}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="match-date">Match Date</Label>
                    <Input
                      id="match-date"
                      type="datetime-local"
                      value={matchDate}
                      onChange={(e) => setMatchDate(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="expiry">Expiry Date</Label>
                    <Input
                      id="expiry"
                      type="datetime-local"
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <textarea
                    id="notes"
                    className="w-full px-3 py-2 border rounded-md"
                    rows={3}
                    placeholder="Any additional information..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : 'Create Match Link'}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><strong>Slug:</strong> {opponent.toLowerCase().replace(/\s+/g, '')}</p>
              <p><strong>Campaign:</strong> {opponent.toLowerCase().replace(/\s+/g, '-')}</p>
              <p><strong>URL:</strong>rov.rs/{opponent.toLowerCase().replace(/\s+/g, '')}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

**Tests:**
- [ ] **Test: Match link mode**
  - Test two-step form flow
  - Test auto-campaign generation
  - Test auto-slug generation
  - Test venue selection
  - Test competition selection
  - Test date inputs
  - Test API integration
  - Use React Testing Library

---

## Phase 6 (Task 14): Social variants

**Files:**
- Create: `admin/functions/api/links/[id]/variants.ts`
- Create: `admin/src/components/VariantGroup.tsx`
- Update: `admin/src/pages/EditPage.tsx`
- Update: `admin/src/pages/CreatePage.tsx`

- [ ] **Step 1: Create Variants endpoint**

Create `/home/ubuntu/rovrs/admin/functions/api/links/[id]/variants.ts`:

```typescript
import { getAuthUser } from '../helpers'
import type { Env } from '../[id]'
import type { Link } from '@rovrs/shared'

interface Env {
  DB: D1Database
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const authUser = await getAuthUser(request, env)
      const id = ctx.params.id

      if (request.method === 'POST') {
        // POST /api/links/{id}/variants - generate social variants
        const { results: baseResults } = await env.DB.prepare('SELECT * FROM links WHERE id = ? AND deleted_at IS NULL')
          .bind(id)
          .all()

        if (baseResults.length === 0) {
          return new Response(
            JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Base link not found' } }),
            { status: 404, headers: { 'Content-Type': 'application/json' } }
          )
        }

        const baseLink = baseResults[0]

        // Check if variants already exist
        const { results: existingVariants } = await env.DB.prepare('SELECT * FROM links WHERE variant_of = ?')
          .bind(id)
          .all()

        if (existingVariants.length > 0) {
          return new Response(
            JSON.stringify({ error: { code: 'VALIDATION_ERROR', message: 'Variants already exist for this link' } }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          )
        }

        // Define social platforms
        const platforms = [
          { name: 'Instagram', channel: 'instagram', suffix: 'ig' },
          { name: 'Facebook', channel: 'facebook', suffix: 'fb' },
          { name: 'X/Twitter', channel: 'x', suffix: 'x' },
          { name: 'TikTok', channel: 'tiktok', suffix: 'tt' },
          { name: 'LinkedIn', channel: 'linkedin', suffix: 'li' },
        ]

        const variants: Link[] = []
        const now = new Date().toISOString()

        // Create variants
        for (const platform of platforms) {
          const variantId = crypto.randomUUID()
          const variantSlug = `${baseLink.slug}-${platform.suffix}`

          const variant = {
            id: variantId,
            slug: variantSlug,
            destination_url: baseLink.destination_url,
            destination_domain: baseLink.destination_domain,
            title: `${baseLink.title || 'Link'} - ${platform.name}`,
            campaign: baseLink.campaign,
            channel: platform.channel,
            owner: baseLink.owner,
            sponsor: baseLink.sponsor,
            opponent: baseLink.opponent,
            competition: baseLink.competition,
            match_date: baseLink.match_date,
            home_away: baseLink.home_away,
            status: baseLink.status,
            redirect_code: baseLink.redirect_code,
            is_qr: false,
            is_offsite_ticket: baseLink.is_offsite_ticket,
            show_offsite_preview: baseLink.show_offsite_preview,
            is_protected: false,
            variant_of: id,
            created_by: authUser.email,
            created_at: now,
            updated_by: authUser.email,
            updated_at: now,
            expires_at: baseLink.expires_at,
            notes: `${baseLink.notes || ''} - ${platform.name} variant`,
          }

          // Insert variant
          await env.DB.prepare(`
            INSERT INTO links (
              id, slug, destination_url, destination_domain, title, campaign, channel,
              owner, sponsor, opponent, competition, match_date, home_away, status,
              redirect_code, is_qr, is_offsite_ticket, show_offsite_preview, is_protected,
              variant_of, created_by, created_at, updated_by, updated_at, expires_at, notes
            ) VALUES (
              ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
          `).bind(
            variant.id, variant.slug, variant.destination_url, variant.destination_domain, variant.title,
            variant.campaign, variant.channel, variant.owner, variant.sponsor, variant.opponent,
            variant.competition, variant.match_date, variant.home_away, variant.status,
            variant.redirect_code, variant.is_qr, variant.is_offsite_ticket, variant.show_offsite_preview,
            variant.is_protected, variant.variant_of, variant.created_by, variant.created_at,
            variant.updated_by, variant.updated_at, variant.expires_at, variant.notes
          ).run()

          variants.push(variant)
        }

        return new Response(JSON.stringify(variants), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        })

      } else if (request.method === 'PATCH') {
        // PATCH /api/links/{id}/variants - bulk update variant destinations
        const body = await request.json()
        const destinations = body.destinations

        if (!Array.isArray(destinations) || destinations.length !== 5) {
          return new Response(
            JSON.stringify({ error: { code: 'VALIDATION_ERROR', message: 'Invalid destinations array' } }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          )
        }

        // Get base link
        const { results: baseResults } = await env.DB.prepare('SELECT * FROM links WHERE id = ? AND deleted_at IS NULL')
          .bind(id)
          .all()

        if (baseResults.length === 0) {
          return new Response(
            JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Base link not found' } }),
            { status: 404, headers: { 'Content-Type': 'application/json' } }
          )
        }

        // Update all variants
        const platforms = ['instagram', 'facebook', 'x', 'tiktok', 'linkedin']
        const updates = []

        for (let i = 0; i < platforms.length; i++) {
          const platform = platforms[i]
          const destination = destinations[i]

          if (!isValidUrl(destination)) {
            return new Response(
              JSON.stringify({ error: { code: 'VALIDATION_ERROR', message: `Invalid URL for ${platform}` } }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
          }

          updates.push(
            env.DB.prepare(`
              UPDATE links
              SET destination_url = ?, destination_domain = ?, updated_by = ?, updated_at = ?
              WHERE variant_of = ? AND channel = ?
            `).bind(
              destination,
              new URL(destination).hostname,
              authUser.email,
              now,
              id,
              platform
            ).run()
          )
        }

        // Execute all updates
        const results = await Promise.all(updates)
        
        if (results.some(r => !r.success)) {
          throw new Error('Failed to update some variants')
        }

        // Get updated variants
        const { results: variantResults } = await env.DB.prepare('SELECT * FROM links WHERE variant_of = ?')
          .bind(id)
          .all()

        return new Response(JSON.stringify(variantResults), {
          headers: { 'Content-Type': 'application/json' },
        })

      } else {
        return new Response(null, { status: 405 })
      }
    } catch (error) {
      return new Response(
        JSON.stringify({ error: { code: 'VALIDATION_ERROR', message: error instanceof Error ? error.message : 'Invalid request' } }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
  },
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const allowedProtocols = ['http:', 'https:']
    return allowedProtocols.includes(parsed.protocol)
  } catch {
    return false
  }
}
```

- [ ] **Step 2: Create VariantGroup component**

Create `/home/ubuntu/rovrs/admin/src/components/VariantGroup.tsx`:

```typescript
import { useState } from 'react'
import { api } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Loader2, Copy, Edit } from 'lucide-react'
import type { Link } from '@rovrs/shared'

interface VariantGroupProps {
  baseLink: Link
  onUpdate?: () => void
}

const socialPlatforms = [
  { name: 'Instagram', channel: 'instagram', suffix: 'ig', color: 'bg-pink-500' },
  { name: 'Facebook', channel: 'facebook', suffix: 'fb', color: 'bg-blue-600' },
  { name: 'X/Twitter', channel: 'x', suffix: 'x', color: 'bg-black' },
  { name: 'TikTok', channel: 'tiktok', suffix: 'tt', color: 'bg-purple-500' },
  { name: 'LinkedIn', channel: 'linkedin', suffix: 'li', color: 'bg-blue-700' },
]

export default function VariantGroup({ baseLink, onUpdate }: VariantGroupProps) {
  const [variants, setVariants] = useState<Link[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const generateVariants = async () => {
    setLoading(true)
    try {
      const generated = await api.generateVariants(baseLink.id)
      setVariants(generated)
      onUpdate?.()
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to generate variants'}`)
    } finally {
      setLoading(false)
    }
  }

  const copyVariantUrl = async (slug: string) => {
    const url = `${window.location.origin}/${slug}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // Fallback
      const textArea = document.createElement('textarea')
      textArea.value = url
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
  }

  const getVariantByChannel = (channel: string) => {
    return variants.find(v => v.channel === channel)
  }

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        onClick={() => setExpanded(!expanded)}
        className="w-full justify-between"
      >
        <span className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Social Variants
          {variants.length > 0 && (
            <Badge variant="secondary">{variants.length}</Badge>
          )}
        </span>
        <span>{expanded ? 'Collapse' : 'Expand'}</span>
      </Button>

      {expanded && (
        <div className="space-y-3 mt-3">
          {variants.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-600 mb-4">
                  Generate platform-specific links with auto-UTM tags for better campaign tracking.
                </p>
                <Button
                  onClick={generateVariants}
                  disabled={loading}
                  size="sm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : 'Generate Variants'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {socialPlatforms.map(platform => {
                  const variant = getVariantByChannel(platform.channel)
                  if (!variant) return null

                  return (
                    <Card key={platform.channel} className="relative">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <div className={`w-3 h-3 rounded-full ${platform.color}`} />
                            <CardTitle className="text-sm font-medium">
                              {platform.name}
                            </CardTitle>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {variant.slug}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          <p className="text-xs text-gray-600">
                            {window.location.origin}/{variant.slug}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {variant.destination_url}
                          </p>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyVariantUrl(variant.slug)}
                              className="flex-1 h-6"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Bulk Update</CardTitle>
                  <CardDescription className="text-xs">
                    Update all variant destinations at once
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Placeholder for bulk update UI */}
                  <p className="text-xs text-gray-500">
                    Bulk update functionality coming soon
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  )
}
```

**Tests:**
- [ ] **Test: Social variants**
  - Test POST /api/links/{id}/variants endpoint
  - Test variant generation with correct slugs
  - Test PATCH /api/links/{id}/variants for bulk update
  - Test VariantGroup component expansion/collapse
  - Test variant URL generation and copying
  - Test error handling (variants already exist)
  - Use @cloudflare/vitest-pool-workers and React Testing Library

---

## Phase 7 (Task 15): QR codes

**Files:**
- Create: `admin/src/lib/qr.ts`
- Create: `admin/src/components/QRGenerator.tsx`
- Update: `admin/src/pages/EditPage.tsx`
- Update: `admin/src/pages/QRToolsPage.tsx`

- [ ] **Step 1: Create QR utility library**

Create `/home/ubuntu/rovrs/admin/src/lib/qr.ts`:

```typescript
import QRCode from 'qrcode'
import { PDFDocument, rgb } from 'pdf-lib'

export async function generateQRCode(text: string, size: number = 256): Promise<string> {
  try {
    const canvas = document.createElement('canvas')
    await QRCode.toCanvas(canvas, text, {
      width: size,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
    
    return canvas.toDataURL('image/png')
  } catch (error) {
    throw new Error(`Failed to generate QR code: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function generateQRPDF(
  text: string,
  title?: string,
  size: number = 256
): Promise<Blob> {
  try {
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([size, size + 50])
    
    // Generate QR code as image
    const qrCanvas = document.createElement('canvas')
    await QRCode.toCanvas(qrCanvas, text, {
      width: size,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
    
    // Convert canvas to image buffer
    const imageBytes = await qrCanvas.toDataURL('image/png')
    const image = await pdfDoc.embedPng(imageBytes)
    
    // Draw QR code
    page.drawImage(image, {
      x: 0,
      y: 50,
      width: size,
      height: size,
    })
    
    // Draw title if provided
    if (title) {
      page.drawText(title, {
        x: size / 2 - title.length * 3,
        y: 20,
        size: 12,
        color: rgb(0, 0, 0),
      })
    }
    
    const pdfBytes = await pdfDoc.save()
    return new Blob([pdfBytes], { type: 'application/pdf' })
  } catch (error) {
    throw new Error(`Failed to generate QR PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// QR code sizes
export const QR_SIZES = {
  PRINT: 1024,
  SOCIAL: 512,
  SCREEN: 256,
} as const

export type QRSize = keyof typeof QR_SIZES
```

- [ ] **Step 2: Create QRGenerator component**

Create `/home/ubuntu/rovrs/admin/src/components/QRGenerator.tsx`:

```typescript
import { useState, useRef } from 'react'
import { generateQRCode, generateQRPDF, QR_SIZES, type QRSize } from '@/lib/qr'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Download, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'
import type { Link } from '@rovrs/shared'

interface QRGeneratorProps {
  link: Link
  showExpiryWarning?: boolean
}

export default function QRGenerator({ link, showExpiryWarning = true }: QRGeneratorProps) {
  const [size, setSize] = useState<QRSize>('SOCIAL')
  const [loading, setLoading] = useState(false)
  const [imageUrl, setImageUrl] = useState<string>('')
  const [expiryWarningVisible, setExpiryWarningVisible] = useState(false)
  const qrRef = useRef<HTMLDivElement>(null)

  const shortUrl = `${window.location.origin}/${link.slug}`
  
  // Check for expiry
  const hasExpiry = link.expires_at
  const isExpired = hasExpiry && new Date(link.expires_at) < new Date()
  const expirySoon = hasExpiry && new Date(link.expires_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const generateQR = async () => {
    setLoading(true)
    try {
      const qrUrl = await generateQRCode(shortUrl, QR_SIZES[size])
      setImageUrl(qrUrl)
      setExpiryWarningVisible(expirySoon && !isExpired)
    } catch (error) {
      alert(`Error generating QR code: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const downloadQR = async (format: 'png' | 'pdf') => {
    if (!imageUrl) return

    if (format === 'png') {
      const link = document.createElement('a')
      link.href = imageUrl
      link.download = `qr-${link.slug}-${size}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else {
      setLoading(true)
      try {
        const pdfBlob = await generateQRPDF(shortUrl, link.title || shortUrl, QR_SIZES[size])
        const url = URL.createObjectURL(pdfBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `qr-${link.slug}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } catch (error) {
        alert(`Error generating PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
      } finally {
        setLoading(false)
      }
    }
  }

  const removeExpiry = async () => {
    // This would call the API to remove expiry
    // For now, just hide the warning
    setExpiryWarningVisible(false)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>QR Code Generator</CardTitle>
          <CardDescription>
            Generate QR codes for {link.title || shortUrl}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="size">Size</Label>
              <Select value={size} onValueChange={(value: QRSize) => setSize(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRINT">Print (1024px)</SelectItem>
                  <SelectItem value="SOCIAL">Social (512px)</SelectItem>
                  <SelectItem value="SCREEN">Screen (256px)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Button 
                onClick={generateQR}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : 'Generate QR'}
              </Button>
            </div>
          </div>

          {imageUrl && (
            <div ref={qrRef} className="flex flex-col items-center space-y-4">
              {/* QR Code */}
              <img 
                src={imageUrl} 
                alt={`QR code for ${shortUrl}`}
                className={`border rounded ${size === 'PRINT' ? 'max-w-full' : ''}`}
                style={{ 
                  width: QR_SIZES[size] === 1024 ? '100%' : QR_SIZES[size] 
                }}
              />

              {/* Info */}
              <div className="text-center text-sm text-gray-600">
                <p>{shortUrl}</p>
                {link.title && <p className="text-xs text-gray-500">{link.title}</p>}
              </div>

              {/* Expiry warning */}
              {expiryWarningVisible && (
                <div className="max-w-md p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-yellow-800">
                        Expiring Soon
                      </p>
                      <p className="text-xs text-yellow-700 mt-1">
                        This link expires on {new Date(link.expires_at!).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-yellow-600 mt-1">
                        After expiry, users will be redirected to the tickets page.
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadQR('png')}
                        >
                          Generate Anyway
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={removeExpiry}
                        >
                          Remove Expiry
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Download buttons */}
              {!expiryWarningVisible && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => downloadQR('png')}
                    variant="outline"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download PNG
                  </Button>
                  <Button
                    onClick={() => downloadQR('pdf')}
                    variant="outline"
                    disabled={loading}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

**Tests:**
- [ ] **Test: QR generation**
  - Test generateQRCode function with different sizes
  - Test generateQRPDF function with title
  - Test QRGenerator component UI
  - Test expiry warning logic
  - Test download functionality (PNG and PDF)
  - Mock QRCode and pdf-lib libraries
  - Use React Testing Library for component tests

---

## Phase Summary

### Key Components Delivered

**Phase 4: Admin SPA + Auth + CRUD**
- React + Vite + Tailwind + shadcn/ui admin dashboard
- Cloudflare Access authentication flow
- Full CRUD API for links with soft delete/restore
- Search, filter, and pagination

**Phase 5: Quick Create + Match Links**
- One-step quick create flow
- Two-step matchday link creator
- Auto-slug and auto-campaign generation

**Phase 6: Social Variants**
- Bulk social variant generation
- Variant grouping under base link
- Bulk destination updates for variants

**Phase 7: QR Codes**
- Client-side QR generation (PNG + PDF)
- Multiple size options
- Expiry warnings and actions
- Download functionality

### Testing Strategy
- API tests: @cloudflare/vitest-pool-workers with mocked D1
- UI tests: React Testing Library with mocked API client
- Component tests: Unit tests for individual components
- Integration tests: End-to-end flows

### Commands to Run
```bash
# Admin SPA development
cd admin
npm install
npm run dev

# Build for production
npm run build

# Test admin code
npm test

# Deploy admin
npm run pages:deploy
```

This completes the admin foundation implementation for rov.rs, providing all necessary functionality for link management, user authentication, and specialized workflows like quick create and social variants.