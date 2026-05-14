// API client for the admin dashboard
const API_BASE_URL = '/api';

interface ApiResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

interface Link {
  slug: string;
  title: string;
  destination: string;
  status: 'active' | 'expired' | 'paused' | 'deleted';
  created_at: string;
  updated_at: string;
  expires_at?: string;
  click_count: number;
}

interface LinkWithDetails extends Link {
  campaign?: string;
  channel?: string;
}

export async function getLinks(params?: {
  limit?: number;
  offset?: number;
  status?: string;
}): Promise<ApiResponse<LinkWithDetails>> {
  const searchParams = new URLSearchParams();

  if (params?.limit) searchParams.append('limit', params.limit.toString());
  if (params?.offset) searchParams.append('offset', params.offset.toString());
  if (params?.status) searchParams.append('status', params.status);

  const queryString = searchParams.toString();
  const url = `${API_BASE_URL}/links${queryString ? `?${queryString}` : ''}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
}

export async function getLinkStats(slug: string): Promise<{ click_count: number }> {
  try {
    const response = await fetch(`${API_BASE_URL}/links/${slug}/stats`);
    if (!response.ok) {
      throw new Error(`Stats request failed: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('Stats API error:', error);
    throw error;
  }
}

// Helper function to get days until expiry
export function getDaysUntilExpiry(expiresAt?: string): number {
  if (!expiresAt) return -1;

  try {
    const expiryDate = new Date(expiresAt);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if expiry date is in the past
    if (expiryDate < today) {
      return -1;
    }

    const diffTime = expiryDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch (error) {
    console.error('Error parsing expiry date:', error);
    return -1;
  }
}

// Format date for display
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
}