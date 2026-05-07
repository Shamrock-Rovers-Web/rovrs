# Phase 5: Quick Create + Match Links

## Overview
Implement the Quick Create UI and Match Links functionality for the admin dashboard.

## Tasks

### Task 12: Quick create UI

#### Step 1: Write failing tests for QuickCreatePage

Create `/home/ubuntu/rovrs/admin/src/__tests__/QuickCreatePage.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import QuickCreatePage from '../pages/QuickCreatePage';
import * as apiClient from '../lib/api-client';

vi.mock('../lib/api-client');

describe('QuickCreatePage', () => {
  it('renders URL input field', () => {
    render(
      <BrowserRouter>
        <QuickCreatePage />
      </BrowserRouter>
    );
    expect(screen.getByPlaceholderText(/paste destination URL/i)).toBeInTheDocument();
  });

  it('shows link result after creating', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      id: 'abc123',
      slug: 'x7k2a',
      destination_url: 'https://example.com',
      title: 'Example',
      created_at: '2026-05-07T00:00:00Z',
    });
    vi.mocked(apiClient.createLink).mockImplementation(mockCreate);

    render(
      <BrowserRouter>
        <QuickCreatePage />
      </BrowserRouter>
    );

    const urlInput = screen.getByPlaceholderText(/paste destination URL/i);
    fireEvent.change(urlInput, { target: { value: 'https://example.com' } });

    const submitButton = screen.getByText(/create link/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/https?:\/\/rov\.rs\/x7k2a/i)).toBeInTheDocument();
    });
  });
});
```

#### Step 2: Implement QuickCreatePage.tsx

Create `/home/ubuntu/rovrs/admin/src/pages/QuickCreatePage.tsx`:

```typescript
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../lib/api-client';
import type { LinkResponse } from '@rovrs/shared';

export default function QuickCreatePage() {
  const [url, setUrl] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await apiClient.createLink({ destination_url: url });
      setSlug(result.slug);
      // Clear URL input for quick repeat
      setUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create link');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Quick Create Link</h1>

      {slug ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-2">Link created successfully!</h2>
          <p className="text-gray-700 mb-4">Your short link is:</p>
          <div className="bg-white border rounded-lg p-4 flex items-center gap-2">
            <code className="text-lg">https://rov.rs/{slug}</code>
            <button
              onClick={() => navigator.clipboard.writeText(`https://rov.rs/${slug}`)}
              className="text-brand-green hover:text-brand-greenDark px-3 py-1 rounded"
            >
              Copy
            </button>
            <Link
              to={`/links/${slug}`}
              className="ml-auto text-brand-green hover:text-brand-greenDark px-3 py-1"
            >
              Edit →
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Destination URL *</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-green"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || !url}
              className="flex-1 bg-brand-green text-white px-6 py-2 rounded-lg hover:bg-brand-greenDark disabled:bg-gray-400"
            >
              {loading ? 'Creating...' : 'Create Link'}
            </button>
            <Link
              to="/links"
              className="px-6 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </Link>
          </div>
        </form>
      )}

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium mb-2">Quick tips</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• Slug is auto-generated as 6 characters</li>
          <li>• Add campaign/channel in the regular create page</li>
          <li>• Create social variants from the link details</li>
        </ul>
      </div>
    </div>
  );
}
```

#### Step 3: Create src/pages/MatchLinkPage.tsx

Create `/home/ubuntu/rovrs/admin/src/pages/MatchLinkPage.tsx`:

```typescript
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../lib/api-client';
import type { LinkResponse } from '@rovrs/shared';

export default function MatchLinkPage() {
  const [opponent, setOpponent] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [homeAway, setHomeAway] = useState('home');
  const [competition, setCompetition] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Normalize opponent name to slug
      const campaign = opponent
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/^-+|-+$/g, '');

      const result = await apiClient.createLink({
        slug: campaign,
        destination_url: destinationUrl,
        campaign,
        channel: 'Matchday',
        match_date: matchDate || null,
        home_away: homeAway,
        competition: competition || null,
        expires_at: expiryDate || null,
      });

      setSuccess(true);
      setOpponent('');
      setDestinationUrl('');
      setHomeAway('home');
      setCompetition('');
      setMatchDate('');
      setExpiryDate('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create link');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Match Day Link</h1>

      {success ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-2">Match link created!</h2>
          <p className="text-gray-700 mb-4">Link: https://rov.rs/{opponent.toLowerCase().replace(/[^a-z0-9]/g, '-')}</p>
          <Link to="/links" className="text-brand-green hover:text-brand-greenDark">
            View all links →
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Opponent *</label>
            <input
              type="text"
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
              placeholder="e.g., Bohemians Dublin"
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-green"
            />
            <p className="text-xs text-gray-500 mt-1">Slug will be auto-generated from this name</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Destination URL *</label>
            <input
              type="url"
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
              placeholder="https://www.shamrockrovers.ie/tickets"
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-green"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Home / Away</label>
              <select
                value={homeAway}
                onChange={(e) => setHomeAway(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-green"
              >
                <option value="home">Home</option>
                <option value="away">Away</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Competition</label>
              <input
                type="text"
                value={competition}
                onChange={(e) => setCompetition(e.target.value)}
                placeholder="e.g., Premier Division"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-green"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Match Date (optional)</label>
            <input
              type="date"
              value={matchDate}
              onChange={(e) => setMatchDate(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-green"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Expiry Date (optional)</label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-green"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || !opponent || !destinationUrl}
              className="flex-1 bg-brand-green text-white px-6 py-2 rounded-lg hover:bg-brand-greenDark disabled:bg-gray-400"
            >
              {loading ? 'Creating...' : 'Create Match Link'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
```

## Notes

- Import types from `@rovrs/shared`
- The QuickCreatePage allows creating a link with just a destination URL
- The MatchLinkPage creates match-specific links with opponent-based slugs
- Both components include error handling and loading states
- The UI is responsive and uses consistent styling with the rest of the admin dashboard