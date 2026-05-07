import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { linksSlugIndex } from '../../../functions/api/links/[slug]/index';
import { applyRateLimit } from '../../functions/api/rate-limit';

// Create a test app
const app = new Hono();
app.mount('/api/links', linksSlugIndex);

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

describe('Links API - Individual Link', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/links/{slug}', () => {
    it('should return a single link', async () => {
      const mockLink = {
        rowid: 1,
        slug: 'tickets',
        destination_url: 'https://shamrockrovers.ie/tickets',
        title: 'Tickets',
        status: 'active',
        redirect_code: 301,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: null,
        click_count: '100'
      };

      const mockPrepare = vi.fn();
      mockPrepare.mockReturnValue({
        first: vi.fn().mockResolvedValue(mockLink),
        bind: vi.fn().mockReturnThis()
      });

      const req = new Request('http://localhost/api/links/tickets', {
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

      const response = await app.request('/api/links/tickets', req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.slug).toBe('tickets');
      expect(data.data.click_count).toBe(100);
    });

    it('should return 404 for non-existent link', async () => {
      const mockPrepare = vi.fn();
      mockPrepare.mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
        bind: vi.fn().mockReturnThis()
      });

      const req = new Request('http://localhost/api/links/nonexistent', {
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

      const response = await app.request('/api/links/nonexistent', req);
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Link not found');
    });
  });

  describe('PATCH /api/links/{slug}', () => {
    it('should update a link', async () => {
      const existingLink = {
        rowid: 1,
        slug: 'test-link',
        destination_url: 'https://old.com',
        status: 'active',
        created_at: '2024-01-01T00:00:00Z'
      };

      const mockPrepare = vi.fn();
      mockPrepare.mockReturnValueOnce({
        first: vi.fn().mockResolvedValue(existingLink)
      });
      mockPrepare.mockReturnValue({
        run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
        bind: vi.fn().mockReturnThis()
      });
      mockPrepare.mockReturnValueOnce({
        first: vi.fn().mockResolvedValue({
          ...existingLink,
          destination_url: 'https://new.com',
          title: 'Updated Title',
          click_count: '0'
        })
      });

      const updateData = {
        destination_url: 'https://new.com',
        title: 'Updated Title'
      };

      const req = new Request('http://localhost/api/links/test-link', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'CF-Access-Jwt-Assertion': 'mock-token'
        },
        body: JSON.stringify(updateData)
      });

      const ctx = {
        req,
        env: mockEnv,
        get: vi.fn().mockReturnValue(mockUser)
      };

      const response = await app.request('/api/links/test-link', req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.destination_url).toBe('https://new.com');
      expect(data.data.title).toBe('Updated Title');
    });

    it('should validate update input', async () => {
      const invalidUpdate = {
        destination_url: 'javascript:alert("xss")' // Invalid protocol
      };

      const req = new Request('http://localhost/api/links/test', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'CF-Access-Jwt-Assertion': 'mock-token'
        },
        body: JSON.stringify(invalidUpdate)
      });

      const ctx = {
        req,
        env: mockEnv,
        get: vi.fn().mockReturnValue(mockUser)
      };

      const response = await app.request('/api/links/test', req);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.errors[0].field).toBe('destination_url');
    });

    it('should return 404 for non-existent link', async () => {
      const mockPrepare = vi.fn();
      mockPrepare.mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
        bind: vi.fn().mockReturnThis()
      });

      const updateData = {
        title: 'New Title'
      };

      const req = new Request('http://localhost/api/links/nonexistent', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'CF-Access-Jwt-Assertion': 'mock-token'
        },
        body: JSON.stringify(updateData)
      });

      const ctx = {
        req,
        env: mockEnv,
        get: vi.fn().mockReturnValue(mockUser)
      };

      const response = await app.request('/api/links/nonexistent', req);
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Link not found');
    });
  });

  describe('DELETE /api/links/{slug}', () => {
    it('should soft delete a link', async () => {
      const existingLink = {
        rowid: 1,
        slug: 'to-delete',
        status: 'active',
        created_at: '2024-01-01T00:00:00Z'
      };

      const mockPrepare = vi.fn();
      mockPrepare.mockReturnValueOnce({
        first: vi.fn().mockResolvedValue(existingLink)
      });
      mockPrepare.mockReturnValue({
        run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
        bind: vi.fn().mockReturnThis()
      });

      const req = new Request('http://localhost/api/links/to-delete', {
        method: 'DELETE',
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

      const response = await app.request('/api/links/to-delete', req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Link deleted successfully');
    });

    it('should return 404 for non-existent link', async () => {
      const mockPrepare = vi.fn();
      mockPrepare.mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
        bind: vi.fn().mockReturnThis()
      });

      const req = new Request('http://localhost/api/links/nonexistent', {
        method: 'DELETE',
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

      const response = await app.request('/api/links/nonexistent', req);
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Link not found');
    });
  });

  describe('POST /api/links/{slug}/restore', () => {
    it('should restore a deleted link', async () => {
      const deletedLink = {
        rowid: 1,
        slug: 'test-deleted-123',
        status: 'deleted',
        created_at: '2024-01-01T00:00:00Z'
      };

      const mockPrepare = vi.fn();
      mockPrepare.mockReturnValueOnce({
        first: vi.fn().mockResolvedValue(deletedLink)
      });
      mockPrepare.mockReturnValueOnce({
        first: vi.fn().mockResolvedValue(null) // Original slug not in use
      });
      mockPrepare.mockReturnValue({
        run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
        bind: vi.fn().mockReturnThis()
      });

      const req = new Request('http://localhost/api/links/test-deleted-123/restore', {
        method: 'POST',
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

      const response = await app.request('/api/links/test-deleted-123/restore', req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Link restored successfully');
      expect(data.restored_to).toBe('test');
    });

    it('should return 404 for non-deleted link', async () => {
      const mockPrepare = vi.fn();
      mockPrepare.mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
        bind: vi.fn().mockReturnThis()
      });

      const req = new Request('http://localhost/api/links/not-deleted/restore', {
        method: 'POST',
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

      const response = await app.request('/api/links/not-deleted/restore', req);
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Deleted link not found');
    });

    it('should return 409 if original slug is in use', async () => {
      const deletedLink = {
        rowid: 1,
        slug: 'test-deleted-123',
        status: 'deleted',
        created_at: '2024-01-01T00:00:00Z'
      };

      const mockPrepare = vi.fn();
      mockPrepare.mockReturnValueOnce({
        first: vi.fn().mockResolvedValue(deletedLink)
      });
      mockPrepare.mockReturnValueOnce({
        first: vi.fn().mockResolvedValue({ slug: 'test' }) // Original slug is taken
      });

      const req = new Request('http://localhost/api/links/test-deleted-123/restore', {
        method: 'POST',
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

      const response = await app.request('/api/links/test-deleted-123/restore', req);
      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Original slug is already in use');
    });
  });
});