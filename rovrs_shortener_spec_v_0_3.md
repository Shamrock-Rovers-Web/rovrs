# rov.rs Link Shortener Spec v0.3

## 1. Summary

**rov.rs** will be the official Shamrock Rovers branded short-link service for tickets, social posts, QR codes, campaign links, sponsor links, and club communications.

The service runs on Cloudflare. The public shortener uses `rov.rs`. The admin dashboard uses `admin.rov.rs`, protected by Cloudflare Access.

Both public redirect logic and admin API are served by a **single Cloudflare Worker** that routes by hostname. The admin UI is a **React SPA deployed on Cloudflare Pages**, calling the Worker API.

Readable links:

```text
rov.rs/tickets
rov.rs/shop
rov.rs/bohs
rov.rs/women
```

Auto-generated short links for quick social use.

---

## 2. Confirmed decisions

### 2.1 Domain

| Item | Decision |
|---|---|
| Domain | `rov.rs` |
| Cloudflare status | Already added to Cloudflare |
| Root domain | Currently redirects to `shamrockrovers.ie`; keep this behaviour |
| `www.rov.rs` | Redirects to `shamrockrovers.ie`; keep this behaviour |
| Branding | Official Shamrock Rovers branded service |
| Initial approval owner | Bill |

### 2.2 Users and access

| Item | Decision |
|---|---|
| Day-to-day users | Bill + marketing team |
| User experience | Form-based admin UI |
| Social workflow | User pastes a destination URL and gets a short link |
| Authentication | Cloudflare Access (email OTP or SSO) |
| Roles | Two roles: **Admin** (Bill) and **Editor** (marketing team). Editors can create/edit/delete links. Admins can also manage users and settings. |
| Publishing | Any authenticated user can create live links |
| Multiple admins | At least 2 users must have Admin role to avoid single point of failure |

### 2.3 Link types

| Item | Decision |
|---|---|
| Readable slugs | Yes |
| Auto-generated slugs | Yes |
| Evergreen links | `tickets`, `shop`, `fixtures`, `members`, `academy`, `women` |
| Match slugs | Opponent-based rolling links preferred |
| Fixture-specific slugs | Supported for cases that need fixed attribution |
| Deleted slug reuse | Allowed after soft delete |

### 2.4 Destinations

| Item | Decision |
|---|---|
| External destinations | Allowed |
| Main site | `shamrockrovers.ie` |
| Shop domains | `shop.shamrockrovers.ie`, `memberswear.shamrockrovers.ie` |
| Ticketing | Future Ticketing, embedded on the site |
| Opponent ticket sites | Sometimes needed |
| Social platforms | Instagram, Facebook, X/Twitter, TikTok, LinkedIn |
| Forms | Google Forms |
| Sponsor sites | Allowed |
| Strict allowlist | Not used; soft safety model instead (see section 8) |

### 2.5 Tickets and match handling

| Item | Decision |
|---|---|
| `rov.rs/tickets` | Always points to main tickets page |
| Passed match links | Redirect to `rov.rs/tickets` |
| Sold-out matches | Keep pointing to ticket page |
| Fixture expiry dates | Supported, but no default expiry across all links |
| Match-link mode | Yes |
| Opponent club ticket links | Show offsite preview page |

### 2.6 Analytics and tracking

| Item | Decision |
|---|---|
| Primary analytics | Click events stored in D1 (first-party data) |
| Metrics | Total clicks, per-link clicks, daily clicks, channel clicks, QR scans, social clicks, sponsor clicks, ticket campaign clicks |
| UTM tagging | Yes — for destinations on shamrockrovers.ie; click_events capture UTM params for all destinations |
| GA4 | Used on `shamrockrovers.ie`; v1 focuses on UTM tagging for GA4 attribution |
| CSV export | Yes |
| Sponsor reports | Yes |

### 2.7 QR codes

