# rov.rs Link Shortener Spec v0.2

## 1. Summary

**rov.rs** will be the official Shamrock Rovers branded short-link service for tickets, social posts, QR codes, campaign links, sponsor links, and club communications.

The service will run mainly on Cloudflare. The public shortener will use `rov.rs`. The admin dashboard will use a separate hostname, likely `admin.rov.rs`, protected by Cloudflare Access.

The system should support readable links like:

```text
rov.rs/tickets
rov.rs/shop
rov.rs/bohs
rov.rs/women
```

It should also support auto-generated short links for quick social use.

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
| Authentication | Cloudflare Access or email login |
| Roles | No roles in v1 |
| Publishing | Any authenticated user can create live links |

### 2.3 Link types

| Item | Decision |
|---|---|
| Readable slugs | Yes |
| Auto-generated slugs | Yes |
| Evergreen links | `tickets`, `shop`, `fixtures`, `members`, `academy`, `women` |
| Match slugs | Opponent-based rolling links preferred |
| Fixture-specific slugs | Supported for cases that need fixed attribution |
| Deleted slug reuse | Allowed |

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
| Strict allowlist | Not preferred |

### 2.5 Tickets and match handling

| Item | Decision |
|---|---|
| `rov.rs/tickets` | Always points to main tickets page |
| Passed match links | Redirect to `rov.rs/tickets` |
| Sold-out matches | Keep pointing to ticket page |
| Fixture expiry dates | Supported, but no default expiry across all links |
| Match-link mode | Yes |
| Opponent club ticket links | Show offsite preview page |

### 2.6 Analytics

| Item | Decision |
|---|---|
| Metrics | Total clicks, per-link clicks, daily clicks, channel clicks, QR scans, social clicks, sponsor clicks, ticket campaign clicks |
| UTM tagging | Yes |
| UTM source/medium/campaign | Based on selected channel/campaign |
| GA4 | Already used on `shamrockrovers.ie` |
| CSV export | Yes |
| Sponsor reports | Yes |

### 2.7 QR codes

| Item | Decision |
|---|---|
| QR generation | Yes |
| QR style | Plain black/white |
| QR formats | PNG and PDF |
| QR uses | Posters and social graphics |
| Permanent by default | No |
| Expiry warning | Assumed yes for QR links with expiry dates |

### 2.8 Admin experience

| Item | Decision |
|---|---|
| Admin UI | Polished dashboard from day one |
| Create-link fields | Slug, destination URL, title, campaign, channel, expiry date, match/opponent, sponsor, notes |
| CSV import | Yes |
| CSV export | Yes |
| Copy button | Yes |
| Auto social variants | Yes |
| Edit destination | Yes |
| Visible edit history | No |
| Search/filter | Yes |

### 2.9 Governance

| Item | Decision |
|---|---|
| Owner field | Yes |
| Default expiry | No |
| Expired link behaviour | Redirect to `rov.rs/tickets` |
| Review process | No review; authenticated users can publish directly |
| Audit log | No full audit log |
| Basic update metadata | Recommended: `last_updated_by`, `last_updated_at` |
| Risk/stale flags | Yes |

### 2.10 Branding and fallback pages

| Item | Decision |
|---|---|
| Brand assets | Available at `https://www.shamrockrovers.ie/brand-material/` |
| Unknown links | Redirect to `rov.rs/tickets` |
| Expired links | Redirect to `rov.rs/tickets` |
| Paused links | Redirect to `rov.rs/tickets` |
| Offsite ticket preview copy | Approved draft copy |
| Quick buttons on fallback | No |
| Visual style | Inspired by `shamrockrovers.ie`, not a direct match |

### 2.11 Technical build

| Item | Decision |
|---|---|
| Source code | GitHub |
| Deployment | Automatic deploy to Cloudflare on push |
| Maintainer | Bill |
| Runtime | Cloudflare Workers |
| Database | Cloudflare D1 |
| Admin hostname | Separate hostname, likely `admin.rov.rs` |
| Admin protection | Cloudflare Access |
| Health check | Yes |
| Backups/export | Yes |
| Stats | Cloudflare first, GA4 if practical |

