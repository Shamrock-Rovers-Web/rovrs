import { parseDeviceType, nowUTC } from '@rovrs/shared';
import type { D1Database } from '@cloudflare/workers-types';
import type { Queues } from '@cloudflare/workers-types';

export interface ClickEventData {
  id: string;
  slug: string;
  timestamp: string;
  ipCountry?: string;
  referrer?: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  url: string;
  utmCampaign?: string;
  utmChannel?: string;
}

// UTM_CHANNEL_MAP for platform-specific tagging
const UTM_CHANNEL_MAP: Record<string, { campaign: string; channel: string }> = {
  'twitter': { campaign: 'twitter-campaign', channel: 'social' },
  'facebook': { campaign: 'facebook-campaign', channel: 'social' },
  'instagram': { campaign: 'instagram-campaign', channel: 'social' },
  'tiktok': { campaign: 'tiktok-campaign', channel: 'social' },
  'youtube': { campaign: 'youtube-campaign', channel: 'social' },
  'linkedin': { campaign: 'linkedin-campaign', channel: 'social' },
  'web': { campaign: 'organic', channel: 'organic' },
  'email': { campaign: 'email-campaign', channel: 'email' },
  'sms': { campaign: 'sms-campaign', channel: 'sms' },
  'other': { campaign: 'referral', channel: 'referral' }
};

export async function enqueueClickEvent(
  queues: Queues | null,
  db: D1Database,
  slug: string,
  request: Request
): Promise<void> {
  const clickEvent = await extractClickEvent(slug, request);

  // Try to enqueue to Cloudflare Queues first
  if (queues) {
    try {
      await queues.clickEvents.write(clickEvent);
      return;
    } catch (error) {
      console.error('Failed to enqueue to Cloudflare Queues, falling back to D1:', error);
    }
  }

  // Fallback to D1
  await writeClickEventToD1(db, clickEvent);
}

export async function extractClickEvent(
  slug: string,
  request: Request
): Promise<ClickEventData> {
  const url = new URL(request.url);
  const userAgent = request.headers.get('User-Agent') || '';
  const referer = request.headers.get('Referer');
  const cfCountry = request.cf?.country;

  // Extract variant information from headers
  const variantOf = request.headers.get('x-variant-of');
  const variantChannel = request.headers.get('x-variant-channel');

  // Determine UTM tags based on variant status
  let utmCampaign: string | undefined;
  let utmChannel: string | undefined;

  if (variantOf && variantChannel) {
    // This is a variant link - apply platform-specific UTM based on channel
    const platformMapping = UTM_CHANNEL_MAP[variantChannel.toLowerCase()];

    if (platformMapping) {
      utmCampaign = platformMapping.campaign;
      utmChannel = variantChannel; // Use the actual channel from the variant
    }
  } else {
    // Extract UTM tags from query parameters for non-variant links
    utmCampaign = url.searchParams.get('utm_campaign') || undefined;
    utmChannel = url.searchParams.get('utm_channel') || undefined;
  }

  return {
    id: generateId(),
    slug,
    timestamp: nowUTC(),
    ipCountry: cfCountry,
    referrer: referer,
    deviceType: parseDeviceType(userAgent),
    url: url.toString(),
    utmCampaign,
    utmChannel
  };
}

export async function writeClickEventToD1(
  db: D1Database,
  event: ClickEventData
): Promise<void> {
  await db
    .prepare(`
      INSERT INTO click_events (
        id, slug, timestamp, ip_country, referrer,
        device_type, url, utm_campaign, utm_channel
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      event.id,
      event.slug,
      event.timestamp,
      event.ipCountry || null,
      event.referrer || null,
      event.deviceType,
      event.url,
      event.utmCampaign || null,
      event.utmChannel || null
    )
    .run();
}

export function generateId(): string {
  // Simple ID generation - nanoid would be better but avoiding new dependencies
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}