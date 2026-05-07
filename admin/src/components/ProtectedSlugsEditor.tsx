import { useState, useEffect } from 'react';
import { api } from '../api';

const PROTECTED_SLUGS = [
  'tickets',
  'shop',
  'fixtures',
  'members',
  'academy',
  'women',
  'admin',
  'api',
  'health',
  'login',
  'logout',
  'stats',
  'export',
  'robots.txt',
  'favicon.ico',
  '.well-known'
];

const ProtectedSlugsEditor = () => {
  const [settings, setSettings] = useState({
    slug_blocklist: [] as string[],
    known_domains: [] as string[]
  });
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [customSlug, setCustomSlug] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    setSelectedSlugs(PROTECTED_SLUGS);
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.settings.get('known_domains');
      if (response.success) {
        const parsed = JSON.parse(response.value);
        setSettings(prev => ({
          ...prev,
          known_domains: Array.isArray(parsed) ? parsed : []
        }));
      }
    } catch (error) {
      console.error('Error fetching domains:', error);
    }
  };

  const toggleSlug = (slug: string) => {
    if (PROTECTED_SLUGS.includes(slug)) {
      alert('Cannot remove core protected slugs');
      return;
    }

    if (selectedSlugs.includes(slug)) {
      setSelectedSlugs(selectedSlugs.filter(s => s !== slug));
    } else {
      setSelectedSlugs([...selectedSlugs, slug]);
    }
  };

  const addCustomSlug = () => {
    if (!customSlug.trim()) return;
    if (selectedSlugs.includes(customSlug.trim())) {
      setError('Slug already exists');
      return;
    }
    setSelectedSlugs([...selectedSlugs, customSlug.trim()]);
    setCustomSlug('');
    setError('');
  };

  const saveProtectedSlugs = async () => {
    setLoading(true);
    setError('');

    try {
      const updatedDomains = [...settings.known_domains];

      // Update settings with new protected slugs
      const response = await api.settings.update('known_domains', JSON.stringify(updatedDomains));

      if (response.success) {
        alert('Protected slugs updated successfully!');
      } else {
        setError(response.error || 'Failed to save protected slugs');
      }
    } catch (error) {
      setError('Failed to save protected slugs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Core Protected Slugs</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {PROTECTED_SLUGS.map((slug) => (
              <div
                key={slug}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  selectedSlugs.includes(slug)
                    ? 'bg-red-100 text-red-800 border border-red-300'
                    : 'bg-gray-100 text-gray-800 border border-gray-300'
                }`}
              >
                {slug}
                <span className="block text-xs text-gray-500 mt-1">
                  Core - cannot remove
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-sm text-gray-500">
            These slugs are permanently protected and cannot be removed from the protected list.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add Custom Protected Slugs</h3>
          <div className="flex space-x-2">
            <input
              type="text"
              value={customSlug}
              onChange={(e) => setCustomSlug(e.target.value)}
              placeholder="Enter custom slug to protect"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={addCustomSlug}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Add
            </button>
          </div>
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">All Protected Slugs</h3>
          <div className="border rounded-md p-3 max-h-60 overflow-y-auto">
            {selectedSlugs.map((slug, index) => (
              <div key={index} className="flex justify-between items-center py-2">
                <div className="flex items-center space-x-3">
                  {PROTECTED_SLUGS.includes(slug) ? (
                    <span className="text-xs text-gray-500">(Core)</span>
                  ) : (
                    <button
                      onClick={() => toggleSlug(slug)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  )}
                  <span className={`font-medium ${
                    PROTECTED_SLUGS.includes(slug) ? 'text-red-800' : 'text-gray-900'
                  }`}>
                    {slug}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {selectedSlugs.length === 0 && (
            <p className="text-sm text-gray-500 italic">No custom protected slugs added</p>
          )}
        </div>

        <button
          onClick={saveProtectedSlugs}
          disabled={loading}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Protected Slugs'}
        </button>
      </div>
    </div>
  );
};

export default ProtectedSlugsEditor;