### 2.12 Launch scope

| Item | Decision |
|---|---|
| Target launch | This month |
| Launch link count | Flexible |
| Day-one admin access | Bill |
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
2. User chooses “Create link”.
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

### 4.2 Create a quick social link

1. User pastes a destination URL.
2. System creates an auto-generated slug.
3. User selects social channel.
4. System appends UTM tags.
5. System returns a short link ready to copy.

Example:

```text
rov.rs/x7k2a
```

### 4.3 Create social variants

For a base campaign such as `bohs`, the system can generate platform-specific links:

```text
rov.rs/bohs-ig
rov.rs/bohs-fb
rov.rs/bohs-x
rov.rs/bohs-tt
rov.rs/bohs-li
```

Each points to the same destination but uses different UTM values.

### 4.4 Create a match link

The admin form should include a match-link mode with fields:

- Opponent
- Home/away
- Competition
- Match date
- Ticket URL
- Campaign
- Expiry date
- Notes

The system should support two slug types:

#### Rolling opponent slug

```text
rov.rs/bohs
rov.rs/pats
rov.rs/dundalk
```

Meaning: the current or next relevant ticket/action link for that opponent.

#### Fixture-specific slug

```text
rov.rs/bohs-h1
rov.rs/bohs-h2
rov.rs/bohs-a1
rov.rs/bohs-a2
```

Meaning: a specific fixture instance.

Recommended rule:

| Scenario | Slug style |
|---|---|
| Social post for next Bohs match | `rov.rs/bohs` |
| Poster/QR for a specific fixture | `rov.rs/bohs-h1` |
| Sponsor report needs fixed attribution | `rov.rs/bohs-h1` |
| Generic ticket push | `rov.rs/tickets` |
| Cup final or European game | `rov.rs/final`, `rov.rs/europe`, `rov.rs/fai-final` |

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
| Characters | Letters, numbers, hyphens |
| Minimum length | 2 or 3 characters |
| Maximum length | 50 characters |
| Reuse | Allowed after deletion |
| Random slugs | Supported for quick links |

### 5.4 Reserved paths

The system should reserve these paths:

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

Recommended default:

```text
302 Temporary Redirect
```

This keeps the club free to change ticket, match, sponsor, or campaign destinations later.

---

## 7. Offsite ticket preview

For opponent club ticket links, show a preview/interstitial page before redirecting.

Approved copy:

```text
You’re leaving Shamrock Rovers

This ticket link will take you to an external site:
{domain}

Continue
```

This should apply only to offsite ticket links.

Normal offsite links to social platforms, sponsors, or forms can redirect directly unless flagged later.

---

## 8. Destination safety model

A strict allowlist is not preferred.

Use a soft safety model instead:

- Allow authenticated users to create external links.
- Show a warning for unusual external domains.
- Mark known club domains as verified.
- Store the destination domain for reporting.
- Block unsafe protocols.
- Block private/internal IP destinations.

### 8.1 Known club domains

```text
shamrockrovers.ie
www.shamrockrovers.ie
shop.shamrockrovers.ie
memberswear.shamrockrovers.ie
```

### 8.2 Common allowed destination categories

- Shamrock Rovers site
- Shop
- Memberswear
- Future Ticketing via embedded club pages
- Opponent club ticket sites
- Instagram
- Facebook
- X/Twitter
- TikTok
- LinkedIn
- Google Forms
- Sponsor sites

### 8.3 Blocked URL types

Block:

```text
javascript:
data:
file:
ftp:
```

Also block:

- Localhost
- Private IP ranges
- Internal hostnames
- Empty or malformed URLs

---

## 9. Analytics and tracking

### 9.1 Metrics required

The admin dashboard should track:

- Total clicks
- Clicks by link
- Clicks by day
- Clicks by channel
- QR scans
- Social post clicks
- Sponsor clicks
- Ticket campaign clicks

### 9.2 Channel field

