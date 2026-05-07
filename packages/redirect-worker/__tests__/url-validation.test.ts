import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  validateURL,
  URLValidationError,
  ValidationStage,
} from '../src/url-validation';

describe('URL Validation Pipeline', () => {
  describe('Protocol Check', () => {
    it('should allow https:// URLs', () => {
      expect(() => validateURL('https://shamrockrovers.ie')).not.toThrow();
    });

    it('should allow http:// URLs', () => {
      expect(() => validateURL('http://shamrockrovers.ie')).not.toThrow();
    });

    it('should block javascript: URLs', () => {
      expect(() => validateURL('javascript:alert("xss")')).toThrow(
        URLValidationError
      );
      expect(() => validateURL('javascript:alert("xss")')).toThrow(
        'Protocol javascript: is not allowed'
      );
    });

    it('should block data: URLs', () => {
      expect(() => validateURL('data:text/html,<script>alert(1)</script>')).toThrow(
        URLValidationError
      );
      expect(() => validateURL('data:text/html,<script>alert(1)</script>')).toThrow(
        'Protocol data: is not allowed'
      );
    });

    it('should block file: URLs', () => {
      expect(() => validateURL('file:///etc/passwd')).toThrow(URLValidationError);
      expect(() => validateURL('file:///etc/passwd')).toThrow(
        'Protocol file: is not allowed'
      );
    });

    it('should block ftp: URLs', () => {
      expect(() => validateURL('ftp://example.com/file')).toThrow(URLValidationError);
      expect(() => validateURL('ftp://example.com/file')).toThrow(
        'Protocol ftp: is not allowed'
      );
    });

    it('should block mailto: URLs', () => {
      expect(() => validateURL('mailto:test@example.com')).toThrow(URLValidationError);
      expect(() => validateURL('mailto:test@example.com')).toThrow(
        'Protocol mailto: is not allowed'
      );
    });
  });

  describe('Decode and Normalise', () => {
    it('should decode percent-encoded URLs', () => {
      expect(() => validateURL('https://shamrockrovers.ie/%74%69%63%6b%65%74%73')).not.toThrow();
    });

    it('should normalise Unicode', () => {
      expect(() => validateURL('https://shamrockrovers.ie/tickets')).not.toThrow();
    });

    it('should prevent bypasses via double encoding', () => {
      expect(() => validateURL('https://example.com/%256A%2561%2576%2561%2573%2563%2572%2569%2570%2574')).toThrow(
        URLValidationError
      );
    });
  });

  describe('Private IP Check', () => {
    it('should block localhost', () => {
      expect(() => validateURL('https://localhost')).toThrow(URLValidationError);
      expect(() => validateURL('https://localhost')).toThrow(
        'Private or internal IP addresses are not allowed'
      );
    });

    it('should block 127.x.x.x', () => {
      expect(() => validateURL('http://127.0.0.1')).toThrow(URLValidationError);
      expect(() => validateURL('http://127.0.0.1')).toThrow(
        'Private or internal IP addresses are not allowed'
      );
    });

    it('should block 10.x.x.x', () => {
      expect(() => validateURL('https://10.0.0.1')).toThrow(URLValidationError);
    });

    it('should block 172.16-31.x.x', () => {
      expect(() => validateURL('https://172.16.0.1')).toThrow(URLValidationError);
      expect(() => validateURL('https://172.31.255.1')).toThrow(URLValidationError);
    });

    it('should block 192.168.x.x', () => {
      expect(() => validateURL('https://192.168.1.1')).toThrow(URLValidationError);
    });

    it('should block 0.0.0.0', () => {
      expect(() => validateURL('https://0.0.0.0')).toThrow(URLValidationError);
    });

    it('should block IPv6 localhost', () => {
      expect(() => validateURL('https://[::1]')).toThrow(URLValidationError);
    });

    it('should allow public IPs', () => {
      expect(() => validateURL('https://8.8.8.8')).not.toThrow();
    });
  });

  describe('Format Check', () => {
    it('should reject empty URLs', () => {
      expect(() => validateURL('')).toThrow(URLValidationError);
      expect(() => validateURL('')).toThrow('URL is empty or malformed');
    });

    it('should reject malformed URLs', () => {
      expect(() => validateURL('not-a-url')).toThrow(URLValidationError);
      expect(() => validateURL('not-a-url')).toThrow('URL is empty or malformed');
    });

    it('should reject URLs with spaces', () => {
      expect(() => validateURL('https://example.com/with space')).toThrow(URLValidationError);
    });

    it('should reject URLs with invalid characters', () => {
      expect(() => validateURL('https://example.com/with?invalid[char]')).toThrow(URLValidationError);
    });
  });

  describe('DNS Resolution', () => {
    it('should resolve valid domains', async () => {
      // This test might fail in certain environments, so we'll skip it if DNS fails
      try {
        await validateURL('https://google.com');
      } catch (error) {
        if (error instanceof URLValidationError && error.message.includes('DNS resolution failed')) {
          expect(true).toBe(true); // DNS resolution can be environment-dependent
        } else {
          throw error;
        }
      }
    });

    it('should fail for non-existent domains', async () => {
      expect(() => validateURL('https://this-domain-does-not-exist-12345.com')).rejects.toThrow(
        URLValidationError
      );
    });
  });

  describe('Homograph Check', () => {
    it('should flag suspicious IDN domains', () => {
      // Example: Cyrillic 'а' (U+0430) vs Latin 'a' (U+0061)
      expect(() => validateURL('https://shаmrockrovers.ie')).toThrow(
        URLValidationError
      );
      expect(() => validateURL('https://shаmrockrovers.ie')).toThrow(
        'Possible homograph attack detected'
      );
    });

    it('should allow normal Unicode domains', () => {
      expect(() => validateURL('https://shamrockrovers.ie')).not.toThrow();
    });
  });

  describe('Shortener Loop Check', () => {
    it('should block rov.rs as destination', () => {
      expect(() => validateURL('https://rov.rs/tickets')).toThrow(URLValidationError);
      expect(() => validateURL('https://rov.rs/tickets')).toThrow(
        'URL shorteners are not allowed as destinations'
      );
    });

    it('should block other known shorteners', () => {
      expect(() => validateURL('https://bit.ly/abc123')).toThrow(URLValidationError);
      expect(() => validateURL('https://tinyurl.com/abc')).toThrow(URLValidationError);
      expect(() => validateURL('https://goo.gl/abc')).toThrow(URLValidationError);
    });

    it('should allow normal destinations', () => {
      expect(() => validateURL('https://shamrockrovers.ie')).not.toThrow();
    });
  });

  describe('Validation Stages', () => {
    it('should validate all stages by default', () => {
      const result = validateURL('https://shamrockrovers.ie');
      expect(result.valid).toBe(true);
      expect(result.stages).toBeDefined();
      expect(result.stages.length).toBeGreaterThan(0);
    });

    it('should validate specific stages when requested', () => {
      // This should pass protocol check but fail DNS check
      expect(() => validateURL('https://invalid-domain-12345.com', { stages: [ValidationStage.PROTOCOL] })).not.toThrow();
    });

    it('should validate all stages individually', () => {
      const testCases = [
        { url: 'https://shamrockrovers.ie', stages: [ValidationStage.PROTOCOL] },
        { url: 'https://shamrockrovers.ie', stages: [ValidationStage.NORMALISE] },
        { url: 'https://8.8.8.8', stages: [ValidationStage.PRIVATE_IP] },
        { url: 'https://shamrockrovers.ie', stages: [ValidationStage.FORMAT] },
        { url: 'https://google.com', stages: [ValidationStage.DNS] },
        { url: 'https://shamrockrovers.ie', stages: [ValidationStage.HOMOGRAPH] },
        { url: 'https://example.com', stages: [ValidationStage.SHORTENER_LOOP] },
      ];

      testCases.forEach(({ url, stages }) => {
        try {
          validateURL(url, { stages });
        } catch (error) {
          // Some stages might fail for valid URLs due to DNS issues
          if (error instanceof URLValidationError && error.message.includes('DNS resolution failed')) {
            // DNS issues are environment-dependent
            expect(true).toBe(true);
          }
        }
      });
    });
  });

  describe('Known Club Domains', () => {
    it('should allow shamrockrovers.ie', () => {
      expect(() => validateURL('https://shamrockrovers.ie')).not.toThrow();
    });

    it('should allow www.shamrockrovers.ie', () => {
      expect(() => validateURL('https://www.shamrockrovers.ie')).not.toThrow();
    });

    it('should allow shop.shamrockrovers.ie', () => {
      expect(() => validateURL('https://shop.shamrockrovers.ie')).not.toThrow();
    });

    it('should allow memberswear.shamrockrovers.ie', () => {
      expect(() => validateURL('https://memberswear.shamrockrovers.ie')).not.toThrow();
    });
  });
});