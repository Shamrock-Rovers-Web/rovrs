import { Context, Hono } from 'hono';
import { rateLimits } from './schema';

export const RATE_LIMIT_REQUESTS = 100;
export const RATE_LIMIT_WINDOW_MINUTES = 1;
export const RATE_LIMIT_WINDOW_MS = RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;

interface RateLimitRecord {
  id: number;
  ip_address: string;
  path: string;
  count: number;
  window_start: string;
  window_end: string;
  created_at: string;
}

export async function isRateLimited(context: Context): Promise<boolean> {
  const request = context.req;
  const cfConnectingIP = request.header('CF-Connecting-IP') || request.header('X-Forwarded-For');
  const path = request.path;

  if (!cfConnectingIP) {
    return false;
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS).toISOString();
  const windowEnd = now.toISOString();

  try {
    // Clean up old rate limit records
    await rateLimits.prepare(`
      DELETE FROM rate_limits
      WHERE window_end < ?
    `).bind(windowStart).run();

    // Check current count
    const existing = await rateLimits.prepare(`
      SELECT id, count
      FROM rate_limits
      WHERE ip_address = ? AND path = ? AND window_end > ?
      ORDER BY window_end DESC
      LIMIT 1
    `).bind(cfConnectingIP, path, windowEnd).first<RateLimitRecord>();

    if (existing && existing.count >= RATE_LIMIT_REQUESTS) {
      return true;
    }

    // Insert or update rate limit record
    if (existing) {
      await rateLimits.prepare(`
        UPDATE rate_limits
        SET count = count + 1, window_start = ?, window_end = ?
        WHERE id = ?
      `).bind(windowStart, windowEnd, existing.id).run();
    } else {
      await rateLimits.prepare(`
        INSERT INTO rate_limits (ip_address, path, count, window_start, window_end)
        VALUES (?, ?, 1, ?, ?)
      `).bind(cfConnectingIP, path, windowStart, windowEnd).run();
    }

    return false;
  } catch (error) {
    console.error('Rate limit error:', error);
    // Don't block requests if rate limiting fails
    return false;
  }
}

export function applyRateLimit(app: Hono): void {
  app.use('*', async (c, next) => {
    if (await isRateLimited(c)) {
      return c.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }
    await next();
  });
}