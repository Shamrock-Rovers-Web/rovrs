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
    const slug = context.params.slug as string;

    const link = await context.env.DB.prepare(`
      SELECT l.*, (SELECT COUNT(*) FROM click_events WHERE link_id = l.id) as click_count
      FROM links l
      WHERE l.slug = ? AND l.status != 'deleted'
    `).bind(slug).first();

    if (!link) {
      return json({ success: false, error: 'Link not found' }, 404);
    }

    return json({ success: true, data: link });
  } catch (error) {
    console.error('Error fetching link:', error);
    return json({ success: false, error: 'Failed to fetch link' }, 500);
  }
};

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  try {
    const slug = context.params.slug as string;
    const input = await context.request.json() as Record<string, any>;

    const existing = await context.env.DB.prepare(
      "SELECT id FROM links WHERE slug = ? AND status != 'deleted'"
    ).bind(slug).first<{ id: string }>();

    if (!existing) {
      return json({ success: false, error: 'Link not found' }, 404);
    }

    const allowedFields = [
      'destination_url', 'title', 'campaign', 'channel', 'owner', 'sponsor',
      'opponent', 'competition', 'match_date', 'home_away', 'status',
      'redirect_code', 'is_qr', 'is_offsite_ticket', 'show_offsite_preview',
      'is_protected', 'expires_at', 'notes'
    ];

    const updates: string[] = [];
    const values: any[] = [];

    for (const field of allowedFields) {
      if (input[field] !== undefined) {
        updates.push(`${field} = ?`);
        if (['is_qr', 'is_offsite_ticket', 'show_offsite_preview', 'is_protected'].includes(field)) {
          values.push(input[field] ? 1 : 0);
        } else {
          values.push(input[field]);
        }
      }
    }

    if (input.destination_url) {
      try {
        const hostname = new URL(input.destination_url).hostname;
        updates.push('destination_domain = ?');
        values.push(hostname);
      } catch {}
    }

    if (updates.length === 0) {
      return json({ success: false, error: 'No valid fields to update' }, 400);
    }

    updates.push('updated_at = datetime("now")');
    values.push(existing.id);

    await context.env.DB.prepare(
      `UPDATE links SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    const updated = await context.env.DB.prepare(
      'SELECT * FROM links WHERE id = ?'
    ).bind(existing.id).first();

    return json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating link:', error);
    return json({ success: false, error: 'Failed to update link' }, 500);
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    const slug = context.params.slug as string;

    const existing = await context.env.DB.prepare(
      "SELECT id FROM links WHERE slug = ? AND status != 'deleted'"
    ).bind(slug).first<{ id: string }>();

    if (!existing) {
      return json({ success: false, error: 'Link not found' }, 404);
    }

    await context.env.DB.prepare(`
      UPDATE links SET status = 'deleted', deleted_at = datetime("now"), updated_at = datetime("now")
      WHERE id = ?
    `).bind(existing.id).run();

    return json({ success: true, message: 'Link deleted' });
  } catch (error) {
    console.error('Error deleting link:', error);
    return json({ success: false, error: 'Failed to delete link' }, 500);
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const slug = context.params.slug as string;
    const url = new URL(context.request.url);

    if (url.pathname.endsWith('/restore')) {
      const deleted = await context.env.DB.prepare(
        "SELECT id FROM links WHERE slug = ? AND status = 'deleted'"
      ).bind(slug).first<{ id: string }>();

      if (!deleted) {
        return json({ success: false, error: 'Deleted link not found' }, 404);
      }

      await context.env.DB.prepare(`
        UPDATE links SET status = 'active', deleted_at = NULL, updated_at = datetime("now")
        WHERE id = ?
      `).bind(deleted.id).run();

      return json({ success: true, message: 'Link restored' });
    }

    if (url.pathname.endsWith('/stats')) {
      const link = await context.env.DB.prepare(
        "SELECT id FROM links WHERE slug = ?"
      ).bind(slug).first<{ id: string }>();

      if (!link) {
        return json({ success: false, error: 'Link not found' }, 404);
      }

      const stats = await context.env.DB.prepare(`
        SELECT
          COUNT(*) as total_clicks,
          COUNT(DISTINCT country) as unique_countries,
          MIN(clicked_at) as first_click,
          MAX(clicked_at) as last_click
        FROM click_events WHERE link_id = ?
      `).bind(link.id).first();

      const byCountry = await context.env.DB.prepare(`
        SELECT country, COUNT(*) as clicks
        FROM click_events WHERE link_id = ?
        GROUP BY country ORDER BY clicks DESC LIMIT 10
      `).bind(link.id).all();

      const byDay = await context.env.DB.prepare(`
        SELECT DATE(clicked_at) as date, COUNT(*) as clicks
        FROM click_events WHERE link_id = ?
        GROUP BY DATE(clicked_at) ORDER BY date DESC LIMIT 30
      `).bind(link.id).all();

      return json({
        success: true,
        data: {
          summary: stats,
          by_country: byCountry.results,
          by_day: byDay.results,
        },
      });
    }

    return json({ success: false, error: 'Unknown action' }, 400);
  } catch (error) {
    console.error('Error in link action:', error);
    return json({ success: false, error: 'Failed to process action' }, 500);
  }
};
