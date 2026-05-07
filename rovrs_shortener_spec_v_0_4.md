# rov.rs Link Shortener Spec v0.4

## 1. Summary

**rov.rs** is the official Shamrock Rovers branded short-link service for tickets, social posts, QR codes, campaign links, sponsor links, and club communications.

The service runs on Cloudflare. The public shortener uses `rov.rs`. The admin dashboard uses `admin.rov.rs`, protected by Cloudflare Access.

### Architecture overview

- **Public redirect Worker** bound to `rov.rs` — handles slug lookups, redirects, click event queuing.
- **Admin Pages project** on `admin.rov.rs` — serves React SPA. Pages Functions (which are Workers) handle all `/api/*` routes.
- Both the redirect Worker and admin Pages Functions bind to the same D1 database.
- Click events are processed asynchronously via Cloudflare Queues.

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
| Authentication | Cloudflare Access (email OTP) |
| Roles | Two roles: **Admin** (full access + user management) and **Editor** (create/edit/delete links). Roles stored in D1 `users` table, synced with Cloudflare Access identity. |
| Publishing | Any authenticated user can create live links |
| Multiple admins | At least 2 users must have Admin role |

### 2.3 Link types

| Item | Decision |
|---|---|
| Readable slugs | Yes |
| Auto-generated slugs | Yes (6-character alphanumeric) |
| Evergreen links | `tickets`, `shop`, `fixtures`, `members`, `academy`, `women` |
| Match slugs | Opponent-based rolling links preferred |
| Fixture-specific slugs | Supported for cases that need fixed attribution |
| Deleted slug reuse | Allowed after soft delete (slug is suffixed on deletion) |

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
| `rov.rs/tickets` | Always points to main tickets page. Marked as protected — cannot be soft-deleted without explicit Admin confirmation. |
| Passed match links | Redirect to `rov.rs/tickets` |
| Sold-out matches | Keep pointing to ticket page (update destination if needed) |
| Fixture expiry dates | Supported, but no default expiry across all links |
| Match-link mode | Yes |
| Opponent club ticket links | Show offsite preview page |

### 2.6 Analytics and tracking

| Item | Decision |
|---|---|
| Primary analytics | Click events stored in D1 (first-party data) |
| Metrics | Total clicks, per-link clicks, daily clicks, channel clicks, QR scans, social clicks, sponsor clicks, ticket campaign clicks |
| UTM tagging | Yes — auto-appended for destinations on `shamrockrovers.ie` |
| GA4 | Used on `shamrockrovers.ie`; v1 focuses on UTM tagging for GA4 attribution |
| CSV export | Yes |
| Sponsor reports | Yes |

### 2.7 QR codes

| Item | Decision |
|---|---|
| QR generation | Client-side in the browser (qrcode.js for PNG, pdf-lib for PDF) |
| QR style | Plain black/white |
| QR formats | PNG and PDF |
| QR sizes | Print (1024px), Social (512px), Screen (256px) |
| Permanent by default | No |
| Expiry warning | Yes, with "Generate anyway" and "Remove expiry" actions |

### 2.8 Admin experience

| Item | Decision |
|---|---|
| Admin UI | React SPA with Vite, served by Cloudflare Pages |
| Create-link fields | Slug, destination URL, title, campaign, channel, expiry date, match/opponent, sponsor, notes |
| Quick create mode | Paste URL → auto-slug → instant link. Optional fields filled in after. |
| Matchday mode | Streamlined form with opponent + destination |
| CSV import | Yes (async, with row-level error reporting) |
| CSV export | Yes |
| Copy button | Yes |
| Auto social variants | Yes, with batch update for all variants |
| Edit destination | Yes |
| Visible edit history | No |
| Search/filter | Full-text across slug, title, notes, campaign |
| Batch operations | Bulk pause, bulk expire, bulk update destination |
| Mobile | Responsive design, optimised for matchday phone use |

### 2.9 Governance

| Item | Decision |
|---|---|
| Owner field | Yes |
| Default expiry | No |
| Expired link behaviour | Redirect to `rov.rs/tickets` (or `shamrockrovers.ie/first-team-tickets` if tickets link itself is missing) |
| Review process | No review; authenticated users can publish directly |
| Audit log | No full audit log |
| Basic update metadata | `last_updated_by`, `last_updated_at` |
| Risk/stale flags | Yes |
| Soft delete | Links are soft-deleted. Slug is suffixed with `__del_{timestamp}` to free the original slug for reuse. Old click events retain original `link_id`. |
| Protected links | Evergreen links (`tickets`, `shop`, etc.) are marked `is_protected = true`. Cannot be deleted without Admin confirmation. |

