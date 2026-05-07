import { useState, useEffect } from 'react';
import { api } from '../api';

const SlugBlocklistEditor = () => {
  const [blocklist, setBlocklist] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.settings.get('slug_blocklist');
      if (response.success) {
        const parsed = JSON.parse(response.value);
        setBlocklist(Array.isArray(parsed) ? parsed : []);
      }
    } catch (error) {
      console.error('Error fetching blocklist:', error);
    }
  };

  const saveBlocklist = async () => {
    if (!validateBlocklist()) return;

    setLoading(true);
    setError('');

    try {
      const response = await api.settings.update('slug_blocklist', JSON.stringify(blocklist));
      if (response.success) {
        setInputValue('');
        alert('Blocklist updated successfully!');
      } else {
        setError(response.error || 'Failed to save blocklist');
      }
    } catch (error) {
      setError('Failed to save blocklist');
    } finally {
      setLoading(false);
    }
  };

  const validateBlocklist = () => {
    try {
      JSON.parse(inputValue);
      setInputValue('');
      setError('');
      return true;
    } catch (error) {
      setError('Invalid JSON format. Please enter a valid JSON array.');
      return false;
    }
  };

  const addToList = () => {
    if (!inputValue.trim()) return;

    try {
      const newItem = inputValue.trim();
      if (!blocklist.includes(newItem)) {
        setBlocklist([...blocklist, newItem]);
      }
      setInputValue('');
      setError('');
    } catch (error) {
      setError('Failed to add to blocklist');
    }
  };

  const removeFromList = (item: string) => {
    setBlocklist(blocklist.filter(i => i !== item));
  };

  const parseJsonArray = (text: string) => {
    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Add New Blocked Term
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter term to block (e.g., 'javascript:')"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={addToList}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Add
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Add protocols, domains, or patterns to block. Example: "javascript:", "localhost", "malicious-site.com"
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Current Blocklist
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={JSON.stringify(blocklist, null, 2)}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-mono text-sm"
            />
            <button
              onClick={() => navigator.clipboard.writeText(JSON.stringify(blocklist, null, 2))}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Copy
            </button>
          </div>
          {blocklist.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Preview:</h4>
              <div className="border rounded-md p-3 max-h-40 overflow-y-auto">
                {blocklist.map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-1">
                    <span className="text-sm font-mono">{item}</span>
                    <button
                      onClick={() => removeFromList(item)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="text-red-600 text-sm">{error}</div>
        )}

        <button
          onClick={saveBlocklist}
          disabled={loading}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Blocklist'}
        </button>
      </div>
    </div>
  );
};

export default SlugBlocklistEditor;