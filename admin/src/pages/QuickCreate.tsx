import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { validateDestinationURL, generateSlug } from '@rovrs/shared';

interface QuickCreateState {
  destination_url: string;
  errors: Record<string, string>;
  isSubmitting: boolean;
  isSuccess: boolean;
  createdLink?: {
    slug: string;
    shortUrl: string;
  };
}

const QuickCreate: React.FC = () => {
  const navigate = useNavigate();
  const baseUrl = window.location.origin === 'http://localhost:3000' ? 'http://localhost:8787' : 'https://admin.rov.rs';

  const [formData, setFormData] = useState<QuickCreateState>({
    destination_url: '',
    errors: {},
    isSubmitting: false,
    isSuccess: false,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({
      ...prev,
      destination_url: value,
      errors: { ...prev.errors, destination_url: '' }
    }));

    // Validate URL
    if (value) {
      const error = validateDestinationURL(value);
      if (error) {
        setFormData(prev => ({
          ...prev,
          errors: { destination_url: error.message }
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.destination_url) {
      setFormData(prev => ({
        ...prev,
        errors: { destination_url: 'Destination URL is required' }
      }));
      return;
    }

    const error = validateDestinationURL(formData.destination_url);
    if (error) {
      setFormData(prev => ({
        ...prev,
        errors: { destination_url: error.message }
      }));
      return;
    }

    setFormData(prev => ({ ...prev, isSubmitting: true }));

    try {
      // Auto-generate 6-char slug
      const autoSlug = generateSlug();

      const response = await fetch(`${baseUrl}/api/links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slug: autoSlug,
          destination_url: formData.destination_url,
        }),
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

  const handleEditDetails = () => {
    if (formData.createdLink) {
      // Navigate to CreateLink page with pre-filled data
      navigate(`/create?slug=${formData.createdLink.slug}&destination_url=${encodeURIComponent(formData.destination_url)}`);
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

              <div className="text-sm text-gray-500">
                <p>Auto-generated slug: <span className="font-mono">{formData.createdLink.slug}</span></p>
                <p>Destination: <span className="font-mono">{formData.destination_url}</span></p>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleEditDetails}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Edit Details
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      isSuccess: false,
                      createdLink: undefined,
                      destination_url: '',
                      errors: {}
                    }));
                  }}
                  className="ml-3 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
            <h3 className="text-xl font-medium text-gray-900 mb-4">Quick Create Short Link</h3>
            <p className="text-sm text-gray-600 mb-6">
              Enter a destination URL below to quickly create a short link with an auto-generated slug.
            </p>

            {formData.errors.general && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">{formData.errors.general}</p>
              </div>
            )}

            {formData.errors.destination_url && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">{formData.errors.destination_url}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="destination_url" className="block text-sm font-medium text-gray-700">
                  Destination URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  id="destination_url"
                  value={formData.destination_url}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 ${
                    formData.errors.destination_url ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="https://example.com"
                />
                <p className="mt-1 text-xs text-gray-500">
                  A 6-character slug will be auto-generated for your link
                </p>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/links')}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formData.isSubmitting || !formData.destination_url}
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

export default QuickCreate;