| Item | Decision |
|---|---|
| QR generation | Client-side in the browser (qrcode.js) |
| QR style | Plain black/white |
| QR formats | PNG and PDF (client-side via jspdf) |
| QR uses | Posters and social graphics |
| QR sizes | Print (300dpi), Social (150dpi), Screen (72dpi) presets |
| Permanent by default | No |
| Expiry warning | Yes, with clear "Generate anyway" action |

### 2.8 Admin experience

| Item | Decision |
|---|---|
| Admin UI | React SPA on Cloudflare Pages |
| Create-link fields | Slug, destination URL, title, campaign, channel, expiry date, match/opponent, sponsor, notes |
| Quick create mode | Paste URL → auto-slug → get link. Optional fields filled in after creation. |
| Matchday mode | Streamlined form with opponent + destination pre-filled from recent matches |
| CSV import | Yes |
| CSV export | Yes |
| Copy button | Yes |
| Auto social variants | Yes, with batch update for all variants |
| Edit destination | Yes |
| Visible edit history | No |
| Search/filter | Full-text search across slug, title, notes, campaign |
| Batch operations | Bulk pause, bulk expire, bulk update destination |
| Mobile | Responsive design, optimised for matchday phone use |

### 2.9 Governance

| Item | Decision |
|---|---|
| Owner field | Yes |
| Default expiry | No |
| Expired link behaviour | Redirect to `rov.rs/tickets` |
| Review process | No review; authenticated users can publish directly |
| Audit log | No full audit log |
| Basic update metadata | `last_updated_by`, `last_updated_at` |
| Risk/stale flags | Yes |
| Soft delete | Links are soft-deleted with `deleted_at` timestamp. Slug becomes available for reuse after deletion. Old click events retain original `link_id`. |

### 2.10 Branding and fallback pages

| Item | Decision |
|---|---|
| Brand assets | Available at `https://www.shamrockrovers.ie/brand-material/` |
| Unknown links | Redirect to `rov.rs/tickets` |
| Expired links | Redirect to `rov.rs/tickets` |
| Paused links | Redirect to `rov.rs/tickets` |
| Offsite ticket preview copy | Approved draft copy (see section 7) |
| Quick buttons on fallback | No |
| Visual style | Inspired by `shamrockrovers.ie`, not a direct match |

### 2.11 Technical build

| Item | Decision |
|---|---|
| Architecture | Single Cloudflare Worker handles both `rov.rs` (public) and `admin.rov.rs` (API) |
| Admin UI | React SPA with Vite, deployed on Cloudflare Pages |
| Source code | GitHub |
| Deployment | Automatic deploy to Cloudflare on push to main |
| Maintainer | Bill |
| Runtime | Cloudflare Workers |
| Database | Cloudflare D1 |
| Async processing | Cloudflare Queues for click events and CSV import |
| Admin hostname | `admin.rov.rs` |
| Admin protection | Cloudflare Access |
| Health check | Yes |
| Backups/export | Yes |
| Monitoring | Cloudflare analytics + custom health check endpoint |

### 2.12 Launch scope

| Item | Decision |
|---|---|
| Target launch | This month |
| Launch link count | Flexible |
| Day-one admin access | Bill + at least 1 backup admin |
| v1 success criteria | All selected v1 items below |
| Out of scope | All listed advanced items below |

---

## 3. Product goals

The shortener should give Shamrock Rovers a controlled branded alternative to generic short-link tools.

The system should help the club:

- Share cleaner links on social posts.
- Create short, readable ticket links.
- Generate QR codes for posters and social graphics.
- Track campaign performance.
- Report clicks for sponsors.
- Route old, expired, paused, or unknown links safely to tickets.
- Let authenticated marketing users create links without needing technical help.

---

## 4. Primary user flows

### 4.1 Create a standard short link

1. User logs into `admin.rov.rs`.
2. User chooses "Create link".
3. User enters:
   - Destination URL
   - Slug
   - Title
   - Campaign
   - Channel
   - Owner
   - Optional expiry date
   - Optional notes
4. System validates the URL and slug.
5. System creates the link.
6. System shows:
   - Short URL
   - Copy button
   - QR download options
   - Optional social variants

### 4.2 Create a quick social link (Quick Create)

