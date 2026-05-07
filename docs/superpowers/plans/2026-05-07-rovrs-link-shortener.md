# rov.rs Link Shortener Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Shamrock Rovers branded link shortener on Cloudflare Workers + Pages with D1, Queues, and R2.

**Architecture:** Redirect Worker on rov.rs handles public slug lookups and redirects. Admin Pages project on admin.rov.rs serves a React SPA with Pages Functions for the API. Both share a D1 database. Click events are processed asynchronously via Cloudflare Queues. A scheduled Worker archives old events to R2.

**Tech Stack:** Cloudflare Workers, Cloudflare Pages + Pages Functions, Cloudflare D1, Cloudflare Queues, Cloudflare R2, Cloudflare Access, React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, Vitest, Miniflare

## File Structure

rovrs/
├── packages/
│   ├── redirect-worker/        # Public redirect Worker (bound to rov.rs)
│   │   ├── src/
│   │   │   ├── index.ts        # Entry point, routing
│   │   │   ├── redirect.ts     # Slug lookup + redirect logic
│   │   │   ├── click-event.ts  # Click event capture + queue
│   │   │   ├── url-validation.ts # URL safety checks
│   │   │   └── offsite-preview.ts # Interstitial HTML
│   │   ├── test/
│   │   │   ├── redirect.test.ts
│   │   │   ├── click-event.test.ts
│   │   │   └── url-validation.test.ts
│   │   ├── wrangler.toml
│   │   ├── tsconfig.json
│   │   └── package.json
│   ├── queue-consumer/         # Click event batch writer
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── wrangler.toml
│   │   └── package.json
│   ├── archival-worker/        # Scheduled D1→R2 archival
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── wrangler.toml
│   │   └── package.json
│   └── shared/                 # Shared types and utilities
│       ├── src/
│       │   ├── types.ts        # TypeScript interfaces
│       │   ├── constants.ts    # Fallback URLs, channels, etc.
│       │   ├── db.ts           # D1 query helpers
│       │   └── nanoid.ts       # ID generation
│       ├── test/
│       │   ├── db.test.ts
│       │   └── nanoid.test.ts
│       └── package.json
├── admin/                      # Cloudflare Pages project
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── index.css           # Tailwind imports
│   │   ├── api/
│   │   │   ├── client.ts       # Fetch wrapper + auth
│   │   │   └── types.ts        # API response types
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Links.tsx
│   │   │   ├── CreateLink.tsx
│   │   │   ├── QuickCreate.tsx
│   │   │   ├── MatchLink.tsx
│   │   │   ├── SponsorReport.tsx
│   │   │   ├── ImportExport.tsx
│   │   │   └── Settings.tsx
│   │   ├── components/
│   │   │   ├── Layout.tsx
│   │   │   ├── LinkForm.tsx
│   │   │   ├── LinkTable.tsx
│   │   │   ├── LinkRow.tsx
│   │   │   ├── SearchFilter.tsx
│   │   │   ├── StatsCard.tsx
│   │   │   ├── QRGenerator.tsx
│   │   │   ├── VariantGroup.tsx
│   │   │   ├── BatchActions.tsx
│   │   │   ├── CopyButton.tsx
│   │   │   └── ProtectedBadge.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useLinks.ts
│   │   │   ├── useStats.ts
│   │   │   └── useUsers.ts
│   │   └── lib/
│   │       ├── qr.ts           # qrcode.js wrapper
│   │       ├── pdf.ts           # pdf-lib wrapper
│   │       └── utils.ts
│   ├── functions/               # Pages Functions (API)
│   │   └── api/
│   │       ├── _middleware.ts   # Auth check, rate limiting
│   │       ├── me.ts
│   │       ├── links/
│   │       │   ├── index.ts     # GET list, POST create
│   │       │   └── [id].ts      # GET, PATCH, DELETE
│   │       ├── links/
│   │       │   └── [id]/
│   │       │       ├── variants.ts
│   │       │       ├── restore.ts
│   │       │       └── stats.ts
│   │       ├── links/
│   │       │   └── batch.ts
│   │       ├── import/
│   │       │   └── csv/
│   │       │       ├── index.ts
│   │       │       └── [jobId]/
│   │       │           └── status.ts
│   │       ├── export/
│   │       │   └── csv.ts
│   │       ├── reports/
│   │       │   └── sponsors.ts
│   │       ├── stats/
│   │       │   └── summary.ts
│   │       └── users/
│   │           └── index.ts
│   ├── public/
│   │   └── favicon.ico
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── tsconfig.json
│   ├── wrangler.toml
│   └── package.json
├── migrations/
│   └── 0001_initial_schema.sql  # All tables in one migration
├── .github/
│   └── workflows/
│       └── deploy.yml
├── CLAUDE.md
├── package.json                 # Root workspace config
├── tsconfig.base.json           # Shared TS config
└── rovrs_shortener_spec_v_0_4.md

