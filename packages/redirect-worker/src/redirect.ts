import type { D1Database } from '@cloudflare/workers-types';

interface Link {
  id: string;
  slug: string;
  destination_url: string;
  destination_domain: string | null;
  title: string | null;
  campaign: string | null;
  channel: string | null;
  status: string;
  redirect_code: number;
  is_protected: number;
  is_offsite_ticket: number;
  show_offsite_preview: number;
  variant_of: string | null;
  expires_at: string | null;
  match_date: string | null;
  created_at: string;
  updated_at: string | null;
}

interface LinkLookupResult {
  link: Link | null;
}

const FALLBACK_URL = 'https://www.shamrockrovers.ie/first-team-tickets';
const PROTECTED_SLUGS = new Set(['tickets', 'shop', 'fixtures', 'members', 'academy', 'women']);

export async function lookupLink(db: D1Database, slug: string): Promise<LinkLookupResult> {
  try {
    const result = await db
      .prepare('SELECT * FROM links WHERE slug = ? AND status != ?')
      .bind(slug, 'deleted')
      .first() as Link | null;

    if (!result) {
      return { link: null };
    }

    const now = new Date();

    // Check expiry
    if (result.expires_at && new Date(result.expires_at) < now) {
      if (result.status === 'active') {
        await db
          .prepare('UPDATE links SET status = ?, updated_at = datetime("now") WHERE id = ?')
          .bind('expired', result.id)
          .run();
      }
      return { link: null };
    }

    // Check match date passed (+4 hours)
    if (result.match_date) {
      const matchEnd = new Date(result.match_date);
      matchEnd.setHours(matchEnd.getHours() + 4);
      if (matchEnd < now) {
        return { link: null };
      }
    }

    // Only return active links
    if (result.status !== 'active') {
      return { link: null };
    }

    return { link: result };
  } catch (error) {
    console.error('DB lookup error:', error);
    return { link: null };
  }
}

export function handleRedirect(link: Link): Response {
  const isEvergreen = PROTECTED_SLUGS.has(link.slug);
  const status = isEvergreen ? 301 : (link.redirect_code || 302);

  return new Response(null, {
    status,
    headers: {
      Location: link.destination_url,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}

export function handleRootRedirect(): Response {
  return new Response(null, {
    status: 302,
    headers: {
      Location: 'https://www.shamrockrovers.ie',
      'Cache-Control': 'no-cache',
    },
  });
}

export async function handleHealth(db: D1Database, queue?: any): Promise<Response> {
  const health: Record<string, any> = {
    status: 'ok',
    db: 'ok',
    timestamp: new Date().toISOString(),
  };

  try {
    await db.prepare('SELECT 1 as ok').first();
  } catch (error) {
    health.status = 'error';
    health.db = 'error';
    return new Response(JSON.stringify(health), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(health), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
