import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { settingsIndex } from '../../../functions/api/settings/[key]/index';

// Create a test app
const app = new Hono();
app.mount('/api/settings', settingsIndex);

// Mock environment
const mockEnv = {
  DB: {
    prepare: vi.fn()
  }
};

// Mock user
const mockUser = {
  email: 'admin@example.com',
  role: 'admin'
};

describe('Settings API - Key', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/settings/[key]', () => {
    it('should return existing setting', async () => {
      const mockSetting = {
        id: 1,
        key: 'slug_blocklist',
        value: '["javascript:", "data:", "file:"]',
        updated_by: 'system',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const mockPrepare = vi.fn();
      mockPrepare.mockReturnValueOnce({
        first: vi.fn().mockResolvedValue(mockSetting)
      });

      mockEnv.DB.prepare = mockPrepare;

      const req = new Request('http://localhost/api/settings/slug_blocklist', {
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

      const response = await app.request('/api/settings/slug_blocklist', req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.key).toBe('slug_blocklist');
      expect(data.value).toBe('["javascript:", "data:", "file:"]');
      expect(data.updated_by).toBe('system');
    });

    it('should return 404 for non-existent setting', async () => {
      const mockPrepare = vi.fn();
      mockPrepare.mockReturnValueOnce({
        first: vi.fn().mockResolvedValue(null)
      });

      mockEnv.DB.prepare = mockPrepare;

      const req = new Request('http://localhost/api/settings/unknown_key', {
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

      const response = await app.request('/api/settings/unknown_key', req);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Setting not found');
    });

    it('should handle database errors gracefully', async () => {
      const mockPrepare = vi.fn();
      mockPrepare.mockReturnValueOnce({
        first: vi.fn().mockRejectedValue(new Error('Database error'))
      });

      mockEnv.DB.prepare = mockPrepare;

      const req = new Request('http://localhost/api/settings/slug_blocklist', {
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

      const response = await app.request('/api/settings/slug_blocklist', req);
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to fetch setting');
    });
  });

  describe('PUT /api/settings/[key]', () => {
    it('should update existing setting', async () => {
      const mockSetting = {
        id: 1,
        key: 'slug_blocklist',
        value: '["javascript:", "data:"]',
        updated_by: 'system',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const mockPrepare = vi.fn();
      mockPrepare.mockReturnValueOnce({
        first: vi.fn().mockResolvedValue(mockSetting)
      });
      mockPrepare.mockReturnValueOnce({
        run: vi.fn().mockResolvedValue({ changes: 1 })
      });
      mockPrepare.mockReturnValueOnce({
        first: vi.fn().mockResolvedValue({
          ...mockSetting,
          value: '["javascript:", "data:", "file:"]',
          updated_by: 'admin@example.com',
          updated_at: '2024-01-02T00:00:00Z'
        })
      });

      mockEnv.DB.prepare = mockPrepare;

      const req = new Request('http://localhost/api/settings/slug_blocklist', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'CF-Access-Jwt-Assertion': 'mock-token'
        },
        body: JSON.stringify({ value: '["javascript:", "data:", "file:"]' })
      });

      const ctx = {
        req,
        env: mockEnv,
        get: vi.fn().mockReturnValue(mockUser)
      };

      const response = await app.request('/api/settings/slug_blocklist', req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.value).toBe('["javascript:", "data:", "file:"]');
      expect(data.updated_by).toBe('admin@example.com');
    });

    it('should create new setting', async () => {
      const mockPrepare = vi.fn();
      mockPrepare.mockReturnValueOnce({
        first: vi.fn().mockResolvedValue(null) // Setting doesn't exist
      });
      mockPrepare.mockReturnValueOnce({
        run: vi.fn().mockResolvedValue({ changes: 1 })
      });
      mockPrepare.mockReturnValueOnce({
        first: vi.fn().mockResolvedValue({
          id: 2,
          key: 'new_setting',
          value: 'new_value',
          updated_by: 'admin@example.com',
          updated_at: '2024-01-02T00:00:00Z'
        })
      });

      mockEnv.DB.prepare = mockPrepare;

      const req = new Request('http://localhost/api/settings/new_setting', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'CF-Access-Jwt-Assertion': 'mock-token'
        },
        body: JSON.stringify({ value: 'new_value' })
      });

      const ctx = {
        req,
        env: mockEnv,
        get: vi.fn().mockReturnValue(mockUser)
      };

      const response = await app.request('/api/settings/new_setting', req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.key).toBe('new_setting');
      expect(data.value).toBe('new_value');
    });

    it('should handle update failure', async () => {
      const mockSetting = {
        id: 1,
        key: 'slug_blocklist',
        value: '["javascript:", "data:"]',
        updated_by: 'system',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const mockPrepare = vi.fn();
      mockPrepare.mockReturnValueOnce({
        first: vi.fn().mockResolvedValue(mockSetting)
      });
      mockPrepare.mockReturnValueOnce({
        run: vi.fn().mockResolvedValue({ changes: 0 }) // No rows updated
      });

      mockEnv.DB.prepare = mockPrepare;

      const req = new Request('http://localhost/api/settings/slug_blocklist', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'CF-Access-Jwt-Assertion': 'mock-token'
        },
        body: JSON.stringify({ value: '["javascript:", "data:"]' })
      });

      const ctx = {
        req,
        env: mockEnv,
        get: vi.fn().mockReturnValue(mockUser)
      };

      const response = await app.request('/api/settings/slug_blocklist', req);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Failed to update setting');
    });

    it('should handle creation failure', async () => {
      const mockPrepare = vi.fn();
      mockPrepare.mockReturnValueOnce({
        first: vi.fn().mockResolvedValue(null) // Setting doesn't exist
      });
      mockPrepare.mockReturnValueOnce({
        run: vi.fn().mockResolvedValue({ changes: 0 }) // No rows created
      });

      mockEnv.DB.prepare = mockPrepare;

      const req = new Request('http://localhost/api/settings/new_setting', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'CF-Access-Jwt-Assertion': 'mock-token'
        },
        body: JSON.stringify({ value: 'new_value' })
      });

      const ctx = {
        req,
        env: mockEnv,
        get: vi.fn().mockReturnValue(mockUser)
      };

      const response = await app.request('/api/settings/new_setting', req);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Failed to create setting');
    });

    it('should handle database errors during update', async () => {
      const mockSetting = {
        id: 1,
        key: 'slug_blocklist',
        value: '["javascript:", "data:"]',
        updated_by: 'system',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const mockPrepare = vi.fn();
      mockPrepare.mockReturnValueOnce({
        first: vi.fn().mockResolvedValue(mockSetting)
      });
      mockPrepare.mockReturnValueOnce({
        run: vi.fn().mockRejectedValue(new Error('Database error'))
      });

      mockEnv.DB.prepare = mockPrepare;

      const req = new Request('http://localhost/api/settings/slug_blocklist', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'CF-Access-Jwt-Assertion': 'mock-token'
        },
        body: JSON.stringify({ value: '["javascript:", "data:"]' })
      });

      const ctx = {
        req,
        env: mockEnv,
        get: vi.fn().mockReturnValue(mockUser)
      };

      const response = await app.request('/api/settings/slug_blocklist', req);
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to update setting');
    });
  });
});