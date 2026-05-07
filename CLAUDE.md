# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**rov.rs** is the Shamrock Rovers branded link shortener. Public short links on `rov.rs`, admin dashboard on `admin.rov.rs` (protected by Cloudflare Access). Full spec is in `rovrs_shortener_spec_v_0_2.md`.

## Architecture

- **Runtime**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Auth**: Cloudflare Access (admin only)
- **Deployment**: GitHub Actions → Wrangler deploy on push to main
- **Domains**: `rov.rs` (public redirector), `admin.rov.rs` (admin dashboard)

### Two Worker entry points

1. **Public shortener** — receives `GET /{slug}`, looks up D1, redirects (302 default, 301 for stable evergreen links), logs click event. Unknown/expired/paused slugs redirect to `rov.rs/tickets`.
2. **Admin dashboard** — SPA served at `admin.rov.rs`, behind Cloudflare Access. CRUD links, analytics, QR generation, CSV import/export, sponsor reports.

### Data model

Two D1 tables: `links` (slug, destination, campaign/channel metadata, status, expiry, match info, QR/offsite flags) and `click_events` (per-click analytics with UTM params, device, referrer). No full audit log — only `created_by/at` and `updated_by/at`. Schema in spec section 12.

## Key Business Rules

- Slugs: lowercase, letters/numbers/hyphens, 2–50 chars. Deleted slugs can be reused.
- Redirect: 302 by default. 301 only for stable evergreen links (`tickets`, `shop`, `fixtures`, etc.).
- Expired/unknown/paused links all redirect to `rov.rs/tickets`.
- Offsite ticket links show an interstitial preview page before redirecting.
- UTM tags are auto-appended based on campaign and channel.
- Reserved paths: `/admin`, `/api`, `/health`, `/login`, `/logout`, `/stats`, `/export`, `/robots.txt`, `/favicon.ico`, `/.well-known`.
- Blocked URL protocols: `javascript:`, `data:`, `file:`, `ftp:`, localhost, private IPs.

## API Structure

Public: `GET /{slug}`, `GET /health`

Admin API (`/api/`):
- `GET/POST /api/links` — list/create
- `GET/PATCH/DELETE /api/links/{slug}` — read/update/delete
- `POST /api/links/{slug}/restore` — restore deleted
- `GET /api/links/{slug}/stats` — per-link analytics
- `GET /api/links/{slug}/qr.png` and `/qr.pdf` — QR generation
- `POST /api/import/csv`, `GET /api/export/csv` — bulk operations
- `GET /api/reports/sponsors` — sponsor reporting
