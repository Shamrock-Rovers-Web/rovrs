import {
  lookupLink,
  updateLinkStatus,
  handleRedirect,
  handleHealth,
  handleRootRedirect,
  type HealthStatus
} from '../src/redirect';
import { SimpleD1Mock } from '../src/simple-d1-mock';

// Mock global Date to control expiry logic
const mockDate = new Date('2024-12-01T00:00:00Z');
const OriginalDate = Date;
global.Date = class extends Date {
  constructor() {
    return mockDate;
  }
} as any;

describe('lookupLink', () => {
  let db: SimpleD1Mock;

  beforeEach(() => {
    db = new SimpleD1Mock();
    db.setTable('links', [
      {
        slug: 'tickets',
        destination: 'https://ticket.shamrockrovers.ie',
        destination_url: undefined,
        destination_domain: undefined,
        status: 'active',
        expiry_date: null,
        match_date: null,
        campaign: 'tickets',
        channel: 'organic',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        slug: 'expired-link',
        destination: 'https://example.com',
        destination_url: undefined,
        destination_domain: undefined,
        status: 'active',
        expiry_date: '2024-01-01T00:00:00Z', // Already expired
        match_date: null,
        campaign: null,
        channel: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        slug: 'deleted-link',
        destination: 'https://example.com',
        destination_url: undefined,
        destination_domain: undefined,
        status: 'deleted',
        expiry_date: null,
        match_date: null,
        campaign: null,
        channel: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        slug: 'match-expired',
        destination: 'https://example.com',
        destination_url: undefined,
        destination_domain: undefined,
        status: 'active',
        expiry_date: null,
        match_date: '2024-01-01T00:00:00Z', // Match date in past
        campaign: null,
        channel: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ]);
  });

  test('returns active link for valid slug', async () => {
    const result = await lookupLink(db, 'tickets');

    expect(result.link).toBeDefined();
    expect(result.link!.slug).toBe('tickets');
    expect(result.link!.status).toBe('active');
    expect(result.shouldUpdateStatus).toBe(false);
  });

  test('returns null for unknown slug', async () => {
    const result = await lookupLink(db, 'unknown');

    expect(result.link).toBeNull();
    expect(result.shouldUpdateStatus).toBe(false);
  });

  test('returns null for deleted slug', async () => {
    const result = await lookupLink(db, 'deleted-link');

    expect(result.link).toBeNull();
    expect(result.shouldUpdateStatus).toBe(false);
  });

  test('returns null for expired link and updates status', async () => {
    const result = await lookupLink(db, 'expired-link');

    expect(result.link).toBeNull();
    expect(result.shouldUpdateStatus).toBe(true);

    // Verify the status was updated in the database
    const { results } = await db.prepare('SELECT * FROM links WHERE slug = ?').bind('expired-link').all();
    expect(results?.[0]?.status).toBe('expired');
  });

  test('returns null when match date has passed', async () => {
    const result = await lookupLink(db, 'match-expired');

    expect(result.link).toBeNull();
    expect(result.shouldUpdateStatus).toBe(false);
  });
});

describe('updateLinkStatus', () => {
  let db: SimpleD1Mock;

  beforeEach(() => {
    db = new SimpleD1Mock();
    db.setTable('links', [
      {
        slug: 'test-link',
        destination: 'https://example.com',
        destination_url: undefined,
        destination_domain: undefined,
        status: 'active',
        expiry_date: null,
        match_date: null,
        campaign: null,
        channel: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ]);
  });

  test('updates link status in database', async () => {
    await updateLinkStatus(db, 'test-link', 'paused');

    const { results } = await db.prepare('SELECT * FROM links WHERE slug = ?').bind('test-link').all();
    expect(results?.[0]?.status).toBe('paused');
    expect(results?.[0]?.updated_at).not.toBe('2024-01-01T00:00:00Z');
  });
});

describe('handleRedirect', () => {
  test('returns 302 redirect for regular link', () => {
    const link = {
      slug: 'regular-link',
      destination: 'https://example.com/path',
      destination_url: undefined,
      destination_domain: undefined,
      status: 'active',
      expiry_date: null,
      match_date: null,
      campaign: null,
      channel: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    const response = handleRedirect(link);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('https://example.com/path');
  });

  test('returns 301 redirect for evergreen link', () => {
    const link = {
      slug: 'tickets',
      destination: 'https://ticket.shamrockrovers.ie',
      destination_url: undefined,
      destination_domain: undefined,
      status: 'active',
      expiry_date: null,
      match_date: null,
      campaign: 'tickets',
      channel: 'organic',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    const response = handleRedirect(link);

    expect(response.status).toBe(301);
  });

  test('appends UTM tags when campaign and channel are present', () => {
    const link = {
      slug: 'campaign-link',
      destination: 'https://example.com/path',
      destination_url: undefined,
      destination_domain: undefined,
      status: 'active',
      expiry_date: null,
      match_date: null,
      campaign: 'summer-sale',
      channel: 'social',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    const response = handleRedirect(link);

    expect(response.headers.get('Location')).toBe('https://example.com/path?utm_campaign=summer-sale&utm_channel=social');
  });

  test('preserves existing URL parameters while adding UTM tags', () => {
    const link = {
      slug: 'complex-link',
      destination: 'https://example.com/path',
      destination_url: 'https://example.com/path?existing=param&test=true',
      destination_domain: undefined,
      status: 'active',
      expiry_date: null,
      match_date: null,
      campaign: 'email',
      channel: 'newsletter',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    const response = handleRedirect(link);

    expect(response.headers.get('Location')).toBe(
      'https://example.com/path?existing=param&test=true&utm_campaign=email&utm_channel=newsletter'
    );
  });

  test('handles invalid URL gracefully', () => {
    const link = {
      slug: 'invalid-url',
      destination: 'not-a-valid-url',
      destination_url: undefined,
      destination_domain: undefined,
      status: 'active',
      expiry_date: null,
      match_date: null,
      campaign: null,
      channel: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    const response = handleRedirect(link);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('not-a-valid-url');
  });
});

describe('handleHealth', () => {
  let db: SimpleD1Mock;

  beforeEach(() => {
    db = new SimpleD1Mock();
    db.setTable('links', []);
  });

  test('returns 200 OK when database is healthy', async () => {
    const response = await handleHealth(db);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/plain');
    const text = await response.text();
    expect(text).toBe('OK');
  });

  test('returns 503 when database query fails', async () => {
    db.setErrorMode(true);

    const response = await handleHealth(db);

    expect(response.status).toBe(503);
    expect(response.headers.get('Content-Type')).toBe('text/plain');
    const text = await response.text();
    expect(text).toBe('Service Unavailable');
  });
});

describe('handleRootRedirect', () => {
  test('returns 302 redirect to shamrockrovers.ie', () => {
    const response = handleRootRedirect();

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('https://shamrockrovers.ie');
  });
});

// Restore original Date after tests
afterAll(() => {
  global.Date = OriginalDate;
});

describe('handleHealth', () => {
  let mockDb: SimpleD1Mock;

  beforeEach(() => {
    mockDb = new SimpleD1Mock();
    mockDb.setTable('links', []);
  });

  it('should return healthy status when database is accessible', async () => {
    const response = await handleHealth(mockDb as any);
    const data = JSON.parse(await response.text()) as HealthStatus;

    expect(response.status).toBe(200);
    expect(data.status).toBe('ok');
    expect(data.db).toBe('ok');
    expect(data.queue).toBe('ok');
    expect(data.details.db_latency).toBeGreaterThan(0);
    expect(data.details.queue_status).toBeUndefined();
  });

  it('should return degraded status when database check fails', async () => {
    const brokenDb = {
      prepare: () => ({
        first: () => Promise.reject(new Error('Connection failed'))
      })
    } as any;

    const response = await handleHealth(brokenDb);
    const data = JSON.parse(await response.text()) as HealthStatus;

    expect(response.status).toBe(503);
    expect(data.status).toBe('error');
    expect(data.db).toBe('error');
  });

  it('should check queue connectivity when queue is provided', async () => {
    const mockQueue = {
      send: jest.fn().mockResolvedValue(undefined),
      receive: jest.fn().mockResolvedValue([
        {
          id: 'test-id',
          body: { slug: 'test', timestamp: new Date().toISOString() }
        }
      ]),
      ack: jest.fn().mockResolvedValue(undefined)
    };

    const response = await handleHealth(mockDb as any, mockQueue);
    const data = JSON.parse(await response.text()) as HealthStatus;

    expect(response.status).toBe(200);
    expect(data.status).toBe('ok');
    expect(data.queue).toBe('ok');
    expect(data.details.queue_status).toBe('ready');
    expect(mockQueue.send).toHaveBeenCalled();
    expect(mockQueue.receive).toHaveBeenCalled();
    expect(mockQueue.ack).toHaveBeenCalled();
  });

  it('should return degraded status when queue check fails', async () => {
    const mockQueue = {
      send: jest.fn().mockRejectedValue(new Error('Queue unavailable'))
    };

    const response = await handleHealth(mockDb as any, mockQueue);
    const data = JSON.parse(await response.text()) as HealthStatus;

    expect(response.status).toBe(206);
    expect(data.status).toBe('degraded');
    expect(data.queue).toBe('error');
    expect(data.details.queue_status).toBe('error');
  });

  it('should include response time in the response', async () => {
    const startTime = Date.now();
    const response = await handleHealth(mockDb as any);
    const endTime = Date.now();
    const data = JSON.parse(await response.text()) as HealthStatus;

    expect(data.response_time).toBeGreaterThan(0);
    expect(data.response_time).toBeLessThan(endTime - startTime + 10);
  });
});