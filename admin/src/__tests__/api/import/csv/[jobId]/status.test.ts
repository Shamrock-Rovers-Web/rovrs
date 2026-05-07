import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { csvStatus } from '../../../functions/api/import/csv/[jobId]/status';

// Create a test app
const app = new Hono();
app.mount('/api/import/csv', csvStatus);

// Mock environment
const mockEnv = {
  DB: {
    prepare: vi.fn()
  }
};

describe('CSV Import API - Status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/import/csv/{jobId}/status', () => {
    it('should return job status for existing job', async () => {
      const mockJob = {
        job_id: 'test_job_123',
        status: 'completed',
        total_rows: 100,
        created_rows: 100,
        skipped_rows: 0,
        errors: '[]',
        created_at: '2024-01-01T00:00:00Z',
        completed_at: '2024-01-01T00:05:00Z'
      };

      const mockPrepare = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockJob)
      };

      mockEnv.DB.prepare = vi.fn().mockReturnValue(mockPrepare);

      const request = new Request('http://localhost/api/import/csv/test_job_123/status');
      const response = await app.request(request, mockEnv);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.job_id).toBe('test_job_123');
      expect(data.data.status).toBe('completed');
      expect(data.data.progress).toBe(100);
      expect(data.data.total_rows).toBe(100);
      expect(data.data.created_rows).toBe(100);
      expect(data.data.skipped_rows).toBe(0);
      expect(data.data.errors).toHaveLength(0);
      expect(data.data.created_at).toBe('2024-01-01T00:00:00Z');
      expect(data.data.completed_at).toBe('2024-01-01T00:05:00Z');
    });

    it('should return correct progress for incomplete job', async () => {
      const mockJob = {
        job_id: 'test_job_456',
        status: 'processing',
        total_rows: 50,
        created_rows: 25,
        skipped_rows: 5,
        errors: '[{"row": 3, "field": "destination_url", "message": "Invalid URL"}]',
        created_at: '2024-01-01T00:00:00Z',
        completed_at: null
      };

      const mockPrepare = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockJob)
      };

      mockEnv.DB.prepare = vi.fn().mockReturnValue(mockPrepare);

      const request = new Request('http://localhost/api/import/csv/test_job_456/status');
      const response = await app.request(request, mockEnv);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.job_id).toBe('test_job_456');
      expect(data.data.status).toBe('processing');
      expect(data.data.progress).toBe(50); // 25/50 = 50%
      expect(data.data.total_rows).toBe(50);
      expect(data.data.created_rows).toBe(25);
      expect(data.data.skipped_rows).toBe(5);
      expect(data.data.errors).toHaveLength(1);
      expect(data.data.errors[0].row).toBe(3);
      expect(data.data.errors[0].field).toBe('destination_url');
      expect(data.data.estimated_remaining).toBe('25 rows remaining');
    });

    it('should handle empty errors array', async () => {
      const mockJob = {
        job_id: 'test_job_789',
        status: 'completed',
        total_rows: 10,
        created_rows: 10,
        skipped_rows: 0,
        errors: '[]',
        created_at: '2024-01-01T00:00:00Z',
        completed_at: '2024-01-01T00:01:00Z'
      };

      const mockPrepare = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockJob)
      };

      mockEnv.DB.prepare = vi.fn().mockReturnValue(mockPrepare);

      const request = new Request('http://localhost/api/import/csv/test_job_789/status');
      const response = await app.request(request, mockEnv);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.errors).toHaveLength(0);
    });

    it('should handle malformed errors JSON', async () => {
      const mockJob = {
        job_id: 'test_job_999',
        status: 'failed',
        total_rows: 1,
        created_rows: 0,
        skipped_rows: 1,
        errors: 'invalid json',
        created_at: '2024-01-01T00:00:00Z',
        completed_at: '2024-01-01T00:01:00Z'
      };

      const mockPrepare = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockJob)
      };

      mockEnv.DB.prepare = vi.fn().mockReturnValue(mockPrepare);

      const request = new Request('http://localhost/api/import/csv/test_job_999/status');
      const response = await app.request(request, mockEnv);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.job_id).toBe('test_job_999');
      expect(data.data.errors).toHaveLength(0); // Should default to empty array
    });

    it('should return 404 for non-existent job', async () => {
      const mockPrepare = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null)
      };

      mockEnv.DB.prepare = vi.fn().mockReturnValue(mockPrepare);

      const request = new Request('http://localhost/api/import/csv/nonexistent_job/status');
      const response = await app.request(request, mockEnv);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Import job not found');
    });
  });
});