1. User pastes a destination URL.
2. System creates an auto-generated slug.
3. System validates URL and creates link immediately.
4. System shows short URL with copy button.
5. User can optionally add campaign, channel, and other metadata after creation.

Only the destination URL is required. All other fields are optional.

### 4.3 Matchday quick create

1. User selects "Match link" from dashboard.
2. User enters opponent name and destination URL.
3. System pre-fills campaign from opponent name.
4. System creates link with rolling slug (e.g., `bohs`).
5. User can add home/away, competition, match date, expiry in a second step if needed.

### 4.4 Create social variants

For a base campaign such as `bohs`, the system can generate platform-specific links:

```text
rov.rs/bohs-ig
rov.rs/bohs-fb
rov.rs/bohs-x
rov.rs/bohs-tt
rov.rs/bohs-li
```

Each points to the same destination but uses different UTM values.

Social variants are grouped under the base link in the admin UI. Bulk operations (update destination, pause, expire) apply to all variants at once.

### 4.5 Create a match link

The admin form includes a match-link mode with fields:

- Opponent
- Home/away
- Competition
- Match date
- Ticket URL
- Campaign
- Expiry date
- Notes

#### Rolling opponent slug

```text
rov.rs/bohs
rov.rs/pats
rov.rs/dundalk
```

Meaning: the current or next relevant ticket/action link for that opponent.

When two matches against the same opponent are upcoming (e.g., home and away), use fixture-specific slugs for at least one of them.

#### Fixture-specific slug

```text
rov.rs/bohs-h1
rov.rs/bohs-h2
rov.rs/bohs-a1
rov.rs/bohs-a2
```

#### Match link status

When a match is postponed, the link owner updates the slug destination. When a match passes, the link redirects to `rov.rs/tickets` (via expiry or manual update).

---

## 5. URL and slug rules

### 5.1 Public URL format

```text
https://rov.rs/{slug}
```

### 5.2 Admin URL format

```text
https://admin.rov.rs
```

### 5.3 Slug rules

| Rule | Recommendation |
|---|---|
| Case | Force lowercase |
| Spaces | Convert to hyphens |
| Characters | Letters, numbers, hyphens only |
| Minimum length | 2 characters |
| Maximum length | 50 characters |
| Reuse | Allowed after soft delete |
| Random slugs | Supported for quick links (6-character alphanumeric) |
| Content filter | Block offensive/obscene terms via a blocklist maintained in settings |

### 5.4 Reserved paths

```text
/admin
/api
/health
/login
/logout
/stats
/export
/robots.txt
/favicon.ico
/.well-known
```

---

## 6. Redirect rules

### 6.1 Default redirect behaviour

| Case | Behaviour |
|---|---|
| Active link | Redirect to destination URL |
| Unknown slug | Redirect to `rov.rs/tickets` |
| Expired slug | Redirect to `rov.rs/tickets` |
| Paused slug | Redirect to `rov.rs/tickets` |
| Sold-out match | Keep pointing to ticket page |
| Passed match link | Redirect to `rov.rs/tickets` |

### 6.2 Redirect status code

Use `302` by default.

Use `301` only for stable evergreen links where the destination is unlikely to change.

### 6.3 Redirect cache

The Worker caches active link lookups in-memory (per-Worker instance) with a 60-second TTL. This provides a fallback if D1 is temporarily unavailable. Cache is invalidated on link update via admin API.

---

## 7. Offsite ticket preview

For opponent club ticket links, show a preview/interstitial page before redirecting.

Copy:

```text
You're leaving Shamrock Rovers

This ticket link will take you to an external site:
{domain}

Continue →
```

Behaviour:
- No auto-redirect. User must click "Continue".
- The "Continue" click is tracked as a separate event (`offsite_continue`).
- Mobile-optimised layout.
- Only applies to links flagged as `is_offsite_ticket = true`.

Normal offsite links to social platforms, sponsors, or forms redirect directly.

---

## 8. Destination safety model

A strict allowlist is not used.

Use a soft safety model:

- Allow authenticated users to create external links.
- Show a warning for unusual external domains (not in known club domains or common platforms).
- Mark known club domains as verified.
- Store the destination domain for reporting.
- Block unsafe protocols.
- Block private/internal IP destinations.

### 8.1 URL validation pipeline

All destination URLs pass through this pipeline before storage:

1. **Protocol check**: Only `https://` and `http://` allowed. Block `javascript:`, `data:`, `file:`, `ftp:`.
2. **Decode and normalise**: Decode percent-encoding, normalise Unicode to prevent bypasses.
3. **Private IP check**: Block `localhost`, `127.x.x.x`, `10.x.x.x`, `172.16-31.x.x`, `192.168.x.x`, `0.0.0.0`, `[::1]`, link-local, and internal-looking hostnames.
4. **Format check**: Reject malformed or empty URLs.
5. **DNS resolution**: Verify the domain resolves to a public IP.
6. **Homograph check**: Flag IDN domains that could be homograph attacks.
7. **Shortener loop check**: Block `rov.rs` and other known URL shorteners as destinations.

### 8.2 Known club domains

```text
shamrockrovers.ie
www.shamrockrovers.ie
shop.shamrockrovers.ie
memberswear.shamrockrovers.ie
```

### 8.3 Common allowed destination categories

- Shamrock Rovers site
- Shop / Memberswear
- Future Ticketing via embedded club pages
- Opponent club ticket sites
- Instagram, Facebook, X/Twitter, TikTok, LinkedIn
- Google Forms
- Sponsor sites

---

## 9. Analytics and tracking

### 9.1 Metrics required

- Total clicks
- Clicks by link
- Clicks by day
- Clicks by channel
- QR scans
- Social post clicks
- Sponsor clicks
- Ticket campaign clicks

### 9.2 Channel field

Suggested options:

```text
Tickets
Instagram
Facebook
X/Twitter
TikTok
LinkedIn
QR code
Email
Sponsor
Matchday
Other
```

### 9.3 UTM tagging

Auto-add UTM tags based on campaign and channel.

Example Instagram link:

```text
rov.rs/bohs-ig
→ https://www.shamrockrovers.ie/tickets/?utm_source=instagram&utm_medium=social&utm_campaign=bohs
```

### 9.4 Click event processing

Click events are not written to D1 synchronously during the redirect. Instead:

1. Worker queues the click event to Cloudflare Queues.
2. A queue consumer batches events and writes to D1.
3. This keeps redirect latency low and handles traffic spikes.

### 9.5 Click event retention

- Click events are retained for **180 days** in D1.
- After 180 days, events are archived to R2 (JSON format) and deleted from D1.
- Archive is available for download and re-import if needed.
- Sponsor reports can span the full retention period.

### 9.6 GA4

GA4 runs on `shamrockrovers.ie`. v1 focuses on reliable UTM tagging so GA4 can attribute traffic after users land on the site.

Direct GA4 event push from Cloudflare is out of scope for v1.

### 9.7 Sponsor reports

Sponsor reports include:

- Sponsor name
- Campaign
- Link list
- Clicks by link
- Clicks by day
- Channel breakdown
- QR scans if applicable
- CSV export

---

## 10. QR code generation

### 10.1 QR generation method

QR codes are generated **client-side** in the browser using `qrcode.js`.

- PNG: Canvas-based generation, downloaded via data URL.
- PDF: Generated client-side via `jspdf`.

No server-side QR processing. No external QR API dependency.

### 10.2 QR formats

- PNG (multiple size presets: print 300dpi, social 150dpi, screen 72dpi)
- PDF (single QR per page, with link title printed below)

### 10.3 QR style

Plain black/white for v1.

### 10.4 QR expiry warning

If a user generates a QR code for a link with an expiry date, show:

```text
This QR code uses a link with an expiry date ({date}).
After expiry, users scanning this QR code will be redirected to the main tickets page.
If this QR code will be printed, consider removing the expiry date.

[Generate anyway] [Remove expiry date]
```

---

## 11. Admin dashboard

