import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Context } from 'hono';
import { Hono } from 'hono';
import archivesDownload from '../../functions/api/archives/download/[date]';
import { createHono } from 'hono/testing';

// Mock environment
const mockEnv = {
  ARCHIVE_BUCKET: {
    list: vi.fn(),
    get: vi.fn(),
    sign: vi.fn()
  }
};

const createMockContext = (date: string) => {
  const app = createHono();
  return {
    req: new Request(`https://admin.rov.rs/api/archives/download/${date}`, {
      method: 'GET'
    }),
    env: mockEnv as any
  } as unknown as Context;
};

describe('Archive Download API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject invalid date formats', async () => {
    const c = createMockContext('2024/01/01');
    const response = await archivesDownload(c);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'Invalid date format. Use YYYY-MM-DD.'
    });
  });

  it('should reject invalid dates', async () => {
    const c = createMockContext('2024-13-01');
    const response = await archivesDownload(c);
    expect(response.status).toBe(404); // Since new Date('2024-13-01') is invalid
    expect(await response.json()).toEqual({
      error: 'Invalid date'
    });
  });

  it('should return 404 when archive does not exist', async () => {
    // Mock list to return objects but not for our specific key
    mockEnv.ARCHIVE_BUCKET.list.mockResolvedValue({
      objects: [
        { key: 'archive/2024/01/2024-01-02.json' },
        { key: 'archive/2024/01/2024-01-03.json' }
      ]
    });

    const c = createMockContext('2024-01-01');
    const response = await archivesDownload(c);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: 'No archive found for date: 2024-01-01'
    });
  });

  it('should return archive download info when archive exists', async () => {
    const mockKey = 'archive/2024/01/2024-01-01.json';
    const mockContent = JSON.stringify([
      { id: 1, slug: 'test1', timestamp: '2024-01-01T00:00:00Z' },
      { id: 2, slug: 'test2', timestamp: '2024-01-01T00:01:00Z' },
      { id: 3, slug: 'test3', timestamp: '2024-01-01T00:02:00Z' }
    ]);

    mockEnv.ARCHIVE_BUCKET.list.mockResolvedValue({
      objects: [
        { key: mockKey }
      ]
    });

    mockEnv.ARCHIVE_BUCKET.get.mockResolvedValue({
      text: () => Promise.resolve(mockContent)
    } as any);

    mockEnv.ARCHIVE_BUCKET.sign.mockResolvedValue(
      'https://rovrs-admin-storage.r2.dev/archive/2024/01/2024-01-01.json?token=abc123'
    );

    const c = createMockContext('2024-01-01');
    const response = await archivesDownload(c);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toEqual({
      date: '2024-01-01',
      records: 3,
      download_url: 'https://rovrs-admin-storage.r2.dev/archive/2024/01/2024-01-01.json?token=abc123'
    });
  });

  it('should handle archive with records field', async () => {
    const mockContent = JSON.stringify({
      records: [
        { id: 1, slug: 'test1' },
        { id: 2, slug: 'test2' }
      ],
      metadata: { total: 2 }
    });

    mockEnv.ARCHIVE_BUCKET.list.mockResolvedValue({
      objects: [
        { key: 'archive/2024/01/2024-01-01.json' }
      ]
    });

    mockEnv.ARCHIVE_BUCKET.get.mockResolvedValue({
      text: () => Promise.resolve(mockContent)
    } as any);

    mockEnv.ARCHIVE_BUCKET.sign.mockResolvedValue(
      'https://rovrs-admin-storage.r2.dev/archive/2024/01/2024-01-01.json?token=abc123'
    );

    const c = createMockContext('2024-01-01');
    const response = await archivesDownload(c);
    expect(response.status).toBe(200);
    expect((await response.json()).records).toBe(2);
  });

  it('should handle malformed JSON gracefully', async () => {
    const mockContent = 'invalid json content';

    mockEnv.ARCHIVE_BUCKET.list.mockResolvedValue({
      objects: [
        { key: 'archive/2024/01/2024-01-01.json' }
      ]
    });

    mockEnv.ARCHIVE_BUCKET.get.mockResolvedValue({
      text: () => Promise.resolve(mockContent)
    } as any);

    mockEnv.ARCHIVE_BUCKET.sign.mockResolvedValue(
      'https://rovrs-admin-storage.r2.dev/archive/2024/01/2024-01-01.json?token=abc123'
    );

    const c = createMockContext('2024-01-01');
    const response = await archivesDownload(c);
    expect(response.status).toBe(200);

    // Should estimate records based on file size
    const data = await response.json();
    expect(data.records).toBeGreaterThan(0);
    expect(data.records).toBeLessThan(10); // ~100 chars per record
  });

  it('should handle R2 errors gracefully', async () => {
    mockEnv.ARCHIVE_BUCKET.list.mockRejectedValue(new Error('R2 access denied'));

    const c = createMockContext('2024-01-01');
    const response = await archivesDownload(c);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: 'Failed to access archive storage'
    });
  });

  it('should handle null object response', async () => {
    mockEnv.ARCHIVE_BUCKET.list.mockResolvedValue({
      objects: [
        { key: 'archive/2024/01/2024-01-01.json' }
      ]
    });

    mockEnv.ARCHIVE_BUCKET.get.mockResolvedValue(null);

    const c = createMockContext('2024-01-01');
    const response = await archivesDownload(c);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: 'Archive found but inaccessible for date: 2024-01-01'
    });
  });
});