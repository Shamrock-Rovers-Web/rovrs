# Phase 4b: Admin API - Links CRUD with Auth

Continuing from Phase 4a where we set up the React SPA scaffolding, now we implement the core admin API endpoints for link management with authentication.

## Overview

Implement the Pages Functions for the admin API endpoints that handle link CRUD operations. All endpoints are protected by Cloudflare Access authentication.

## Prerequisites

- Phase 4a completed (React SPA scaffolding)
- Cloudflare Access configured for `admin.rov.rs`
- D1 database with initial schema
- Shared package with types and utilities

## Implementation Steps

### [ ] Step 1: Create admin/functions/api/me.ts for auth

Create `/home/ubuntu/rovrs/admin/functions/api/me.ts`:

```typescript
import { assets, env } from 'cloudflare:workers';

interface JwtPayload {
  email: string;
  role?: string;
}

interface JwtHeader {
  alg: string;
}

export interface Env {
  DB: D1Database;
}

export async function onRequestGet(): Promise<Response> {
  const request = assets.request;
  const cf = (request as any).cf;
  const jwt = cf?.['Cf-Access-Jwt-Assertion'] as string;

  if (!jwt) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // JWT is base64url encoded: header.payload.signature
    const [headerB64, payloadB64] = jwt.split('.');
    const header = JSON.parse(atob(headerB64)) as JwtHeader;
    const payload = JSON.parse(atob(payloadB64)) as JwtPayload;

    // Look up or create user in D1
    const result = await env.DB.prepare(
      'SELECT id, email, role, display_name, created_at, last_login_at FROM users WHERE email = ? LIMIT 1'
    )
      .bind(payload.email)
      .first<any>();

    let user;
    if (!result) {
      // Create new user with default role
      const now = new Date().toISOString();
      const userId = crypto.randomUUID();
      await env.DB.prepare(
        'INSERT INTO users (id, email, role, display_name, created_at) VALUES (?, ?, ?, ?, ?)'
      )
        .bind(userId, payload.email, payload.role || 'editor', null, now)
        .run();
      user = {
        id: userId,
        email: payload.email,
        role: payload.role || 'editor',
        display_name: null,
        created_at: now,
        last_login_at: null,
      };
    } else {
      // Update last login
      const now = new Date().toISOString();
      await env.DB.prepare(
        'UPDATE users SET last_login_at = ? WHERE id = ?'
      )
        .bind(now, result.id)
        .run();
      user = {
        id: result.id,
        email: result.email,
        role: result.role,
        display_name: result.display_name,
        created_at: result.created_at,
        last_login_at: result.last_login_at,
      };
    }

    return Response.json({
      email: user.email,
      role: user.role,
      display_name: user.display_name,
    });
  } catch (error) {
    console.error('Auth error:', error);
    return new Response('Auth error', { status: 500 });
  }
}
```

### [ ] Step 2: Create admin/functions/api/links/index.ts (GET + POST)

Create `/home/ubuntu/rovrs/admin/functions/api/links/index.ts`:

