# rov.rs Phase 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the monorepo, D1 database schema, and shared types/utilities that all subsequent phases depend on.

**Architecture:** npm workspaces monorepo with packages for redirect-worker, queue-consumer, archival-worker, admin SPA, and shared utilities. D1 database with four tables. TypeScript throughout.

**Tech Stack:** TypeScript, npm workspaces, Wrangler, Vitest, nanoid, Cloudflare Workers/Pages/D1/Queues/R2

---

## Task 1: Monorepo Setup

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/redirect-worker/package.json`
- Create: `packages/redirect-worker/tsconfig.json`
- Create: `packages/redirect-worker/wrangler.toml`
- Create: `packages/queue-consumer/package.json`
- Create: `packages/queue-consumer/tsconfig.json`
- Create: `packages/queue-consumer/wrangler.toml`
- Create: `packages/archival-worker/package.json`
- Create: `packages/archival-worker/tsconfig.json`
- Create: `packages/archival-worker/wrangler.toml`
- Create: `admin/package.json`
- Create: `admin/tsconfig.json`
- Create: `admin/wrangler.toml`

- [ ] **Step 1: Create root package.json**

Create `/home/ubuntu/rovrs/package.json`:

```json
{
  "name": "rovrs",
  "private": true,
  "workspaces": [
    "packages/*",
    "admin"
  ],
  "scripts": {
    "test": "npm -ws test",
    "test:shared": "npm test -w packages/shared",
    "test:redirect": "npm test -w packages/redirect-worker",
    "test:queue": "npm test -w packages/queue-consumer",
    "test:admin": "npm test -w admin",
    "lint": "npm -ws run lint",
    "build": "npm -ws run build",
    "dev:redirect": "npm run dev -w packages/redirect-worker",
    "dev:admin": "npm run dev -w admin",
    "deploy:redirect": "npm run deploy -w packages/redirect-worker",
    "deploy:admin": "npm run pages:deploy -w admin",
    "db:migrate": "wrangler d1 migrations apply rovrs-db --local",
    "db:migrate:prod": "wrangler d1 migrations apply rovrs-db --remote",
    "typecheck": "npm -ws run typecheck"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "wrangler": "^4.0.0",
    "vitest": "^3.0.0",
    "@cloudflare/vitest-pool-workers": "^0.6.0"
  }
}
```

- [ ] **Step 2: Create root tsconfig.base.json**

Create `/home/ubuntu/rovrs/tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src"
  }
}
```

- [ ] **Step 3: Create .gitignore**

Create `/home/ubuntu/rovrs/.gitignore`:

```
node_modules/
dist/
.wrangler/
.dev.vars
.env
.env.local
*.log
.DS_Store
coverage/
.vitest/
admin/.vercel/
```

- [ ] **Step 4: Create packages/shared/package.json and tsconfig.json**

Create `/home/ubuntu/rovrs/packages/shared/package.json`:

```json
{
  "name": "@rovrs/shared",
  "version": "0.0.1",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "nanoid": "^5.0.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

Create `/home/ubuntu/rovrs/packages/shared/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "types": ["vitest/globals"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

Create `/home/ubuntu/rovrs/packages/shared/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
  },
});
```

- [ ] **Step 5: Create packages/redirect-worker/package.json, tsconfig.json, wrangler.toml**

Create `/home/ubuntu/rovrs/packages/redirect-worker/package.json`:

```json
{
  "name": "@rovrs/redirect-worker",
  "version": "0.0.1",
  "private": true,
  "main": "src/index.ts",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@rovrs/shared": "*"
  },
  "devDependencies": {
    "@cloudflare/vitest-pool-workers": "^0.6.0",
    "@cloudflare/workers-types": "^4.20250109.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0",
    "wrangler": "^4.0.0"
  }
}
```

Create `/home/ubuntu/rovrs/packages/redirect-worker/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "types": ["@cloudflare/workers-types", "@cloudflare/vitest-pool-workers"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

Create `/home/ubuntu/rovrs/packages/redirect-worker/wrangler.toml`:

```toml
name = "rovrs-redirect"
main = "src/index.ts"
compatibility_date = "2025-01-01"

routes = [
  { pattern = "rov.rs/*", zone_name = "rov.rs" }
]

[[d1_databases]]
binding = "DB"
database_name = "rovrs-db"
database_id = "PLACEHOLDER_D1_DATABASE_ID"

[[queues.producers]]
queue = "rovrs-click-events"
binding = "CLICK_QUEUE"

[vars]
FALLBACK_URL = "https://www.shamrockrovers.ie/first-team-tickets"
```

Create `/home/ubuntu/rovrs/packages/redirect-worker/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml' },
      },
    },
  },
});
```

- [ ] **Step 6: Create packages/queue-consumer/package.json, tsconfig.json, wrangler.toml**

Create `/home/ubuntu/rovrs/packages/queue-consumer/package.json`:

```json
{
  "name": "@rovrs/queue-consumer",
  "version": "0.0.1",
  "private": true,
  "main": "src/index.ts",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@rovrs/shared": "*"
  },
  "devDependencies": {
    "@cloudflare/vitest-pool-workers": "^0.6.0",
    "@cloudflare/workers-types": "^4.20250109.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0",
    "wrangler": "^4.0.0"
  }
}
```

Create `/home/ubuntu/rovrs/packages/queue-consumer/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "types": ["@cloudflare/workers-types", "@cloudflare/vitest-pool-workers"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

Create `/home/ubuntu/rovrs/packages/queue-consumer/wrangler.toml`:

```toml
name = "rovrs-queue-consumer"
main = "src/index.ts"
compatibility_date = "2025-01-01"

[[queues.consumers]]
queue = "rovrs-click-events"
max_batch_size = 100
max_batch_timeout = 30

[[d1_databases]]
binding = "DB"
database_name = "rovrs-db"
database_id = "PLACEHOLDER_D1_DATABASE_ID"
```

- [ ] **Step 7: Create packages/archival-worker/package.json, tsconfig.json, wrangler.toml**

Create `/home/ubuntu/rovrs/packages/archival-worker/package.json`:

```json
{
  "name": "@rovrs/archival-worker",
  "version": "0.0.1",
  "private": true,
  "main": "src/index.ts",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@rovrs/shared": "*"
  },
  "devDependencies": {
    "@cloudflare/vitest-pool-workers": "^0.6.0",
    "@cloudflare/workers-types": "^4.20250109.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0",
    "wrangler": "^4.0.0"
  }
}
```

Create `/home/ubuntu/rovrs/packages/archival-worker/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "types": ["@cloudflare/workers-types", "@cloudflare/vitest-pool-workers"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

Create `/home/ubuntu/rovrs/packages/archival-worker/wrangler.toml`:

```toml
name = "rovrs-archival"
main = "src/index.ts"
compatibility_date = "2025-01-01"

[triggers]
crons = ["0 3 * * *"]

[[d1_databases]]
binding = "DB"
database_name = "rovrs-db"
database_id = "PLACEHOLDER_D1_DATABASE_ID"

[[r2_buckets]]
binding = "ARCHIVE"
bucket_name = "rovrs-click-archive"

[vars]
RETENTION_DAYS = "180"
```

- [ ] **Step 8: Create admin/package.json, tsconfig.json, wrangler.toml**

Create `/home/ubuntu/rovrs/admin/package.json`:

```json
{
  "name": "@rovrs/admin",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "wrangler pages dev",
    "pages:deploy": "npm run build && wrangler pages deploy dist",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@rovrs/shared": "*",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0",
    "qrcode": "^1.5.0",
    "pdf-lib": "^1.17.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20250109.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/qrcode": "^1.5.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "vitest": "^3.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "jsdom": "^25.0.0",
    "wrangler": "^4.0.0"
  }
}
```

Create `/home/ubuntu/rovrs/admin/tsconfig.json`:

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "outDir": "dist",
    "rootDir": ".",
    "types": ["@cloudflare/workers-types", "vite/client"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "functions/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

Create `/home/ubuntu/rovrs/admin/wrangler.toml`:

```toml
name = "rovrs-admin"
pages_build_output_dir = "dist"
compatibility_date = "2025-01-01"

[[d1_databases]]
binding = "DB"
database_name = "rovrs-db"
database_id = "PLACEHOLDER_D1_DATABASE_ID"
```

- [ ] **Step 9: Create placeholder src directories with index files**

Create each package's `src/index.ts` as a placeholder:

`/home/ubuntu/rovrs/packages/shared/src/index.ts`:
```typescript
// shared package - types, constants, utilities
// populated in Task 3
export {};
```

`/home/ubuntu/rovrs/packages/redirect-worker/src/index.ts`:
```typescript
// redirect worker - populated in Phase 2
export default {};
```

`/home/ubuntu/rovrs/packages/queue-consumer/src/index.ts`:
```typescript
// queue consumer - populated in Phase 3
export default {};
```

`/home/ubuntu/rovrs/packages/archival-worker/src/index.ts`:
```typescript
// archival worker - populated in Phase 11
export default {};
```

- [ ] **Step 10: Run npm install and verify workspace setup**

Run:
```bash
cd /home/ubuntu/rovrs && npm install
```

Expected: Successful install with all workspaces resolved. No peer dependency errors.

Run:
```bash
npm ls --depth=0
```

Expected: Lists `@rovrs/shared`, `@rovrs/redirect-worker`, `@rovrs/queue-consumer`, `@rovrs/archival-worker`, `@rovrs/admin` as workspace packages.

- [ ] **Step 11: Initialize git and commit**

Run:
```bash
cd /home/ubuntu/rovrs && git init && git add -A && git commit -m "chore: monorepo scaffold with npm workspaces

- Root package.json with workspace scripts
- packages/shared, redirect-worker, queue-consumer, archival-worker
- admin/ (Cloudflare Pages SPA)
- wrangler.toml configs with D1, Queue, R2 bindings
- TypeScript config base"
```

---

## Task 2: D1 Schema Migration

**Files:**
- Create: `migrations/0001_initial_schema.sql`

- [ ] **Step 1: Create the initial migration file**

Create `/home/ubuntu/rovrs/migrations/0001_initial_schema.sql`:

```sql
-- rov.rs initial schema
-- Links table: core short link data
CREATE TABLE IF NOT EXISTS links (
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

CREATE INDEX IF NOT EXISTS idx_links_status ON links(status);
CREATE INDEX IF NOT EXISTS idx_links_campaign ON links(campaign);
CREATE INDEX IF NOT EXISTS idx_links_expires_at ON links(expires_at);
CREATE INDEX IF NOT EXISTS idx_links_channel ON links(channel);
CREATE INDEX IF NOT EXISTS idx_links_variant_of ON links(variant_of);
CREATE INDEX IF NOT EXISTS idx_links_sponsor ON links(sponsor);
CREATE INDEX IF NOT EXISTS idx_links_opponent ON links(opponent);

-- Click events table: per-click analytics
CREATE TABLE IF NOT EXISTS click_events (
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

CREATE INDEX IF NOT EXISTS idx_click_events_link_id ON click_events(link_id);
CREATE INDEX IF NOT EXISTS idx_click_events_clicked_at ON click_events(clicked_at);
CREATE INDEX IF NOT EXISTS idx_click_events_slug ON click_events(slug);

-- Destination history: track URL changes for reporting
CREATE TABLE IF NOT EXISTS destination_history (
  id TEXT PRIMARY KEY,
  link_id TEXT NOT NULL,
  old_destination_url TEXT NOT NULL,
  new_destination_url TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  changed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dest_history_link_id ON destination_history(link_id);
CREATE INDEX IF NOT EXISTS idx_dest_history_changed_at ON destination_history(changed_at);

-- Users table: admin user roles (synced with Cloudflare Access)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor',
  display_name TEXT,
  created_at TEXT NOT NULL,
  last_login_at TEXT
);

-- Rate limits: track requests per email (100 req/min)
CREATE TABLE IF NOT EXISTS rate_limits (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_email_created ON rate_limits(email, created_at);

-- Seed evergreen links
-- IDs are nanoid-compatible: 12-char lowercase alphanumeric
-- Timestamps are ISO 8601 UTC
INSERT INTO links (id, slug, destination_url, destination_domain, title, status, redirect_code, is_protected, created_by, created_at) VALUES
  ('evergreen000001', 'tickets', 'https://www.shamrockrovers.ie/first-team-tickets', 'www.shamrockrovers.ie', 'Tickets', 'active', 301, 1, 'system', '2026-05-07T00:00:00Z'),
  ('evergreen000002', 'shop', 'https://shop.shamrockrovers.ie', 'shop.shamrockrovers.ie', 'Shop', 'active', 301, 1, 'system', '2026-05-07T00:00:00Z'),
  ('evergreen000003', 'fixtures', 'https://www.shamrockrovers.ie/fixtures', 'www.shamrockrovers.ie', 'Fixtures', 'active', 301, 1, 'system', '2026-05-07T00:00:00Z'),
  ('evergreen000004', 'members', 'https://www.shamrockrovers.ie/membership', 'www.shamrockrovers.ie', 'Members', 'active', 301, 1, 'system', '2026-05-07T00:00:00Z'),
  ('evergreen000005', 'academy', 'https://www.shamrockrovers.ie/academy', 'www.shamrockrovers.ie', 'Academy', 'active', 301, 1, 'system', '2026-05-07T00:00:00Z'),
  ('evergreen000006', 'women', 'https://www.shamrockrovers.ie/women', 'www.shamrockrovers.ie', 'Women', 'active', 301, 1, 'system', '2026-05-07T00:00:00Z');
```

- [ ] **Step 2: Apply migration locally**

Run:
```bash
cd /home/ubuntu/rovrs && npx wrangler d1 migrations apply rovrs-db --local --config packages/redirect-worker/wrangler.toml
```

Expected: `Migrations to be applied: 0001_initial_schema.sql ... OK`

- [ ] **Step 3: Verify schema locally**

Run:
```bash
npx wrangler d1 execute rovrs-db --local --config packages/redirect-worker/wrangler.toml --command "SELECT name FROM sqlite_master WHERE type='table'"
```

Expected: `links`, `click_events`, `destination_history`, `users`

Run:
```bash
npx wrangler d1 execute rovrs-db --local --config packages/redirect-worker/wrangler.toml --command "SELECT slug, destination_url FROM links"
```

Expected: 6 evergreen links (tickets, shop, fixtures, members, academy, women)

- [ ] **Step 3: Create rate_limits migration**

Create `/home/ubuntu/rovrs/migrations/0002_add_rate_limits.sql`:

```sql
-- Rate limits: track requests per email (100 req/min)
CREATE TABLE IF NOT EXISTS rate_limits (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_email_created ON rate_limits(email, created_at);
```

Apply the migration:

```bash
npx wrangler d1 migrations apply rovrs-db --local
```

- [ ] **Step 4: Commit**

Run:
```bash
git add migrations/ && git commit -m "feat: D1 initial schema with links, click_events, destination_history, users, rate_limits

- All five tables with indexes (links, click_events, destination_history, users, rate_limits)
- Seed data for 6 evergreen links (tickets, shop, fixtures, members, academy, women)
- Evergreen links use 301 redirect and are marked is_protected
- Rate limits table for admin API (100 req/min per user)"
```

---

## Task 3: Shared Types and Utilities

**Files:**
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/types.ts`
- Create: `packages/shared/src/constants.ts`
- Create: `packages/shared/src/nanoid.ts`
- Create: `packages/shared/src/db.ts`
- Create: `packages/shared/src/__tests__/nanoid.test.ts`
- Create: `packages/shared/src/__tests__/db.test.ts`
- Create: `packages/shared/src/__tests__/slug.test.ts`
- Create: `packages/shared/src/slug.ts`

- [ ] **Step 1: Write failing test for nanoid generation**

Create `/home/ubuntu/rovrs/packages/shared/src/__tests__/nanoid.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { generateId, SLUG_ALPHABET, SLUG_LENGTH, ID_LENGTH } from '../nanoid';

describe('generateId', () => {
  it('generates a 12-character ID by default', () => {
    const id = generateId();
    expect(id).toHaveLength(12);
  });

  it('generates only lowercase letters and digits', () => {
    const id = generateId();
    expect(id).toMatch(/^[a-z0-9]+$/);
  });

  it('generates unique IDs on successive calls', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });

  it('respects custom length', () => {
    const id = generateId(20);
    expect(id).toHaveLength(20);
  });
});

describe('generateSlug', () => {
  it('generates a 6-character slug', () => {
    const { generateSlug } = require('../nanoid');
    const slug = generateSlug();
    expect(slug).toHaveLength(6);
  });

  it('uses only non-ambiguous characters (no 0/O, 1/l)', () => {
    const { generateSlug } = require('../nanoid');
    const slug = generateSlug();
    // Should not contain 0, o, 1, l
    expect(slug).not.toMatch(/[0ol1]/);
  });

  it('generates unique slugs on successive calls', () => {
    const { generateSlug } = require('../nanoid');
    const slugs = new Set(Array.from({ length: 100 }, () => generateSlug()));
    expect(slugs.size).toBe(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd /home/ubuntu/rovrs && npm test -w packages/shared
```

Expected: FAIL — `Cannot find module '../nanoid'`

- [ ] **Step 3: Implement nanoid.ts**

Create `/home/ubuntu/rovrs/packages/shared/src/nanoid.ts`:

```typescript
import { customAlphabet } from 'nanoid';

// ID alphabet: lowercase + digits (for link IDs, user IDs, etc.)
const ID_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';
export const ID_LENGTH = 12;

// Slug alphabet: lowercase + digits, excluding ambiguous chars
const SLUG_CHARS = '23456789abcdefghijkmnpqrstuvwxyz'; // no 0,O,1,l
export const SLUG_LENGTH = 6;

const generateIdWithAlphabet = customAlphabet(ID_ALPHABET, ID_LENGTH);
const generateSlugWithAlphabet = customAlphabet(SLUG_CHARS, SLUG_LENGTH);

export function generateId(length: number = ID_LENGTH): string {
  if (length === ID_LENGTH) {
    return generateIdWithAlphabet();
  }
  return customAlphabet(ID_ALPHABET, length)();
}

export function generateSlug(): string {
  return generateSlugWithAlphabet();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
cd /home/ubuntu/rovrs && npm test -w packages/shared
```

Expected: All tests PASS

- [ ] **Step 5: Write failing test for slug validation**

Create `/home/ubuntu/rovrs/packages/shared/src/__tests__/slug.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { validateSlug, normaliseSlug, isReservedPath } from '../slug';

describe('validateSlug', () => {
  it('accepts valid slugs', () => {
    expect(validateSlug('tickets')).toEqual({ valid: true });
    expect(validateSlug('bohs-h1')).toEqual({ valid: true });
    expect(validateSlug('ab')).toEqual({ valid: true });
    expect(validateSlug('a-really-long-slug-with-many-parts')).toEqual({ valid: true });
  });

  it('rejects slugs shorter than 2 characters', () => {
    expect(validateSlug('a')).toEqual({ valid: false, error: 'Slug must be 2-50 characters' });
    expect(validateSlug('')).toEqual({ valid: false, error: 'Slug must be 2-50 characters' });
  });

  it('rejects slugs longer than 50 characters', () => {
    const longSlug = 'a'.repeat(51);
    expect(validateSlug(longSlug)).toEqual({ valid: false, error: 'Slug must be 2-50 characters' });
  });

  it('rejects slugs with invalid characters', () => {
    expect(validateSlug('hello world')).toEqual({ valid: false, error: 'Slug must contain only lowercase letters, numbers, and hyphens' });
    expect(validateSlug('Hello')).toEqual({ valid: false, error: 'Slug must contain only lowercase letters, numbers, and hyphens' });
    expect(validateSlug('test_slug')).toEqual({ valid: false, error: 'Slug must contain only lowercase letters, numbers, and hyphens' });
    expect(validateSlug('test.slug')).toEqual({ valid: false, error: 'Slug must contain only lowercase letters, numbers, and hyphens' });
  });

  it('rejects slugs starting or ending with hyphen', () => {
    expect(validateSlug('-test')).toEqual({ valid: false, error: 'Slug cannot start or end with a hyphen' });
    expect(validateSlug('test-')).toEqual({ valid: false, error: 'Slug cannot start or end with a hyphen' });
  });

  it('rejects reserved paths', () => {
    expect(validateSlug('admin')).toEqual({ valid: false, error: 'This path is reserved' });
    expect(validateSlug('api')).toEqual({ valid: false, error: 'This path is reserved' });
    expect(validateSlug('health')).toEqual({ valid: false, error: 'This path is reserved' });
  });
});

describe('normaliseSlug', () => {
  it('converts to lowercase', () => {
    expect(normaliseSlug('Bohs')).toBe('bohs');
  });

  it('converts spaces to hyphens', () => {
    expect(normaliseSlug('bohs away')).toBe('bohs-away');
  });

  it('collapses multiple hyphens', () => {
    expect(normaliseSlug('bohs--away')).toBe('bohs-away');
  });

  it('trims whitespace', () => {
    expect(normaliseSlug('  bohs  ')).toBe('bohs');
  });
});

describe('isReservedPath', () => {
  it('identifies reserved paths', () => {
    expect(isReservedPath('admin')).toBe(true);
    expect(isReservedPath('api')).toBe(true);
    expect(isReservedPath('health')).toBe(true);
    expect(isReservedPath('login')).toBe(true);
    expect(isReservedPath('logout')).toBe(true);
    expect(isReservedPath('stats')).toBe(true);
    expect(isReservedPath('export')).toBe(true);
    expect(isReservedPath('robots.txt')).toBe(true);
    expect(isReservedPath('favicon.ico')).toBe(true);
  });

  it('does not flag non-reserved paths', () => {
    expect(isReservedPath('tickets')).toBe(false);
    expect(isReservedPath('bohs')).toBe(false);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run:
```bash
cd /home/ubuntu/rovrs && npm test -w packages/shared
```

Expected: FAIL — `Cannot find module '../slug'`

- [ ] **Step 7: Implement slug.ts**

Create `/home/ubuntu/rovrs/packages/shared/src/slug.ts`:

```typescript
import { RESERVED_PATHS } from './constants';

export interface SlugValidation {
  valid: boolean;
  error?: string;
}

export function validateSlug(slug: string): SlugValidation {
  if (slug.length < 2 || slug.length > 50) {
    return { valid: false, error: 'Slug must be 2-50 characters' };
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { valid: false, error: 'Slug must contain only lowercase letters, numbers, and hyphens' };
  }

  if (slug.startsWith('-') || slug.endsWith('-')) {
    return { valid: false, error: 'Slug cannot start or end with a hyphen' };
  }

  if (isReservedPath(slug)) {
    return { valid: false, error: 'This path is reserved' };
  }

  return { valid: true };
}

export function normaliseSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function isReservedPath(slug: string): boolean {
  return RESERVED_PATHS.has(slug);
}

export function suffixDeletedSlug(slug: string): string {
  const timestamp = new Date().toISOString()
    .replace(/[-:]/g, '')
    .replace(/\..+/, '')
    .toLowerCase();
  return `${slug}__del_${timestamp}`;
}

export function extractOriginalSlug(suffixedSlug: string): string | null {
  const match = suffixedSlug.match(/^(.+)__del_\d{8}t\d{6}z$/);
  return match ? match[1] : null;
}
```

- [ ] **Step 8: Run test to verify it passes**

Run:
```bash
cd /home/ubuntu/rovrs && npm test -w packages/shared
```

Expected: All slug tests PASS

- [ ] **Step 9: Write constants.ts**

Create `/home/ubuntu/rovrs/packages/shared/src/constants.ts`:

```typescript
export const FALLBACK_URL = 'https://www.shamrockrovers.ie/first-team-tickets';
export const ROOT_REDIRECT_URL = 'https://www.shamrockrovers.ie';
export const SHORT_DOMAIN = 'rov.rs';

export const RESERVED_PATHS = new Set([
  'admin',
  'api',
  'health',
  'login',
  'logout',
  'stats',
  'export',
  'robots.txt',
  'favicon.ico',
]);

export const PROTECTED_SLUGS = new Set([
  'tickets',
  'shop',
  'fixtures',
  'members',
  'academy',
  'women',
]);

export const CHANNELS = [
  'Tickets',
  'Instagram',
  'Facebook',
  'X/Twitter',
  'TikTok',
  'LinkedIn',
  'QR code',
  'Email',
  'Sponsor',
  'Matchday',
  'Other',
] as const;

export type Channel = (typeof CHANNELS)[number];

export const LINK_STATUS = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  EXPIRED: 'expired',
  DELETED: 'deleted',
} as const;

export type LinkStatus = (typeof LINK_STATUS)[keyof typeof LINK_STATUS];

export const USER_ROLES = {
  ADMIN: 'admin',
  EDITOR: 'editor',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const EVENT_TYPES = {
  CLICK: 'click',
  OFFSITE_CONTINUE: 'offsite_continue',
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

export const KNOWN_CLUB_DOMAINS = new Set([
  'shamrockrovers.ie',
  'www.shamrockrovers.ie',
  'shop.shamrockrovers.ie',
  'memberswear.shamrockrovers.ie',
]);

export const BLOCKED_PROTOCOLS = ['javascript:', 'data:', 'file:', 'ftp:'];

export const UTM_CHANNEL_MAP: Record<string, { source: string; medium: string }> = {
  'Instagram': { source: 'instagram', medium: 'social' },
  'Facebook': { source: 'facebook', medium: 'social' },
  'X/Twitter': { source: 'twitter', medium: 'social' },
  'TikTok': { source: 'tiktok', medium: 'social' },
  'LinkedIn': { source: 'linkedin', medium: 'social' },
  'QR code': { source: 'qr', medium: 'offline' },
  'Email': { source: 'email', medium: 'email' },
  'Sponsor': { source: 'sponsor', medium: 'partner' },
  'Matchday': { source: 'matchday', medium: 'offline' },
};

export const VARIANT_SUFFIX_MAP: Record<string, string> = {
  'Instagram': '-ig',
  'Facebook': '-fb',
  'X/Twitter': '-x',
  'TikTok': '-tt',
  'LinkedIn': '-li',
};

export const RETENTION_DAYS = 180;
export const CLICK_EVENTS_MAX_AGE_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;
```

- [ ] **Step 10: Write types.ts**

Create `/home/ubuntu/rovrs/packages/shared/src/types.ts`:

```typescript
import type { Channel, LinkStatus, UserRole, EventType } from './constants';

// ─── Database row types ───

export interface Link {
  id: string;
  slug: string;
  destination_url: string;
  destination_domain: string | null;
  title: string | null;
  campaign: string | null;
  channel: Channel | null;
  owner: string | null;
  sponsor: string | null;
  opponent: string | null;
  competition: string | null;
  match_date: string | null;
  home_away: string | null;
  status: LinkStatus;
  redirect_code: number;
  is_qr: number; // SQLite BOOLEAN = 0 | 1
  is_offsite_ticket: number;
  show_offsite_preview: number;
  is_protected: number;
  variant_of: string | null;
  created_by: string;
  created_at: string;
  updated_by: string | null;
  updated_at: string | null;
  expires_at: string | null;
  deleted_at: string | null;
  notes: string | null;
}

export interface ClickEvent {
  id: string;
  link_id: string;
  slug: string;
  clicked_at: string;
  country: string | null;
  referrer: string | null;
  device_type: string | null;
  is_bot: number;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  event_type: EventType;
}

export interface DestinationHistory {
  id: string;
  link_id: string;
  old_destination_url: string;
  new_destination_url: string;
  changed_by: string;
  changed_at: string;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  display_name: string | null;
  created_at: string;
  last_login_at: string | null;
}

// ─── API request/response types ───

export interface CreateLinkRequest {
  slug?: string;
  destination_url: string;
  title?: string;
  campaign?: string;
  channel?: Channel;
  owner?: string;
  sponsor?: string;
  opponent?: string;
  competition?: string;
  match_date?: string;
  home_away?: string;
  expires_at?: string;
  notes?: string;
  is_offsite_ticket?: boolean;
}

export interface UpdateLinkRequest {
  destination_url?: string;
  title?: string;
  campaign?: string;
  channel?: Channel;
  owner?: string;
  sponsor?: string;
  opponent?: string;
  competition?: string;
  match_date?: string;
  home_away?: string;
  expires_at?: string;
  notes?: string;
  status?: LinkStatus;
  is_offsite_ticket?: boolean;
}

export interface ListLinksQuery {
  page?: number;
  limit?: number;
  status?: LinkStatus;
  channel?: Channel;
  campaign?: string;
  sponsor?: string;
  opponent?: string;
  search?: string;
  variant_only?: boolean;
  base_only?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  has_more: boolean;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface BatchActionRequest {
  action: 'pause' | 'expire' | 'update_destination';
  link_ids: string[];
  destination_url?: string;
}

export interface GenerateVariantsRequest {
  platforms?: string[];
}

export interface ImportCsvStatus {
  job_id: string;
  status: 'processing' | 'complete' | 'failed';
  created: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
}

export interface SponsorReportQuery {
  sponsor: string;
  from?: string;
  to?: string;
}

export interface StatsSummary {
  total_links: number;
  active_links: number;
  total_clicks_today: number;
  total_clicks_7d: number;
  total_clicks_30d: number;
  top_links: Array<{
    id: string;
    slug: string;
    title: string | null;
    clicks: number;
  }>;
}

export interface LinkStats {
  link_id: string;
  total_clicks: number;
  clicks_by_day: Array<{ date: string; clicks: number }>;
  clicks_by_channel: Array<{ channel: string; clicks: number }>;
  clicks_by_country: Array<{ country: string; clicks: number }>;
}

export interface MeResponse {
  email: string;
  role: UserRole;
  display_name: string | null;
}

// ─── Queue message types ───

export interface ClickEventMessage {
  id: string;
  link_id: string;
  slug: string;
  clicked_at: string;
  country: string | null;
  referrer: string | null;
  device_type: string | null;
  is_bot: boolean;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  event_type: EventType;
}

// ─── Environment bindings ───

export interface RedirectWorkerEnv {
  DB: D1Database;
  CLICK_QUEUE: Queue;
  FALLBACK_URL: string;
}

export interface QueueConsumerEnv {
  DB: D1Database;
}

export interface ArchivalWorkerEnv {
  DB: D1Database;
  ARCHIVE: R2Bucket;
  RETENTION_DAYS: string;
}

export interface AdminFunctionEnv {
  DB: D1Database;
}
```

- [ ] **Step 11: Write db.ts (D1 query helpers)**

Create `/home/ubuntu/rovrs/packages/shared/src/__tests__/db.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildWhereClause, buildPagination, parseDeviceType, nowUTC, toISODate } from '../db';

describe('buildWhereClause', () => {
  it('returns empty clause for no conditions', () => {
    const result = buildWhereClause({});
    expect(result.sql).toBe('');
    expect(result.params).toEqual([]);
  });

  it('builds single condition', () => {
    const result = buildWhereClause({ status: 'active' });
    expect(result.sql).toBe('WHERE status = ?');
    expect(result.params).toEqual(['active']);
  });

  it('builds multiple conditions with AND', () => {
    const result = buildWhereClause({ status: 'active', channel: 'instagram' });
    expect(result.sql).toBe('WHERE status = ? AND channel = ?');
    expect(result.params).toEqual(['active', 'instagram']);
  });

  it('skips undefined values', () => {
    const result = buildWhereClause({ status: 'active', channel: undefined });
    expect(result.sql).toBe('WHERE status = ?');
    expect(result.params).toEqual(['active']);
  });

  it('handles search with LIKE', () => {
    const result = buildWhereClause({}, { search: 'bohs' });
    expect(result.sql).toContain('(slug LIKE ? OR title LIKE ? OR notes LIKE ? OR campaign LIKE ?)');
    expect(result.params).toEqual(['%bohs%', '%bohs%', '%bohs%', '%bohs%']);
  });
});

describe('buildPagination', () => {
  it('defaults to page 1, limit 50', () => {
    const result = buildPagination({});
    expect(result.limit).toBe(50);
    expect(result.offset).toBe(0);
  });

  it('calculates offset from page and limit', () => {
    const result = buildPagination({ page: 3, limit: 25 });
    expect(result.limit).toBe(25);
    expect(result.offset).toBe(50);
  });

  it('clamps limit to max 100', () => {
    const result = buildPagination({ page: 1, limit: 200 });
    expect(result.limit).toBe(100);
  });

  it('clamps page to min 1', () => {
    const result = buildPagination({ page: 0 });
    expect(result.offset).toBe(0);
  });
});

describe('parseDeviceType', () => {
  it('detects mobile', () => {
    expect(parseDeviceType('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)')).toBe('mobile');
    expect(parseDeviceType('Mozilla/5.0 (Linux; Android 13; Pixel 7)')).toBe('mobile');
  });

  it('detects tablet', () => {
    expect(parseDeviceType('Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)')).toBe('tablet');
  });

  it('detects desktop', () => {
    expect(parseDeviceType('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('desktop');
    expect(parseDeviceType('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe('desktop');
  });

  it('returns unknown for empty string', () => {
    expect(parseDeviceType('')).toBe('unknown');
  });
});

describe('nowUTC', () => {
  it('returns ISO 8601 string ending in Z', () => {
    const result = nowUTC();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});

describe('toISODate', () => {
  it('extracts date portion', () => {
    expect(toISODate('2026-05-07T12:00:00Z')).toBe('2026-05-07');
  });
});
```

- [ ] **Step 12: Run test to verify it fails**

Run:
```bash
cd /home/ubuntu/rovrs && npm test -w packages/shared
```

Expected: FAIL — `Cannot find module '../db'`

- [ ] **Step 13: Implement db.ts**

Create `/home/ubuntu/rovrs/packages/shared/src/db.ts`:

```typescript
export interface WhereConditions {
  [key: string]: string | number | boolean | undefined;
}

export interface WhereResult {
  sql: string;
  params: (string | number | boolean)[];
}

export function buildWhereClause(
  conditions: WhereConditions,
  options?: { search?: string; deleted_only?: boolean }
): WhereResult {
  const clauses: string[] = [];
  const params: (string | number | boolean)[] = [];

  for (const [key, value] of Object.entries(conditions)) {
    if (value === undefined) continue;
    clauses.push(`${key} = ?`);
    params.push(value);
  }

  if (options?.search) {
    const term = `%${options.search}%`;
    clauses.push(`(slug LIKE ? OR title LIKE ? OR notes LIKE ? OR campaign LIKE ?)`);
    params.push(term, term, term, term);
  }

  const sql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  return { sql, params };
}

export interface PaginationInput {
  page?: number;
  limit?: number;
}

export interface PaginationResult {
  limit: number;
  offset: number;
}

export function buildPagination(input: PaginationInput): PaginationResult {
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);
  const page = Math.max(input.page ?? 1, 1);
  return { limit, offset: (page - 1) * limit };
}

export function parseDeviceType(userAgent: string): string {
  if (!userAgent) return 'unknown';
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet/.test(ua)) return 'tablet';
  if (/mobile|iphone|android.*mobile/.test(ua)) return 'mobile';
  return 'desktop';
}

export function nowUTC(): string {
  return new Date().toISOString();
}

export function toISODate(isoString: string): string {
  return isoString.substring(0, 10);
}
```

- [ ] **Step 14: Run all tests to verify they pass**

Run:
```bash
cd /home/ubuntu/rovrs && npm test -w packages/shared
```

Expected: All tests PASS (nanoid, slug, db)

- [ ] **Step 15: Update shared src/index.ts to re-export everything**

Write `/home/ubuntu/rovrs/packages/shared/src/index.ts`:

```typescript
export * from './types';
export * from './constants';
export { generateId, generateSlug, ID_LENGTH, SLUG_LENGTH } from './nanoid';
export {
  validateSlug,
  normaliseSlug,
  isReservedPath,
  suffixDeletedSlug,
  extractOriginalSlug,
} from './slug';
export {
  buildWhereClause,
  buildPagination,
  parseDeviceType,
  nowUTC,
  toISODate,
} from './db';
```

- [ ] **Step 16: Verify typecheck passes**

Run:
```bash
cd /home/ubuntu/rovrs && npm run typecheck -w packages/shared
```

Expected: No errors

- [ ] **Step 17: Commit**

Run:
```bash
cd /home/ubuntu/rovrs && git add packages/shared/ && git commit -m "feat: shared types, constants, nanoid, slug validation, db helpers

- types.ts: all DB row types, API request/response types, env bindings
- constants.ts: FALLBACK_URL, RESERVED_PATHS, CHANNELS, UTM maps, etc.
- nanoid.ts: generateId (12-char), generateSlug (6-char, no ambiguous chars)
- slug.ts: validate, normalise, reserved check, soft-delete suffix
- db.ts: WHERE clause builder, pagination, device type parser
- Full test coverage for nanoid, slug, db helpers"
```

---

## Phase 1 Summary

| Task | What was built |
|---|---|
| 1 | Monorepo with npm workspaces, all wrangler.toml configs, TypeScript setup |
| 2 | D1 migration with 4 tables, 10 indexes, 6 seed evergreen links |
| 3 | Shared package: types, constants, nanoid, slug validation, db helpers — all tested |

Next phase: **Phase 2 — Redirect Worker** (core redirect, URL validation, click events, offsite preview).
