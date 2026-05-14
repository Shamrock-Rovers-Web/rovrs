import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const CHANNELS = ['Tickets', 'Instagram', 'Facebook', 'X/Twitter', 'TikTok', 'LinkedIn', 'QR code', 'Email', 'Sponsor', 'Matchday', 'Other'];

interface LinkCreateInput {
  slug: string;
  destination_url: string;
  title?: string;
  campaign?: string;
  channel?: string;
  owner?: string;
  sponsor?: string;
  opponent?: string;
  competition?: string;
  match_date?: string;
  home_away?: 'home' | 'away';
  expires_at?: string;
  notes?: string;
}

const validateDestinationURL = (url: string): { message: string } | null => {
  if (!url) {
    return { message: 'Destination URL is required' };
  }
  try {
    new URL(url);
    if (url.startsWith('javascript:') || url.startsWith('data:') || url.startsWith('file:') || url.startsWith('ftp:')) {
      return { message: 'Blocked URL protocol' };
    }
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      return { message: 'Localhost URLs are not allowed' };
    }
  } catch {
    return { message: 'Please enter a valid URL' };
  }
  return null;
};

const validateLinkInput = (data: LinkCreateInput): Array<{ field: string; message: string }> => {
  const errors: Array<{ field: string; message: string }> = [];

  if (!data.slug) {
    errors.push({ field: 'slug', message: 'Slug is required' });
  }

  if (!data.destination_url) {
    errors.push({ field: 'destination_url', message: 'Destination URL is required' });
  } else {
    const urlError = validateDestinationURL(data.destination_url);
    if (urlError) {
      errors.push({ field: 'destination_url', message: urlError.message });
    }
  }

  return errors;
};

interface FormState extends LinkCreateInput {
  errors: Record<string, string>;
  isSubmitting: boolean;
  isSuccess: boolean;
  createdLink?: {
    slug: string;
    shortUrl: string;
  };
}

