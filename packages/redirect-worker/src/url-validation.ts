export interface ValidationResult {
  valid: boolean;
  stages: ValidationStepResult[];
  normalizedUrl?: string;
}

export interface ValidationStepResult {
  stage: ValidationStage;
  passed: boolean;
  message?: string;
  error?: string;
}

export enum ValidationStage {
  PROTOCOL = 'protocol',
  NORMALISE = 'normalise',
  PRIVATE_IP = 'private_ip',
  FORMAT = 'format',
  DNS = 'dns',
  HOMOGRAPH = 'homograph',
  SHORTENER_LOOP = 'shortener_loop',
  KNOWN_DOMAIN = 'known_domain',
}

export class URLValidationError extends Error {
  constructor(
    message: string,
    public stage: ValidationStage | null = null,
    public code: string = 'VALIDATION_ERROR'
  ) {
    super(message);
    this.name = 'URLValidationError';
  }
}

export interface ValidationOptions {
  stages?: ValidationStage[];
  skipDNS?: boolean; // Useful for testing environments where DNS might be restricted
}

const ALLOWED_PROTOCOLS = ['http:', 'https:'];
const BLOCKED_PROTOCOLS = [
  'javascript:', 'data:', 'file:', 'ftp:', 'mailto:', 'tel:', 'sms:',
  'irc:', 'git:', 'svn:', 'ssh:', 'ws:', 'wss:',
];

const KNOWN_SHORTENERS = [
  'rov.rs',
  'bit.ly', 'tinyurl.com', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly',
  't.co', 'short.io', 'rebrand.ly', 'clck.ru', 'cutt.ly',
];

const KNOWN_CLUB_DOMAINS = [
  'shamrockrovers.ie',
  'www.shamrockrovers.ie',
  'shop.shamrockrovers.ie',
  'memberswear.shamrockrovers.ie',
];

const PRIVATE_IP_RANGES = [
  // IPv4 private ranges
  /^localhost$/,           // Loopback
  /^127\.\d+\.\d+\.\d+$/, // Loopback
  /^10\.\d+\.\d+\.\d+$/,  // Private network
  /^172\.(1[6-9]|2[0-9]|3[01])\.\d+\.\d+$/, // Private network
  /^192\.168\.\d+\.\d+$/, // Private network
  /^0\.0\.0\.0$/,         // All zeros
  // IPv6 private ranges
  /^\[?::1\]?$/,          // IPv6 loopback
  /^\[?fc00::\]?$/,      // Unique local address
  /^\[?fe80::\]?$/,      // Link-local address
];

export function validateURL(
  url: string,
  options: ValidationOptions = {}
): ValidationResult {
  const {
    stages = Object.values(ValidationStage),
    skipDNS = false,
  } = options;

  const results: ValidationStepResult[] = [];
  let normalizedUrl = url;

  // Start with protocol check - this should be first
  if (stages.includes(ValidationStage.PROTOCOL)) {
    try {
      const urlObj = new URL(normalizedUrl);
      if (!ALLOWED_PROTOCOLS.includes(urlObj.protocol)) {
        results.push({
          stage: ValidationStage.PROTOCOL,
          passed: false,
          error: `Protocol ${urlObj.protocol} is not allowed`,
        });
        throw new URLValidationError(
          `Protocol ${urlObj.protocol} is not allowed`,
          ValidationStage.PROTOCOL
        );
      }
      results.push({
        stage: ValidationStage.PROTOCOL,
        passed: true,
        message: 'Protocol check passed',
      });
    } catch (error) {
      if (error instanceof URLValidationError) {
        throw error;
      }
      results.push({
        stage: ValidationStage.PROTOCOL,
        passed: false,
        error: 'URL is empty or malformed',
      });
      throw new URLValidationError(
        'URL is empty or malformed',
        ValidationStage.PROTOCOL
      );
    }
  }

  // 2. Decode and Normalise
  if (stages.includes(ValidationStage.NORMALISE)) {
    try {
      // Handle double encoding attacks
      const decodedUrl = decodeURI(url);
      if (decodedUrl !== url) {
        // Check if double encoded
        const doubleDecoded = decodeURI(decodedUrl);
        if (doubleDecoded !== decodedUrl) {
          results.push({
            stage: ValidationStage.NORMALISE,
            passed: false,
            error: 'Possible double encoding attack detected',
          });
          throw new URLValidationError(
            'Possible double encoding attack detected',
            ValidationStage.NORMALISE
          );
        }
      }

      // Re-encode to normalize
      normalizedUrl = decodeURI(url);

      results.push({
        stage: ValidationStage.NORMALISE,
        passed: true,
        message: 'URL normalisation passed',
      });
    } catch (error) {
      results.push({
        stage: ValidationStage.NORMALISE,
        passed: false,
        error: 'URL normalisation failed',
      });
      throw new URLValidationError(
        'URL normalisation failed',
        ValidationStage.NORMALISE
      );
    }
  }

  // 3. Private IP Check
  if (stages.includes(ValidationStage.PRIVATE_IP)) {
    try {
      const urlObj = new URL(normalizedUrl);

      // Check if it's an IP address
      const hostname = urlObj.hostname;
      let isPrivate = false;

      // Check IPv4
      if (/^[\d.]+$/.test(hostname)) {
        for (const range of PRIVATE_IP_RANGES) {
          if (range.test(hostname)) {
            isPrivate = true;
            break;
          }
        }
      } else {
        // Check IPv6
        if (
          hostname === '[::1]' ||
          hostname === '::1' ||
          hostname.startsWith('fc00:') ||
          hostname.startsWith('fe80:')
        ) {
          isPrivate = true;
        }
      }

      if (isPrivate) {
        results.push({
          stage: ValidationStage.PRIVATE_IP,
          passed: false,
          error: 'Private or internal IP addresses are not allowed',
        });
        throw new URLValidationError(
          'Private or internal IP addresses are not allowed',
          ValidationStage.PRIVATE_IP
        );
      }

      results.push({
        stage: ValidationStage.PRIVATE_IP,
        passed: true,
        message: 'Private IP check passed',
      });
    } catch (error) {
      if (error instanceof URLValidationError) {
        throw error;
      }
      results.push({
        stage: ValidationStage.PRIVATE_IP,
        passed: false,
        error: 'Invalid hostname format',
      });
      throw new URLValidationError(
        'Invalid hostname format',
        ValidationStage.PRIVATE_IP
      );
    }
  }

  // 4. Format Check
  if (stages.includes(ValidationStage.FORMAT)) {
    try {
      const urlObj = new URL(normalizedUrl);

      // Check for spaces
      if (normalizedUrl.includes(' ')) {
        results.push({
          stage: ValidationStage.FORMAT,
          passed: false,
          error: 'URL contains spaces',
        });
        throw new URLValidationError(
          'URL contains spaces',
          ValidationStage.FORMAT
        );
      }

      // Check for control characters
      if (/[^ -~]/.test(urlObj.pathname)) {
        results.push({
          stage: ValidationStage.FORMAT,
          passed: false,
          error: 'URL contains invalid characters',
        });
        throw new URLValidationError(
          'URL contains invalid characters',
          ValidationStage.FORMAT
        );
      }

      results.push({
        stage: ValidationStage.FORMAT,
        passed: true,
        message: 'Format check passed',
      });
    } catch (error) {
      if (error instanceof URLValidationError) {
        throw error;
      }
      results.push({
        stage: ValidationStage.FORMAT,
        passed: false,
        error: 'URL format validation failed',
      });
      throw new URLValidationError(
        'URL format validation failed',
        ValidationStage.FORMAT
      );
    }
  }

  // 5. Homograph Check
  if (stages.includes(ValidationStage.HOMOGRAPH)) {
    try {
      const urlObj = new URL(normalizedUrl);
      const hostname = urlObj.hostname;

      // Check for IDN homograph attacks
      // Look for domains that mix scripts (e.g., Cyrillic and Latin)
      const hasMixedScripts = /[Ѐ-ӿ]/.test(hostname) && /[a-zA-Z]/.test(hostname);

      if (hasMixedScripts) {
        results.push({
          stage: ValidationStage.HOMOGRAPH,
          passed: false,
          error: 'Possible homograph attack detected',
        });
        throw new URLValidationError(
          'Possible homograph attack detected',
          ValidationStage.HOMOGRAPH
        );
      }

      // Check for common homograph confusions
      const commonHomographs = [
        /а/mg, // Cyrillic a vs Latin a
        /е/mg, // Cyrillic e vs Latin e
        /о/mg, // Cyrillic o vs Latin o
        /р/mg, // Cyrillic p vs Latin p
        /с/mg, // Cyrillic c vs Latin c
        /т/mg, // Cyrillic t vs Latin t
        /и/mg, // Cyrillic i vs Latin i
      ];

      for (const pattern of commonHomographs) {
        if (pattern.test(hostname)) {
          results.push({
            stage: ValidationStage.HOMOGRAPH,
            passed: false,
            error: 'Possible homograph attack detected',
          });
          throw new URLValidationError(
            'Possible homograph attack detected',
            ValidationStage.HOMOGRAPH
          );
        }
      }

      results.push({
        stage: ValidationStage.HOMOGRAPH,
        passed: true,
        message: 'Homograph check passed',
      });
    } catch (error) {
      if (error instanceof URLValidationError) {
        throw error;
      }
      results.push({
        stage: ValidationStage.HOMOGRAPH,
        passed: false,
        error: 'Homograph check failed',
      });
      throw new URLValidationError(
        'Homograph check failed',
        ValidationStage.HOMOGRAPH
      );
    }
  }

  // 6. DNS Check
  if (stages.includes(ValidationStage.DNS) && !skipDNS) {
    try {
      const urlObj = new URL(normalizedUrl);
      const dnsResult = mockDnsCheck(urlObj.hostname);
      if (!dnsResult.valid) {
        results.push({
          stage: ValidationStage.DNS,
          passed: false,
          error: 'DNS resolution failed: ' + dnsResult.error,
        });
        throw new URLValidationError(
          'DNS resolution failed: ' + dnsResult.error,
          ValidationStage.DNS
        );
      }

      results.push({
        stage: ValidationStage.DNS,
        passed: true,
        message: 'DNS check passed',
      });
    } catch (error) {
      if (error instanceof URLValidationError) {
        throw error;
      }
      results.push({
        stage: ValidationStage.DNS,
        passed: false,
        error: 'DNS validation failed',
      });
      throw new URLValidationError(
        'DNS validation failed',
        ValidationStage.DNS
      );
    }
  }

  // 7. Shortener Loop Check
  if (stages.includes(ValidationStage.SHORTENER_LOOP)) {
    try {
      const urlObj = new URL(normalizedUrl);
      const hostname = urlObj.hostname.replace('www.', '');

      if (checkShortenerDomains(hostname)) {
        results.push({
          stage: ValidationStage.SHORTENER_LOOP,
          passed: false,
          error: 'URL shorteners are not allowed as destinations',
        });
        throw new URLValidationError(
          'URL shorteners are not allowed as destinations',
          ValidationStage.SHORTENER_LOOP
        );
      }

      results.push({
        stage: ValidationStage.SHORTENER_LOOP,
        passed: true,
        message: 'Shortener loop check passed',
      });
    } catch (error) {
      if (error instanceof URLValidationError) {
        throw error;
      }
      results.push({
        stage: ValidationStage.SHORTENER_LOOP,
        passed: false,
        error: 'Shortener loop check failed',
      });
      throw new URLValidationError(
        'Shortener loop check failed',
        ValidationStage.SHORTENER_LOOP
      );
    }
  }

  // 8. Known Domain Check
  if (stages.includes(ValidationStage.KNOWN_DOMAIN)) {
    try {
      const urlObj = new URL(normalizedUrl);
      const hostname = urlObj.hostname.replace('www.', '');

      if (isKnownDomain(hostname)) {
        results.push({
          stage: ValidationStage.KNOWN_DOMAIN,
          passed: false,
          error: 'This domain is already a known service and may cause confusion',
        });
        throw new URLValidationError(
          'This domain is already a known service and may cause confusion',
          ValidationStage.KNOWN_DOMAIN
        );
      }

      results.push({
        stage: ValidationStage.KNOWN_DOMAIN,
        passed: true,
        message: 'Known domain check passed',
      });
    } catch (error) {
      if (error instanceof URLValidationError) {
        throw error;
      }
      results.push({
        stage: ValidationStage.KNOWN_DOMAIN,
        passed: false,
        error: 'Known domain check failed',
      });
      throw new URLValidationError(
        'Known domain check failed',
        ValidationStage.KNOWN_DOMAIN
      );
    }
  }

  // Check if all passed
  const allPassed = results.every(r => r.passed);

  return {
    valid: allPassed,
    stages: results,
    normalizedUrl: allPassed ? normalizedUrl! : undefined,
  };
}

