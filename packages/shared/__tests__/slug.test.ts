import {
  validateSlug,
  normaliseSlug,
  isReservedPath,
  suffixDeletedSlug,
  extractOriginalSlug,
  createUniqueSlug,
  isSlugAvailable,
} from '../src/slug';

describe('validateSlug', () => {
  it('should accept valid slugs', () => {
    expect(validateSlug('abc123')).toBe(true);
    expect(validateSlug('a-b-c')).toBe(true);
    expect(validateSlug('123-456')).toBe(true);
    expect(validateSlug('a1-b2-c3')).toBe(true);
    expect(validateSlug('test-link')).toBe(true);
    expect(validateSlug('tickets')).toBe(true);
    expect(validateSlug('shop')).toBe(true);
    expect(validateSlug('fixtures')).toBe(true);
  });

  it('should reject slugs that are too short', () => {
    expect(validateSlug('a')).toBe(false);
    expect(validateSlug('ab')).toBe(false);
  });

  it('should reject slugs that are too long', () => {
    expect(validateSlug('a'.repeat(51))).toBe(false);
    expect(validateSlug('a-'.repeat(26))).toBe(false);
  });

  it('should reject slugs starting or ending with hyphen', () => {
    expect(validateSlug('-test')).toBe(false);
    expect(validateSlug('test-')).toBe(false);
    expect(validateSlug('-test-')).toBe(false);
  });

  it('should reject slugs with invalid characters', () => {
    expect(validateSlug('Test')).toBe(false); // uppercase
    expect(validateSlug('test link')).toBe(false); // space
    expect(validateSlug('test_link')).toBe(false); // underscore
    expect(validateSlug('test.link')).toBe(false); // dot
    expect(validateSlug('test&link')).toBe(false); // ampersand
    expect(validateSlug('test/link')).toBe(false); // slash
    expect(validateSlug('')).toBe(false); // empty
  });
});

describe('normaliseSlug', () => {
  it('should convert to lowercase', () => {
    expect(normaliseSlug('TEST')).toBe('test');
    expect(normaliseSlug('Test')).toBe('test');
  });

  it('should replace spaces with hyphens', () => {
    expect(normaliseSlug('test link')).toBe('test-link');
  });

  it('should replace underscores with hyphens', () => {
    expect(normaliseSlug('test_link')).toBe('test-link');
  });

  it('should replace dots with hyphens', () => {
    expect(normaliseSlug('test.link')).toBe('test-link');
  });

  it('should replace multiple hyphens with single hyphen', () => {
    expect(normaliseSlug('test--link')).toBe('test-link');
    expect(normaliseSlug('test---link')).toBe('test-link');
    expect(normaliseSlug('test----link')).toBe('test-link');
  });

  it('should remove leading and trailing hyphens', () => {
    expect(normaliseSlug('-test')).toBe('test');
    expect(normaliseSlug('test-')).toBe('test');
    expect(normaliseSlug('-test-')).toBe('test');
  });

  it('should handle complex cases', () => {
    expect(normaliseSlug('Test Link_Upper-Case')).toBe('test-link-upper-case');
    expect(normaliseSlug('...test...link...')).toBe('test-link');
  });
});

describe('isReservedPath', () => {
  it('should return true for reserved paths', () => {
    expect(isReservedPath('admin')).toBe(true);
    expect(isReservedPath('api')).toBe(true);
    expect(isReservedPath('health')).toBe(true);
    expect(isReservedPath('login')).toBe(true);
    expect(isReservedPath('logout')).toBe(true);
    expect(isReservedPath('stats')).toBe(true);
    expect(isReservedPath('export')).toBe(true);
    expect(isReservedPath('robots.txt')).toBe(true);
    expect(isReservedPath('favicon.ico')).toBe(true);
    expect(isReservedPath('.well-known')).toBe(true);
  });

  it('should return false for non-reserved paths', () => {
    expect(isReservedPath('tickets')).toBe(false);
    expect(isReservedPath('shop')).toBe(false);
    expect(isReservedPath('fixtures')).toBe(false);
    expect(isReservedPath('test')).toBe(false);
    expect(isReservedPath('abc123')).toBe(false);
  });
});

describe('suffixDeletedSlug', () => {
  it('should add deleted suffix to slug', () => {
    expect(suffixDeletedSlug('test')).toBe('test-deleted');
    expect(suffixDeletedSlug('test-link')).toBe('test-link-deleted');
    expect(suffixDeletedSlug('abc123')).toBe('abc123-deleted');
  });

  it('should handle slugs with existing suffix', () => {
    expect(suffixDeletedSlug('test-deleted')).toBe('test-deleted-deleted');
  });
});

describe('extractOriginalSlug', () => {
  it('should extract original slug from deleted slug', () => {
    expect(extractOriginalSlug('test-deleted')).toBe('test');
    expect(extractOriginalSlug('test-link-deleted')).toBe('test-link');
    expect(extractOriginalSlug('abc123-deleted')).toBe('abc123');
  });

  it('should return null for non-deleted slugs', () => {
    expect(extractOriginalSlug('test')).toBe(null);
    expect(extractOriginalSlug('test-link')).toBe(null);
    expect(extractOriginalSlug('test-deleted-something')).toBe(null);
  });
});

describe('createUniqueSlug', () => {
  it('should generate a valid slug', () => {
    const slug = createUniqueSlug();
    expect(slug).toHaveLength(6);
    expect(slug).toMatch(/^[a-z0-9]+$/);
  });

  it('should generate unique slugs', () => {
    const slug1 = createUniqueSlug();
    const slug2 = createUniqueSlug();
    expect(slug1).not.toBe(slug2);
  });
});

describe('isSlugAvailable', () => {
  it('should return false for invalid slugs', () => {
    expect(isSlugAvailable('A')).toBe(false); // too short
    expect(isSlugAvailable('A-')).toBe(false); // ends with hyphen
    expect(isSlugAvailable('Test')).toBe(false); // uppercase
  });

  it('should return false for reserved paths', () => {
    expect(isSlugAvailable('admin')).toBe(false);
    expect(isSlugAvailable('api')).toBe(false);
    expect(isSlugAvailable('health')).toBe(false);
  });

  it('should return false for deleted slugs', () => {
    expect(isSlugAvailable('test-deleted')).toBe(false);
  });

  it('should return true for valid, non-reserved slugs', () => {
    expect(isSlugAvailable('tickets')).toBe(true);
    expect(isSlugAvailable('shop')).toBe(true);
    expect(isSlugAvailable('fixtures')).toBe(true);
    expect(isSlugAvailable('test-link')).toBe(true);
  });
});