## Task List

Write these tasks IN ORDER. Each task follows TDD: write test → verify fail → implement → verify pass → commit.

### Phase 1: Foundation (Tasks 1-3)

**Task 1: Monorepo setup**
- Create root package.json with npm workspaces
- Create tsconfig.base.json
- Create packages/shared/package.json and tsconfig.json
- Create packages/redirect-worker/package.json and tsconfig.json and wrangler.toml
- Create packages/queue-consumer/package.json and tsconfig.json and wrangler.toml
- Create packages/archival-worker/package.json and tsconfig.json and wrangler.toml
- Create admin/package.json and tsconfig.json and vite.config.ts and tailwind.config.ts and wrangler.toml
- Run npm install
- Verify: `npm run -w packages/shared build` works
- Commit: "chore: monorepo scaffolding"

Show ALL the config files in full. Include wrangler.toml with D1 binding, Queue binding, R2 binding placeholders.

**Task 2: D1 schema migration**
- Create migrations/0001_initial_schema.sql with ALL tables: links, click_events, destination_history, users
- Include ALL indexes from the spec section 12
- Include seed data: evergreen links (tickets, shop, fixtures, members, academy, women) with is_protected=true
- Show the complete SQL file
- Test: run migration locally with wrangler d1 migrations apply --local
- Commit: "feat: initial D1 schema with seed data"

**Task 3: Shared types and utilities**
- Create packages/shared/src/types.ts with TypeScript interfaces for Link, ClickEvent, DestinationHistory, User, LinkStatus enum, CreateLinkInput, UpdateLinkInput, PaginatedResponse, ApiError, etc.
- Create packages/shared/src/constants.ts with FALLBACK_URL, RESERVED_PATHS, KNOWN_DOMAINS, CHANNELS, PLATFORM_SUFFIXES (for variants: ig, fb, x, tt, li), BLOCKED_PROTOCOLS, PROTECTED_SLUGS
- Create packages/shared/src/nanoid.ts with ID generation (12 chars, lowercase + digits, no ambiguous chars)
- Create packages/shared/src/db.ts with D1 query helpers: findActiveLinkBySlug, createLink, updateLink, softDeleteLink, etc. These are async functions that take a D1Database and params.
- Write tests for nanoid and db helpers using Vitest
- Commit: "feat: shared types, constants, and DB helpers"

### Phase 2: Public Redirect Worker (Tasks 4-7)

**Task 4: Core redirect logic**
- Create packages/redirect-worker/src/index.ts with fetch handler
- Create packages/redirect-worker/src/redirect.ts with:
  - slug extraction from URL path
  - reserved path check (return 404 for reserved paths)
  - root path `/` → redirect to shamrockrovers.ie
  - D1 lookup for active link
  - Status checks: active→redirect, expired→fallback, paused→fallback
  - Match date check: if match_date + 4hrs < now → fallback
  - Fallback always to shamrockrovers.ie/first-team-tickets
  - 302 default, 301 for evergreen links
- Write tests in test/redirect.test.ts using Miniflare/vitest-pool-workers
- Commit: "feat: redirect worker - core slug lookup and redirect"

**Task 5: URL validation pipeline**
- Create packages/redirect-worker/src/url-validation.ts (this is used by ADMIN API too, so consider putting it in shared)
- Actually put it in packages/shared/src/url-validation.ts
- Functions: validateDestinationUrl(url) that runs the full pipeline from spec section 8.1:
  - Protocol check, decode/normalize, blocked protocols, private IP check, format check, DNS resolution (skip in test), homograph flag, shortener loop check
  - Returns { valid: boolean, warnings: string[] }
- Write comprehensive tests for each validation step
- Commit: "feat: URL validation pipeline"

