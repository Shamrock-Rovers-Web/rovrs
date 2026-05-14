import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

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

const validateSlug = (slug: string): { message: string } | null => {
  if (!slug || slug.length < 2 || slug.length > 50) {
    return { message: 'Slug must be between 2 and 50 characters' };
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { message: 'Slug must contain only lowercase letters, numbers, and hyphens' };
  }
  return null;
};

const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const validateDestinationURL = (url: string): { message: string } | null => {
  if (!url) {
    return { message: 'Destination URL is required' };
  }
  if (!isValidUrl(url)) {
    return { message: 'Please enter a valid URL' };
  }
  if (url.startsWith('javascript:') || url.startsWith('data:') || url.startsWith('file:') || url.startsWith('ftp:')) {
    return { message: 'Blocked URL protocol' };
  }
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    return { message: 'Localhost URLs are not allowed' };
  }
  return null;
};

const validateLinkInput = (data: LinkCreateInput): Array<{ field: string; message: string }> => {
  const errors: Array<{ field: string; message: string }> = [];

  if (!data.slug) {
    errors.push({ field: 'slug', message: 'Slug is required' });
  } else {
    const slugError = validateSlug(data.slug);
    if (slugError) {
      errors.push({ field: 'slug', message: slugError.message });
    }
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

const CreateLink: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
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

  // Check for query parameters on component mount
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const slug = queryParams.get('slug');
    const destinationUrl = queryParams.get('destination_url');

    if (slug || destinationUrl) {
      setFormData(prev => ({
        ...prev,
        slug: slug || '',
        destination_url: destinationUrl || '',
        errors: {}
      }));
    }
  }, [location.search]);

  const validateField = (field: keyof FormState, value: any) => {
    const tempData = { ...formData, [field]: value };

    if (field === 'slug') {
      const error = validateSlug(value);
      if (error) {
        tempData.errors.slug = error.message;
      } else {
        delete tempData.errors.slug;
      }
    }

    if (field === 'destination_url') {
      const error = validateDestinationURL(value);
      if (error) {
        tempData.errors.destination_url = error.message;
      } else {
        delete tempData.errors.destination_url;
      }
    }

    setFormData(tempData);
  };

  const handleInputChange = (field: keyof FormState, value: string | undefined) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      errors: { ...prev.errors, [field]: '' }
    }));

    // Real-time validation
    if (field === 'slug' || field === 'destination_url') {
      validateField(field, value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const inputData = {
      slug: formData.slug,
      destination_url: formData.destination_url,
      title: formData.title || undefined,
      campaign: formData.campaign || undefined,
      channel: formData.channel || undefined,
      owner: formData.owner || undefined,
      sponsor: formData.sponsor || undefined,
      opponent: formData.opponent || undefined,
      competition: formData.competition || undefined,
      match_date: formData.match_date || undefined,
      home_away: formData.home_away || undefined,
      expires_at: formData.expires_at || undefined,
      notes: formData.notes || undefined,
    };

    const validationErrors = validateLinkInput(inputData);

    if (validationErrors.length > 0) {
      const errorMap: Record<string, string> = {};
      validationErrors.forEach(error => {
        errorMap[error.field] = error.message;
      });
      setFormData(prev => ({
        ...prev,
        errors: errorMap,
        isSubmitting: false
      }));
      return;
    }

    setFormData(prev => ({ ...prev, isSubmitting: true }));

    try {
      const response = await fetch(`${baseUrl}/api/links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inputData),
      });

      if (response.ok) {
        const result = await response.json();
        setFormData(prev => ({
          ...prev,
          isSuccess: true,
          createdLink: {
            slug: result.slug,
            shortUrl: `${baseUrl}/${result.slug}`
          },
          isSubmitting: false
        }));
      } else {
        const error = await response.json();
        setFormData(prev => ({
          ...prev,
          errors: { general: error.message || 'Failed to create link' },
          isSubmitting: false
        }));
      }
    } catch (error) {
      setFormData(prev => ({
        ...prev,
        errors: { general: 'Network error. Please try again.' },
        isSubmitting: false
      }));
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    } catch (error) {
      alert('Failed to copy to clipboard');
    }
  };

  const generateQR = async () => {
    if (!formData.createdLink) return;

    try {
      const response = await fetch(`${baseUrl}/api/links/${formData.createdLink.slug}/qr.png`);
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `rovrs-qrcode-${formData.createdLink.slug}.png`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      alert('Failed to generate QR code');
    }
  };

  if (formData.isSuccess && formData.createdLink) {
    return (
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="mt-2 text-lg font-medium text-gray-900">Link Created Successfully!</h3>
              <p className="mt-1 text-sm text-gray-500">Your short link is ready to use</p>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Short URL</label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    type="text"
                    readOnly
                    value={formData.createdLink.shortUrl}
                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-l-md border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(formData.createdLink!.shortUrl)}
                    className="inline-flex items-center px-4 py-2 border border-l-0 border-gray-300 rounded-r-md text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">QR Code</label>
                <div className="mt-2 flex space-x-4">
                  <button
                    type="button"
                    onClick={generateQR}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Download QR Code
                  </button>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      isSuccess: false,
                      createdLink: undefined,
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
                      notes: ''
                    }));
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Create Another Link
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/links')}
                  className="ml-3 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  View All Links
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-xl font-medium text-gray-900 mb-4">Create New Short Link</h3>

            {formData.errors.general && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">{formData.errors.general}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-1 md:grid-cols-2">
                <div>
                  <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
                    Slug <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => handleInputChange('slug', e.target.value)}
                    className={`mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 ${
                      formData.errors.slug ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="e.g., matchday-v-bohs"
                  />
                  {formData.errors.slug && (
                    <p className="mt-1 text-sm text-red-600">{formData.errors.slug}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Lowercase letters, numbers, hyphens only (2-50 chars)
                  </p>
                </div>

                <div>
                  <label htmlFor="destination_url" className="block text-sm font-medium text-gray-700">
                    Destination URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    id="destination_url"
                    value={formData.destination_url}
                    onChange={(e) => handleInputChange('destination_url', e.target.value)}
                    className={`mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 ${
                      formData.errors.destination_url ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="https://example.com"
                  />
                  {formData.errors.destination_url && (
                    <p className="mt-1 text-sm text-red-600">{formData.errors.destination_url}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                    Title (optional)
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Link title"
                  />
                </div>

                <div>
                  <label htmlFor="channel" className="block text-sm font-medium text-gray-700">
                    Channel
                  </label>
                  <select
                    id="channel"
                    value={formData.channel || ''}
                    onChange={(e) => handleInputChange('channel', e.target.value || undefined)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select channel</option>
                    {CHANNELS.map((channel) => (
                      <option key={channel} value={channel}>{channel}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="campaign" className="block text-sm font-medium text-gray-700">
                    Campaign (optional)
                  </label>
                  <input
                    type="text"
                    id="campaign"
                    value={formData.campaign || ''}
                    onChange={(e) => handleInputChange('campaign', e.target.value || undefined)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., League 2026, Cup, Friendly"
                  />
                </div>

                <div>
                  <label htmlFor="owner" className="block text-sm font-medium text-gray-700">
                    Owner (optional)
                  </label>
                  <input
                    type="text"
                    id="owner"
                    value={formData.owner}
                    onChange={(e) => handleInputChange('owner', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Team member name"
                  />
                </div>

                <div>
                  <label htmlFor="sponsor" className="block text-sm font-medium text-gray-700">
                    Sponsor (optional)
                  </label>
                  <input
                    type="text"
                    id="sponsor"
                    value={formData.sponsor}
                    onChange={(e) => handleInputChange('sponsor', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Sponsor name"
                  />
                </div>

                <div>
                  <label htmlFor="opponent" className="block text-sm font-medium text-gray-700">
                    Opponent (optional)
                  </label>
                  <input
                    type="text"
                    id="opponent"
                    value={formData.opponent}
                    onChange={(e) => handleInputChange('opponent', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Opponent team name"
                  />
                </div>

                <div>
                  <label htmlFor="competition" className="block text-sm font-medium text-gray-700">
                    Competition (optional)
                  </label>
                  <input
                    type="text"
                    id="competition"
                    value={formData.competition}
                    onChange={(e) => handleInputChange('competition', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., Premier Division"
                  />
                </div>

                <div>
                  <label htmlFor="match_date" className="block text-sm font-medium text-gray-700">
                    Match Date (optional)
                  </label>
                  <input
                    type="date"
                    id="match_date"
                    value={formData.match_date}
                    onChange={(e) => handleInputChange('match_date', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Home/Away (optional)
                  </label>
                  <div className="mt-2 space-x-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="home_away"
                        value="home"
                        checked={formData.home_away === 'home'}
                        onChange={(e) => handleInputChange('home_away', e.target.checked ? 'home' : undefined)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">Home</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="home_away"
                        value="away"
                        checked={formData.home_away === 'away'}
                        onChange={(e) => handleInputChange('home_away', e.target.checked ? 'away' : undefined)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">Away</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label htmlFor="expires_at" className="block text-sm font-medium text-gray-700">
                    Expires At (optional)
                  </label>
                  <input
                    type="datetime-local"
                    id="expires_at"
                    value={formData.expires_at}
                    onChange={(e) => handleInputChange('expires_at', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Notes (optional)
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Additional notes about this link"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => navigate('/links')}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formData.isSubmitting}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {formData.isSubmitting ? 'Creating...' : 'Create Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateLink;