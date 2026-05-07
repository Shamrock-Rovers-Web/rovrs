/**
 * Application constants
 */

export const FALLBACK_URL = 'https://rov.rs/tickets';

export const RESERVED_PATHS = [
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
] as const;

export const CHANNELS = [
  'social',
  'email',
  'web',
  'referral',
  'organic',
  'paid',
  'sms',
  'other',
] as const;

export const LINK_STATUS = [
  'active',
  'paused',
  'expired',
  'deleted',
] as const;

export const USER_ROLES = [
  'admin',
  'editor',
  'viewer',
] as const;

export const KNOWN_CLUB_DOMAINS = [
  'shamrockrovers.com',
  'rov.rs',
  'shop.shamrockrovers.com',
  'tickets.shamrockrovers.com',
  'fixtures.shamrockrovers.com',
] as const;

export const BLOCKED_PROTOCOLS = [
  'javascript:',
  'data:',
  'file:',
  'ftp:',
] as const;

export const UTM_CHANNEL_MAP = {
  social: 'social',
  email: 'email',
  web: 'web',
  referral: 'referral',
  organic: 'organic',
  paid: 'paid',
  sms: 'sms',
  other: 'other',
} as const;

export const VARIANT_SUFFIX_MAP = {
  'a': '-a',
  'b': '-b',
  'c': '-c',
  'd': '-d',
  'e': '-e',
  'f': '-f',
  'g': '-g',
  'h': '-h',
  'i': '-i',
  'j': '-j',
} as const;

export const SOCIAL_VARIANT_SUFFIX_MAP = {
  'instagram': '-ig',
  'facebook': '-fb',
  'twitter': '-x',
  'tiktok': '-tt',
  'linkedin': '-li',
} as const;

export const SOCIAL_PLATFORM_UTM_SOURCE_MAP = {
  'instagram': 'instagram',
  'facebook': 'facebook',
  'twitter': 'twitter',
  'tiktok': 'tiktok',
  'linkedin': 'linkedin',
} as const;