```typescript
import { assets, env } from 'cloudflare:workers';

import {
  type ListLinksQuery,
  type PaginatedResponse,
  type Link,
  type CreateLinkRequest,
  type ApiError,
} from '@rovrs/shared';
import { buildWhereClause, buildPagination } from '@rovrs/shared';

interface Env {
  DB: D1Database;
}

async function getAuthUser(request: Request, db: D1Database): Promise<{ email: string; role: string }> {
  const cf = (request as any).cf;
  const jwt = cf?.['Cf-Access-Jwt-Assertion'] as string;

  if (!jwt) {
    throw new Error('Unauthorized');
  }

  const [payloadB64] = jwt.split('.');
  const payload = JSON.parse(atob(payloadB64));
  return { email: payload.email, role: payload.role || 'editor' };
}

async function checkRateLimit(email: string, db: D1Database): Promise<boolean> {
  const now = Date.now();
  const oneMinAgo = now - 60000;

  const result = await db
    .prepare(
      'SELECT COUNT(*) as count FROM rate_limits WHERE email = ? AND created_at > ?'
    )
    .bind(email, oneMinAgo)
    .first<{ count: number }>();

  return (result?.count ?? 0) < 10; // Allow 10 requests per minute per user
}

export async function onRequestGet(context: { request: Request; env: Env }): Promise<Response> {
  const request = context.request;
  const env = context.env;

  try {
    await checkRateLimit((request as any).user.email, env.DB);
  } catch (error) {
    return Response.json(
      { error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
      { status: 429 }
    );
  }

  const url = new URL(request.url);
  const params: ListLinksQuery = {
    page: parseInt(url.searchParams.get('page') || '1'),
    limit: parseInt(url.searchParams.get('limit') || '50'),
    status: url.searchParams.get('status') as any,
    channel: url.searchParams.get('channel') as any,
    campaign: url.searchParams.get('campaign'),
    sponsor: url.searchParams.get('sponsor'),
    opponent: url.searchParams.get('opponent'),
    search: url.searchParams.get('search'),
    variant_only: url.searchParams.get('variant_only') === 'true',
    base_only: url.searchParams.get('base_only') === 'true',
  };

  const { limit, offset } = buildPagination(params);

  const where = buildWhereClause(
    { status: params.status, channel: params.channel, campaign: params.campaign, sponsor: params.sponsor, opponent: params.opponent },
    { search: params.search, deleted_only: true }
  );

  let sql = `
    SELECT id, slug, destination_url, title, campaign, channel, owner, sponsor, 
           opponent, competition, match_date, home_away, status, redirect_code, 
           is_qr, is_offsite_ticket, is_protected, variant_of, created_by, created_at, 
           updated_at, expires_at, deleted_at, notes
    FROM links
    ${where.sql}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `;
  const paramsArray = [...where.params, limit, offset];

  const links = await env.DB.prepare(sql).bind(...paramsArray).all<any>();

  const countSql = `SELECT COUNT(*) as total FROM links ${where.sql}`;
  const countResult = await env.DB.prepare(countSql).bind(...where.params).first<{ total: number }>();

  return Response.json({
    data: links.results,
    page: params.page,
    limit,
    total: countResult?.total ?? 0,
    has_more: (params.page - 1) * limit + links.results.length < countResult?.total ?? 0,
  });
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  const request = context.request;
  const env = context.env;

  const user = await getAuthUser(request, env.DB);

  let body: CreateLinkRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON' } },
      { status: 400 }
    );
  }

  // Validate required fields
  if (!body.destination_url) {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', message: 'destination_url is required', details: { field: 'destination_url' } } },
      { status: 400 }
    );
  }

  // Auto-generate slug if not provided
  let slug = body.slug;
  if (!slug) {
    const { generateSlug } = await import('@rovrs/shared');
    slug = generateSlug();
  } else {
    const { validateSlug } = await import('@rovrs/shared');
    const validation = validateSlug(slug);
    if (!validation.valid) {
      return Response.json(
        { error: { code: 'VALIDATION_ERROR', message: validation.error!, details: { field: 'slug', value: slug } } },
        { status: 400 }
      );
    }
  }

  // Check slug uniqueness (active links only)
  const existing = await env.DB.prepare('SELECT id FROM links WHERE slug = ? AND deleted_at IS NULL').bind(slug).first();
  if (existing) {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Slug already exists', details: { field: 'slug', value: slug } } },
      { status: 400 }
    );
  }

  const { generateId, toISODate } = await import('@rovrs/shared');
  const now = toISODate(new Date().toISOString());

  const id = generateId();
  const destinationDomain = body.destination_url ? new URL(body.destination_url).hostname : null;

  try {
    await env.DB.prepare(
      `INSERT INTO links (
        id, slug, destination_url, destination_domain, title, campaign, channel, owner,
        sponsor, opponent, competition, match_date, home_away, status, redirect_code,
        is_qr, is_offsite_ticket, is_protected, variant_of, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id, slug, body.destination_url, destinationDomain, body.title, body.campaign, body.channel, body.owner,
        body.sponsor, body.opponent, body.competition, body.match_date, body.home_away, 'active',
        body.redirect_code || 302, body.is_qr ? 1 : 0, body.is_offsite_ticket ? 1 : 0,
        body.is_protected ? 1 : 0, body.variant_of || null, user.email, now
      )
      .run();

    const link = await env.DB.prepare(
      'SELECT * FROM links WHERE id = ?'
    ).bind(id).first();

    return Response.json(link, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: { code: 'DATABASE_ERROR', message: 'Failed to create link' } },
      { status: 500 }
    );
  }
}
```

### [ ] Step 3: Create admin/functions/api/links/[id].ts (GET + PATCH + DELETE)

Create `/home/ubuntu/rovrs/admin/functions/api/links/[id].ts`:

```typescript
import { assets, env } from 'cloudflare:workers';

