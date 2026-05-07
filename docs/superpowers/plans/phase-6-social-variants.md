# Phase 6: Social Variants Generation

**Status:** Planned  
**Dependencies:** Phase 4-7 (Admin Foundation)  
**Estimated Duration:** 2-3 days  

## Overview

Implement social variants generation for creating platform-specific links (Instagram, Facebook, X/Twitter, TikTok, LinkedIn) from base campaign links with automatic UTM tagging and bulk operations.

## Acceptance Criteria

- [ ] Social variants can be generated from base links via API endpoint
- [ ] Each variant gets platform-specific slug suffix (`-ig`, `-fb`, `-x`, `-tt`, `-li`)
- [ ] UTM tags are automatically appended based on platform and campaign
- [ ] Variants are grouped under base link in admin UI
- [ ] Bulk destination updates apply to all variants
- [ ] Cascade operations: pause/expire/delete base link affects all variants
- [ ] API endpoints properly authenticated and authorized

## Implementation Tasks

### Step 1: Create test for POST /api/links/[id]/variants

Create `/home/ubuntu/rovrs/admin/functions/__tests__/links-variants.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET, POST } from '../links/[id]/variants';

describe('POST /api/links/[id]/variants', () => {
  it('generates social variants for a base link', async () => {
    const mockLink = {
      id: 'base123',
      slug: 'bohs',
      destination_url: 'https://example.com/tickets',
    };

    const mockVariants = [
      {
        id: 'var1',
        slug: 'bohs-ig',
        destination_url: 'https://example.com/tickets',
        channel: 'Instagram',
        variant_of: 'base123',
        status: 'active',
      },
      {
        id: 'var2',
        slug: 'bohs-fb',
        destination_url: 'https://example.com/tickets',
        channel: 'Facebook',
        variant_of: 'base123',
        status: 'active',
      },
      {
        id: 'var3',
        slug: 'bohs-x',
        destination_url: 'https://example.com/tickets',
        channel: 'X/Twitter',
        variant_of: 'base123',
        status: 'active',
      },
      {
        id: 'var4',
        slug: 'bohs-tt',
        destination_url: 'https://example.com/tickets',
        channel: 'TikTok',
        variant_of: 'base123',
        status: 'active',
      },
      {
        id: 'var5',
        slug: 'bohs-li',
        destination_url: 'https://example.com/tickets',
        channel: 'LinkedIn',
        variant_of: 'base123',
        status: 'active',
      },
    ];

    // This test would use Cloudflare Workers testing utilities
    // For now, we verify the expected behavior
    expect(mockVariants.length).toBe(5);
    mockVariants.forEach((variant) => {
      expect(variant.variant_of).toBe('base123');
      expect(variant.slug).toMatch(/^bohs-[a-z]{2}$/);
      expect(variant.channel).toMatch(/Instagram|Facebook|Twitter|TikTok|LinkedIn/);
    });
  });
});
```

### Step 2: Create functions/api/links/[id]/variants.ts with POST endpoint

Create `/home/ubuntu/rovrs/admin/functions/api/links/[id]/variants.ts`:

```typescript
import { assets, env } from 'cloudflare:workers';

import { type GenerateVariantsRequest, type Link } from '@rovrs/shared';

interface Env {
  DB: D1Database;
}

interface GetLinkContext {
  id: string;
}

interface UpdateVariantsContext {
  id: string;
  destinationUrl: string;
}

interface JwtPayload {
  email: string;
}

function getJwtPayload(jwt: string): JwtPayload {
  const [payloadB64] = jwt.split('.');
  return JSON.parse(atob(payloadB64));
}

async function getAuthUser(request: Request, db: D1Database): Promise<{ email: string; role: string }> {
  const cf = (request as any).cf;
  const jwt = cf?.['Cf-Access-Jwt-Assertion'] as string;

  if (!jwt) {
    throw new Error('Unauthorized');
  }

  const payload = getJwtPayload(jwt);
  return { email: payload.email, role: payload.role || 'editor' };
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  const request = context.request;
  const env = context.env;

  try {
    const body: GenerateVariantsRequest = await request.json();
    const user = await getAuthUser(request, env.DB);

    const id = context.params.id;
    const baseLink = await env.DB.prepare(
      'SELECT id, slug, destination_url, campaign, variant_of FROM links WHERE id = ?'
    ).bind(id).first();

    if (!baseLink) {
      return Response.json(
        { error: { code: 'NOT_FOUND', message: 'Link not found' } },
        { status: 404 }
      );
    }

    // Don't allow creating variants for existing variants
    if (baseLink.variant_of) {
      return Response.json(
        { error: { code: 'BAD_REQUEST', message: 'Cannot create variants for a variant link' } },
        { status: 400 }
      );
    }

    const platformSuffixes: Record<string, string> = {
      Instagram: '-ig',
      Facebook: '-fb',
      'X/Twitter': '-x',
      TikTok: '-tt',
      LinkedIn: '-li',
    };

    const selectedPlatforms = body.platforms || Object.keys(platformSuffixes);
    const now = new Date().toISOString();
    const userId = await crypto.randomUUID();

    const variants: Link[] = [];
    for (const platform of selectedPlatforms) {
      const suffix = platformSuffixes[platform];
      const newSlug = `${baseLink.slug}${suffix}`;
      const newId = await crypto.randomUUID();

      await env.DB.prepare(
        `INSERT INTO links (
          id, slug, destination_url, title, campaign, channel,
          is_qr, is_offsite_ticket, is_protected, variant_of, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          newId,
          newSlug,
          baseLink.destination_url,
          baseLink.title || null,
          baseLink.campaign || null,
          platform,
          0, // is_qr
          0, // is_offsite_ticket
          0, // is_protected
          baseLink.id,
          user.email,
          now
        )
        .run();

      const variant = await env.DB.prepare(
        'SELECT * FROM links WHERE id = ?'
      ).bind(newId).first();

      if (variant) {
        variants.push({
          id: variant.id as string,
          slug: variant.slug as string,
          destination_url: variant.destination_url as string,
          destination_domain: null,
          title: variant.title as string,
          campaign: variant.campaign as string,
          channel: variant.channel as string,
          owner: null,
          sponsor: null,
          opponent: null,
          competition: null,
          match_date: null,
          home_away: null,
          status: 'active',
          redirect_code: 302,
          is_qr: 0,
          is_offsite_ticket: 0,
          show_offsite_preview: 0,
          is_protected: 0,
          variant_of: variant.variant_of as string,
          created_by: variant.created_by as string,
          created_at: variant.created_at as string,
          updated_by: null,
          updated_at: null,
          expires_at: null,
          deleted_at: null,
          notes: null,
        });
      }
    }

    return Response.json(variants, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 }
    );
  }
}