### 11.1 Tech stack

- **Framework**: React with Vite
- **Hosting**: Cloudflare Pages
- **UI library**: Tailwind CSS + shadcn/ui components
- **Deployment**: Auto-deploy on push to main (separate from Worker deploy)

### 11.2 Required pages

| Page | Purpose |
|---|---|
| Dashboard | Summary stats, recent links, top links, alerts |
| Links | Search, filter, edit, delete, export. Social variants grouped under base link. |
| Create link | Full form-based link creation |
| Quick create | URL + auto-slug → instant link |
| Match link | Fixture-specific creation flow |
| Sponsor report | Sponsor-level reporting |
| QR tools | Generate and download QR codes |
| Import/export | CSV upload/download |
| Settings | Defaults, slug blocklist, known domains |

### 11.3 Create-link fields

```text
Slug
Destination URL
Title
Campaign
Channel
Expiry date
Match/opponent
Sponsor
Owner
Notes
```

### 11.4 Batch operations

From the links list, users can select multiple links and:

- Bulk update destination URL
- Bulk pause links
- Bulk expire links
- Bulk generate QR codes (ZIP download)

This is especially useful for post-matchday cleanup and updating ticket URLs.

### 11.5 Search and filters

- **Search**: Full-text across slug, title, notes, campaign. Ordered by relevance.
- **Filters**: Status, channel, campaign, owner, sponsor, match/opponent, created date, expiry date, offsite destination, QR links, variant links only, base links only.

### 11.6 Dashboard flags

- Expiring soon (within 7 days)
- Already expired
- Offsite destination
- No clicks in 90 days
- Destination changed recently (within 7 days)
- QR link with expiry date

### 11.7 Mobile responsiveness

The admin UI is responsive and usable on mobile. Key mobile-optimised workflows:

- Quick create link
- Copy short link
- Update destination URL
- View click counts

---

## 12. Data model

### 12.1 Links table

```sql
CREATE TABLE links (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  destination_url TEXT NOT NULL,
  destination_domain TEXT,
  title TEXT,
  campaign TEXT,
  channel TEXT,
  owner TEXT,
  sponsor TEXT,
  opponent TEXT,
  competition TEXT,
  match_date TEXT,
  home_away TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  redirect_code INTEGER NOT NULL DEFAULT 302,
  is_qr BOOLEAN NOT NULL DEFAULT 0,
  is_offsite_ticket BOOLEAN NOT NULL DEFAULT 0,
  show_offsite_preview BOOLEAN NOT NULL DEFAULT 0,
  variant_of TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_by TEXT,
  updated_at TEXT,
  expires_at TEXT,
  deleted_at TEXT,
  notes TEXT
);

-- Slug uniqueness for active (non-deleted) links only
CREATE UNIQUE INDEX idx_links_slug_active ON links(slug) WHERE deleted_at IS NULL;

-- Query indexes
CREATE INDEX idx_links_status ON links(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_links_campaign ON links(campaign) WHERE campaign IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_links_expires_at ON links(expires_at) WHERE expires_at IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_links_channel ON links(channel) WHERE channel IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_links_variant_of ON links(variant_of) WHERE variant_of IS NOT NULL;
```

### 12.2 Click events table

```sql
CREATE TABLE click_events (
  id TEXT PRIMARY KEY,
  link_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  clicked_at TEXT NOT NULL,
  country TEXT,
  referrer TEXT,
  user_agent TEXT,
  device_type TEXT,
  is_bot BOOLEAN DEFAULT 0,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  event_type TEXT DEFAULT 'click'
);

CREATE INDEX idx_click_events_link_id ON click_events(link_id);
CREATE INDEX idx_click_events_clicked_at ON click_events(clicked_at);
CREATE INDEX idx_click_events_slug ON click_events(slug);
CREATE INDEX idx_click_events_utm ON click_events(utm_source, utm_medium, utm_campaign) WHERE utm_source IS NOT NULL;
```

### 12.3 ID generation

Use nanoid for all IDs. 12-character alphanumeric, URL-safe.

