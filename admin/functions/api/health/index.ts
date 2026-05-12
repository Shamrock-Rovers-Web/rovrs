interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const health: Record<string, any> = {
    status: 'ok',
    db: 'ok',
    timestamp: new Date().toISOString(),
  };

  try {
    const start = Date.now();
    await context.env.DB.prepare('SELECT 1 as ok').first();
    health.db_latency = Date.now() - start;
  } catch {
    health.status = 'error';
    health.db = 'error';
    return new Response(JSON.stringify(health), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(health), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