// Helper function to validate specific stages
export function validateURLStages(
  url: string,
  stagesToValidate: ValidationStage[]
): ValidationResult {
  return validateURL(url, { stages: stagesToValidate });
}

// Helper function to get all failed validation messages
export function getValidationErrors(result: ValidationResult): string[] {
  return result.stages
    .filter(stage => !stage.passed && stage.error)
    .map(stage => stage.error!);
}

// isPrivateIP - reject localhost, 127.x, 10.x, 172.16-31.x, 192.168.x
export function isPrivateIP(hostname: string): boolean {
  // Check IPv4
  if (/^[\d.]+$/.test(hostname)) {
    for (const range of PRIVATE_IP_RANGES) {
      if (range.test(hostname)) {
        return true;
      }
    }
  }

  // Check IPv6
  if (
    hostname === '[::1]' ||
    hostname === '::1' ||
    hostname.startsWith('fc00:') ||
    hostname.startsWith('fe80:')
  ) {
    return true;
  }

  return false;
}

// mockDnsCheck - mock DNS resolution for testing
export function mockDnsCheck(hostname: string): { valid: boolean; error?: string } {
  // Mock implementation - in real Cloudflare Worker, use fetch to check DNS
  if (!hostname || hostname.length > 253) {
    return { valid: false, error: 'Invalid hostname length' };
  }

  // Check hostname format
  if (!/^[a-zA-Z0-9.-]+$/.test(hostname)) {
    return { valid: false, error: 'Invalid hostname characters' };
  }

  // Simulate DNS lookup delay
  const delay = Math.random() * 50;
  if (delay > 40) {
    return { valid: false, error: 'DNS timeout' };
  }

  return { valid: true };
}