import {
  type UpdateLinkRequest,
  type ApiError,
} from '@rovrs/shared';

interface Env {
  DB: D1Database;
}

async function getAuthUser(request: Request, db: D1Database): Promise<{ email: string; role: string }> {
  const cf = (request as any).cf;
  const jwt = cf?.['Cf-Access-Jwt-Assertion'] as string;

  if (!jwt) {
    throw new Error('Unauthorized');
  }

  const [payloadB64] = jwt.split('.');
  const payload = JSON.parse(atob(payloadB64));
  return { email: payload.email, role: payload.role || 'editor' };
}

async function checkRateLimit(email: string, db: D1Database): Promise<boolean> {
  const now = Date.now();
  const oneMinAgo = now - 60000;

  const result = await db
    .prepare(
      'SELECT COUNT(*) as count FROM rate_limits WHERE email = ? AND created_at > ?'
    )
    .bind(email, oneMinAgo)
    .first<{ count: number }>();

  return (result?.count ?? 0) < 10; // Allow 10 requests per minute per user
}

export async function onRequestGet(context: { request: Request; env: Env; params: { id: string } }): Promise<Response> {
  const request = context.request;
  const env = context.env;
  const { id } = context.params;

  try {
    await checkRateLimit((request as any).user.email, env.DB);
  } catch (error) {
    return Response.json(
      { error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
      { status: 429 }
    );
  }

  const link = await env.DB.prepare(
    'SELECT * FROM links WHERE id = ?'
  ).bind(id).first();

  if (!link) {
    return Response.json(
      { error: { code: 'NOT_FOUND', message: 'Link not found' } },
      { status: 404 }
    );
  }

  return Response.json(link);
}

export async function onRequestPatch(context: { request: Request; env: Env; params: { id: string } }): Promise<Response> {
  const request = context.request;
  const env = context.env;
  const { id } = context.params;

  const user = await getAuthUser(request, env.DB);

  let body: UpdateLinkRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON' } },
      { status: 400 }
    );
  }

  // Get current link for status checks
  const current = await env.DB.prepare('SELECT * FROM links WHERE id = ?').bind(id).first<any>();
  if (!current) {
    return Response.json(
      { error: { code: 'NOT_FOUND', message: 'Link not found' } },
      { status: 404 }
    );
  }

  // Check if link is protected and user is not Admin
  if (current.is_protected && user.role !== 'admin') {
    return Response.json(
      { error: { code: 'FORBIDDEN', message: 'Cannot modify protected link' } },
      { status: 403 }
    );
  }

  // Check if trying to delete a protected link (soft delete)
  if (body.status === 'deleted' && current.is_protected && user.role !== 'admin') {
    return Response.json(
      { error: { code: 'FORBIDDEN', message: 'Admin approval required to delete protected link' } },
      { status: 403 }
    );
  }

  // Prepare update fields
  const updateFields: string[] = [];
  const updateValues: any[] = [];
  
  if (body.destination_url !== undefined) {
    updateFields.push('destination_url = ?');
    updateFields.push('destination_domain = ?');
    updateValues.push(body.destination_url);
    updateValues.push(body.destination_url ? new URL(body.destination_url).hostname : null);
    
    // If this is a base link, update all variants too
    if (!current.variant_of) {
      const variants = await env.DB.prepare(
        'SELECT id FROM links WHERE variant_of = ?'
      ).bind(id).all<any>();
      
      for (const variant of variants.results) {
        await env.DB.prepare(
          'UPDATE links SET destination_url = ?, destination_domain = ? WHERE id = ?'
        )
          .bind(body.destination_url, body.destination_url ? new URL(body.destination_url).hostname : null, variant.id)
          .run();
      }
    }
  }
  
  if (body.title !== undefined) {
    updateFields.push('title = ?');
    updateValues.push(body.title);
  }
  
  if (body.campaign !== undefined) {
    updateFields.push('campaign = ?');
    updateValues.push(body.campaign);
  }
  
  if (body.channel !== undefined) {
    updateFields.push('channel = ?');
    updateValues.push(body.channel);
  }
  
  if (body.owner !== undefined) {
    updateFields.push('owner = ?');
    updateValues.push(body.owner);
  }
  
  if (body.sponsor !== undefined) {
    updateFields.push('sponsor = ?');
    updateValues.push(body.sponsor);
  }
  
  if (body.opponent !== undefined) {
    updateFields.push('opponent = ?');
    updateValues.push(body.opponent);
  }
  
  if (body.competition !== undefined) {
    updateFields.push('competition = ?');
    updateValues.push(body.competition);
  }
  
  if (body.match_date !== undefined) {
    updateFields.push('match_date = ?');
    updateValues.push(body.match_date);
  }
  
  if (body.home_away !== undefined) {
    updateFields.push('home_away = ?');
    updateValues.push(body.home_away);
  }
  
  if (body.status !== undefined) {
    // Validate status transition
    const validTransitions = {
      active: ['paused', 'deleted'],
      paused: ['active'],
      expired: ['active'],
    };
    
    if (validTransitions[current.status]?.includes(body.status)) {
      updateFields.push('status = ?');
      updateValues.push(body.status);
      
      // If deleting, set deleted_at and suffix slug
      if (body.status === 'deleted') {
        const timestamp = new Date().toISOString();
        const slugSuffix = `__del_${timestamp.replace(/[:.]/g, '').replace('T', 't').replace('Z', 'z')}`;
        updateFields.push('deleted_at = ?');
        updateFields.push('slug = ?');
        updateValues.push(timestamp);
        updateValues.push(current.slug + slugSuffix);
      }
    } else {
      return Response.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid status transition' } },
        { status: 400 }
      );
    }
  }
  
  if (body.redirect_code !== undefined) {
    updateFields.push('redirect_code = ?');
    updateValues.push(body.redirect_code);
  }
  
  if (body.is_qr !== undefined) {
    updateFields.push('is_qr = ?');
    updateValues.push(body.is_qr ? 1 : 0);
  }
  
  if (body.is_offsite_ticket !== undefined) {
    updateFields.push('is_offsite_ticket = ?');
    updateValues.push(body.is_offsite_ticket ? 1 : 0);
  }
  
  if (body.is_protected !== undefined) {
    // Only Admin can set protected status
    if (user.role !== 'admin') {
      return Response.json(
        { error: { code: 'FORBIDDEN', message: 'Only Admin can set protected status' } },
        { status: 403 }
      );
    }
    updateFields.push('is_protected = ?');
    updateValues.push(body.is_protected ? 1 : 0);
  }
  
  if (body.expires_at !== undefined) {
    updateFields.push('expires_at = ?');
    updateValues.push(body.expires_at);
  }
  
  if (body.notes !== undefined) {
    updateFields.push('notes = ?');
    updateValues.push(body.notes);
  }
  
  // Always update updated_by and updated_at
  updateFields.push('updated_by = ?');
  updateFields.push('updated_at = ?');
  updateValues.push(user.email);
  updateValues.push(new Date().toISOString());
  
  if (updateFields.length === 0) {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', message: 'No fields to update' } },
      { status: 400 }
    );
  }
  
  const updateSql = `
    UPDATE links 
    SET ${updateFields.join(', ')}
    WHERE id = ?
  `;
  updateValues.push(id);
  
  try {
    await env.DB.prepare(updateSql).bind(...updateValues).run();
    
    const updated = await env.DB.prepare(
      'SELECT * FROM links WHERE id = ?'
    ).bind(id).first();
    
    return Response.json(updated);
  } catch (error) {
    return Response.json(
      { error: { code: 'DATABASE_ERROR', message: 'Failed to update link' } },
      { status: 500 }
    );
  }
}

