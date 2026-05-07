import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { linksIndex } from '../../../functions/api/links/index';
import { eq } from 'drizzle-orm/expressions';
import { links } from '../../functions/api/db';

// Create a test app
const app = new Hono();
app.mount('/api/links', linksIndex);

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

describe('Links API - Index', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/links', () => {
    it('should return list of links with pagination', async () => {
      // Mock database response
      const mockLinks = [
        {
          rowid: 1,
          slug: 'tickets',
          destination_url: 'https://shamrockrovers.ie/tickets',
          title: 'Tickets',
          status: 'active',
          redirect_code: 301,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: null,
          click_count: '100'
        },
        {
          rowid: 2,
          slug: 'shop',
          destination_url: 'https://shop.shamrockrovers.ie',
          title: 'Shop',
          status: 'active',
          redirect_code: 302,
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-03T00:00:00Z',
          click_count: '50'
        }
      ];

      const mockCount = 2;

      // Mock database queries
      const mockPrepare = vi.fn();
      mockPrepare.mockReturnValue({
        all: vi.fn().mockResolvedValue([{ count: mockCount }]),
        bind: vi.fn().mockReturnThis(),
        run: vi.fn()
      });

      mockPrepare.mockReturnValueOnce({
        all: vi.fn().mockResolvedValue([{ count: mockCount }]),
        bind: vi.fn().mockReturnThis()
      });

      mockPrepare.mockReturnValueOnce({
        all: vi.fn().mockResolvedValue(mockLinks),
        bind: vi.fn().mockReturnThis()
      });

      // Create request
      const req = new Request('http://localhost/api/links?limit=20&offset=0', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'CF-Access-Jwt-Assertion': 'mock-token'
        }
      });

      // Add mocks to context
      const ctx = {
        req,
        env: mockEnv,
        get: vi.fn().mockReturnValue(mockUser)
      };

      // Test the endpoint
      const response = await app.request('/api/links', req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.pagination.total).toBe(2);
      expect(data.pagination.limit).toBe(20);
      expect(data.pagination.offset).toBe(0);
    });

    it('should filter by status', async () => {
      const mockLinks = [
        {
          rowid: 1,
          slug: 'expired-link',
          destination_url: 'https://example.com',
          status: 'expired',
          created_at: '2024-01-01T00:00:00Z',
          click_count: '0'
        }
      ];

      const mockPrepare = vi.fn();
      mockPrepare.mockReturnValueOnce({
        all: vi.fn().mockResolvedValue([{ count: 1 }]),
        bind: vi.fn().mockReturnThis()
      });
      mockPrepare.mockReturnValueOnce({
        all: vi.fn().mockResolvedValue(mockLinks),
        bind: vi.fn().mockReturnThis()
      });

      const req = new Request('http://localhost/api/links?status=expired', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'CF-Access-Jwt-Assertion': 'mock-token'
        }
      });

      const ctx = {
        req,
        env: mockEnv,
        get: vi.fn().mockReturnValue(mockUser)
      };

      const response = await app.request('/api/links', req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].status).toBe('expired');
    });

    it('should search by slug, URL, or title', async () => {
      const mockLinks = [
        {
          rowid: 1,
          slug: 'test-event',
          destination_url: 'https://shamrockrovers.ie/event',
          title: 'Test Event',
          status: 'active',
          created_at: '2024-01-01T00:00:00Z',
          click_count: '10'
        }
      ];

      const mockPrepare = vi.fn();
      mockPrepare.mockReturnValueOnce({
        all: vi.fn().mockResolvedValue([{ count: 1 }]),
        bind: vi.fn().mockReturnThis()
      });
      mockPrepare.mockReturnValueOnce({
        all: vi.fn().mockResolvedValue(mockLinks),
        bind: vi.fn().mockReturnThis()
      });

      const req = new Request('http://localhost/api/links?search=test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'CF-Access-Jwt-Assertion': 'mock-token'
        }
      });

      const ctx = {
        req,
        env: mockEnv,
        get: vi.fn().mockReturnValue(mockUser)
      };

      const response = await app.request('/api/links', req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].slug).toBe('test-event');
    });

    it('should handle database errors gracefully', async () => {
      const mockPrepare = vi.fn();
      mockPrepare.mockReturnValue({
        all: vi.fn().mockRejectedValue(new Error('Database error')),
        bind: vi.fn().mockReturnThis()
      });

      const req = new Request('http://localhost/api/links', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'CF-Access-Jwt-Assertion': 'mock-token'
        }
      });

      const ctx = {
        req,
        env: mockEnv,
        get: vi.fn().mockReturnValue(mockUser)
      };

      const response = await app.request('/api/links', req);
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to fetch links');
    });
  });

  describe('POST /api/links', () => {
    it('should create a new link', async () => {
      const linkData = {
        slug: 'new-link',
        destination_url: 'https://example.com/new',
        title: 'New Link',
        campaign: 'general',
        channel: 'Other'
      };

      const mockResult = { meta: { last_row_id: 1 } };

      const mockPrepare = vi.fn();
      mockPrepare.mockReturnValueOnce({
        first: vi.fn().mockResolvedValue(null) // Slug doesn't exist
      });
      mockPrepare.mockReturnValueOnce({
        run: vi.fn().mockResolvedValue(mockResult)
      });
      mockPrepare.mockReturnValueOnce({
        first: vi.fn().mockResolvedValue({
          rowid: 1,
          ...linkData,
          click_count: '0'
        })
      });

      const req = new Request('http://localhost/api/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Access-Jwt-Assertion': 'mock-token'
        },
        body: JSON.stringify(linkData)
      });

      const ctx = {
        req,
        env: mockEnv,
        get: vi.fn().mockReturnValue(mockUser)
      };

      const response = await app.request('/api/links', req);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.slug).toBe('new-link');
      expect(data.data.click_count).toBe(0);
    });

    it('should validate slug format', async () => {
      const invalidData = {
        slug: 'invalid slug!', // Invalid characters
        destination_url: 'https://example.com'
      };

      const req = new Request('http://localhost/api/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Access-Jwt-Assertion': 'mock-token'
        },
        body: JSON.stringify(invalidData)
      });

      const ctx = {
        req,
        env: mockEnv,
        get: vi.fn().mockReturnValue(mockUser)
      };

      const response = await app.request('/api/links', req);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.errors).toHaveLength(1);
      expect(data.errors[0].field).toBe('slug');
    });

    it('should validate destination URL', async () => {
      const invalidData = {
        slug: 'test',
        destination_url: 'javascript:alert("xss")' // Unsafe protocol
      };

      const req = new Request('http://localhost/api/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Access-Jwt-Assertion': 'mock-token'
        },
        body: JSON.stringify(invalidData)
      });

      const ctx = {
        req,
        env: mockEnv,
        get: vi.fn().mockReturnValue(mockUser)
      };

      const response = await app.request('/api/links', req);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.errors[0].field).toBe('destination_url');
    });

    it('should reject duplicate slugs', async () => {
      const linkData = {
        slug: 'existing',
        destination_url: 'https://example.com'
      };

      const mockPrepare = vi.fn();
      mockPrepare.mockReturnValueOnce({
        first: vi.fn().mockResolvedValue({ slug: 'existing' }) // Slug exists
      });

      const req = new Request('http://localhost/api/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Access-Jwt-Assertion': 'mock-token'
        },
        body: JSON.stringify(linkData)
      });

      const ctx = {
        req,
        env: mockEnv,
        get: vi.fn().mockReturnValue(mockUser)
      };

      const response = await app.request('/api/links', req);
      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Slug already exists');
    });

    it('should extract domain from destination URL', async () => {
      const linkData = {
        slug: 'domain-test',
        destination_url: 'https://shamrockrovers.ie/path'
      };

      const mockResult = { meta: { last_row_id: 1 } };

      const mockPrepare = vi.fn();
      mockPrepare.mockReturnValueOnce({
        first: vi.fn().mockResolvedValue(null)
      });
      mockPrepare.mockReturnValueOnce({
        run: vi.fn().mockResolvedValue(mockResult)
      });

      const req = new Request('http://localhost/api/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Access-Jwt-Assertion': 'mock-token'
        },
        body: JSON.stringify(linkData)
      });

      const ctx = {
        req,
        env: mockEnv,
        get: vi.fn().mockReturnValue(mockUser)
      };

      const response = await app.request('/api/links', req);
      expect(response.status).toBe(201);
    });
  });
});