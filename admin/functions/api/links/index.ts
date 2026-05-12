interface Env {
  DB: D1Database;
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') || '';
    const channel = url.searchParams.get('channel') || '';
    const campaign = url.searchParams.get('campaign') || '';
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '20'), 1), 100);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0);
    const sort_by = url.searchParams.get('sort_by') || 'created_at';
    const sort_order = url.searchParams.get('sort_order') === 'asc' ? 'ASC' : 'DESC';

    const allowedSorts = ['created_at', 'updated_at', 'expires_at', 'title', 'slug'];
    const safeSort = allowedSorts.includes(sort_by) ? sort_by : 'created_at';

    const conditions: string[] = ["status != 'deleted'"];
    const params: any[] = [];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    if (channel) {
      conditions.push('channel = ?');
      params.push(channel);
    }
    if (campaign) {
      conditions.push('campaign = ?');
      params.push(campaign);
    }
    if (search) {
      conditions.push('(slug LIKE ? OR destination_url LIKE ? OR title LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    const where = conditions.join(' AND ');

    const countResult = await context.env.DB.prepare(
      `SELECT COUNT(*) as total FROM links WHERE ${where}`
    ).bind(...params).first<{ total: number }>();

    const linksData = await context.env.DB.prepare(
      `SELECT l.*, (SELECT COUNT(*) FROM click_events WHERE link_id = l.id) as click_count
       FROM links l
       WHERE ${where}
       ORDER BY l.${safeSort} ${sort_order}
       LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all();

    return json({
      success: true,
      data: linksData.results,
      pagination: {
        total: countResult?.total || 0,
        limit,
        offset,
        has_more: offset + limit < (countResult?.total || 0),
      },
    });
  } catch (error) {
    console.error('Error fetching links:', error);
    return json({ success: false, error: 'Failed to fetch links' }, 500);
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const input = await context.request.json() as Record<string, any>;

    if (!input.slug || !input.destination_url) {
      return json({ success: false, error: 'slug and destination_url are required' }, 400);
    }

    const slug = String(input.slug).toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$/.test(slug)) {
      return json({ success: false, error: 'Invalid slug format' }, 400);
    }

    try {
      const url = new URL(input.destination_url);
      if (['javascript:', 'data:', 'file:', 'ftp:'].includes(url.protocol)) {
        return json({ success: false, error: 'Blocked URL protocol' }, 400);
      }
    } catch {
      return json({ success: false, error: 'Invalid destination URL' }, 400);
    }

    const existing = await context.env.DB.prepare(
      "SELECT id FROM links WHERE slug = ? AND status != 'deleted'"
    ).bind(slug).first();
    if (existing) {
      return json({ success: false, error: 'Slug already exists' }, 409);
    }

    let destinationDomain: string | null = null;
    try {
      destinationDomain = new URL(input.destination_url).hostname;
    } catch {}

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    await context.env.DB.prepare(`
      INSERT INTO links (id, slug, destination_url, destination_domain, title, campaign, channel,
        owner, sponsor, opponent, competition, match_date, home_away,
        status, redirect_code, is_qr, is_offsite_ticket, show_offsite_preview, is_protected,
        variant_of, expires_at, notes, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, slug, input.destination_url, destinationDomain,
      input.title || null, input.campaign || null, input.channel || null,
      input.owner || null, input.sponsor || null, input.opponent || null,
      input.competition || null, input.match_date || null, input.home_away || null,
      input.status || 'active', input.redirect_code || 302,
      input.is_qr ? 1 : 0, input.is_offsite_ticket ? 1 : 0,
      input.show_offsite_preview ? 1 : 0, input.is_protected ? 1 : 0,
      input.variant_of || null, input.expires_at || null, input.notes || null,
      input.created_by || 'admin', now
    ).run();

    const created = await context.env.DB.prepare(
      'SELECT * FROM links WHERE id = ?'
    ).bind(id).first();

    return json({ success: true, data: created }, 201);
  } catch (error) {
    console.error('Error creating link:', error);
    return json({ success: false, error: 'Failed to create link' }, 500);
  }
};
