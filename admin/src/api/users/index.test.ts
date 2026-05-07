import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { usersIndex } from '../../../functions/api/users/index';
import { eq } from 'drizzle-orm';
import { users } from '../../../functions/api/schema';

// Create a test app
const app = new Hono();
app.mount('/api/users', usersIndex);

// Mock environment
const mockEnv = {
  DB: {
    prepare: vi.fn()
  }
};

// Mock user
const mockAdminUser = {
  id: 1,
  email: 'admin@example.com',
  role: 'admin'
};

const mockEditorUser = {
  id: 2,
  email: 'editor@example.com',
  role: 'user',
  name: 'Test Editor'
};

describe('Users API - Index', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/users', () => {
    it('should return list of users with pagination', async () => {
      // Mock database response
      const mockUsers = [
        {
          id: 1,
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'admin',
          is_active: true,
          last_login_at: '2024-01-01T00:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 2,
          email: 'editor@example.com',
          name: 'Editor User',
          role: 'user',
          is_active: true,
          last_login_at: null,
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z'
        }
      ];

      const mockCount = 2;

      // Mock database queries
      const mockPrepare = vi.fn();
      mockPrepare.mockReturnValueOnce({
        all: vi.fn().mockResolvedValue([{ count: mockCount }]),
        bind: vi.fn().mockReturnThis()
      });
      mockPrepare.mockReturnValueOnce({
        all: vi.fn().mockResolvedValue(mockUsers),
        bind: vi.fn().mockReturnThis()
      });

      mockEnv.DB.prepare = mockPrepare;

      const req = new Request('http://localhost/api/users?limit=20&offset=0', {
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
        get: vi.fn().mockReturnValue(mockAdminUser)
      };

      // Test the endpoint
      const response = await app.request('/api/users', req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].email).toBe('admin@example.com');
      expect(data.data[1].email).toBe('editor@example.com');
      expect(data.pagination.total).toBe(2);
      expect(data.pagination.limit).toBe(20);
      expect(data.pagination.offset).toBe(0);
    });

    it('should filter by role', async () => {
      const mockUsers = [
        {
          id: 2,
          email: 'editor@example.com',
          name: 'Editor User',
          role: 'user',
          is_active: true,
          last_login_at: null,
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z'
        }
      ];

      const mockPrepare = vi.fn();
      mockPrepare.mockReturnValueOnce({
        all: vi.fn().mockResolvedValue([{ count: 1 }]),
        bind: vi.fn().mockReturnThis()
      });
      mockPrepare.mockReturnValueOnce({
        all: vi.fn().mockResolvedValue(mockUsers),
        bind: vi.fn().mockReturnThis()
      });

      mockEnv.DB.prepare = mockPrepare;

      const req = new Request('http://localhost/api/users?role=user', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'CF-Access-Jwt-Assertion': 'mock-token'
        }
      });

      const ctx = {
        req,
        env: mockEnv,
        get: vi.fn().mockReturnValue(mockAdminUser)
      };

      const response = await app.request('/api/users', req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].role).toBe('user');
    });

    it('should search by email or name', async () => {
      const mockUsers = [
        {
          id: 2,
          email: 'editor@example.com',
          name: 'Test Editor',
          role: 'user',
          is_active: true,
          last_login_at: null,
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z'
        }
      ];

      const mockPrepare = vi.fn();
      mockPrepare.mockReturnValueOnce({
        all: vi.fn().mockResolvedValue([{ count: 1 }]),
        bind: vi.fn().mockReturnThis()
      });
      mockPrepare.mockReturnValueOnce({
        all: vi.fn().mockResolvedValue(mockUsers),
        bind: vi.fn().mockReturnThis()
      });

      mockEnv.DB.prepare = mockPrepare;

      const req = new Request('http://localhost/api/users?search=editor', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'CF-Access-Jwt-Assertion': 'mock-token'
        }
      });

      const ctx = {
        req,
        env: mockEnv,
        get: vi.fn().mockReturnValue(mockAdminUser)
      };

      const response = await app.request('/api/users', req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].email).toBe('editor@example.com');
      expect(data.data[0].name).toBe('Test Editor');
    });

    it('should handle database errors gracefully', async () => {
      const mockPrepare = vi.fn();
      mockPrepare.mockReturnValue({
        all: vi.fn().mockRejectedValue(new Error('Database error')),
        bind: vi.fn().mockReturnThis()
      });

      mockEnv.DB.prepare = mockPrepare;

      const req = new Request('http://localhost/api/users', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'CF-Access-Jwt-Assertion': 'mock-token'
        }
      });

      const ctx = {
        req,
        env: mockEnv,
        get: vi.fn().mockReturnValue(mockAdminUser)
      };

      const response = await app.request('/api/users', req);
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to fetch users');
    });
  });

  describe('PATCH /api/users/:id', () => {
    it('should update user role (admin to user)', async () => {
      const userId = '2';
      const mockPrepare = vi.fn();
      mockPrepare.mockReturnValueOnce({
        first: vi.fn().mockResolvedValue(mockEditorUser)
      });
      mockPrepare.mockReturnValueOnce({
        run: vi.fn().mockResolvedValue({ changes: 1 })
      });
      mockPrepare.mockReturnValueOnce({
        first: vi.fn().mockResolvedValue({
          ...mockEditorUser,
          role: 'admin'
        })
      });

      mockEnv.DB.prepare = mockPrepare;

      const req = new Request(`http://localhost/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'CF-Access-Jwt-Assertion': 'mock-token'
        },
        body: JSON.stringify({ role: 'admin' })
      });

      const ctx = {
        req,
        env: mockEnv,
        get: vi.fn().mockReturnValue(mockAdminUser)
      };

      const response = await app.request(`/api/users/${userId}`, req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.role).toBe('admin');
    });

    it('should update user role (user to admin)', async () => {
      const userId = '2';
      const mockPrepare = vi.fn();
      mockPrepare.mockReturnValueOnce({
        first: vi.fn().mockResolvedValue(mockEditorUser)
      });
      mockPrepare.mockReturnValueOnce({
        run: vi.fn().mockResolvedValue({ changes: 1 })
      });
      mockPrepare.mockReturnValueOnce({
        first: vi.fn().mockResolvedValue({
          ...mockEditorUser,
          role: 'admin'
        })
      });

      mockEnv.DB.prepare = mockPrepare;

      const req = new Request(`http://localhost/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'CF-Access-Jwt-Assertion': 'mock-token'
        },
        body: JSON.stringify({ role: 'admin' })
      });

      const ctx = {
        req,
        env: mockEnv,
        get: vi.fn().mockReturnValue(mockAdminUser)
      };

      const response = await app.request(`/api/users/${userId}`, req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.role).toBe('admin');
    });

    it('should reject non-admin requests', async () => {
      const userId = '2';
      const mockPrepare = vi.fn();

      mockEnv.DB.prepare = mockPrepare;

      const req = new Request(`http://localhost/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'CF-Access-Jwt-Assertion': 'mock-token'
        },
        body: JSON.stringify({ role: 'admin' })
      });

      const ctx = {
        req,
        env: mockEnv,
        get: vi.fn().mockReturnValue({ id: 3, email: 'user@example.com', role: 'user' })
      };

      const response = await app.request(`/api/users/${userId}`, req);
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should prevent self-demotion', async () => {
      const userId = '1'; // Admin user trying to demote themselves
      const mockPrepare = vi.fn();

      mockEnv.DB.prepare = mockPrepare;

      const req = new Request(`http://localhost/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'CF-Access-Jwt-Assertion': 'mock-token'
        },
        body: JSON.stringify({ role: 'user' })
      });

      const ctx = {
        req,
        env: mockEnv,
        get: vi.fn().mockReturnValue(mockAdminUser)
      };

      const response = await app.request(`/api/users/${userId}`, req);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Cannot demote yourself');
    });

    it('should reject invalid role', async () => {
      const userId = '2';
      const mockPrepare = vi.fn();

      mockEnv.DB.prepare = mockPrepare;

      const req = new Request(`http://localhost/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'CF-Access-Jwt-Assertion': 'mock-token'
        },
        body: JSON.stringify({ role: 'invalid' })
      });

      const ctx = {
        req,
        env: mockEnv,
        get: vi.fn().mockReturnValue(mockAdminUser)
      };

      const response = await app.request(`/api/users/${userId}`, req);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid role. Must be admin or user');
    });

    it('should handle not found user', async () => {
      const userId = '999';
      const mockPrepare = vi.fn();
      mockPrepare.mockReturnValueOnce({
        first: vi.fn().mockResolvedValue(null)
      });

      mockEnv.DB.prepare = mockPrepare;

      const req = new Request(`http://localhost/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'CF-Access-Jwt-Assertion': 'mock-token'
        },
        body: JSON.stringify({ role: 'admin' })
      });

      const ctx = {
        req,
        env: mockEnv,
        get: vi.fn().mockReturnValue(mockAdminUser)
      };

      const response = await app.request(`/api/users/${userId}`, req);
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('User not found');
    });

    it('should handle update failure', async () => {
      const userId = '2';
      const mockPrepare = vi.fn();
      mockPrepare.mockReturnValueOnce({
        first: vi.fn().mockResolvedValue(mockEditorUser)
      });
      mockPrepare.mockReturnValueOnce({
        run: vi.fn().mockResolvedValue({ changes: 0 }) // No rows updated
      });

      mockEnv.DB.prepare = mockPrepare;

      const req = new Request(`http://localhost/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'CF-Access-Jwt-Assertion': 'mock-token'
        },
        body: JSON.stringify({ role: 'admin' })
      });

      const ctx = {
        req,
        env: mockEnv,
        get: vi.fn().mockReturnValue(mockAdminUser)
      };

      const response = await app.request(`/api/users/${userId}`, req);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Failed to update user');
    });

    it('should handle database errors during update', async () => {
      const userId = '2';
      const mockPrepare = vi.fn();
      mockPrepare.mockReturnValueOnce({
        first: vi.fn().mockResolvedValue(mockEditorUser)
      });
      mockPrepare.mockReturnValueOnce({
        run: vi.fn().mockRejectedValue(new Error('Database error'))
      });

      mockEnv.DB.prepare = mockPrepare;

      const req = new Request(`http://localhost/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'CF-Access-Jwt-Assertion': 'mock-token'
        },
        body: JSON.stringify({ role: 'admin' })
      });

      const ctx = {
        req,
        env: mockEnv,
        get: vi.fn().mockReturnValue(mockAdminUser)
      };

      const response = await app.request(`/api/users/${userId}`, req);
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to update user');
    });
  });
});