A channel field should describe where the link is used.

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

The system should auto-add UTM tags based on campaign and channel.

Example Instagram link:

```text
rov.rs/bohs-ig
→ https://www.shamrockrovers.ie/tickets/?utm_source=instagram&utm_medium=social&utm_campaign=bohs
```

Example QR link:

```text
rov.rs/bohs-qr
→ https://www.shamrockrovers.ie/tickets/?utm_source=qr&utm_medium=offline&utm_campaign=bohs
```

### 9.4 GA4

GA4 already runs on `shamrockrovers.ie`.

v1 should focus on reliable UTM tagging so GA4 can attribute traffic after users land on the site.

Direct GA4 event push from Cloudflare can be explored later, but it should not block v1.

### 9.5 Sponsor reports

Sponsor reports should include:

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

The admin dashboard should generate QR codes for any link.

### 10.1 QR formats

Required:

- PNG
- PDF

### 10.2 QR style

Required:

- Plain black/white

Out of scope for v1:

- Crest/logo in centre
- Branded colour QR codes
- Advanced print templates

### 10.3 QR expiry warning

If a user generates a QR code for a link with an expiry date, show a warning:

```text
This QR code uses a link with an expiry date. If this QR code is used on printed material, users may be redirected to the main tickets page after expiry.
```

---

## 11. Admin dashboard

### 11.1 Required pages

| Page | Purpose |
|---|---|
| Dashboard | Summary stats, recent links, top links, alerts |
| Links | Search, filter, edit, delete, export |
| Create link | Form-based link creation |
| Match link | Fixture-specific creation flow |
| Sponsor report | Sponsor-level reporting |
| QR tools | Generate and download QR codes |
| Import/export | CSV upload/download |
| Settings | Basic defaults |

### 11.2 Create-link fields

The form should include:

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

### 11.3 Required actions

- Create link
- Edit link
- Delete link
- Reuse deleted slug
- Copy short link
- Generate QR PNG
- Generate QR PDF
- Generate social variants
- Import from CSV
- Export to CSV
- Search/filter links

### 11.4 Search and filters

Filters should include:

- Status
- Channel
- Campaign
- Owner
- Sponsor
- Match/opponent
- Created date
- Expiry date
- Offsite destination
- QR links

### 11.5 Dashboard flags

The dashboard should flag:

- Expiring soon
- Already expired
- Offsite destination
- No clicks in 90 days
- Destination changed recently
- QR link with expiry date

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
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_by TEXT,
  updated_at TEXT,
  expires_at TEXT,
  notes TEXT
);
```

### 12.2 Click events table

```sql
CREATE TABLE click_events (
  id TEXT PRIMARY KEY,
  link_id TEXT,
  slug TEXT NOT NULL,
  clicked_at TEXT NOT NULL,
  country TEXT,
  referrer TEXT,
  user_agent TEXT,
  device_type TEXT,
  is_bot BOOLEAN DEFAULT 0,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT
);
```

### 12.3 No full audit table in v1

A full edit history is not required.

Keep only:

```text
created_by
created_at
updated_by
updated_at
```

This gives basic accountability without exposing a full history UI.

---

## 13. Cloudflare architecture

### 13.1 Public shortener

```text
User
  ↓
https://rov.rs/{slug}
  ↓
Cloudflare Worker
  ↓
D1 lookup
  ↓
Redirect or preview page
  ↓
Click event stored
```

### 13.2 Admin dashboard

```text
User
  ↓
https://admin.rov.rs
  ↓
Cloudflare Access
  ↓
Admin Worker/App
  ↓
D1 database
```

### 13.3 Components

| Component | Purpose |
|---|---|
| Cloudflare DNS | Domain hosting |
| Cloudflare Workers | Public redirect logic and admin app |
| Cloudflare D1 | Link database |
| Cloudflare Access | Admin authentication |
| GitHub | Source code |
| GitHub Actions | CI/CD |
| Wrangler | Cloudflare deployment |
| Cloudflare analytics/logs | First-level click reporting |
| GA4 | Website attribution via UTMs |

---

## 14. Deployment

### 14.1 GitHub workflow

Recommended flow:

```text
Push to main
  → GitHub Actions
  → Run tests/lint
  → Run D1 migrations if needed
  → Wrangler deploy
