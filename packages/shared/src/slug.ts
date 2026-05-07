import { generateSlug } from './nanoid';

/**
 * Slug validation regex: lowercase letters, numbers, hyphens, 2-50 characters
 */
const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;

/**
 * Reserved paths that cannot be used as slugs
 */
const RESERVED_PATHS = [
  'admin',
  'api',
  'health',
  'login',
  'logout',
  'stats',
  'export',
  'robots.txt',
  'favicon.ico',
  '.well-known',
];

/**
 * Deleted slug suffix
 */
const DELETED_SUFFIX = '-deleted';

/**
 * Validate if a string is a valid slug
 */
export function validateSlug(slug: string): boolean {
  return SLUG_REGEX.test(slug);
}

/**
 * Normalize a slug by converting to lowercase and removing special characters
 * except hyphens, which are preserved
 */
export function normaliseSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Check if a path is reserved (cannot be used as a slug)
 */
export function isReservedPath(path: string): boolean {
  return RESERVED_PATHS.includes(path);
}

/**
 * Add deleted suffix to a slug
 */
export function suffixDeletedSlug(slug: string): string {
  return `${slug}${DELETED_SUFFIX}`;
}

/**
 * Extract original slug from deleted slug
 */
export function extractOriginalSlug(slug: string): string | null {
  if (slug.endsWith(DELETED_SUFFIX)) {
    return slug.slice(0, -DELETED_SUFFIX.length);
  }
  return null;
}

/**
 * Generate a new unique slug
 */
export function createUniqueSlug(): string {
  return generateSlug();
}

/**
 * Check if a slug is available (not reserved and not deleted)
 */
export function isSlugAvailable(slug: string): boolean {
  if (!validateSlug(slug)) {
    return false;
  }

  if (isReservedPath(slug)) {
    return false;
  }

  if (slug.endsWith(DELETED_SUFFIX)) {
    return false;
  }

  return true;
}