### 12.4 Soft delete

Links are never hard-deleted. Setting `deleted_at` to a timestamp marks the link as deleted. The slug becomes available for reuse once `deleted_at` is set. Click events always reference the original `link_id`, preserving analytics history across slug reuse boundaries.

### 12.5 No full audit table in v1

Keep only:

```text
created_by / created_at
updated_by / updated_at
deleted_at
```

---

## 13. Cloudflare architecture

### 13.1 Architecture diagram

```text
Public flow:
  User → https://rov.rs/{slug}
    → Cloudflare Worker (single worker)
    → D1 lookup (with in-memory cache, 60s TTL)
    → Redirect or offsite preview page
    → Click event queued to Cloudflare Queues

Admin flow:
  User → https://admin.rov.rs
    → Cloudflare Pages (React SPA)
    → API calls to Worker (admin.rov.rs/api/*)
    → Cloudflare Access protects all /api/* routes on admin.rov.rs
    → D1 read/write

Queue consumer:
  Cloudflare Queue
    → Queue Worker
    → Batch write click events to D1
```

### 13.2 Components

| Component | Purpose |
|---|---|
| Cloudflare DNS | Domain hosting |
| Single Cloudflare Worker | Public redirect logic + admin API |
| Cloudflare Pages | Admin SPA hosting |
| Cloudflare D1 | Link database |
| Cloudflare Queues | Async click event processing and CSV import |
| Cloudflare Access | Admin authentication |
| Cloudflare R2 | Click event archive (after 180 days) |
| GitHub | Source code |
| GitHub Actions | CI/CD |
| Wrangler | Cloudflare deployment |

### 13.3 Authentication flow (admin)

1. User visits `admin.rov.rs`.
2. Cloudflare Access intercepts — user authenticates (email OTP or SSO).
3. Access sets a JWT cookie on the request.
4. SPA reads user identity from Cloudflare Access headers (`Cf-Access-User`).
5. All API calls include the Cloudflare Access cookie — the Worker validates it on every request.
6. No separate login/password system. Cloudflare Access is the sole auth provider.

---

## 14. Deployment

### 14.1 GitHub workflow

```text
Push to main
  → GitHub Actions
  → Run tests/lint
  → Run D1 migrations (versioned, numbered SQL files)
  → Wrangler deploy (Worker)
  → Pages deploy (admin SPA) — auto on push if linked
```

### 14.2 D1 migration strategy

- Migrations are numbered SQL files: `0001_initial_schema.sql`, `0002_add_variant_of.sql`, etc.
- Migrations are applied via Wrangler in CI/CD before Worker deploy.
- Migrations must be forward-only (no rollback scripts).
- Each migration runs in a transaction. If it fails, the deploy stops.
- For non-trivial migrations (adding columns), write the migration to be additive only — never remove or rename columns in the same deploy.

### 14.3 Environments

| Environment | Hostname | Purpose |
|---|---|---|
| Production | `rov.rs` | Public links |
| Admin | `admin.rov.rs` | Admin dashboard |
| Preview/staging | Optional — `staging.rov.rs` | Test deploys before production |

### 14.4 Rollback

- Worker: redeploy previous version via Wrangler. Keep last 3 deploy SHAs documented.
- D1: no rollback. Migrations are forward-only. Fix-forward with a new migration.
- Pages: auto-rollback available in Cloudflare Pages on build failure.

---

## 15. API specification

### 15.1 Public routes

```http
GET /{slug}      → redirect or offsite preview
GET /health      → { "status": "ok", "db": "ok" }
```

### 15.2 Admin routes

All admin routes are on `admin.rov.rs/api/*` and protected by Cloudflare Access.

