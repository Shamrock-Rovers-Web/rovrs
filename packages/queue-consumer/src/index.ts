interface Env {
  DB: D1Database;
  CLICK_EVENTS_QUEUE: Queue;
}

interface ClickEvent {
  id: string;
  slug: string;
  timestamp: string;
  userAgent?: string;
  referer?: string;
  ip?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

export default {
  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    const { cron } = event;
    console.log(`Queue consumer triggered at ${new Date().toISOString()} for cron: ${cron}`);

    try {
      await processBatch(env);
    } catch (error) {
      console.error('Error in scheduled queue processing:', error);
      throw error;
    }
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
  },
};

async function processBatch(env: Env): Promise<void> {
  const maxBatchSize = 100;
  const maxBatchTimeout = 30 * 1000; // 30 seconds
  const startTime = Date.now();

  let processedCount = 0;
  let hasMore = true;

  try {
    while (hasMore && processedCount < maxBatchSize && Date.now() - startTime < maxBatchTimeout) {
      // Receive batch from queue
      const messages = await env.CLICK_EVENTS_QUEUE.receive(maxBatchSize - processedCount, {
        waitSeconds: 5,
        maxRetries: 3,
      });

      if (messages.length === 0) {
        hasMore = false;
        break;
      }

      console.log(`Processing ${messages.length} messages...`);

      // Process and insert into D1
      const clickEvents = messages.map(msg => ({
        id: msg.id,
        slug: msg.body.slug,
        timestamp: msg.body.timestamp || new Date().toISOString(),
        userAgent: msg.body.userAgent,
        referer: msg.body.referer,
        ip: msg.body.ip,
        utm_source: msg.body.utm_source,
        utm_medium: msg.body.utm_medium,
        utm_campaign: msg.body.utm_campaign,
        utm_term: msg.body.utm_term,
        utm_content: msg.body.utm_content,
      }));

      await insertClickEvents(env.DB, clickEvents);

      // Acknowledge processed messages
      for (const msg of messages) {
        await env.CLICK_EVENTS_QUEUE.ack(msg.id);
      }

      processedCount += messages.length;
      console.log(`Processed ${processedCount} messages total`);
    }

    console.log(`Batch processing completed. Processed ${processedCount} messages in ${Date.now() - startTime}ms`);
  } catch (error) {
    console.error('Error processing batch:', error);
    throw error;
  }
}

async function insertClickEvents(db: D1Database, events: ClickEvent[]): Promise<void> {
  if (events.length === 0) return;

  const values = events.map((_, index) => `(${index + 1})`).join(',');

  const sql = `
    INSERT INTO click_events (
      id, slug, timestamp, user_agent, referer, ip,
      utm_source, utm_medium, utm_campaign, utm_term, utm_content
    ) VALUES ${values}
  `;

  const params = events.flatMap(event => [
    event.id,
    event.slug,
    event.timestamp,
    event.userAgent || null,
    event.referer || null,
    event.ip || null,
    event.utm_source || null,
    event.utm_medium || null,
    event.utm_campaign || null,
    event.utm_term || null,
    event.utm_content || null,
  ]);

  try {
    const result = await db.prepare(sql).bind(...params).run();
    console.log(`Inserted ${result.changes} click events`);
  } catch (error) {
    console.error('Error inserting click events:', error);
    throw error;
  }
}