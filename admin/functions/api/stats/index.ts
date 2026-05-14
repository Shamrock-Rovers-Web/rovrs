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
    const [
      totalLinks,
      activeLinks,
      clicksToday,
      clicks7d,
      clicks30d,
      qrClicksToday,
      qrClicks7d,
      qrClicks30d,
      topLinks,
    ] = await Promise.all([
      context.env.DB.prepare("SELECT COUNT(*) as total FROM links WHERE status != 'deleted'").first<{ total: number }>(),
      context.env.DB.prepare("SELECT COUNT(*) as total FROM links WHERE status = 'active'").first<{ total: number }>(),
      context.env.DB.prepare(
        "SELECT COUNT(*) as total FROM click_events WHERE clicked_at >= datetime('now', '-1 day')"
      ).first<{ total: number }>(),
      context.env.DB.prepare(
        "SELECT COUNT(*) as total FROM click_events WHERE clicked_at >= datetime('now', '-7 days')"
      ).first<{ total: number }>(),
      context.env.DB.prepare(
        "SELECT COUNT(*) as total FROM click_events WHERE clicked_at >= datetime('now', '-30 days')"
      ).first<{ total: number }>(),
      context.env.DB.prepare(
        `SELECT COUNT(*) as total FROM click_events ce
         JOIN links l ON ce.link_id = l.id
         WHERE l.is_qr = 1 AND ce.clicked_at >= datetime('now', '-1 day')`
      ).first<{ total: number }>(),
      context.env.DB.prepare(
        `SELECT COUNT(*) as total FROM click_events ce
         JOIN links l ON ce.link_id = l.id
         WHERE l.is_qr = 1 AND ce.clicked_at >= datetime('now', '-7 days')`
      ).first<{ total: number }>(),
      context.env.DB.prepare(
        `SELECT COUNT(*) as total FROM click_events ce
         JOIN links l ON ce.link_id = l.id
         WHERE l.is_qr = 1 AND ce.clicked_at >= datetime('now', '-30 days')`
      ).first<{ total: number }>(),
      context.env.DB.prepare(
        `SELECT l.slug, l.title, COUNT(ce.id) as clicks
         FROM links l
         JOIN click_events ce ON ce.link_id = l.id
         WHERE ce.clicked_at >= datetime('now', '-7 days') AND l.status != 'deleted'
         GROUP BY l.id
         ORDER BY clicks DESC LIMIT 5`
      ).all(),
    ]);

    return json({
      success: true,
      data: {
        total_links: totalLinks?.total || 0,
        active_links: activeLinks?.total || 0,
        clicks_today: clicksToday?.total || 0,
        clicks_7d: clicks7d?.total || 0,
        clicks_30d: clicks30d?.total || 0,
        qr_clicks_today: qrClicksToday?.total || 0,
        qr_clicks_7d: qrClicks7d?.total || 0,
        qr_clicks_30d: qrClicks30d?.total || 0,
        top_links: topLinks.results,
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return json({ success: false, error: 'Failed to fetch stats' }, 500);
  }
};