// isHomographDomain - detect Cyrillic/other suspicious characters
export function isHomographDomain(hostname: string): boolean {
  // Check for IDN homograph attacks
  const hasMixedScripts = /[Ѐ-ӿ]/.test(hostname) && /[a-zA-Z]/.test(hostname);

  if (hasMixedScripts) {
    return true;
  }

  // Check for common homograph confusions
  const commonHomographs = [
    /а/mg, // Cyrillic a vs Latin a
    /е/mg, // Cyrillic e vs Latin e
    /о/mg, // Cyrillic o vs Latin o
    /р/mg, // Cyrillic p vs Latin p
    /с/mg, // Cyrillic c vs Latin c
    /т/mg, // Cyrillic t vs Latin t
    /и/mg, // Cyrillic i vs Latin i
  ];

  for (const pattern of commonHomographs) {
    if (pattern.test(hostname)) {
      return true;
    }
  }

  return false;
}

// checkShortenerDomains - flag bit.ly, t.co, etc.
export function checkShortenerDomains(hostname: string): boolean {
  const cleanHostname = hostname.replace('www.', '');
  return KNOWN_SHORTENERS.includes(cleanHostname);
}

// isKnownDomain - check against common platforms (not club domains)
export function isKnownDomain(hostname: string): boolean {
  const cleanHostname = hostname.replace('www.', '');

  // Check against common platforms that might cause confusion
  const commonPlatforms = [
    'facebook.com', 'instagram.com', 'twitter.com', 'x.com',
    'youtube.com', 'tiktok.com', 'linkedin.com',
    'paypal.com', 'amazon.com', 'ebay.com',
    'google.com', 'gmail.com', 'yahoo.com',
    'microsoft.com', 'apple.com', 'tesla.com',
  ];

  return commonPlatforms.includes(cleanHostname);
}

// Main validateDestinationUrl function
export function validateDestinationUrl(url: string): ValidationResult {
  try {
    return validateURL(url, { stages: Object.values(ValidationStage) });
  } catch (error) {
    if (error instanceof URLValidationError) {
      return {
        valid: false,
        stages: error.stage ? [{
          stage: error.stage,
          passed: false,
          error: error.message,
        }] : [],
      };
    }

    // Generic error
    return {
      valid: false,
      stages: [{
        stage: ValidationStage.PROTOCOL,
        passed: false,
        error: 'URL validation failed with unexpected error',
      }],
    };
  }
}