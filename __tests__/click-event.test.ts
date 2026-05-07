import { describe, it, expect, beforeEach, vi } from 'vitest';
import { enqueueClickEvent, extractClickEvent, writeClickEventToD1, generateId } from '../packages/redirect-worker/src/click-event';

vi.mock('@rovrs/shared', () => ({
  parseDeviceType: vi.fn((ua: string) => {
    if (ua.toLowerCase().includes('mobile')) return 'mobile';
    if (ua.toLowerCase().includes('tablet')) return 'tablet';
    return 'desktop';
  }),
  nowUTC: vi.fn(() => '2026-05-07T12:00:00.000Z')
}));

describe('Click Event System', () => {
  let mockDb: any;
  let mockQueues: any;

  beforeEach(() => {
    mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({})
        })
      })
    };

    mockQueues = {
      clickEvents: {
        write: vi.fn().mockResolvedValue({})
      }
    };

    vi.clearAllMocks();
  });

  describe('generateId', () => {
    it('should generate a 12-character alphanumeric ID', () => {
      const id = generateId();
      expect(id).toHaveLength(12);
      expect(id).toMatch(/^[A-Za-z0-9]+$/);
    });
  });

  describe('extractClickEvent', () => {
    it('should extract basic event data from request', async () => {
      const request = new Request('https://rov.rs/test', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Desktop)'
        }
      });

      // Extend Request with cf property
      (request as any).cf = { country: undefined };

      const event = await extractClickEvent('test-slug', request);

      expect(event.slug).toBe('test-slug');
      expect(event.id).toBeDefined();
      expect(event.timestamp).toBe('2026-05-07T12:00:00.000Z');
      expect(event.deviceType).toBe('desktop');
      expect(event.url).toBe('https://rov.rs/test');
    });

    it('should handle country from cf', async () => {
      const request = new Request('https://rov.rs/test', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Desktop)'
        }
      });

      // Extend Request with cf property
      (request as any).cf = { country: 'IE' };

      const event = await extractClickEvent('test-slug', request);
      expect(event.ipCountry).toBe('IE');
    });

    it('should extract UTM parameters from URL', async () => {
      const request = new Request('https://rov.rs/test?utm_campaign=camp&utm_channel=social', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Desktop)'
        }
      });

      // Extend Request with cf property
      (request as any).cf = { country: undefined };

      const event = await extractClickEvent('test-slug', request);
      expect(event.utmCampaign).toBe('camp');
      expect(event.utmChannel).toBe('social');
    });
  });

  describe('enqueueClickEvent', () => {
    it('should use queues when available', async () => {
      const request = new Request('https://rov.rs/test', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Desktop)'
        }
      });

      // Extend Request with cf property
      (request as any).cf = { country: undefined };

      await enqueueClickEvent(mockQueues, mockDb, 'test-slug', request);

      expect(mockQueues.clickEvents.write).toHaveBeenCalledTimes(1);
      expect(mockDb.prepare).not.toHaveBeenCalled();
    });

    it('should fallback to D1 when queues fail', async () => {
      mockQueues.clickEvents.write.mockRejectedValue(new Error('Queue failed'));

      const request = new Request('https://rov.rs/test', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Desktop)'
        }
      });

      // Extend Request with cf property
      (request as any).cf = { country: undefined };

      await enqueueClickEvent(mockQueues, mockDb, 'test-slug', request);

      expect(mockQueues.clickEvents.write).toHaveBeenCalledTimes(1);
      expect(mockDb.prepare).toHaveBeenCalledTimes(1);
    });

    it('should use D1 when no queues', async () => {
      const request = new Request('https://rov.rs/test', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Desktop)'
        }
      });

      // Extend Request with cf property
      (request as any).cf = { country: undefined };

      await enqueueClickEvent(null, mockDb, 'test-slug', request);

      expect(mockDb.prepare).toHaveBeenCalledTimes(1);
    });
  });

  describe('writeClickEventToD1', () => {
    it('should write event to database', async () => {
      const event = {
        id: 'test-id',
        slug: 'test-slug',
        timestamp: '2026-05-07T12:00:00.000Z',
        ipCountry: 'IE',
        referrer: 'https://google.com',
        deviceType: 'mobile' as const,
        url: 'https://rov.rs/test',
        utmCampaign: 'campaign',
        utmChannel: 'social'
      };

      await writeClickEventToD1(mockDb, event);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO click_events')
      );
    });
  });
});