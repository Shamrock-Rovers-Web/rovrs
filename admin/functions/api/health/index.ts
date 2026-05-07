import { db } from '../db';

interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  db: 'ok' | 'error';
  queue: 'ok' | 'error';
  details: {
    db_latency?: number;
    queue_status?: string;
  };
}

export const onRequestGet: ExportedHandler<Env> = async (context) => {
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
    await db.prepare('SELECT COUNT(*) as count FROM links').first();
    health.details.db_latency = Date.now() - dbStart;

    // Check queue connectivity
    const env = context.env as any;
    if (env.CLICK_EVENTS_QUEUE) {
      try {
        // Send a test message to verify queue connectivity
        const testMessage = {
          id: `test-${Date.now()}`,
          slug: 'health-check',
          timestamp: new Date().toISOString(),
          test: true
        };

        await env.CLICK_EVENTS_QUEUE.send(testMessage);

        // Receive and immediately acknowledge the test message
        const messages = await env.CLICK_EVENTS_QUEUE.receive(1, { waitSeconds: 1 });
        if (messages.length > 0) {
          await env.CLICK_EVENTS_QUEUE.ack(messages[0].id);
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
    } else {
      health.details.queue_status = 'not_configured';
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
};