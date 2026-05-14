export async function enqueueClickEvent(
  queue: Queue | null,
  db: D1Database,
  slug: string,
  request: Request
): Promise<void> {
  const url = new URL(request.url);
  const userAgent = request.headers.get('User-Agent') || '';
  const referer = request.headers.get('Referer');
  const cfCountry = (request as any).cf?.country;
  const isBot = /bot|crawl|spider|slurp|mediapartners/i.test(userAgent);

  // Look up link_id from slug
  const link = await db.prepare('SELECT id FROM links WHERE slug = ? LIMIT 1').bind(slug).first<{ id: string }>();
  const linkId = link?.id || slug;

  const event = {
    id: crypto.randomUUID(),
    link_id: linkId,
    slug,
    clicked_at: new Date().toISOString(),
    country: cfCountry || null,
    referrer: referer || null,
    device_type: getDeviceType(userAgent),
    is_bot: isBot ? 1 : 0,
    utm_source: url.searchParams.get('utm_source') || null,
    utm_medium: url.searchParams.get('utm_medium') || null,
    utm_campaign: url.searchParams.get('utm_campaign') || null,
    event_type: 'click',
  };

  if (queue) {
    try {
      await queue.send(event);
      return;
    } catch {
      // Fall through to D1 direct write
    }
  }

  await db.prepare(`
    INSERT INTO click_events (id, link_id, slug, clicked_at, country, referrer, device_type, is_bot, utm_source, utm_medium, utm_campaign)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    event.id, event.link_id, event.slug, event.clicked_at, event.country,
    event.referrer, event.device_type, event.is_bot,
    event.utm_source, event.utm_medium, event.utm_campaign
  ).run();
}

function getDeviceType(ua: string): string {
  if (/Mobile|Android.*Mobile|iPhone|iPod/.test(ua)) return 'mobile';
  if (/iPad|Android(?!.*Mobile)|Tablet/.test(ua)) return 'tablet';
  return 'desktop';
}
