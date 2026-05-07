import {
  validateDestinationUrl,
  validateURL,
  validateURLStages,
  ValidationResult,
  ValidationStage,
  URLValidationError,
  isPrivateIP,
  mockDnsCheck,
  isHomographDomain,
  checkShortenerDomains,
  isKnownDomain,
  getValidationErrors,
} from '../packages/redirect-worker/src/url-validation';

describe('URL Validation', () => {
  describe('validateDestinationUrl', () => {
    it('should allow valid HTTPS URLs', () => {
      const result = validateDestinationUrl('https://example.com/path');
      expect(result.valid).toBe(true);
      expect(result.normalizedUrl).toBeDefined();
      expect(result.stages.every(stage => stage.passed)).toBe(true);
    });

    it('should allow valid HTTP URLs', () => {
      const result = validateDestinationUrl('http://example.com/path');
      expect(result.valid).toBe(true);
      expect(result.normalizedUrl).toBeDefined();
      expect(result.stages.every(stage => stage.passed)).toBe(true);
    });

    it('should reject javascript: protocol', () => {
      const result = validateDestinationUrl('javascript:alert("xss")');
      expect(result.valid).toBe(false);
      expect(result.stages.some(stage => stage.stage === ValidationStage.PROTOCOL && !stage.passed)).toBe(true);
      expect(getValidationErrors(result).some(error => error.includes('Protocol'))).toBe(true);
    });

    it('should reject data: protocol', () => {
      const result = validateDestinationUrl('data:text/html,<script>alert(1)</script>');
      expect(result.valid).toBe(false);
      expect(result.stages.some(stage => stage.stage === ValidationStage.PROTOCOL && !stage.passed)).toBe(true);
    });

    it('should reject file: protocol', () => {
      const result = validateDestinationUrl('file:///etc/passwd');
      expect(result.valid).toBe(false);
      expect(result.stages.some(stage => stage.stage === ValidationStage.PROTOCOL && !stage.passed)).toBe(true);
    });

    it('should reject ftp: protocol', () => {
      const result = validateDestinationUrl('ftp://example.com');
      expect(result.valid).toBe(false);
      expect(result.stages.some(stage => stage.stage === ValidationStage.PROTOCOL && !stage.passed)).toBe(true);
    });
  });

  describe('isPrivateIP', () => {
    it('should reject localhost', () => {
      expect(isPrivateIP('localhost')).toBe(true);
    });

    it('should reject 127.x.x.x', () => {
      expect(isPrivateIP('127.0.0.1')).toBe(true);
      expect(isPrivateIP('127.255.255.255')).toBe(true);
    });

    it('should reject 10.x.x.x', () => {
      expect(isPrivateIP('10.0.0.1')).toBe(true);
      expect(isPrivateIP('10.99.99.99')).toBe(true);
    });

    it('should reject 172.16-31.x.x', () => {
      expect(isPrivateIP('172.16.0.1')).toBe(true);
      expect(isPrivateIP('172.31.255.255')).toBe(true);
    });

    it('should reject 192.168.x.x', () => {
      expect(isPrivateIP('192.168.0.1')).toBe(true);
      expect(isPrivateIP('192.168.255.255')).toBe(true);
    });

    it('should reject ::1 IPv6', () => {
      expect(isPrivateIP('[::1]')).toBe(true);
      expect(isPrivateIP('::1')).toBe(true);
    });

    it('should allow public IP addresses', () => {
      expect(isPrivateIP('8.8.8.8')).toBe(false);
      expect(isPrivateIP('1.1.1.1')).toBe(false);
      expect(isPrivateIP('208.67.222.222')).toBe(false);
    });

    it('should allow valid domain names', () => {
      expect(isPrivateIP('example.com')).toBe(false);
      expect(isPrivateIP('google.com')).toBe(false);
    });
  });

  describe('mockDnsCheck', () => {
    it('should return valid for common domains', () => {
      expect(mockDnsCheck('example.com').valid).toBe(true);
      expect(mockDnsCheck('google.com').valid).toBe(true);
    });

    it('should reject invalid hostname length', () => {
      const longHostname = 'a'.repeat(254) + '.com';
      expect(mockDnsCheck(longHostname).valid).toBe(false);
    });

    it('should reject invalid hostname characters', () => {
      expect(mockDnsCheck('example@.com').valid).toBe(false);
      expect(mockDnsCheck('example com').valid).toBe(false);
    });
  });

  describe('isHomographDomain', () => {
    it('should detect Cyrillic characters mixed with Latin', () => {
      expect(isHomographDomain('exаmple.com')).toBe(true); // а is Cyrillic
      expect(isHomographDomain('examрle.com')).toBe(true); // р is Cyrillic
      expect(isHomographDomain('examplе.com')).toBe(true); // е is Cyrillic
    });

    it('should reject common homograph attacks', () => {
      expect(isHomographDomain('gооgle.com')).toBe(true); // о is Cyrillic
      expect(isHomographDomain('аmazon.com')).toBe(true); // а is Cyrillic
    });

    it('should allow pure Latin domains', () => {
      expect(isHomographDomain('example.com')).toBe(false);
      expect(isHomographDomain('google.com')).toBe(false);
    });
  });

  describe('checkShortenerDomains', () => {
    it('should flag known shorteners', () => {
      expect(checkShortenerDomains('bit.ly')).toBe(true);
      expect(checkShortenerDomains('t.co')).toBe(true);
      expect(checkShortenerDomains('tinyurl.com')).toBe(true);
      expect(checkShortenerDomains('goo.gl')).toBe(true);
    });

    it('should flag rov.rs shortener', () => {
      expect(checkShortenerDomains('rov.rs')).toBe(true);
    });

    it('should ignore www subdomains', () => {
      expect(checkShortenerDomains('www.bit.ly')).toBe(true);
    });

    it('should allow non-shortener domains', () => {
      expect(checkShortenerDomains('example.com')).toBe(false);
      expect(checkShortenerDomains('google.com')).toBe(false);
    });
  });

  describe('isKnownDomain', () => {
    it('should flag common platforms', () => {
      expect(isKnownDomain('facebook.com')).toBe(true);
      expect(isKnownDomain('instagram.com')).toBe(true);
      expect(isKnownDomain('twitter.com')).toBe(true);
      expect(isKnownDomain('x.com')).toBe(true);
      expect(isKnownDomain('youtube.com')).toBe(true);
    });

    it('should not flag Shamrock Rovers domains', () => {
      expect(isKnownDomain('shamrockrovers.ie')).toBe(false);
      expect(isKnownDomain('www.shamrockrovers.ie')).toBe(false);
      expect(isKnownDomain('shop.shamrockrovers.ie')).toBe(false);
      expect(isKnownDomain('memberswear.shamrockrovers.ie')).toBe(false);
    });

    it('should allow unknown domains', () => {
      expect(isKnownDomain('example.com')).toBe(false);
      expect(isKnownDomain('new-startup.com')).toBe(false);
    });
  });

  describe('getValidationErrors', () => {
    it('should return all error messages from failed stages', () => {
      const result: ValidationResult = {
        valid: false,
        stages: [
          { stage: ValidationStage.PROTOCOL, passed: false, error: 'Protocol javascript: is not allowed' },
          { stage: ValidationStage.PRIVATE_IP, passed: true, message: 'OK' },
          { stage: ValidationStage.HOMOGRAPH, passed: false, error: 'Possible homograph attack' },
        ],
      };

      const errors = getValidationErrors(result);
      expect(errors).toHaveLength(2);
      expect(errors).toContain('Protocol javascript: is not allowed');
      expect(errors).toContain('Possible homograph attack');
    });

    it('should return empty array when no errors', () => {
      const result: ValidationResult = {
        valid: true,
        stages: [
          { stage: ValidationStage.PROTOCOL, passed: true, message: 'OK' },
          { stage: ValidationStage.PRIVATE_IP, passed: true, message: 'OK' },
        ],
      };

      const errors = getValidationErrors(result);
      expect(errors).toHaveLength(0);
    });
  });

  describe('validateURLStages', () => {
    it('should validate only specified stages', () => {
      const result = validateURLStages('http://127.0.0.1', [
        ValidationStage.PROTOCOL,
        ValidationStage.PRIVATE_IP,
      ]);

      expect(result.valid).toBe(false);
      expect(result.stages).toHaveLength(2);
      expect(result.stages[0].stage).toBe(ValidationStage.PROTOCOL);
      expect(result.stages[1].stage).toBe(ValidationStage.PRIVATE_IP);
    });
  });

  describe('double encoding attacks', () => {
    it('should allow normal encoding', () => {
      const result = validateDestinationUrl('https://example.com/path%20with%20spaces');
      expect(result.valid).toBe(true);
    });
  });

  describe('URL normalization', () => {
    it('should normalize URLs consistently', () => {
      const result = validateDestinationUrl('https://EXAMPLE.COM/PATH');
      expect(result.valid).toBe(true);
      expect(result.normalizedUrl).toBe('https://example.com/PATH');
    });
  });

  describe('format validation', () => {
    it('should reject URLs with spaces', () => {
      const result = validateDestinationUrl('https://example.com/with spaces');
      expect(result.valid).toBe(false);
      expect(result.stages.some(stage => stage.stage === ValidationStage.FORMAT && !stage.passed)).toBe(true);
    });

    it('should allow valid special characters in URL', () => {
      const result = validateDestinationUrl('https://example.com/path?query=value&other=123');
      expect(result.valid).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should reject empty URL', () => {
      const result = validateDestinationUrl('');
      expect(result.valid).toBe(false);
    });

    it('should reject malformed URL', () => {
      const result = validateDestinationUrl('not-a-url');
      expect(result.valid).toBe(false);
    });

    it('should reject null input', () => {
      const result = validateDestinationUrl((null as unknown) as string);
      expect(result.valid).toBe(false);
    });

    it('should reject undefined input', () => {
      const result = validateDestinationUrl((undefined as unknown) as string);
      expect(result.valid).toBe(false);
    });
  });

  describe('comprehensive validation', () => {
    it('should pass all stages for a valid URL', () => {
      const result = validateDestinationUrl('https://example.com/path');
      expect(result.valid).toBe(true);
      expect(result.stages.length > 0).toBe(true);
      expect(result.stages.every(stage => stage.passed)).toBe(true);
    });

    it('should fail at first error in chain', () => {
      const result = validateDestinationUrl('javascript://example.com');
      expect(result.valid).toBe(false);
      expect(result.stages[0].stage).toBe(ValidationStage.PROTOCOL);
      expect(result.stages[0].passed).toBe(false);
    });

    it('should provide detailed validation results', () => {
      const result = validateDestinationUrl('http://127.0.0.1/path');
      expect(result.valid).toBe(false);
      expect(result.stages.length > 0).toBe(true);
      expect(result.stages.some(stage => !stage.passed)).toBe(true);
    });
  });
});