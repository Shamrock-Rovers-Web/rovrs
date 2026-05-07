// Archival worker for cleaning up expired links
export interface Env {
  KV_LINKS: KVNamespace;
  DB: D1Database;
  ARCHIVAL_QUEUE: DurableObjectNamespace;
  ENVIRONMENT: string;
}

export default {
  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    console.log(`Archival worker triggered at ${new Date().toISOString()}`);

    try {
      await cleanupExpiredLinks(env);
    } catch (error) {
      console.error('Error in archival processing:', error);
      throw error;
    }
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const body = await request.json();
    const { slug } = body;

    if (!slug) {
      return new Response('Slug is required', { status: 400 });
    }

    try {
      await markLinkAsDeleted(env, slug);
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Failed to delete link' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};

async function cleanupExpiredLinks(env: Env): Promise<void> {
  const now = new Date().toISOString();
  console.log(`Cleaning up expired links at ${now}`);

  // Get expired links from database
  const { results } = await env.DB.prepare(`
    SELECT slug FROM links
    WHERE status = 'active' AND expiry_date IS NOT NULL AND expiry_date < ?
  `).bind(now).all();

  if (results.length === 0) {
    console.log('No expired links found');
    return;
  }

  console.log(`Found ${results.length} expired links`);

  // Update status to expired
  const slugs = results.map((r: any) => r.slug);
  const placeholders = slugs.map((_, i) => `?`).join(',');

  await env.DB.prepare(`
    UPDATE links
    SET status = 'expired', updated_at = ?
    WHERE slug IN (${placeholders})
  `).bind(now, ...slugs).run();

  // Remove from KV
  for (const slug of slugs) {
    await env.KV_LINKS.delete(slug);
  }

  console.log(`Processed ${slugs.length} expired links`);
}

async function markLinkAsDeleted(env: Env, slug: string): Promise<void> {
  const now = new Date().toISOString();

  // Update in database
  await env.DB.prepare(`
    UPDATE links
    SET status = 'deleted', updated_at = ?
    WHERE slug = ?
  `).bind(now, slug).run();

  // Remove from KV
  await env.KV_LINKS.delete(slug);
}