export async function onRequestDelete(context: { request: Request; env: Env; params: { id: string } }): Promise<Response> {
  const request = context.request;
  const env = context.env;
  const { id } = context.params;

  const user = await getAuthUser(request, env.DB);

  // Get current link
  const current = await env.DB.prepare('SELECT * FROM links WHERE id = ?').bind(id).first<any>();
  if (!current) {
    return Response.json(
      { error: { code: 'NOT_FOUND', message: 'Link not found' } },
      { status: 404 }
    );
  }

  // Check if link is protected
  if (current.is_protected) {
    return Response.json(
      { error: { code: 'FORBIDDEN', message: 'Cannot delete protected link. Use PATCH with status=deleted' } },
      { status: 403 }
    );
  }

  // Soft delete: set deleted_at and suffix slug
  const timestamp = new Date().toISOString();
  const slugSuffix = `__del_${timestamp.replace(/[:.]/g, '').replace('T', 't').replace('Z', 'z')}`;
  
  try {
    await env.DB.prepare(
      'UPDATE links SET deleted_at = ?, slug = ?, status = ? WHERE id = ?'
    )
      .bind(timestamp, current.slug + slugSuffix, 'deleted', id)
      .run();

    return new Response(null, { status: 204 });
  } catch (error) {
    return Response.json(
      { error: { code: 'DATABASE_ERROR', message: 'Failed to delete link' } },
      { status: 500 }
    );
  }
}
```

### [ ] Step 4: Create admin/functions/api/links/[id]/restore.ts

Create `/home/ubuntu/rovrs/admin/functions/api/links/[id]/restore.ts`:

```typescript
import { assets, env } from 'cloudflare:workers';

