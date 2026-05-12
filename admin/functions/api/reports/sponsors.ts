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
    const sponsor = url.searchParams.get('sponsor') || '';

    if (!sponsor) {
      const sponsors = await context.env.DB.prepare(`
        SELECT sponsor, COUNT(*) as link_count
        FROM links
        WHERE sponsor IS NOT NULL AND status != 'deleted'
        GROUP BY sponsor
        ORDER BY link_count DESC
      `).all();

      return json({ success: true, data: sponsors.results });
    }

    const links = await context.env.DB.prepare(`
      SELECT l.*,
        (SELECT COUNT(*) FROM click_events WHERE link_id = l.id) as click_count
      FROM links l
      WHERE l.sponsor = ? AND l.status != 'deleted'
      ORDER BY l.created_at DESC
    `).bind(sponsor).all();

    const totalClicks = links.results.reduce((sum: number, l: any) => sum + (l.click_count || 0), 0);

    return json({
      success: true,
      data: {
        sponsor,
        total_links: links.results.length,
        total_clicks: totalClicks,
        links: links.results,
      },
    });
  } catch (error) {
    console.error('Error fetching sponsor report:', error);
    return json({ success: false, error: 'Failed to fetch sponsor report' }, 500);
  }
};
