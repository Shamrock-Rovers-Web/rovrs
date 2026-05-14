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
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50'), 1), 100);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0);

    const countResult = await context.env.DB.prepare(
      `SELECT COUNT(*) as total FROM links
       WHERE status != 'deleted' AND (
         is_qr = 1
         OR id IN (SELECT DISTINCT link_id FROM click_events WHERE utm_source = 'qr')
       )`
    ).first<{ total: number }>();

    const qrLinks = await context.env.DB.prepare(
      `SELECT l.*,
         (SELECT COUNT(*) FROM click_events WHERE link_id = l.id) as click_count,
         (SELECT COUNT(*) FROM click_events WHERE link_id = l.id AND utm_source = 'qr') as qr_click_count
       FROM links l
       WHERE l.status != 'deleted' AND (
         l.is_qr = 1
         OR l.id IN (SELECT DISTINCT ce.link_id FROM click_events ce WHERE ce.utm_source = 'qr')
       )
       ORDER BY l.created_at DESC
       LIMIT ? OFFSET ?`
    ).bind(limit, offset).all();

    return json({
      success: true,
      data: qrLinks.results,
      pagination: {
        total: countResult?.total || 0,
        limit,
        offset,
        has_more: offset + limit < (countResult?.total || 0),
      },
    });
  } catch (error) {
    console.error('Error fetching QR links:', error);
    return json({ success: false, error: 'Failed to fetch QR links' }, 500);
  }
};