```

### 14.2 Environments

Recommended:

| Environment | Hostname | Purpose |
|---|---|---|
| Production | `rov.rs` | Public links |
| Admin | `admin.rov.rs` | Admin dashboard |
| Preview/staging | Optional | Test deploys |

---

## 15. API sketch

### 15.1 Public routes

```http
GET /{slug}
GET /health
```

### 15.2 Admin routes

```http
GET    /api/links
POST   /api/links
GET    /api/links/{slug}
PATCH  /api/links/{slug}
DELETE /api/links/{slug}
POST   /api/links/{slug}/restore
GET    /api/links/{slug}/stats
GET    /api/links/{slug}/qr.png
GET    /api/links/{slug}/qr.pdf
POST   /api/import/csv
GET    /api/export/csv
GET    /api/reports/sponsors
```

---

## 16. v1 scope

v1 should include:

- Create/edit/delete links
- Reliable redirects
- Auto social variants
- QR code generation
- CSV import/export
- Basic analytics dashboard
- Sponsor reports
- GA4 UTM tagging
- Cloudflare Access login
- GitHub deploy pipeline
- Admin dashboard on separate hostname
- Health check URL
- Backups/export

---

## 17. Explicitly out of scope for v1

- Full role-based permissions
- Approval workflows
- Branded QR codes
- Public stats pages
- A/B testing
- External API access
- Advanced GA4 event push
- Complex sponsor dashboards
- Full edit audit history

---

## 18. Acceptance criteria

### 18.1 Redirects

- Active links redirect correctly.
- Unknown links redirect to `rov.rs/tickets`.
- Expired links redirect to `rov.rs/tickets`.
- Paused links redirect to `rov.rs/tickets`.
- Offsite ticket links show a preview page before redirect.
- Redirects work from `https://rov.rs/{slug}`.

### 18.2 Admin

- Admin dashboard is available at separate hostname.
- Cloudflare Access protects admin routes.
- Authenticated users can create links.
- Authenticated users can edit destinations.
- Authenticated users can delete links.
- Deleted slugs can be reused.
- Users can search and filter links.
- Users can copy a short link after creation.

### 18.3 Social variants

- User can generate social variants from a base link.
- Variants use platform-specific UTM tags.
- Variants can be copied individually.

### 18.4 QR

- User can generate PNG QR codes.
- User can generate PDF QR codes.
- QR links can have expiry dates.
- The UI warns when a QR link has an expiry date.

### 18.5 Analytics

- Clicks are tracked per link.
- Dashboard shows total clicks.
- Dashboard shows clicks by day.
- Dashboard shows clicks by channel.
- Sponsor reports can be exported.
- CSV export works.
- UTM tags reach GA4 on destination pages.

### 18.6 Operations

- Code lives in GitHub.
- Push to main deploys to Cloudflare.
- Health check route works.
- Database export/backup is available.

---

## 19. Remaining open questions

1. Confirm admin hostname: `admin.rov.rs` or another subdomain.
2. Confirm exact main tickets URL for `rov.rs/tickets`.
3. Confirm exact brand assets to use from the brand material page.
4. Confirm whether Cloudflare Access will use email OTP, Google, Microsoft, or another identity provider.
5. Confirm if marketing users should be managed manually in Cloudflare Access.
6. Confirm if QR PDF should be a simple single-code PDF or include title/campaign text.
7. Confirm sponsor report format.
8. Confirm CSV import template columns.
9. Confirm preferred tech stack for admin UI.
10. Confirm whether staging is required before production.

---

## 20. Recommended next build step

Create a technical implementation plan with:

- Repository structure
- Cloudflare Worker routes
- D1 schema migrations
- Admin UI screens
- CSV import/export format
- QR generation method
- GitHub Actions deployment workflow
- First set of seed links

