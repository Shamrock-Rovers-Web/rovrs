import { buildWhereClause, buildPagination, parseDeviceType, nowUTC, toISODate } from '../src/db';

describe('buildWhereClause', () => {
  it('should build simple equality conditions', () => {
    const filters = { status: 'active', created_by: 'user1' };
    const result = buildWhereClause(filters);
    expect(result).toBe('WHERE status = ? AND created_by = ?');
  });

  it('should build LIKE conditions for strings with %', () => {
    const filters = { slug: 'test%', destination: 'example.com%' };
    const result = buildWhereClause(filters);
    expect(result).toBe('WHERE slug LIKE ? AND destination LIKE ?');
  });

  it('should build IN conditions for arrays', () => {
    const filters = { status: ['active', 'pending'], channel: ['social', 'email'] };
    const result = buildWhereClause(filters);
    expect(result).toBe('WHERE status IN (?, ?) AND channel IN (?, ?)');
  });

  it('should skip null and undefined values', () => {
    const filters = { status: 'active', deleted_at: null, updated_by: undefined };
    const result = buildWhereClause(filters);
    expect(result).toBe('WHERE status = ?');
  });

  it('should build comparison operators', () => {
    const filters = {
      created_at: { gt: '2024-01-01' },
      clicks: { gte: 100 },
      expires_at: { lte: '2024-12-31' },
      priority: { lt: 5 },
      slug: { ne: 'test' }
    };
    const result = buildWhereClause(filters);
    expect(result).toBe('WHERE created_at > ? AND clicks >= ? AND expires_at <= ? AND priority < ? AND slug != ?');
  });

  it('should handle mixed conditions', () => {
    const filters = {
      status: 'active',
      created_at: { gt: '2024-01-01' },
      channel: ['social', 'email']
    };
    const result = buildWhereClause(filters);
    expect(result).toBe('WHERE status = ? AND created_at > ? AND channel IN (?, ?)');
  });

  it('should return empty string for no valid filters', () => {
    const filters = { deleted_at: null, updated_by: undefined };
    const result = buildWhereClause(filters);
    expect(result).toBe('');
  });
});

describe('buildPagination', () => {
  it('should build pagination with limit and offset', () => {
    expect(buildPagination(10, 0)).toBe('LIMIT 10 OFFSET 0');
    expect(buildPagination(20, 10)).toBe('LIMIT 20 OFFSET 10');
    expect(buildPagination(50, 100)).toBe('LIMIT 50 OFFSET 100');
  });

  it('should handle zero offset', () => {
    expect(buildPagination(10, 0)).toBe('LIMIT 10 OFFSET 0');
  });

  it('should handle zero limit', () => {
    expect(buildPagination(0, 0)).toBe('LIMIT 0 OFFSET 0');
  });
});

describe('parseDeviceType', () => {
  it('should identify mobile devices', () => {
    expect(parseDeviceType('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)')).toBe('mobile');
    expect(parseDeviceType('Mozilla/5.0 (Android 11; Mobile; rv:68.0)')).toBe('mobile');
    expect(parseDeviceType('Mozilla/5.0 (Mobile; rv:68.0)')).toBe('mobile');
  });

  it('should identify tablet devices', () => {
    expect(parseDeviceType('Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)')).toBe('tablet');
    expect(parseDeviceType('Mozilla/5.0 (Android 10; Tablet; rv:68.0)')).toBe('tablet');
  });

  it('should identify desktop devices', () => {
    expect(parseDeviceType('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe('desktop');
    expect(parseDeviceType('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('desktop');
    expect(parseDeviceType('Mozilla/5.0 (X11; Linux x86_64)')).toBe('desktop');
  });
});

describe('nowUTC', () => {
  it('should return current UTC date', () => {
    const before = new Date();
    const result = nowUTC();
    const after = new Date();

    expect(result).toBeInstanceOf(Date);
    expect(result.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(result.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should return the same time within a short window', () => {
    const time1 = nowUTC().getTime();
    const time2 = nowUTC().getTime();
    const diff = Math.abs(time1 - time2);

    // Should be very close (within 10ms)
    expect(diff).toBeLessThan(10);
  });
});

describe('toISODate', () => {
  it('should convert Date to ISO string', () => {
    const date = new Date('2024-01-01T00:00:00.000Z');
    const result = toISODate(date);
    expect(result).toBe('2024-01-01T00:00:00.000Z');
  });

  it('should handle different time zones', () => {
    const date = new Date('2024-01-01T12:00:00+02:00');
    const result = toISODate(date);
    expect(result).toBe('2024-01-01T10:00:00.000Z');
  });
});