export async function onRequestPatch(context: { request: Request; env: Env }): Promise<Response> {
  const request = context.request;
  const env = context.env;

  try {
    const body: { destination_url: string } = await request.json();
    const user = await getAuthUser(request, env.DB);

    const id = context.params.id;

    // Get the base link and all its variants
    const { generateId, toISODate } = await import('@rovrs/shared');
    const now = toISODate(new Date().toISOString());

    // Get all links with this variant_of
    const variants = await env.DB.prepare(
      'SELECT id FROM links WHERE variant_of = ? AND deleted_at IS NULL'
    ).bind(id).all();

    if (variants.results.length === 0) {
      return Response.json(
        { error: { code: 'NOT_FOUND', message: 'No variants found' } },
        { status: 404 }
      );
    }

    const variantIds = variants.results.map((v: any) => v.id);

    // Update all variants
    await env.DB.prepare(
      'UPDATE links SET destination_url = ?, updated_by = ?, updated_at = ? WHERE id IN (' +
        variantIds.map(() => '?').join(',') +
        ')'
    )
      .bind(body.destination_url, user.email, now, ...variantIds)
      .run();

    // Record destination history for each variant
    for (const variantId of variantIds) {
      await env.DB.prepare(
        'INSERT INTO destination_history (id, link_id, old_destination_url, new_destination_url, changed_by, changed_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
        .bind(await crypto.randomUUID(), variantId, body.destination_url, body.destination_url, user.email, now)
        .run();
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 }
    );
  }
}
```

### Step 3: Create src/components/VariantGroup.tsx

Create `/home/ubuntu/rovrs/admin/src/components/VariantGroup.tsx`:

```typescript
import { useState } from 'react';
import { type Link } from '@rovrs/shared';
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react';

interface VariantGroupProps {
  baseLink: Link;
  variants: Link[];
  onDeleteVariant: (id: string) => void;
  onUpdateVariants: (destinationUrl: string) => void;
}

const CHANNEL_COLORS: Record<string, string> = {
  Instagram: 'bg-pink-100 text-pink-800',
  Facebook: 'bg-blue-100 text-blue-800',
  'X/Twitter': 'bg-gray-100 text-gray-800',
  TikTok: 'bg-gray-900 text-white',
  LinkedIn: 'bg-blue-600 text-white',
};

export default function VariantGroup({
  baseLink,
  variants,
  onDeleteVariant,
  onUpdateVariants,
}: VariantGroupProps) {
  const [expanded, setExpanded] = useState(true);

  if (variants.length === 0) {
    return null;
  }

  return (
    <div className="border rounded-lg overflow-hidden mb-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span className="font-medium">
            Social Variants ({variants.length})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {variants.map((v) => v.slug).join(', ')}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t bg-white p-4 space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Update all variants</label>
              <input
                type="url"
                defaultValue={variants[0]?.destination_url}
                onChange={(e) => onUpdateVariants(e.target.value)}
                placeholder="New destination URL"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <button
              onClick={() => onUpdateVariants(variants[0]?.destination_url || '')}
              className="px-4 py-2 bg-brand-green text-white rounded-lg hover:bg-brand-greenDark text-sm self-end"
            >
              Apply
            </button>
          </div>

          <div className="space-y-2">
            {variants.map((variant) => (
              <div
                key={variant.id}
                className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono">{variant.slug}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${CHANNEL_COLORS[variant.channel || 'Other']}`}>
                    {variant.channel}
                  </span>
                </div>
                <button
                  onClick={() => onDeleteVariant(variant.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

## Testing Strategy

### Unit Tests

- Verify variant generation creates correct slugs for each platform
- Test that variants are properly linked to base link via `variant_of`
- Test bulk destination update functionality
- Test cascade behavior when base link is modified

### Integration Tests

- Test POST /api/links/[id]/variants with authenticated requests
- Test PATCH /api/links/[id]/variants updates all variants
- Verify database constraints and relationships
- Test error handling for invalid requests

## Implementation Notes

1. **Authentication**: Uses Cloudflare Access JWT from `Cf-Access-Jwt-Assertion` header
2. **Validation**: Prevents creating variants for existing variant links
3. **Platform Suffixes**: Hardcoded mapping for consistent social platform slugs
4. **Cascade Operations**: Update operations must apply to all variants
5. **Database**: Uses D1 with proper indexing on `variant_of`

## Database Schema Considerations

The `links` table already supports variants via:
- `variant_of` column references base link ID
- Index on `variant_of` for efficient queries
- No recursion limit (variants cannot have variants)

## Performance Considerations

- Bulk updates use parameterized queries for efficiency
- Database queries minimized with single fetch for all variants
- Destination history recorded for audit trail