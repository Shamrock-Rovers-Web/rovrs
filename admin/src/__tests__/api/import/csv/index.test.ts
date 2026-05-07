import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { csvIndex } from '../../../functions/api/import/csv/index';
import { eq } from 'drizzle-orm/expressions';

// Create a test app
const app = new Hono();
app.mount('/api/import/csv', csvIndex);

// Mock environment
const mockEnv = {
  DB: {
    prepare: vi.fn()
  }
};

// Mock user
const mockUser = {
  email: 'test@example.com'
};

describe('CSV Import API - Index', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset all mocks
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/import/csv', () => {
    it('should reject if no file is provided', async () => {
      const request = new Request('http://localhost/api/import/csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const response = await app.request(request, { ...mockEnv, user: mockUser });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('No file provided');
    });

    it('should reject non-CSV files', async () => {
      const formData = new FormData();
      formData.append('file', new File(['test content'], 'test.txt', { type: 'text/plain' }));

      const request = new Request('http://localhost/api/import/csv', {
        method: 'POST',
        body: formData
      });

      const response = await app.request(request, { ...mockEnv, user: mockUser });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('File must be a CSV');
    });

    it('should process valid CSV with multiple rows', async () => {
      const csvContent = `slug,destination_url,title,campaign,channel
tickets,https://shamrockrovers.ie/tickets,Tickets,,social
shop,https://shop.shamrockrovers.ie,Shop,email,`;

      const formData = new FormData();
      formData.append('file', new File([csvContent], 'test.csv', { type: 'text/csv' }));

      // Mock database operations
      const mockPrepare = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({ meta: { last_row_id: 1 } }),
        all: vi.fn().mockResolvedValue([{ count: 0 }]),
        first: vi.fn().mockResolvedValue(null)
      };

      mockEnv.DB.prepare = vi.fn().mockImplementation((query) => {
        if (query.includes('INSERT INTO import_jobs')) {
          return mockPrepare;
        } else if (query.includes('UPDATE import_jobs')) {
          return mockPrepare;
        }
        return mockPrepare;
      });

      vi.spyOn(Date, 'now').mockReturnValue(1640995200000); // Fixed timestamp

      const request = new Request('http://localhost/api/import/csv', {
        method: 'POST',
        body: formData
      });

      const response = await app.request(request, { ...mockEnv, user: mockUser });
      const data = await response.json();

      expect(response.status).toBe(202); // Accepted
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('processing');
      expect(data.data.total_rows).toBe(2);
      expect(data.data.valid_rows).toBe(2);
      expect(data.data.invalid_rows).toBe(0);
      expect(data.data.job_id).toMatch(/^import_\d+_[a-z0-9]+$/);
    });

    it('should reject rows with invalid URLs', async () => {
      const csvContent = `slug,destination_url
test,invalid-url`;

      const formData = new FormData();
      formData.append('file', new File([csvContent], 'test.csv', { type: 'text/csv' }));

      const mockPrepare = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({ meta: { last_row_id: 1 } }),
        all: vi.fn().mockResolvedValue([{ count: 0 }]),
        first: vi.fn().mockResolvedValue(null)
      };

      mockEnv.DB.prepare = vi.fn().mockImplementation((query) => {
        if (query.includes('INSERT INTO import_jobs')) {
          return mockPrepare;
        } else if (query.includes('UPDATE import_jobs')) {
          return mockPrepare;
        }
        return mockPrepare;
      });

      const request = new Request('http://localhost/api/import/csv', {
        method: 'POST',
        body: formData
      });

      const response = await app.request(request, { ...mockEnv, user: mockUser });
      const data = await response.json();

      expect(response.status).toBe(202);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('failed');
      expect(data.data.total_rows).toBe(1);
      expect(data.data.valid_rows).toBe(0);
      expect(data.data.invalid_rows).toBe(1);
      expect(data.data.errors).toHaveLength(1);
      expect(data.data.errors[0].field).toBe('destination_url');
      expect(data.data.errors[0].message).toBe('Invalid URL format');
    });

    it('should reject duplicate slugs', async () => {
      const csvContent = `slug,destination_url
tickets,https://example.com`;

      const formData = new FormData();
      formData.append('file', new File([csvContent], 'test.csv', { type: 'text/csv' }));

      const mockPrepare = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({ meta: { last_row_id: 1 } }),
        all: vi.fn().mockResolvedValue([{ count: 0 }]),
        first: vi.fn().mockResolvedValue({ slug: 'tickets' }) // Existing link
      };

      mockEnv.DB.prepare = vi.fn().mockImplementation((query) => {
        if (query.includes('INSERT INTO import_jobs')) {
          return mockPrepare;
        } else if (query.includes('UPDATE import_jobs')) {
          return mockPrepare;
        } else if (query.includes('SELECT slug FROM links')) {
          return mockPrepare;
        }
        return mockPrepare;
      });

      const request = new Request('http://localhost/api/import/csv', {
        method: 'POST',
        body: formData
      });

      const response = await app.request(request, { ...mockEnv, user: mockUser });
      const data = await response.json();

      expect(response.status).toBe(202);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('failed');
      expect(data.data.errors[0].field).toBe('slug');
      expect(data.data.errors[0].message).toBe('Slug already exists');
    });

    it('should reject invalid channels', async () => {
      const csvContent = `slug,destination_url,channel
test,https://example.com,invalid-channel`;

      const formData = new FormData();
      formData.append('file', new File([csvContent], 'test.csv', { type: 'text/csv' }));

      const mockPrepare = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({ meta: { last_row_id: 1 } }),
        all: vi.fn().mockResolvedValue([{ count: 0 }]),
        first: vi.fn().mockResolvedValue(null)
      };

      mockEnv.DB.prepare = vi.fn().mockImplementation((query) => {
        if (query.includes('INSERT INTO import_jobs')) {
          return mockPrepare;
        } else if (query.includes('UPDATE import_jobs')) {
          return mockPrepare;
        }
        return mockPrepare;
      });

      const request = new Request('http://localhost/api/import/csv', {
        method: 'POST',
        body: formData
      });

      const response = await app.request(request, { ...mockEnv, user: mockUser });
      const data = await response.json();

      expect(response.status).toBe(202);
      expect(data.success).toBe(true);
      expect(data.data.errors[0].field).toBe('channel');
      expect(data.data.errors[0].message).toContain('Channel must be one of');
    });

    it('should parse valid dates correctly', async () => {
      const csvContent = `slug,destination_url,expires_at
test,https://example.com,2025-12-31T23:59:59Z`;

      const formData = new FormData();
      formData.append('file', new File([csvContent], 'test.csv', { type: 'text/csv' }));

      const mockPrepare = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({ meta: { last_row_id: 1 } }),
        all: vi.fn().mockResolvedValue([{ count: 0 }]),
        first: vi.fn().mockResolvedValue(null)
      };

      mockEnv.DB.prepare = vi.fn().mockImplementation((query) => {
        if (query.includes('INSERT INTO import_jobs')) {
          return mockPrepare;
        } else if (query.includes('UPDATE import_jobs')) {
          return mockPrepare;
        }
        return mockPrepare;
      });

      const request = new Request('http://localhost/api/import/csv', {
        method: 'POST',
        body: formData
      });

      const response = await app.request(request, { ...mockEnv, user: mockUser });
      const data = await response.json();

      expect(response.status).toBe(202);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('processing');
      expect(data.data.valid_rows).toBe(1);
    });
  });
});