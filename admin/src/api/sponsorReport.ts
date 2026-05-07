import type { Link, ClickEvent } from '@rovrs/shared';

interface LinkClickData {
  date: string;
  slug: string;
  destination: string;
  click_count: number;
  channels: Array<{
    channel: string;
    clicks: number;
  }>;
}

interface SponsorReportResponse {
  links: LinkClickData[];
  total_clicks: number;
  unique_links: number;
}

const API_BASE = window.location.origin === 'http://localhost:3000'
  ? 'http://localhost:8787'
  : 'https://admin.rov.rs';

// Fetch all unique sponsors from the links table
export const fetchUniqueSponsors = async (): Promise<string[]> => {
  try {
    const response = await fetch(`${API_BASE}/api/sponsors/unique`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.sponsors || [];
  } catch (error) {
    console.error('Error fetching unique sponsors:', error);
    throw error;
  }
};

// Fetch sponsor report data
export const fetchSponsorReport = async (
  sponsor?: string,
  startDate?: string,
  endDate?: string
): Promise<LinkClickData[]> => {
  const params = new URLSearchParams();

  if (sponsor) {
    params.append('sponsor', sponsor);
  }
  if (startDate) {
    params.append('start_date', startDate);
  }
  if (endDate) {
    params.append('end_date', endDate);
  }

  try {
    const response = await fetch(`${API_BASE}/api/reports/sponsors?${params.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: SponsorReportResponse = await response.json();
    return data.links || [];
  } catch (error) {
    console.error('Error fetching sponsor report:', error);
    throw error;
  }
};

// Helper function to get date range breakdown
export const getDateBreakdown = (clickEvents: ClickEvent[]): Record<string, number> => {
  const breakdown: Record<string, number> = {};

  clickEvents.forEach(event => {
    const date = new Date(event.clicked_at).toISOString().split('T')[0];
    breakdown[date] = (breakdown[date] || 0) + 1;
  });

  return breakdown;
};

// Helper function to get channel breakdown
export const getChannelBreakdown = (clickEvents: ClickEvent[]): Record<string, number> => {
  const breakdown: Record<string, number> = {};

  clickEvents.forEach(event => {
    const channel = event.utm_medium || 'organic';
    breakdown[channel] = (breakdown[channel] || 0) + 1;
  });

  return breakdown;
};