**Task 6: Click event queuing**
- Create packages/redirect-worker/src/click-event.ts
- Function: captureClickEvent(request, link, env) that:
  - Extracts: country from CF-IPCountry header, referrer, parse user-agent to device_type (mobile/desktop/tablet/bot), UTM params from destination URL
  - Creates queue message with all data + nanoid ID
  - Sends to Queue binding. Falls back to direct D1 write if queue unavailable.
- Update redirect.ts to call captureClickEvent after redirect decision (non-blocking)
- Write tests
- Commit: "feat: click event capture and queuing"

**Task 7: Offsite preview page**
- Create packages/redirect-worker/src/offsite-preview.ts
- Function: generateOffsitePreviewHTML(link) that returns HTML string
- The interstitial page from spec section 7
- Mobile-optimised, brand-inspired styling inline
- "Continue" button that links to the actual destination
- Update redirect.ts: if link.is_offsite_ticket → return preview page instead of redirect
- Write tests
- Commit: "feat: offsite ticket preview interstitial"

### Phase 3: Queue Consumer (Task 8)

**Task 8: Click event batch consumer**
- Create packages/queue-consumer/src/index.ts
- Queue handler: receives batch of messages, constructs INSERT statement for click_events table
- Uses INSERT with multiple VALUES for efficiency
- Handles event_type: 'click' for regular, 'offsite_continue' for preview continues
- Error handling: log failed writes, don't retry individual events
- Write tests with mock D1
- Commit: "feat: queue consumer for click event batch writes"

### Phase 4: Admin SPA Foundation (Tasks 9-13)

**Task 9: SPA scaffolding and routing**
- Create admin/src/main.tsx, App.tsx with React Router
- Create admin/src/components/Layout.tsx with sidebar navigation
- Create admin/src/pages/ stubs for all pages
- Create admin/src/api/client.ts with authenticated fetch wrapper (includes credentials)
- Create admin/src/api/types.ts with response types
- Create admin/src/hooks/useAuth.ts
- Create admin/index.html
- Create admin/src/index.css with Tailwind imports
- Configure vite.config.ts for Cloudflare Pages (base path, build output)
- Verify: npm run dev shows the app
- Commit: "feat: admin SPA scaffolding with routing"

