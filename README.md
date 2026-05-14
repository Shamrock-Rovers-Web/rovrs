# rov.rs — Shamrock Rovers Link Shortener

Branded link shortener for Shamrock Rovers FC. Short links on `rov.rs`, admin dashboard at `admin.rov.rs`.

## Architecture

- **Runtime**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Auth**: Cloudflare Access (admin only)
- **Queue**: Cloudflare Queues (click event processing)
- **Storage**: Cloudflare R2 (click event archival)
- **Deployment**: GitHub Actions → Wrangler on push to main

### Components

| Component | Path | Domain |
|-----------|------|--------|
| Redirect Worker | `packages/redirect-worker/` | `rov.rs` |
| Queue Consumer | `packages/queue-consumer/` | Internal |
| Archival Worker | `packages/archival-worker/` | Internal (cron) |
| Admin SPA | `admin/` | `admin.rov.rs` |
| Shared Types | `packages/shared/` | Internal |

### Data Model

- **links** — slug, destination URL, campaign/channel metadata, status, expiry, match info, QR/offsite flags
- **click_events** — per-click analytics with UTM params, device, referrer, country
- **destination_history** — audit trail of URL changes
- **users** — admin user accounts
- **rate_limits** — API rate limiting

## Setup

```bash
# Install dependencies
npm install

# Run admin dev server
cd admin && npm run dev

# Run redirect worker locally
cd packages/redirect-worker && npx wrangler dev
```

### Environment

Wrangler authenticates via OAuth (`npx wrangler login`). The D1 database is shared across all workers:

- Database: `rovrs-db` (`7c172f99-9550-4aa7-a33f-165fc340a051`)
- Queue: `rovrs-click-events`
- Zone: `rov.rs` (`e436d011d4de81bd15cca6a15aff5c0c`)

## Deployment

```bash
# Deploy redirect worker
cd packages/redirect-worker && npx wrangler deploy

# Deploy queue consumer
cd packages/queue-consumer && npx wrangler deploy

# Build and deploy admin (handles D1 binding + functions)
bash deploy-admin.sh
```

Migrations are applied via:
```bash
npx wrangler d1 execute rovrs-db --file=migrations/0001_initial_schema.sql
```

## API

### Public

| Method | Path | Description |
|--------|------|-------------|
| GET | `/{slug}` | Redirect to destination |
| GET | `/health` | Health check |

### Admin (`/api/`)

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/links` | List/create links |
| GET/PATCH/DELETE | `/api/links/{slug}` | Read/update/delete |
| POST | `/api/links/{slug}/restore` | Restore deleted link |
| POST | `/api/links/{slug}/stats` | Per-link click analytics |
| GET | `/api/stats` | Dashboard stats (clicks, QR scans, top links) |
| GET | `/api/qr` | List QR-flagged links with scan counts |
| GET | `/api/export/csv` | Export links as CSV |
| POST | `/api/import/csv` | Import links from CSV |
| GET | `/api/reports/sponsors` | Sponsor reporting |
| GET | `/api/health` | Admin health check |

## Business Rules

- Slugs: lowercase, letters/numbers/hyphens, 2–50 chars
- Redirect: 302 default, 301 for stable evergreen links (`tickets`, `shop`, `fixtures`, `members`, `academy`, `women`)
- Expired/unknown/paused links redirect to ticket page
- Offsite ticket links show interstitial preview
- QR codes encode URLs with `?utm_source=qr&utm_medium=qr-code` for scan tracking
- Reserved paths: `/admin`, `/api`, `/health`, `/robots.txt`, etc.
- Blocked URL protocols: `javascript:`, `data:`, `file:`, `ftp:`, localhost

## Project Status

Live in production. See `rovrs_shortener_spec_v_0_4.md` for full spec.