const MatchLink: React.FC = () => {
  const navigate = useNavigate();
  const baseUrl = '';

  const [formData, setFormData] = useState<FormState>({
    slug: '',
    destination_url: '',
    title: '',
    campaign: '',
    channel: '',
    owner: '',
    sponsor: '',
    opponent: '',
    competition: '',
    match_date: '',
    home_away: undefined,
    expires_at: '',
    notes: '',
    errors: {},
    isSubmitting: false,
    isSuccess: false,
  });

  // Generate rolling slug from opponent name
  const generateRollingSlug = (opponent: string): string => {
    if (!opponent.trim()) return '';
    return opponent.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Remove multiple hyphens
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      .substring(0, 50) // Limit to 50 chars
      .trim();
  };

  // Auto-fill campaign when opponent changes
  useEffect(() => {
    if (formData.opponent) {
      const generatedSlug = generateRollingSlug(formData.opponent);
      setFormData(prev => ({
        ...prev,
        slug: generatedSlug,
        campaign: `vs-${generatedSlug}`
      }));
    }
  }, [formData.opponent]);

  const validateField = (field: keyof FormState, value: any) => {
    const tempData = { ...formData, [field]: value };

    if (field === 'destination_url') {
      const error = validateDestinationURL(value);
      if (error) {
        tempData.errors.destination_url = error.message;
      } else {
        delete tempData.errors.destination_url;
      }
    }

    if (field === 'opponent' && value) {
      const generatedSlug = generateRollingSlug(value);
      if (generatedSlug.length < 2) {
        tempData.errors.opponent = 'Opponent name must be at least 2 characters';
      } else {
        delete tempData.errors.opponent;
      }
    }

    setFormData(tempData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    let isValid = true;
    const validationErrors: Record<string, string> = {};

    if (!formData.destination_url) {
      validationErrors.destination_url = 'Destination URL is required';
      isValid = false;
    } else {
      const error = validateDestinationURL(formData.destination_url);
      if (error) {
        validationErrors.destination_url = error.message;
        isValid = false;
      }
    }

    if (!formData.opponent) {
      validationErrors.opponent = 'Opponent is required';
      isValid = false;
    }

    if (!formData.slug) {
      validationErrors.slug = 'Slug is required';
      isValid = false;
    }

    if (!formData.home_away) {
      validationErrors.home_away = 'Home/Away selection is required';
      isValid = false;
    }

    if (!formData.competition) {
      validationErrors.competition = 'Competition is required';
      isValid = false;
    }

    if (!isValid) {
      setFormData(prev => ({
        ...prev,
        errors: validationErrors
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      isSubmitting: true,
      errors: {}
    }));

    try {
      const response = await fetch(`${baseUrl}/api/links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          channel: 'match', // Default to match channel
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({
          ...prev,
          isSuccess: true,
          createdLink: {
            slug: data.slug,
            shortUrl: `${baseUrl}/${data.slug}`
          }
        }));
      } else {
        const error = await response.json();
        setFormData(prev => ({
          ...prev,
          errors: { general: error.message || 'Failed to create link' }
        }));
      }
    } catch (err) {
      setFormData(prev => ({
        ...prev,
        errors: { general: 'Failed to create link' }
      }));
    } finally {
      setFormData(prev => ({
        ...prev,
        isSubmitting: false
      }));
    }
  };

  const handleOpponentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, opponent: value }));
    validateField('opponent', value);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Create Match Link</h1>

      {formData.isSuccess && formData.createdLink && (
        <div className="mb-8 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          <p className="font-bold">Link created successfully!</p>
          <p>Short URL: <a href={formData.createdLink.shortUrl} target="_blank" rel="noopener noreferrer">{formData.createdLink.shortUrl}</a></p>
          <p>Slug: {formData.createdLink.slug}</p>
        </div>
      )}

      {formData.errors.general && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {formData.errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="opponent" className="block text-sm font-medium text-gray-700 mb-1">
            Opponent *
          </label>
          <input
            type="text"
            id="opponent"
            value={formData.opponent}
            onChange={handleOpponentChange}
            className={`w-full px-3 py-2 border ${formData.errors.opponent ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
            placeholder="Enter opponent name"
          />
          {formData.errors.opponent && (
            <p className="mt-1 text-sm text-red-600">{formData.errors.opponent}</p>
          )}
        </div>

        <div>
          <label htmlFor="destination_url" className="block text-sm font-medium text-gray-700 mb-1">
            Destination URL *
          </label>
          <input
            type="url"
            id="destination_url"
            value={formData.destination_url}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, destination_url: e.target.value }));
              validateField('destination_url', e.target.value);
            }}
            className={`w-full px-3 py-2 border ${formData.errors.destination_url ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
            placeholder="https://example.com"
          />
          {formData.errors.destination_url && (
            <p className="mt-1 text-sm text-red-600">{formData.errors.destination_url}</p>
          )}
        </div>

        <div>
          <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
            Slug (auto-generated)
          </label>
          <input
            type="text"
            id="slug"
            value={formData.slug}
            readOnly
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100"
            placeholder="Generated from opponent name"
          />
          <p className="mt-1 text-sm text-gray-500">Slug is automatically generated from the opponent name</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="home_away" className="block text-sm font-medium text-gray-700 mb-1">
              Home/Away *
            </label>
            <select
              id="home_away"
              value={formData.home_away || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, home_away: e.target.value as 'home' | 'away' }))}
              className={`w-full px-3 py-2 border ${formData.errors.home_away ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              <option value="">Select...</option>
              <option value="home">Home</option>
              <option value="away">Away</option>
            </select>
            {formData.errors.home_away && (
              <p className="mt-1 text-sm text-red-600">{formData.errors.home_away}</p>
            )}
          </div>

          <div>
            <label htmlFor="competition" className="block text-sm font-medium text-gray-700 mb-1">
              Competition *
            </label>
            <select
              id="competition"
              value={formData.competition}
              onChange={(e) => setFormData(prev => ({ ...prev, competition: e.target.value }))}
              className={`w-full px-3 py-2 border ${formData.errors.competition ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              <option value="">Select competition...</option>
              <option value="premier-division">Premier Division</option>
              <option value="fai-cup">FAI Cup</option>
              <option value="champions-league">Champions League</option>
              <option value="europa-league">Europa League</option>
              <option value="conference-league">Conference League</option>
              <option value="friendly">Friendly</option>
              <option value="other">Other</option>
            </select>
            {formData.errors.competition && (
              <p className="mt-1 text-sm text-red-600">{formData.errors.competition}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="match_date" className="block text-sm font-medium text-gray-700 mb-1">
              Match Date
            </label>
            <input
              type="date"
              id="match_date"
              value={formData.match_date}
              onChange={(e) => setFormData(prev => ({ ...prev, match_date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="expires_at" className="block text-sm font-medium text-gray-700 mb-1">
              Expiry Date (optional)
            </label>
            <input
              type="date"
              id="expires_at"
              value={formData.expires_at}
              onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Additional notes..."
          />
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={formData.isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {formData.isSubmitting ? 'Creating...' : 'Create Match Link'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default MatchLink;