```http
GET    /api/links?page=1&limit=50&status=active&channel=instagram&campaign=bohs&search=bohs
POST   /api/links
GET    /api/links/{id}
PATCH  /api/links/{id}
DELETE /api/links/{id}                  → soft delete
POST   /api/links/{id}/restore          → un-delete
GET    /api/links/{id}/stats?from=2026-01-01&to=2026-01-31
GET    /api/links/{id}/qr.png?size=print
GET    /api/links/{id}/qr.pdf
POST   /api/links/{id}/variants         → generate social variants
PATCH  /api/links/{id}/variants         → bulk update all variant destinations
POST   /api/links/batch                 → batch operations { action: "pause"|"expire"|"update_destination", link_ids: [...], destination_url: "..." }
POST   /api/import/csv                  → async, returns { job_id }
GET    /api/import/csv/{job_id}/status
GET    /api/export/csv?status=active&campaign=bohs
GET    /api/reports/sponsors?sponsor=...
GET    /api/stats/summary               → dashboard totals
```

### 15.3 Pagination format

```json
{
  "data": [...],
  "page": 1,
  "limit": 50,
  "total": 237,
  "has_more": true
}
```

### 15.4 Error format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Slug already exists",
    "details": { "field": "slug", "value": "bohs" }
  }
}
```

### 15.5 Rate limiting

- Admin API: 100 requests/minute per authenticated user.
- Public redirect: no rate limit (handled by Cloudflare edge).
- CSV import: 1 concurrent import per user.

### 15.6 CORS

The admin SPA on `admin.rov.rs` calls the API on `admin.rov.rs/api/*`. Same-origin — no CORS configuration needed.

---

## 16. Monitoring and failure handling

### 16.1 Health check

```http
GET /health → { "status": "ok", "db": "ok", "queue": "ok" }
```

Returns 503 if D1 or Queue is unreachable.

### 16.2 Monitoring

- Cloudflare Workers analytics (built-in): request count, error rate, latency.
- Custom dashboard widget: real-time click rate on matchdays.
- Alert on: error rate > 5%, D1 latency > 500ms, queue backlog > 1000 events.

### 16.3 Failure modes

| Failure | Behaviour |
|---|---|
| D1 unavailable | Serve redirect from in-memory cache (60s TTL). If not cached, redirect to `rov.rs/tickets`. Queue click event for later write. |
| Queue unavailable | Write click event directly to D1 as fallback (slower but no data loss). |
| Worker error | Cloudflare serves error page. Links stop working. |
| Cloudflare Access down | Admin dashboard inaccessible. Public links unaffected. |
| GitHub Actions down | Emergency deploy via `wrangler deploy` from local machine. |

---

## 17. GDPR and data handling

### 17.1 Data collected per click

- Slug and link_id (internal reference)
- Timestamp
- Country (derived from Cloudflare CF-IPCountry header, no IP stored)
- Referrer
- User agent (parsed to device_type, not stored raw)
- UTM parameters

### 17.2 Data NOT collected

- IP addresses
- Raw user agent strings (only parsed device_type stored)
- Cookies (no cookie banner needed)

### 17.3 Retention

- Click events: 180 days in D1, then archived to R2.
- Links: retained indefinitely (soft delete).
- Admin user data: managed by Cloudflare Access, not stored in D1.

### 17.4 Data subject rights

- Data export: available via CSV export.
- Data deletion: not applicable (no PII collected from public users).
- Admin users: managed through Cloudflare Access.

---

## 18. v1 scope

v1 includes:

- Create/edit/delete links (soft delete)
- Two roles: Admin and Editor
- Reliable redirects with in-memory cache
- Quick create mode (URL → link in one step)
- Matchday quick create
- Auto social variants with batch update
- QR code generation (client-side, PNG + PDF)
- CSV import (async via Queues) and export
- Basic analytics dashboard
- Sponsor reports
- GA4 UTM tagging
- Cloudflare Access login
- GitHub deploy pipeline
- Admin dashboard on separate hostname (Cloudflare Pages)
- Health check URL
- Backups/export
- Batch operations (bulk pause/expire/update)
- Mobile-responsive admin
- URL validation pipeline
- Rate limiting on admin API
- Click event processing via Queues
- 180-day click event retention

---

## 19. Explicitly out of scope for v1

- Full role-based permissions (more than Admin/Editor)
- Approval workflows
- Branded QR codes
- Public stats pages
- A/B testing
- External API access
- Advanced GA4 event push
- Complex sponsor dashboards
- Full edit audit history
- Conversion tracking (clicks → ticket sales)
- Geographic analytics beyond country-level
- Comparison views between campaigns

---

## 20. Acceptance criteria

### 20.1 Redirects

- Active links redirect correctly.
- Unknown links redirect to `rov.rs/tickets`.
- Expired links redirect to `rov.rs/tickets`.
- Paused links redirect to `rov.rs/tickets`.
- Offsite ticket links show a preview page before redirect.
- Redirects work from `https://rov.rs/{slug}`.
- Previously cached links serve correctly after destination update (within 60s).

### 20.2 Admin

- Admin dashboard is available at `admin.rov.rs`.
- Cloudflare Access protects admin routes.
- Authenticated users can create links.
- Authenticated users can edit destinations.
- Authenticated users can soft-delete links.
- Deleted slugs can be reused.
- Users can search and filter links.
- Users can copy a short link after creation.
- Batch operations work on selected links.

### 20.3 Quick create and matchday

- Quick create requires only a destination URL.
- Auto-generated slugs are 6 characters.
- Matchday mode pre-fills opponent-based defaults.

### 20.4 Social variants

- User can generate social variants from a base link.
- Variants use platform-specific UTM tags.
- Variants can be copied individually.
- Bulk update changes destination for all variants at once.

### 20.5 QR

- User can generate PNG QR codes (multiple sizes).
- User can generate PDF QR codes.
- QR links can have expiry dates.
- The UI warns when a QR link has an expiry date, with clear action buttons.

### 20.6 Analytics

- Clicks are tracked per link.
- Dashboard shows total clicks.
- Dashboard shows clicks by day.
- Dashboard shows clicks by channel.
- Sponsor reports can be exported.
- CSV export works.
- UTM tags reach GA4 on destination pages.
- Click events process via Queues (not synchronous).

### 20.7 Operations

- Code lives in GitHub.
- Push to main deploys to Cloudflare.
- Health check route works.
- Database export/backup is available.
- Click events are archived after 180 days.
- Migrations are versioned and forward-only.

---

## 21. Cost estimate

| Component | Monthly cost (moderate use) |
|---|---|
| Workers | ~$5 (paid plan, 10M requests included) |
| D1 | ~$5 (25M reads, 50K writes included) |
| Pages | Free |
| Queues | Free (< 1M operations) |
| R2 | ~$0.10 (archival storage) |
| Access | Free (up to 50 users) |
| **Total** | **~$10/month** |

---

## 22. Resolved open questions

| # | Question | Decision |
|---|---|---|
| 1 | Admin hostname | `admin.rov.rs` |
| 2 | Main tickets URL for `rov.rs/tickets` | To be confirmed — likely `https://www.shamrockrovers.ie/tickets/` or Future Ticketing embed |
| 3 | Brand assets | Use assets from `shamrockrovers.ie/brand-material/` |
| 4 | Cloudflare Access identity provider | Email OTP (simplest; can add SSO later) |
| 5 | Marketing user management | Manually in Cloudflare Access by Bill |
| 6 | QR PDF format | Single QR code per page with link title below |
| 7 | Sponsor report format | CSV export from admin dashboard |
| 8 | CSV import template | Columns matching create-link fields: slug, destination_url, title, campaign, channel, owner, sponsor, opponent, competition, match_date, home_away, expires_at, notes |
| 9 | Admin UI tech stack | React + Vite on Cloudflare Pages, Tailwind + shadcn/ui |
| 10 | Staging requirement | Optional — can be added later if needed |

---

## 23. Remaining open questions

1. Confirm exact main tickets URL for `rov.rs/tickets`.
2. Confirm brand colour palette to use for admin dashboard visual style.
3. Confirm whether match-day opponents should auto-suggest from a predefined list or be free-text.
4. Confirm timezone for all timestamps — recommendation is UTC everywhere, displayed in IST (Irish Standard Time) in the admin UI.
