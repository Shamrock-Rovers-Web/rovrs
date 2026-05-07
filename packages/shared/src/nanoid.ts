import { customAlphabet } from 'nanoid';

const ALPHANUMERIC = 'abcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Generate a 12-character ID using alphanumeric characters
 */
export function generateId(): string {
  const nanoid = customAlphabet(ALPHANUMERIC, 12);
  return nanoid();
}

/**
 * Generate a 6-character slug using lowercase letters and numbers
 */
export function generateSlug(): string {
  const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 6);
  return nanoid();
}