interface Env {
  DB: D1Database;
}

async function getAuthUser(request: Request, db: D1Database): Promise<{ email: string; role: string }> {
  const cf = (request as any).cf;
  const jwt = cf?.['Cf-Access-Jwt-Assertion'] as string;

  if (!jwt) {
    throw new Error('Unauthorized');
  }

  const [payloadB64] = jwt.split('.');
  const payload = JSON.parse(atob(payloadB64));
  return { email: payload.email, role: payload.role || 'editor' };
}

async function checkRateLimit(email: string, db: D1Database): Promise<boolean> {
  const now = Date.now();
  const oneMinAgo = now - 60000;

  const result = await db
    .prepare(
      'SELECT COUNT(*) as count FROM rate_limits WHERE email = ? AND created_at > ?'
    )
    .bind(email, oneMinAgo)
    .first<{ count: number }>();

  return (result?.count ?? 0) < 10; // Allow 10 requests per minute per user
}

export async function onRequestPost(context: { request: Request; env: Env; params: { id: string } }): Promise<Response> {
  const request = context.request;
  const env = context.env;
  const { id } = context.params;

  const user = await getAuthUser(request, env.DB);

  try {
    await checkRateLimit((request as any).user.email, env.DB);
  } catch (error) {
    return Response.json(
      { error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
      { status: 429 }
    );
  }

  // Get current link
  const current = await env.DB.prepare('SELECT * FROM links WHERE id = ?').bind(id).first<any>();
  if (!current) {
    return Response.json(
      { error: { code: 'NOT_FOUND', message: 'Link not found' } },
      { status: 404 }
    );
  }

  // Check if link is already restored
  if (!current.deleted_at) {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Link is not deleted' } },
      { status: 400 }
    );
  }

  // Extract original slug (remove __del_ suffix)
  const originalSlug = current.slug.split('__del_')[0];
  
  // Check if original slug is available
  const existing = await env.DB.prepare(
    'SELECT id FROM links WHERE slug = ? AND id != ? AND deleted_at IS NULL'
  ).bind(originalSlug, id).first();
  
  if (existing) {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Original slug is in use by another link' } },
      { status: 400 }
    );
  }

  try {
    // Restore the link
    await env.DB.prepare(
      'UPDATE links SET deleted_at = NULL, slug = ?, status = ?, updated_by = ?, updated_at = ? WHERE id = ?'
    )
      .bind(originalSlug, 'active', user.email, new Date().toISOString(), id)
      .run();

    // Update any variants that might have been pointing to the suffixed slug
    await env.DB.prepare(
      'UPDATE links SET slug = ? WHERE variant_of = ? AND slug LIKE ?'
    )
      .bind(originalSlug, id, `${originalSlug}__del_%`)
      .run();

    const restored = await env.DB.prepare(
      'SELECT * FROM links WHERE id = ?'
    ).bind(id).first();

    return Response.json(restored);
  } catch (error) {
    return Response.json(
      { error: { code: 'DATABASE_ERROR', message: 'Failed to restore link' } },
      { status: 500 }
    );
  }
}
```

## Deployment

### Wrangler Configuration

Update `wrangler.toml` for the Pages Functions:

```toml
name = "rovrs-admin"
compatibility_date = "2024-12-07"