**Task 10: Auth flow and /api/me**
- Create admin/functions/api/_middleware.ts:
  - Extracts email from Cf-Access-Jwt-Assertion JWT header
  - Validates JWT signature (using Cloudflare's public keys)
  - Looks up user in D1 users table
  - If not found, auto-creates with 'editor' role
  - Attaches user to request context
  - Returns 401 for unauthenticated requests
- Create admin/functions/api/me.ts: GET handler returns user info
- Update useAuth hook to call /api/me on mount
- Add login state management to React context
- Test middleware with mocked JWT
- Commit: "feat: Cloudflare Access auth middleware and /api/me"

**Task 11: Admin API - Links CRUD**
- Create admin/functions/api/links/index.ts:
  - GET: list links with pagination, search, filters. Query params: page, limit, status, channel, campaign, sponsor, opponent, search. Search does LIKE on slug, title, notes, campaign.
  - POST: create link. Validates URL (using shared url-validation), validates slug (rules from spec 5.3), checks slug uniqueness for active links, generates nanoid ID, sets created_by from auth user.
- Create admin/functions/api/links/[id].ts:
  - GET: single link by ID
  - PATCH: update link. If destination_url changed, write to destination_history. Update updated_by/at.
  - DELETE: soft delete. Suffix slug with __del_{timestamp}. Set deleted_at. If is_protected, require role=admin.
- Create admin/functions/api/links/[id]/restore.ts: POST handler, restore slug, clear deleted_at
- Write tests for each endpoint
- Commit: "feat: admin API - links CRUD with soft delete"

**Task 12: Admin API - Batch operations**
- Create admin/functions/api/links/batch.ts:
  - POST handler with body: { action: "pause"|"expire"|"update_destination", link_ids: string[], destination_url?: string }
  - Validates action, applies to all link_ids in single transaction
  - For update_destination: also writes destination_history for each changed link
  - Returns { updated: number }
- Write tests
- Commit: "feat: admin API - batch operations"

**Task 13: Admin UI - Links page**
- Create admin/src/components/LinkTable.tsx: sortable table with columns (slug, destination, title, status, channel, clicks, created, expires)
- Create admin/src/components/LinkRow.tsx: row with copy button, edit/delete actions, variant indicator
- Create admin/src/components/SearchFilter.tsx: search input + filter dropdowns (status, channel, campaign, sponsor)
- Create admin/src/components/BatchActions.tsx: checkbox selection + bulk action buttons
- Create admin/src/hooks/useLinks.ts: React Query (or SWR) hook for paginated links API
- Create admin/src/pages/Links.tsx: combines all components
- Commit: "feat: admin links list page with search and filters"

**Task 14: Admin UI - Create/Edit link forms**
- Create admin/src/components/LinkForm.tsx: full form with all fields from spec 11.3
  - Slug validation (lowercase, 2-50 chars, letters/numbers/hyphens)
  - URL validation with preview
  - Campaign and channel dropdowns
  - Expiry date picker
  - Sponsor, owner, opponent fields
  - Notes textarea
- Create admin/src/pages/CreateLink.tsx: wraps LinkForm for create
- Create edit mode in LinkForm (pre-populate fields)
- After creation, show success with copy button + QR generation option
- Commit: "feat: link create/edit forms"

### Phase 5: Quick Create and Match Links (Tasks 15-16)

**Task 15: Quick create**
- Create admin/src/pages/QuickCreate.tsx:
  - Single URL input field
  - On submit: POST /api/links with auto-generated slug, no other fields
  - Show result immediately with copy button
  - "Add details" button that navigates to edit form
- Commit: "feat: quick create link flow"

**Task 16: Match link mode**
- Create admin/src/pages/MatchLink.tsx:
  - Opponent field (free text)
  - Home/away toggle
  - Competition field
  - Match date picker
  - Ticket URL input
  - Expiry date (default: match date + 4 hours)
  - Slug preview: opponent name → lowercase, spaces→hyphens
  - On submit: creates link with match metadata
- Commit: "feat: match link creation mode"

### Phase 6: Social Variants (Task 17)

**Task 17: Social variants API and UI**
- Create admin/functions/api/links/[id]/variants.ts:
  - POST: generate social variants. Takes base link ID, creates 5 variant links (ig, fb, x, tt, li) with suffixes appended to slug. Each variant gets channel set to the platform. variant_of set to base link ID.
  - PATCH: bulk update all variant destinations to match base link. Used when base link destination changes.
- Create admin/src/components/VariantGroup.tsx: collapsible section under base link showing all variants with individual copy buttons
- Update Links page to show variants grouped under base link
- Commit: "feat: social variant generation and UI"

### Phase 7: QR Codes (Task 18)

**Task 18: Client-side QR generation**
- Install qrcode.js and pdf-lib in admin package
- Create admin/src/lib/qr.ts: generateQR_png(url, size) → data URL, generateQR_pdf(url, title) → Blob
- Create admin/src/components/QRGenerator.tsx:
  - Size selector (print/social/screen)
  - PNG and PDF download buttons
  - Expiry warning if link has expires_at
  - "Generate anyway" / "Remove expiry date" actions
- Add QR button to link detail/edit view
- Commit: "feat: client-side QR code generation"

### Phase 8: Analytics (Tasks 19-21)

**Task 19: Stats API endpoints**
- Create admin/functions/api/stats/summary.ts: GET returns total clicks, total links, active links, clicks today, clicks by channel, top 5 links
- Create admin/functions/api/links/[id]/stats.ts: GET returns daily clicks for a link within date range (from/to params), breakdown by channel, total clicks
- Write tests
- Commit: "feat: stats API endpoints"

**Task 20: Dashboard page**
- Create admin/src/pages/Dashboard.tsx:
  - Stats cards: total links, active links, total clicks, clicks today
  - Top 5 links by clicks
  - Recent links list (last 5 created)
  - Dashboard flags section: expiring soon, no clicks in 90 days, destination changed recently
- Create admin/src/components/StatsCard.tsx
- Create admin/src/hooks/useStats.ts
- Commit: "feat: analytics dashboard"

**Task 21: Sponsor reports**
- Create admin/functions/api/reports/sponsors.ts:
  - GET: takes sponsor, from, to params
  - Queries links by sponsor, aggregates click_events within date range
  - Returns per-link clicks, daily breakdown, channel breakdown
  - For historical accuracy: joins with destination_history to show URL at time of click
- Create admin/src/pages/SponsorReport.tsx:
  - Sponsor selector, date range picker
  - Results table with CSV export button
- Commit: "feat: sponsor reports with CSV export"

### Phase 9: Import/Export (Task 22)

**Task 22: CSV import and export**
- Create admin/functions/api/import/csv/index.ts:
  - POST: accepts CSV file upload (multipart form)
  - Parse CSV (columns from spec: slug, destination_url, title, campaign, channel, owner, sponsor, opponent, competition, match_date, home_away, expires_at, notes)
  - Validate each row through URL validation pipeline
  - Skip invalid rows, collect errors with row numbers
  - Create links with status=active
  - Return { job_id, created: N, skipped: N, errors: [{row, error}] }
  - Enqueue to Queue for async processing if >100 rows
- Create admin/functions/api/export/csv.ts:
  - GET: same filters as links list
  - Streams CSV response
- Create admin/src/pages/ImportExport.tsx: upload form, download button, import status display
- Commit: "feat: CSV import with row-level errors and CSV export"

### Phase 10: Users and Settings (Task 23)

**Task 23: User management and settings**
- Create admin/functions/api/users/index.ts:
  - GET: list all users (admin only)
  - PATCH /api/users/[id]: update role (admin only)
- Create admin/src/hooks/useUsers.ts
- Add user management section to Settings page
- Create admin/src/pages/Settings.tsx: slug blocklist management, known domains, protected slugs list
- Create admin/functions/api/settings.ts or handle in existing endpoints
- Commit: "feat: user management and settings page"

### Phase 11: Operations (Tasks 24-26)

**Task 24: Archival Worker**
- Create packages/archival-worker/src/index.ts:
  - Scheduled handler (cron trigger)
  - Query click_events WHERE clicked_at < now() - 180 days
  - Batch write to R2 as JSON (partitioned by date: clicks/YYYY-MM-DD.json)
  - Delete archived rows from D1
  - Process in batches of 1000 to avoid memory/timeout issues
- Configure wrangler.toml with cron trigger and R2 binding
- Commit: "feat: scheduled worker for click event archival to R2"

**Task 25: Health check and rate limiting**
- Add GET /health to redirect worker: check D1 connectivity, return { status: "ok", db: "ok" } or 503
- Add rate limiting to admin API middleware: track requests per email per minute in D1 (simple counter table or in-memory Map with TTL)
- If rate exceeded, return 429 with Retry-After header
- Write tests
- Commit: "feat: health check endpoint and API rate limiting"

**Task 26: CI/CD pipeline**
- Create .github/workflows/deploy.yml:
  - Trigger: push to main
  - Steps: checkout, setup node, npm ci, run tests, run D1 migrations (wrangler d1 migrations apply), deploy redirect worker (wrangler deploy), deploy admin (wrangler pages deploy)
  - Use GitHub secrets for CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID
- Commit: "feat: GitHub Actions CI/CD pipeline"

### Phase 12: Polish and Launch (Tasks 27-28)

**Task 27: Mobile responsive polish**
- Review all admin pages on mobile viewport (320px, 375px, 428px)
- Ensure: Layout sidebar collapses to hamburger, tables become card lists, forms stack vertically, copy buttons remain accessible, quick create works on mobile
- Add viewport meta tag, ensure touch targets are 44px minimum
- Commit: "feat: mobile responsive polish"

**Task 28: Seed data and launch verification**
- Verify all seed links from migration are correct (tickets → shamrockrovers.ie/first-team-tickets, etc.)
- Create a launch checklist test script that verifies:
  - Health check returns ok
  - rov.rs/tickets redirects correctly
  - rov.rs/unknown redirects to fallback
  - admin.rov.rs loads
  - /api/me returns user info
  - Can create, edit, delete a link
  - Click events are captured
- Run through acceptance criteria from spec section 20
- Commit: "chore: launch verification and seed data confirmation"

## IMPORTANT RULES

1. Every step must contain the actual code or command. NO placeholders.
2. Show the COMPLETE file content for config files (package.json, wrangler.toml, tsconfig.json, etc.)
3. For implementation files, show the key functions and logic. Include imports.
4. For test files, show representative test cases. Don't write every possible test.
5. Use checkbox syntax: `- [ ] Step description`
6. Each task ends with a commit step.
7. Write the ENTIRE plan to the file. Do not truncate. Do not summarize. Write it all.
8. The plan will be very long. That's expected. Write it completely.