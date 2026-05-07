import type { D1Database } from '@cloudflare/workers-types';

interface Link {
  slug: string;
  destination: string;
  destination_url?: string;
  destination_domain?: string;
  campaign?: string;
  channel?: string;
  status: 'active' | 'deleted' | 'expired' | 'paused';
  expiry_date?: string;
  match_date?: string;
  created_at: string;
  updated_at: string;
  // Variant support
  variant_of?: string;
}

interface LinkLookupResult {
  link: Link | null;
  shouldUpdateStatus: boolean;
}

export async function lookupLink(
  db: D1Database,
  slug: string
): Promise<LinkLookupResult> {
  const now = new Date().toISOString();

  // Query for the link
  const { results } = await db
    .prepare('SELECT * FROM links WHERE slug = ?')
    .bind(slug)
    .all();

  const link = results?.[0] as Link | null;

  if (!link) {
    return { link: null, shouldUpdateStatus: false };
  }

  // Check if link is expired
  const isExpired = link.expiry_date && link.expiry_date < now;

  // Check if match date has passed
  const isMatchDatePassed = link.match_date && link.match_date < now;

  // Update status if expired and currently active
  const shouldUpdateStatus = isExpired && link.status === 'active';

  if (shouldUpdateStatus) {
    await updateLinkStatus(db, slug, 'expired');
    return { link: null, shouldUpdateStatus: true };
  }

  // Return null if link is not active
  if (link.status !== 'active' || isMatchDatePassed) {
    return { link: null, shouldUpdateStatus: false };
  }

  return { link, shouldUpdateStatus: false };
}

export async function updateLinkStatus(
  db: D1Database,
  slug: string,
  status: 'active' | 'deleted' | 'expired' | 'paused'
): Promise<void> {
  await db
    .prepare('UPDATE links SET status = ?, updated_at = ? WHERE slug = ?')
    .bind(status, new Date().toISOString(), slug)
    .run();
}

export function handleRedirect(link: Link): Response {
  const isEvergreen = ['tickets', 'shop', 'fixtures'].includes(link.slug);
  const status = isEvergreen ? 301 : 302;

  // Use destination_url if available, otherwise fall back to destination
  let url = link.destination_url || link.destination;

  try {
    const urlObj = new URL(url);

    // Add UTM tags if present in link metadata
    if (link.campaign || link.channel) {
      const params = new URLSearchParams(urlObj.search);
      if (link.campaign) {
        params.set('utm_campaign', link.campaign);
      }
      if (link.channel) {
        params.set('utm_channel', link.channel);
      }
      urlObj.search = params.toString();
      url = urlObj.toString();
    }
  } catch (e) {
    // If URL parsing fails, use as-is
    console.warn('Invalid URL:', url);
  }

  return new Response(null, {
    status,
    headers: {
      Location: url,
    },
  });
}

interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  db: 'ok' | 'error';
  queue: 'ok' | 'error';
  details: {
    db_latency?: number;
    queue_status?: string;
  };
}

export async function handleHealth(db: D1Database, queue?: any): Promise<Response> {
  const startTime = Date.now();
  const health: HealthStatus = {
    status: 'ok',
    db: 'ok',
    queue: 'ok',
    details: {}
  };

  try {
    // Check database connectivity
    const dbStart = Date.now();
    await db
      .prepare('SELECT COUNT(*) as count FROM links')
      .first();
    health.details.db_latency = Date.now() - dbStart;

    // Check queue connectivity if queue is provided
    if (queue) {
      try {
        // Send a test message to verify queue connectivity
        const testMessage = {
          id: `test-${Date.now()}`,
          slug: 'health-check',
          timestamp: new Date().toISOString(),
          test: true
        };

        await queue.send(testMessage);

        // Receive and immediately acknowledge the test message
        const messages = await queue.receive(1, { waitSeconds: 1 });
        if (messages.length > 0) {
          await queue.ack(messages[0].id);
          health.details.queue_status = 'ready';
        } else {
          health.status = 'degraded';
          health.queue = 'error';
          health.details.queue_status = 'no_messages';
        }
      } catch (error) {
        console.error('Queue health check failed:', error);
        health.status = 'degraded';
        health.queue = 'error';
        health.details.queue_status = 'error';
      }
    }
  } catch (error) {
    console.error('Health check failed:', error);
    health.status = 'error';
    health.db = 'error';
  }

  const responseTime = Date.now() - startTime;

  return new Response(JSON.stringify({
    ...health,
    response_time: responseTime
  }), {
    status: health.status === 'ok' ? 200 : (health.status === 'degraded' ? 206 : 503),
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export function handleRootRedirect(): Response {
  return new Response(null, {
    status: 302,
    headers: {
      Location: 'https://shamrockrovers.ie',
    },
  });
}