### 2.10 Branding and fallback pages

| Item | Decision |
|---|---|
| Brand assets | Available at `https://www.shamrockrovers.ie/brand-material/` |
| Unknown links | Redirect to `shamrockrovers.ie/first-team-tickets` (absolute fallback, never to another short link) |
| Expired links | Redirect to `shamrockrovers.ie/first-team-tickets` |
| Paused links | Redirect to `shamrockrovers.ie/first-team-tickets` |
| Offsite ticket preview | Show interstitial page before redirect (see section 7) |
| Visual style | Inspired by `shamrockrovers.ie`, not a direct match |

### 2.11 Technical build

| Item | Decision |
|---|---|
| Public redirect | Cloudflare Worker bound to `rov.rs` |
| Admin SPA | React + Vite on Cloudflare Pages at `admin.rov.rs` |
| Admin API | Pages Functions at `admin.rov.rs/api/*` |
| Database | Cloudflare D1 (shared binding) |
| Async processing | Cloudflare Queues for click events and CSV import |
| Auth | Cloudflare Access |
| Source code | GitHub |
| Deployment | GitHub Actions → Wrangler (Worker + Pages) |
| Monitoring | Cloudflare analytics + health check endpoint |
| Archival | Scheduled Worker (cron) archives old click events to R2 |

### 2.12 Launch scope

| Item | Decision |
|---|---|
| Target launch | This month |
| Launch link count | Flexible |
| Day-one admin access | Bill + at least 1 backup admin |
| v1 success criteria | All selected v1 items (section 18) |
| Out of scope | All items in section 19 |

---

## 3. Product goals

The shortener gives Shamrock Rovers a controlled branded alternative to generic short-link tools.

- Share cleaner links on social posts.
- Create short, readable ticket links.
- Generate QR codes for posters and social graphics.
- Track campaign performance.
- Report clicks for sponsors.
- Route old, expired, paused, or unknown links safely to the tickets page.
- Let authenticated marketing users create links without technical help.

---

## 4. Primary user flows

### 4.1 Create a standard short link

1. User logs into `admin.rov.rs` (Cloudflare Access).
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
4. System validates the URL and slug (section 8).
5. System creates the link.
6. System shows short URL, copy button, QR download options, and social variant option.

### 4.2 Quick create

1. User pastes a destination URL.
2. System auto-generates a 6-character slug.
3. System validates URL and creates link.
4. System shows short URL with copy button.
5. User can optionally add campaign, channel, and other metadata later.

Only the destination URL is required. All other fields are optional.

### 4.3 Matchday quick create

1. User selects "Match link" from dashboard.
2. User enters opponent name and destination URL.
3. System pre-fills campaign from opponent name.
4. System creates link with rolling slug (e.g., `bohs`).
5. User can add home/away, competition, match date, expiry in a second step.

### 4.4 Social variants

For a base campaign such as `bohs`, the system generates platform-specific links:

```text
rov.rs/bohs-ig  → destination?utm_source=instagram&utm_medium=social&utm_campaign=bohs
rov.rs/bohs-fb  → destination?utm_source=facebook&utm_medium=social&utm_campaign=bohs
rov.rs/bohs-x   → destination?utm_source=twitter&utm_medium=social&utm_campaign=bohs
rov.rs/bohs-tt  → destination?utm_source=tiktok&utm_medium=social&utm_campaign=bohs
rov.rs/bohs-li  → destination?utm_source=linkedin&utm_medium=social&utm_campaign=bohs
```

