import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { linksBatchIndex } from '../../../functions/api/links/batch/index';

// Create a test app
const app = new Hono();
app.mount('/api/links', linksBatchIndex);

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

describe('Links API - Batch Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/links/batch', () => {
    it('should process batch operations successfully', async () => {
      const operations = [
        {
          operation: 'pause' as const,
          slug: 'link1'
        },
        {
          operation: 'expire' as const,
          slug: 'link2'
        },
        {
          operation: 'update_destination' as const,
          slug: 'link3',
          destination_url: 'https://new-destination.com'
        }
      ];

      const existingLinks = [
        { rowid: 1, slug: 'link1', status: 'active' },
        { rowid: 2, slug: 'link2', status: 'active' },
        { rowid: 3, slug: 'link3', status: 'active' }
      ];

      const mockPrepare = vi.fn();
      mockPrepare.mockReturnValue({
        first: vi.fn().mockImplementation((query) => {
          const slug = query.bindings[0];
          return existingLinks.find(link => link.slug === slug);
        }),
        bind: vi.fn().mockReturnThis()
      });

      mockPrepare.mockReturnValue({
        run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
        bind: vi.fn().mockReturnThis()
      });

      const req = new Request('http://localhost/api/links/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Access-Jwt-Assertion': 'mock-token'
        },
        body: JSON.stringify(operations)
      });

      const ctx = {
        req,
        env: mockEnv,
        get: vi.fn().mockReturnValue(mockUser)
      };

      const response = await app.request('/api/links/batch', req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.results).toHaveLength(3);
      expect(data.errors).toHaveLength(0);
      expect(data.total_processed).toBe(3);
      expect(data.successful).toBe(3);
      expect(data.failed).toBe(0);
    });

    it('should handle invalid operations', async () => {
      const operations = [
        {
          operation: 'invalid' as any, // Invalid operation
          slug: 'link1'
        }
      ];

      const req = new Request('http://localhost/api/links/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Access-Jwt-Assertion': 'mock-token'
        },
        body: JSON.stringify(operations)
      });

      const ctx = {
        req,
        env: mockEnv,
        get: vi.fn().mockReturnValue(mockUser)
      };

      const response = await app.request('/api/links/batch', req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.results).toHaveLength(0);
      expect(data.errors).toHaveLength(1);
      expect(data.errors[0].slug).toBe('link1');
      expect(data.errors[0].error).toBe('Invalid operation: invalid');
    });

    it('should handle non-existent links', async () => {
      const operations = [
        {
          operation: 'pause' as const,
          slug: 'nonexistent'
        }
      ];

      const mockPrepare = vi.fn();
      mockPrepare.mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
        bind: vi.fn().mockReturnThis()
      });

      const req = new Request('http://localhost/api/links/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Access-Jwt-Assertion': 'mock-token'
        },
        body: JSON.stringify(operations)
      });

      const ctx = {
        req,
        env: mockEnv,
        get: vi.fn().mockReturnValue(mockUser)
      };

      const response = await app.request('/api/links/batch', req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.results).toHaveLength(0);
      expect(data.errors).toHaveLength(1);
      expect(data.errors[0].slug).toBe('nonexistent');
      expect(data.errors[0].error).toBe('Link not found');
    });

    it('should require destination URL for update_destination', async () => {
      const operations = [
        {
          operation: 'update_destination' as const,
          slug: 'link1'
          // Missing destination_url
        }
      ];

      const req = new Request('http://localhost/api/links/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Access-Jwt-Assertion': 'mock-token'
        },
        body: JSON.stringify(operations)
      });

      const ctx = {
        req,
        env: mockEnv,
        get: vi.fn().mockReturnValue(mockUser)
      };

      const response = await app.request('/api/links/batch', req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.errors).toHaveLength(1);
      expect(data.errors[0].error).toBe('Destination URL is required for update_destination operation');
    });

    it('should validate destination URL format', async () => {
      const operations = [
        {
          operation: 'update_destination' as const,
          slug: 'link1',
          destination_url: 'javascript:alert("xss")'
        }
      ];

      const req = new Request('http://localhost/api/links/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Access-Jwt-Assertion': 'mock-token'
        },
        body: JSON.stringify(operations)
      });

      const ctx = {
        req,
        env: mockEnv,
        get: vi.fn().mockReturnValue(mockUser)
      };

      const response = await app.request('/api/links/batch', req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.errors).toHaveLength(1);
      expect(data.errors[0].error).toBe('URL protocol is not allowed');
    });

    it('should limit batch size to 100 operations', async () => {
      const operations = Array(101).fill(null).map((_, i) => ({
        operation: 'pause' as const,
        slug: `link${i}`
      }));

      const req = new Request('http://localhost/api/links/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Access-Jwt-Assertion': 'mock-token'
        },
        body: JSON.stringify(operations)
      });

      const ctx = {
        req,
        env: mockEnv,
        get: vi.fn().mockReturnValue(mockUser)
      };

      const response = await app.request('/api/links/batch', req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Maximum 100 operations per batch');
    });

    it('should handle non-array input', async () => {
      const invalidInput = {
        operation: 'pause',
        slug: 'link1'
      };

      const req = new Request('http://localhost/api/links/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Access-Jwt-Assertion': 'mock-token'
        },
        body: JSON.stringify(invalidInput)
      });

      const ctx = {
        req,
        env: mockEnv,
        get: vi.fn().mockReturnValue(mockUser)
      };

      const response = await app.request('/api/links/batch', req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Operations must be a non-empty array');
    });

    it('should handle empty array', async () => {
      const req = new Request('http://localhost/api/links/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Access-Jwt-Assertion': 'mock-token'
        },
        body: JSON.stringify([])
      });

      const ctx = {
        req,
        env: mockEnv,
        get: vi.fn().mockReturnValue(mockUser)
      };

      const response = await app.request('/api/links/batch', req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Operations must be a non-empty array');
    });

    it('should track operation results and errors separately', async () => {
      const operations = [
        {
          operation: 'pause' as const,
          slug: 'link1' // Exists
        },
        {
          operation: 'pause' as const,
          slug: 'nonexistent' // Doesn't exist
        }
      ];

      const mockPrepare = vi.fn();
      mockPrepare.mockReturnValueOnce({
        first: vi.fn().mockResolvedValue({ rowid: 1, slug: 'link1', status: 'active' })
      });
      mockPrepare.mockReturnValueOnce({
        first: vi.fn().mockResolvedValue(null) // nonexistent
      });
      mockPrepare.mockReturnValue({
        run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
        bind: vi.fn().mockReturnThis()
      });

      const req = new Request('http://localhost/api/links/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Access-Jwt-Assertion': 'mock-token'
        },
        body: JSON.stringify(operations)
      });

      const ctx = {
        req,
        env: mockEnv,
        get: vi.fn().mockReturnValue(mockUser)
      };

      const response = await app.request('/api/links/batch', req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.results).toHaveLength(1);
      expect(data.results[0].slug).toBe('link1');
      expect(data.errors).toHaveLength(1);
      expect(data.errors[0].slug).toBe('nonexistent');
      expect(data.total_processed).toBe(2);
      expect(data.successful).toBe(1);
      expect(data.failed).toBe(1);
    });
  });
});