[env.production]
pages_build_output_dir = "./dist"
upload_format = "directory"

[env.production.vars]
ENVIRONMENT = "production"

[[env.production.d1_databases]]
binding = "DB"
database_id = "your-d1-database-id"
```

### Build Script

Update package.json:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "deploy": "wrangler pages deploy --project-name rovrs-admin"
  }
}
```

### Environment Variables

Create `.env` for development:

```env
DATABASE_URL="file:./dev.db"
```

## Testing

### Test Authentication

1. Create a test link:
```bash
curl -X POST https://admin.rov.rs/api/links \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLOUDFLARE_ACCESS_TOKEN" \
  -d '{"destination_url": "https://example.com", "title": "Test Link"}'
```

2. Check auth status:
```bash
curl https://admin.rov.rs/api/me
```

### Test CRUD Operations

1. List links:
```bash
curl https://admin.rov.rs/api/links
```

2. Get specific link:
```bash
curl https://admin.rov.rs/api/links/{link-id}
```

3. Update link:
```bash
curl -X PATCH https://admin.rov.rs/api/links/{link-id} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLOUDFLARE_ACCESS_TOKEN" \
  -d '{"title": "Updated Title"}'
```

4. Soft delete link:
```bash
curl -X DELETE https://admin.rov.rs/api/links/{link-id}
```

5. Restore link:
```bash
curl -X POST https://admin.rov.rs/api/links/{link-id}/restore \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLOUDFLARE_ACCESS_TOKEN"
```

## Next Steps

1. Implement rate limiting table in D1
2. Add validation utilities to shared package
3. Create API client wrappers for the admin SPA
4. Implement error handling middleware
5. Add request logging for debugging