Social variants are linked to the base link via `variant_of` (the base link's ID). They are grouped in the admin UI under the base link. Bulk operations (update destination, pause, expire) apply to all variants at once.

When the base link's destination is updated, variants inherit the new destination. When a base link is paused or expired, all variants are paused/expired too (cascade). When a base link is deleted, variants are also deleted (cascade). This keeps variant groups coherent — an orphaned variant pointing to a stale destination serves no purpose.

### 4.5 Match links

Match-link mode fields:

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
rov.rs/bohs    → current/next Bohs match
rov.rs/pats    → current/next Pats match
```

When two matches against the same opponent are upcoming, use fixture-specific slugs for at least one.

#### Fixture-specific slug

```text
rov.rs/bohs-h1  → Bohs home fixture 1
rov.rs/bohs-a1  → Bohs away fixture 1
```

#### Match link lifecycle

| State | Trigger |
|---|---|
| Active | Link created |
| Expired | `expires_at` is in the past (checked at redirect time, compared in UTC) |
| Paused | Manually paused by any authenticated user |
| Passed | `match_date` + 4 hours has passed (checked at redirect time) — redirects to tickets |

When a match is postponed, the owner updates `match_date` and optionally `expires_at`.

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

| Rule | Value |
|---|---|
| Case | Force lowercase |
| Spaces | Convert to hyphens |
| Characters | Letters, numbers, hyphens only |
| Minimum length | 2 characters |
| Maximum length | 50 characters |
| Random slugs | 6-character alphanumeric (nanoid, lowercase + digits, no ambiguous chars: 0/O, 1/l) |
| Reuse | Allowed after soft delete |
| Content filter | Block offensive terms via configurable blocklist in settings |

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

Root path (`/`) redirects to `shamrockrovers.ie`. This is handled by the Worker, not Cloudflare DNS rules.

### 5.5 Protected slugs

The following slugs are marked `is_protected` and cannot be soft-deleted without Admin confirmation:

```text
tickets
shop
fixtures
members
academy
women
```

---

## 6. Redirect rules

### 6.1 Redirect behaviour

| Case | Behaviour |
|---|---|
| Active link | Redirect to destination URL |
| Unknown slug | Redirect to `shamrockrovers.ie/first-team-tickets` |
| Expired slug | Redirect to `shamrockrovers.ie/first-team-tickets` |
| Paused slug | Redirect to `shamrockrovers.ie/first-team-tickets` |
| Deleted slug | Treated as unknown (slug was suffixed on delete). Redirects to `shamrockrovers.ie/first-team-tickets`. |
| Passed match | Redirect to `shamrockrovers.ie/first-team-tickets` |
| Sold-out match | Keep pointing to ticket page |
| Offsite ticket | Show interstitial preview page |
| Root path `/` | Redirect to `shamrockrovers.ie` |

**Fallback is always `shamrockrovers.ie/first-team-tickets`** (absolute URL), never another short link. This prevents redirect loops.

### 6.2 Redirect status code

- `302` by default.
- `301` only for stable evergreen links (`tickets`, `shop`, etc.).

### 6.3 Redirect performance

Slug lookups are served directly from D1 (primary key lookup, typically <10ms). No caching layer — D1 is fast enough for this use case and avoids cache invalidation complexity.

If D1 is unreachable, the Worker returns a `302` redirect to `shamrockrovers.ie/first-team-tickets` as a safe fallback. The click event is dropped (acceptable data loss during outage).

---

## 7. Offsite ticket preview

For links flagged `is_offsite_ticket = true`, show an interstitial page before redirecting.

Copy:

```text
You're leaving Shamrock Rovers

This ticket link will take you to an external site:
{domain}

Continue →
```

Behaviour:
- No auto-redirect. User must click "Continue".
- The "Continue" click is tracked with `event_type = 'offsite_continue'` on the same link.
- Mobile-optimised layout.
- Only for links flagged `is_offsite_ticket = true`. All other external links redirect directly.

---

## 8. Destination safety model

Soft safety model — no strict allowlist.

### 8.1 URL validation pipeline

Every destination URL passes through these checks before storage:

1. **Protocol check**: Only `https://` and `http://` allowed.
2. **Decode and normalise**: Decode percent-encoding, normalise Unicode.
3. **Blocked protocols**: `javascript:`, `data:`, `file:`, `ftp:` — rejected.
4. **Private IP check**: Block `localhost`, `127.x`, `10.x`, `172.16-31.x`, `192.168.x`, `0.0.0.0`, `[::1]`, link-local ranges.
5. **Format check**: Reject malformed or empty URLs.
6. **DNS resolution**: Verify domain resolves to a public IP.
7. **Homograph flag**: Flag IDN domains that could be homograph attacks (warn in admin UI, don't block).
8. **Shortener loop**: Block `rov.rs` as a destination. Flag other known URL shorteners with a warning.

### 8.2 Known club domains (verified, no warning shown)

```text
shamrockrovers.ie
www.shamrockrovers.ie
shop.shamrockrovers.ie
memberswear.shamrockrovers.ie
```

### 8.3 Domain warnings

When a user creates a link to a domain that is not a known club domain and not a common platform (social media, Google, ticketing), the admin UI shows a warning: "This destination is not a recognised domain. Please verify the URL." The link is still created — the warning is informational.

---

## 9. Analytics and tracking

### 9.1 Metrics

- Total clicks
- Clicks by link
- Clicks by day
- Clicks by channel
- QR scans
- Social post clicks
- Sponsor clicks
- Ticket campaign clicks

### 9.2 Channel field

```text
Tickets, Instagram, Facebook, X/Twitter, TikTok, LinkedIn, QR code, Email, Sponsor, Matchday, Other
```

### 9.3 UTM tagging

Auto-append UTM tags based on campaign and channel. Only applied to destinations on `shamrockrovers.ie` (external sites don't accept UTMs meaningfully).

### 9.4 Click event processing

1. Public Worker captures click data (slug, link_id, timestamp, country from `CF-IPCountry` header, referrer, device type, UTM params).
2. Worker enqueues click event to Cloudflare Queues.
3. Queue consumer batches events and writes to D1.

If the queue is unavailable, the Worker writes directly to D1 as a fallback (slower redirect, but no data loss).

### 9.5 Click event retention

- Click events retained for **180 days** in D1.
- A scheduled Worker (cron, daily) archives events older than 180 days to R2 (JSON format) and deletes them from D1.
- Archives are available for manual download from R2.
- Sponsor reports within the 180-day window are fully supported. For reports spanning beyond 180 days, the admin can download the R2 archive and merge manually.

### 9.6 Historical destination tracking

When a link's destination is changed, the previous `destination_url` is stored in a `destination_history` table with the timestamp of the change. Sponsor reports show the destination at the time of each click, not the current destination.

### 9.7 GA4

GA4 runs on `shamrockrovers.ie`. v1 focuses on UTM tagging for GA4 attribution. Direct GA4 event push from Cloudflare is out of scope.

### 9.8 Sponsor reports

- Sponsor name, campaign, link list
- Clicks by link, clicks by day, channel breakdown, QR scans
- Shows destination at time of click (from destination_history)
- CSV export

---

## 10. QR code generation

### 10.1 Method

Client-side in the browser:
- **PNG**: `qrcode.js` library, canvas-based generation
- **PDF**: `pdf-lib` library (lightweight, mobile-compatible)

### 10.2 QR formats

- PNG: 1024px (print), 512px (social), 256px (screen)
- PDF: Single QR per page with link title below the code

### 10.3 Expiry warning

```text
This QR code uses a link with an expiry date ({date}).
After expiry, users scanning this code will be redirected to the tickets page.
If this code will be printed, consider removing the expiry date.

[Generate anyway] [Remove expiry date]
```

---

## 11. Admin dashboard

### 11.1 Tech stack

- **Framework**: React with Vite
- **Hosting**: Cloudflare Pages at `admin.rov.rs`
- **UI**: Tailwind CSS + shadcn/ui
- **API**: Pages Functions at `admin.rov.rs/api/*`

### 11.2 Pages

| Page | Purpose |
|---|---|
| Dashboard | Summary stats, recent links, top links, alerts |
| Links | Search, filter, edit, delete, export. Variants grouped under base link. |
| Create link | Full form |
| Quick create | URL → link in one step |
| Match link | Fixture-specific flow |
| Sponsor report | Sponsor-level reporting |
| QR tools | Generate and download QR codes |
| Import/export | CSV upload/download |
| Settings | Defaults, slug blocklist, known domains, protected slugs |

### 11.3 Create-link fields

```text
Slug, Destination URL, Title, Campaign, Channel, Expiry date,
Match/opponent, Sponsor, Owner, Notes
```

### 11.4 Batch operations

From the links list, select multiple links and:
- Bulk update destination URL
- Bulk pause links
- Bulk expire links
- Bulk generate QR codes (ZIP download)

### 11.5 Search and filters

- **Search**: Full-text across slug, title, notes, campaign.
- **Filters**: Status, channel, campaign, owner, sponsor, opponent, created date, expiry date, offsite, QR, variant/base links only.

### 11.6 Dashboard flags

- Expiring soon (7 days)
- Already expired
- Offsite destination
- No clicks in 90 days
- Destination changed recently (7 days)
- QR link with expiry date

### 11.7 Mobile responsiveness

Responsive UI, mobile-optimised for:
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
  slug TEXT UNIQUE NOT NULL,
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
  is_protected BOOLEAN NOT NULL DEFAULT 0,
  variant_of TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_by TEXT,
  updated_at TEXT,
  expires_at TEXT,
  deleted_at TEXT,
  notes TEXT
);

CREATE INDEX idx_links_status ON links(status);
CREATE INDEX idx_links_campaign ON links(campaign);
CREATE INDEX idx_links_expires_at ON links(expires_at);
CREATE INDEX idx_links_channel ON links(channel);
CREATE INDEX idx_links_variant_of ON links(variant_of);
CREATE INDEX idx_links_sponsor ON links(sponsor);
CREATE INDEX idx_links_opponent ON links(opponent);
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
  device_type TEXT,
  is_bot BOOLEAN DEFAULT 0,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  event_type TEXT NOT NULL DEFAULT 'click'
);

CREATE INDEX idx_click_events_link_id ON click_events(link_id);
CREATE INDEX idx_click_events_clicked_at ON click_events(clicked_at);
CREATE INDEX idx_click_events_slug ON click_events(slug);
```

### 12.3 Destination history table

```sql
CREATE TABLE destination_history (
  id TEXT PRIMARY KEY,
  link_id TEXT NOT NULL,
  old_destination_url TEXT NOT NULL,
  new_destination_url TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  changed_at TEXT NOT NULL
);

CREATE INDEX idx_dest_history_link_id ON destination_history(link_id);
CREATE INDEX idx_dest_history_changed_at ON destination_history(changed_at);
```

### 12.4 Users table

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor',
  display_name TEXT,
  created_at TEXT NOT NULL,
  last_login_at TEXT
);
```

Users are auto-created on first login via Cloudflare Access. Their email is captured from the Access JWT. Role defaults to `editor`; Admin can promote to `admin`.

### 12.5 ID generation

Use nanoid (12-character alphanumeric, URL-safe) for all IDs.

### 12.6 Timestamps

All timestamps stored as ISO 8601 strings in UTC (e.g., `2026-05-07T12:00:00Z`). The admin UI displays times in Irish time (IST/ GMT+1 in summer, GMT in winter).

### 12.7 Soft delete mechanism

When a link is soft-deleted:
1. `deleted_at` is set to current UTC timestamp.
2. `slug` is suffixed: `bohs` → `bohs__del_20260507t120000z`.
3. The original slug is immediately available for reuse.
4. Old click events reference the original `link_id` — analytics are preserved.
5. Protected links require Admin confirmation before deletion.

### 12.8 Slug uniqueness

The `slug` column has a `UNIQUE` constraint. Since soft-deleted slugs are suffixed, the constraint naturally allows reuse while preventing active slug collisions.

Application-level check: before creating a link, query for any existing active link with the same slug. Return a clear error if it exists.

### 12.9 Link status lifecycle

| Status | Description | Who can set |
|---|---|---|
| `active` | Default. Link redirects to destination. | Any authenticated user (on create) |
| `paused` | Manually paused. Redirects to tickets fallback. | Any authenticated user |
| `expired` | `expires_at` is past. Set automatically at redirect time. | System |
| `deleted` | Soft-deleted. `deleted_at` is set. | Any user (protected links: Admin only) |

Transitions:
- `active` → `paused`: manual
- `paused` → `active`: manual
- `active` → `expired`: automatic (at redirect time, if `expires_at < now`)
- `expired` → `active`: manual (by updating `expires_at` to future date)
- `any` → `deleted`: manual (soft delete)
- `deleted` → `active`: manual (restore via API, unsuffix slug)

### 12.10 Variant behaviour

- `variant_of` stores the base link's `id` (TEXT, references `links.id`). One level only — variants cannot have their own variants.
- When base link destination is updated, all variant `destination_url` fields are updated to the same base URL. UTM tags are NOT stored in `destination_url` — they are appended at redirect time based on the variant's channel. So a variant for Instagram stores the same `destination_url` as the base, but the redirect appends `?utm_source=instagram&utm_medium=social&utm_campaign={campaign}`.
- When base link is paused, all variants are paused.
- When base link is expired/deleted, variants are also expired/deleted (cascade).

### 12.11 Event types

`event_type` in click_events supports:
- `click` — standard redirect click
- `offsite_continue` — user clicked "Continue" on offsite preview page

---

## 13. Cloudflare architecture

### 13.1 Architecture diagram

```text
Public flow:
  User → https://rov.rs/{slug}
    → Cloudflare Worker (redirect Worker, bound to rov.rs)
    → D1 lookup (primary key, <10ms)
    → Redirect or offsite preview page
    → Click event queued to Cloudflare Queues

Admin flow:
  User → https://admin.rov.rs
    → Cloudflare Pages (React SPA)
    → Cloudflare Access intercepts → authenticates user
    → SPA calls /api/* → Pages Functions (server-side Workers)
    → Pages Functions read Cf-Access-Jwt-Assertion header → extract email → match users table
    → D1 read/write

Queue consumer:
  Cloudflare Queue
    → Queue Worker
    → Batch write click events to D1

Archival:
  Scheduled Worker (cron, daily at 03:00 UTC)
    → Query click_events older than 180 days
    → Write to R2 (JSON, partitioned by date)
    → Delete archived rows from D1
```

### 13.2 Authentication flow (admin)

1. User visits `admin.rov.rs`.
2. Cloudflare Access intercepts — user authenticates via email OTP.
3. Access sets `CF_Authorization` cookie and `Cf-Access-Jwt-Assertion` header on requests.
4. SPA calls `GET /api/me`. The Pages Function reads the JWT, extracts the email, looks up or creates the user in the `users` table, returns user info + role.
5. SPA stores user info in React context. All subsequent API calls include the Cloudflare Access cookie — Pages Functions validate it on every request.
6. No separate login/password system. Cloudflare Access is the sole auth provider.

### 13.3 Rate limiting

- Admin API: 100 requests/minute per user (identified by email from Access JWT).
- Enforced at application level in Pages Functions.
- Public redirect: no rate limit (Cloudflare edge handles abuse automatically).

### 13.4 Components

| Component | Purpose |
|---|---|
| Cloudflare Worker | Public redirect logic (bound to `rov.rs`) |
| Cloudflare Pages | Admin SPA hosting (`admin.rov.rs`) |
| Pages Functions | Admin API (`admin.rov.rs/api/*`) |
| Cloudflare D1 | Link database (shared binding) |
| Cloudflare Queues | Async click event processing + CSV import |
| Cloudflare Access | Admin authentication |
| Cloudflare R2 | Click event archive |
| Scheduled Worker | Daily archival cron |
| GitHub | Source code |
| GitHub Actions | CI/CD |
| Wrangler | Deployment |

---

## 14. Deployment

### 14.1 GitHub workflow

```text
Push to main
  → GitHub Actions
  → Run tests/lint
  → Run D1 migrations (versioned, numbered SQL files)
  → Wrangler deploy (redirect Worker)
  → Wrangler pages deploy (admin SPA)
```

### 14.2 D1 migration strategy

- Migrations are numbered SQL files: `0001_initial_schema.sql`, `0002_add_users.sql`.
- Applied via Wrangler in CI/CD before deploy.
- Forward-only. No rollback scripts. Fix-forward with new migration.
- Each migration runs in a transaction. Failure stops the deploy.
- Migrations are additive only — never remove or rename columns in the same deploy.

### 14.3 Environments

| Environment | Hostname | Purpose |
|---|---|---|
| Production | `rov.rs` | Public links |
| Admin | `admin.rov.rs` | Admin dashboard |
| Staging | `staging.rov.rs` (optional, future) | Test deploys |

### 14.4 Rollback

- Worker: redeploy previous version via `wrangler deployments rollback`.
- Pages: automatic rollback on build failure; manual rollback via Cloudflare dashboard.
- D1: no rollback. Migrations are forward-only.

### 14.5 Emergency deploy

If GitHub Actions is down, run `wrangler deploy` and `wrangler pages deploy` from a local machine with Wrangler CLI installed.

---

## 15. API specification

### 15.1 Public routes (redirect Worker)

```http
GET /{slug}      → redirect or offsite preview
GET /health      → { "status": "ok", "db": "ok", "queue": "ok" }
```

### 15.2 Admin routes (Pages Functions)

All routes on `admin.rov.rs/api/*`. Protected by Cloudflare Access.

#### Auth

```http
GET /api/me      → { "email": "...", "role": "admin"|"editor", "display_name": "..." }
```

#### Links

```http
GET    /api/links?page=1&limit=50&status=active&channel=instagram&campaign=bohs&search=bohs&sponsor=...
POST   /api/links
GET    /api/links/{id}
PATCH  /api/links/{id}
DELETE /api/links/{id}                  → soft delete (suffix slug)
POST   /api/links/{id}/restore          → un-delete (restore original slug)
```

#### Variants

```http
POST   /api/links/{id}/variants         → generate social variants
PATCH  /api/links/{id}/variants         → bulk update all variant destinations
```

#### Analytics

```http
GET    /api/links/{id}/stats?from=2026-01-01&to=2026-01-31
GET    /api/stats/summary               → dashboard totals
```

#### QR codes

QR codes are generated entirely client-side in the browser. The admin UI knows the short URL (`https://rov.rs/{slug}`) and generates PNG/PDF locally. No server endpoint is needed for QR generation.

#### Batch operations

```http
POST /api/links/batch
Body: { "action": "pause"|"expire"|"update_destination", "link_ids": ["..."], "destination_url": "..." }
```

#### Import/export

```http
POST /api/import/csv                   → async, returns { "job_id": "..." }
GET  /api/import/csv/{job_id}/status   → { "status": "processing"|"complete"|"failed", "created": 450, "skipped": 50, "errors": [...] }
GET  /api/export/csv?status=active&campaign=bohs
```

CSV import error handling:
- All imported links are created with status `active` by default.
- Valid rows are imported. Invalid rows are skipped.
- Response includes row-level errors: `{ "row": 47, "error": "Invalid URL" }`.
- Slug collisions: skip with error (don't overwrite).
- Import is not atomic — partial success is expected.
- Each imported row runs through the full URL validation pipeline (section 8.1).

#### Sponsor reports

```http
GET /api/reports/sponsors?sponsor=...&from=2026-01-01&to=2026-06-01
```

#### Admin-only

```http
GET  /api/users                        → list users
PATCH /api/users/{id}                  → update role
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

Error codes: `VALIDATION_ERROR`, `NOT_FOUND`, `FORBIDDEN`, `RATE_LIMITED`, `IMPORT_ERROR`.

### 15.5 CORS

Same-origin — SPA on `admin.rov.rs` calls API on `admin.rov.rs/api/*`. No CORS configuration needed.

---

## 16. Monitoring and failure handling

### 16.1 Health check

```http
GET /health → { "status": "ok", "db": "ok" }
```

Returns 503 if D1 is unreachable.

### 16.2 Monitoring

- Cloudflare Workers analytics (built-in): request count, error rate, latency.
- Custom alert: error rate > 5%, D1 latency > 500ms.
- Dashboard widget: real-time click rate (pulled from D1, refreshed every 60s).

### 16.3 Failure modes

| Failure | Behaviour |
|---|---|
| D1 unavailable (redirect Worker) | Redirect all requests to `shamrockrovers.ie/first-team-tickets`. Drop click events. |
| D1 unavailable (admin) | Show error in admin UI. Retry with backoff. |
| Queue unavailable | Write click events directly to D1 (synchronous fallback). |
| Cloudflare Access down | Admin dashboard inaccessible. Public links unaffected. |
| GitHub Actions down | Emergency deploy via local `wrangler deploy`. |
| Pages Functions error | Admin API returns 500. SPA shows error toast. |

---

## 17. GDPR and data handling

### 17.1 Data collected per click

- Slug, link_id, timestamp
- Country (from `CF-IPCountry` header, captured at queue time)
- Referrer, device type (parsed)
- UTM parameters

### 17.2 Data NOT collected

- IP addresses
- Raw user agent strings
- Cookies (no cookie banner needed for public users)

### 17.3 Retention

- Click events: 180 days in D1, then archived to R2.
- Links: retained indefinitely (soft delete).
- Admin user data: email + role in `users` table. Managed via Cloudflare Access.

---

## 18. v1 scope

v1 includes:

- Create/edit/delete links (soft delete with slug suffix)
- Two roles: Admin and Editor
- Quick create mode (URL → link in one step)
- Matchday quick create
- Auto social variants with batch update
- QR code generation (client-side, PNG + PDF)
- CSV import (async, row-level errors) and export
- Basic analytics dashboard
- Sponsor reports with historical destination tracking
- GA4 UTM tagging
- Cloudflare Access login with auto-user-creation
- GitHub deploy pipeline with versioned migrations
- Admin dashboard on Cloudflare Pages
- Health check endpoint
- Batch operations (bulk pause/expire/update)
- Mobile-responsive admin
- URL validation pipeline
- Rate limiting on admin API
- Click event processing via Queues
- 180-day click event retention with R2 archival
- Protected evergreen links
- Destination history tracking

---

## 19. Explicitly out of scope for v1

- More than two roles (Admin/Editor)
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
- Campaign comparison views
- Staging environment (can be added later)

---

## 20. Acceptance criteria

### 20.1 Redirects

- Active links redirect correctly.
- Unknown links redirect to `shamrockrovers.ie/first-team-tickets`.
- Expired links redirect to `shamrockrovers.ie/first-team-tickets`.
- Paused links redirect to `shamrockrovers.ie/first-team-tickets`.
- Offsite ticket links show interstitial preview.
- Redirects work from `https://rov.rs/{slug}`.
- No redirect loops (fallback is always absolute URL).

### 20.2 Admin

- Admin dashboard available at `admin.rov.rs`.
- Cloudflare Access protects admin routes.
- Users auto-created on first login.
- Editors can create/edit/delete links.
- Admins can manage user roles and delete protected links.
- Soft-deleted slugs can be reused.
- Search and filter work across slug, title, notes, campaign.
- Batch operations work on selected links.

### 20.3 Quick create and matchday

- Quick create requires only destination URL.
- Auto-generated slugs are 6 characters.
- Matchday mode pre-fills opponent-based defaults.

### 20.4 Social variants

- Variants generated from base link.
- Platform-specific UTM tags applied.
- Bulk update changes all variant destinations.
- Variants grouped under base link in UI.

### 20.5 QR

- PNG QR codes at 3 sizes.
- PDF QR codes with title.
- Expiry warning with action buttons.

### 20.6 Analytics

- Clicks tracked per link via Queues.
- Dashboard shows totals, daily, by channel.
- Sponsor reports exportable.
- CSV export works.
- Destination history preserved.

### 20.7 Operations

- Push to main deploys to Cloudflare.
- Health check route works.
- Migrations are versioned and forward-only.
- Click events archived after 180 days.
- Emergency deploy works from local machine.

---

## 21. Cost estimate

| Component | Monthly cost |
|---|---|
| Workers (paid plan) | $5 (10M requests included) |
| D1 | $5 (25M reads, 50K writes included; additional usage priced per-unit) |
| Pages | Free |
| Queues | ~$1 (< 1M operations) |
| R2 | ~$0.50 (archival storage) |
| Access | Free (< 50 users) |
| **Total** | **~$12/month** |

Costs may increase with high click volume (>100K clicks/month would increase D1 write costs).

---

## 22. Resolved open questions

| # | Question | Decision |
|---|---|---|
| 1 | Admin hostname | `admin.rov.rs` |
| 2 | Main tickets URL | To be confirmed (likely `shamrockrovers.ie/first-team-tickets` or Future Ticketing embed) |
| 3 | Brand assets | From `shamrockrovers.ie/brand-material/` |
| 4 | Cloudflare Access identity | Email OTP (simplest) |
| 5 | User management | Manually in Cloudflare Access; roles in D1 `users` table |
| 6 | QR PDF format | Single QR per page with title |
| 7 | Sponsor report format | CSV export from admin |
| 8 | CSV import columns | slug, destination_url, title, campaign, channel, owner, sponsor, opponent, competition, match_date, home_away, expires_at, notes |
| 9 | Admin UI tech stack | React + Vite + Tailwind + shadcn/ui on Cloudflare Pages |
| 10 | Staging | Optional, future |
| 11 | Redirect fallback | Absolute URL `shamrockrovers.ie/first-team-tickets` (never another short link) |
| 12 | Cache strategy | No cache — D1 is fast enough. Fallback to absolute URL on D1 failure. |
| 13 | Architecture | Redirect Worker on `rov.rs` + Pages project (with Functions) on `admin.rov.rs` |
| 14 | Soft delete mechanism | Slug suffixed with `__del_{timestamp}` on delete |
| 15 | Auth flow | `/api/me` endpoint reads Access JWT server-side, returns user info |
| 16 | Timezone | UTC in storage, Irish time in admin UI |

---

## 23. Resolved questions (round 2)

| # | Question | Decision |
|---|---|---|
| 1 | Main tickets URL | `shamrockrovers.ie/first-team-tickets` |
| 2 | Brand colour palette | From `shamrockrovers.ie/brand-material` |
| 3 | Opponent list | Free-text (no predefined dropdown) |
| 4 | Cloudflare account plan | Workers paid plan already in place |

All open questions resolved. Spec is complete.
