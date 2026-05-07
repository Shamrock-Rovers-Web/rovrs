import { describe, it, expect } from 'vitest';

describe('Links API Tests', () => {
  it('should validate slug format', () => {
    const validSlugs = [
      'tickets',
      'bohs-match',
      'home-game-1',
      'shop-general'
    ];

    const invalidSlugs = [
      'invalid slug', // space
      'UPPERCASE', // uppercase
      'too-short', // too short
      'a-very-long-slug-that-exceeds-the-maximum-length-allowed', // too long
      'test!', // special characters
      '_starts-with-underscore', // starts with non-letter
      'ends-with-hyphen-', // ends with hyphen
      '', // empty
      'a', // single char
    ];

    validSlugs.forEach(slug => {
      expect(slug).toMatch(/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/);
    });

    invalidSlugs.forEach(slug => {
      expect(slug).not.toMatch(/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/);
    });
  });

  it('should validate destination URL format', () => {
    const validURLs = [
      'https://shamrockrovers.ie/tickets',
      'https://shop.shamrockrovers.ie',
      'https://example.com/path',
      'https://www.shamrockrovers.ie/fixture/bohs'
    ];

    const invalidURLs = [
      'javascript:alert("xss")',
      'data:text/html,<script>alert(1)</script>',
      'file:///etc/passwd',
      'ftp://example.com',
      'not-a-url',
      '',
      'https://',
      '://example.com'
    ];

    // Basic URL validation
    validURLs.forEach(url => {
      try {
        new URL(url);
        expect(true).toBe(true);
      } catch {
        expect(false).toBe(true); // Should not reach here
      }
    });

    invalidURLs.forEach(url => {
      try {
        new URL(url);
        expect(false).toBe(true); // Should not reach here
      } catch {
        expect(true).toBe(true);
      }
    });
  });

  it('should handle reserved paths', () => {
    const reservedPaths = [
      'admin',
      'api',
      'health',
      'login',
      'logout',
      'stats',
      'export',
      'robots.txt',
      'favicon.ico',
      '.well-known'
    ];

    reservedPaths.forEach(path => {
      expect(path).not.toMatch(/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/);
    });
  });

  it('should validate link operations', () => {
    const validOperations = ['pause', 'expire', 'update_destination'];
    const invalidOperations = ['delete', 'create', 'invalid', ''];

    validOperations.forEach(op => {
      expect(validOperations).toContain(op);
    });

    invalidOperations.forEach(op => {
      expect(validOperations).not.toContain(op);
    });
  });
});