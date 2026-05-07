import { CHANNELS, LINK_STATUS, USER_ROLES } from './constants';

/**
 * Core data types for the application
 */

export interface Link {
  id: string;
  slug: string;
  destination: string;
  campaign?: string;
  channel?: typeof CHANNELS[number];
  status: typeof LINK_STATUS[number];
  created_at: string;
  updated_at: string;
  expires_at?: string;
  created_by: string;
  updated_by: string;
  match_info?: MatchInfo;
  is_offsite: boolean;
  show_preview: boolean;
  is_stable_evergreen: boolean;
  qr_code_path?: string;
  deleted_at?: string;
  original_slug?: string;
  variant_suffix?: string;
}

export interface ClickEvent {
  id: string;
  link_id: string;
  ip_address: string;
  user_agent: string;
  referer?: string;
  country?: string;
  city?: string;
  device_type: 'mobile' | 'tablet' | 'desktop';
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  clicked_at: string;
}

export interface MatchInfo {
  geo?: {
    country?: string;
    city?: string;
  };
  device?: {
    type: 'mobile' | 'tablet' | 'desktop';
    os?: string;
    browser?: string;
  };
  time?: {
    start?: string;
    end?: string;
    days?: number[];
  };
}

export interface DestinationHistory {
  id: string;
  link_id: string;
  old_destination: string;
  new_destination: string;
  changed_at: string;
  changed_by: string;
  reason?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: typeof USER_ROLES[number];
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

export interface CreateLinkRequest {
  destination: string;
  campaign?: string;
  channel?: typeof CHANNELS[number];
  expires_at?: string;
  match_info?: MatchInfo;
  is_offsite?: boolean;
  show_preview?: boolean;
  is_stable_evergreen?: boolean;
}

export interface UpdateLinkRequest {
  destination?: string;
  campaign?: string;
  channel?: typeof CHANNELS[number];
  status?: typeof LINK_STATUS[number];
  expires_at?: string;
  match_info?: MatchInfo;
  is_offsite?: boolean;
  show_preview?: boolean;
  is_stable_evergreen?: boolean;
}

export interface LinkStats {
  link_id: string;
  slug: string;
  total_clicks: number;
  unique_clicks: number;
  clicks_by_device: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  clicks_by_day: Array<{
    date: string;
    clicks: number;
  }>;
  top_countries: Array<{
    country: string;
    clicks: number;
  }>;
  top_referers: Array<{
    referer: string;
    clicks: number;
  }>;
  utm_breakdown: Array<{
    source: string;
    medium: string;
    campaign: string;
    clicks: number;
  }>;
}

export interface BulkImportRow {
  slug?: string;
  destination: string;
  campaign?: string;
  channel?: typeof CHANNELS[number];
  expires_at?: string;
  match_info?: MatchInfo;
  is_offsite?: boolean;
  show_preview?: boolean;
  is_stable_evergreen?: boolean;
}

export interface SponsorReport {
  sponsor_id: string;
  sponsor_name: string;
  total_clicks: number;
  unique_clicks: number;
  links_count: number;
  top_links: Array<{
    slug: string;
    destination: string;
    clicks: number;
  }>;
  period: {
    start: string;
    end: string;
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}