interface Env {
  DB: D1Database;
}

interface ClickEvent {
  id: string;
  link_id?: string;
  slug: string;
  timestamp: string;
  clicked_at?: string;
  country?: string;
  referrer?: string;
  device_type?: string;
  is_bot?: number;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  event_type?: string;
}

export default {
  async queue(batch: MessageBatch<ClickEvent>, env: Env): Promise<void> {
    const events = batch.messages.map((msg) => msg.body);

    if (events.length === 0) return;

    const placeholders = events.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    const params = events.flatMap((event) => [
      event.id,
      event.link_id || null,
      event.slug,
      event.clicked_at || event.timestamp,
      event.country || null,
      event.referrer || null,
      event.device_type || null,
      event.is_bot || 0,
      event.utm_source || null,
      event.utm_medium || null,
      event.event_type || 'click',
    ]);

    try {
      await env.DB
        .prepare(
          `INSERT INTO click_events (id, link_id, slug, clicked_at, country, referrer, device_type, is_bot, utm_source, utm_medium, event_type) VALUES ${placeholders}`
        )
        .bind(...params)
        .run();
      console.log(`Inserted ${events.length} click events`);
    } catch (error) {
      console.error('Error inserting click events:', error);
      // Mark all messages for retry
      for (const msg of batch.messages) {
        msg.retry({ delaySeconds: 30 });
      }
    }
  },
};
