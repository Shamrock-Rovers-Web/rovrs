/**
 * Database helper utilities for building queries and parsing data
 */

/**
 * Build WHERE clause from filter object
 */
export function buildWhereClause(filters: Record<string, any>): string {
  const conditions: string[] = [];

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (typeof value === 'string' && value.includes('%')) {
      conditions.push(`${key} LIKE ?`);
    } else if (Array.isArray(value)) {
      if (value.length > 0) {
        const placeholders = value.map(() => '?').join(', ');
        conditions.push(`${key} IN (${placeholders})`);
      }
    } else if (typeof value === 'object' && value !== null) {
      // Handle comparison operators
      if ('gt' in value) {
        conditions.push(`${key} > ?`);
      }
      if ('gte' in value) {
        conditions.push(`${key} >= ?`);
      }
      if ('lt' in value) {
        conditions.push(`${key} < ?`);
      }
      if ('lte' in value) {
        conditions.push(`${key} <= ?`);
      }
      if ('ne' in value) {
        conditions.push(`${key} != ?`);
      }
    } else {
      conditions.push(`${key} = ?`);
    }
  }

  return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
}

/**
 * Build pagination clause
 */
export function buildPagination(limit: number, offset: number): string {
  return `LIMIT ${limit} OFFSET ${offset}`;
}

/**
 * Parse device type from User-Agent string
 */
export function parseDeviceType(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
  const mobileRegex = /Mobile|Android|iPhone|iPad|iPod/i;
  const tabletRegex = /iPad|Android(?!.*Mobile)/i;

  if (tabletRegex.test(userAgent)) {
    return 'tablet';
  }

  if (mobileRegex.test(userAgent)) {
    return 'mobile';
  }

  return 'desktop';
}

/**
 * Get current UTC timestamp
 */
export function nowUTC(): Date {
  return new Date();
}

/**
 * Convert Date to ISO string for database storage
 */
export function toISODate(date: Date): string {
  return date.toISOString();
}