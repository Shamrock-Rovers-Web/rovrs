import { useState, useEffect } from 'react';
import { getLinks, formatDate } from '../api/client';

interface LinkData {
  slug: string;
  title: string;
  click_count: number;
  status: 'active' | 'expired' | 'paused' | 'deleted';
  created_at: string;
}

function getStatusBadge(status: string) {
  const getStatusClass = () => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'deleted': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'active': return 'Active';
      case 'expired': return 'Expired';
      case 'paused': return 'Paused';
      case 'deleted': return 'Deleted';
      default: return 'Unknown';
    }
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusClass()}`}>
      {getStatusText()}
    </span>
  );
}

export function TopLinks() {
  const [links, setLinks] = useState<LinkData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopLinks = async () => {
      try {
        const response = await getLinks({ limit: 10 });
        // Sort by click_count in descending order
        const sortedLinks = [...response.data].sort((a, b) =>
          b.click_count - a.click_count
        );
        // Take top 5
        setLinks(sortedLinks.slice(0, 5));
      } catch (error) {
        console.error('Failed to fetch top links:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopLinks();
  }, []);

  if (loading) {
    return (
      <div className="top-links-section">
        <div className="section-header flex justify-between items-center">
          <h2 className="text-lg font-semibold">Top Performing Links</h2>
          <div className="h-8 w-16 bg-gray-300 rounded animate-pulse"></div>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Slug</th>
                <th>Title</th>
                <th>Total Clicks</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i}>
                  <td><div className="h-4 bg-gray-300 rounded animate-pulse w-20"></div></td>
                  <td><div className="h-4 bg-gray-300 rounded animate-pulse w-32"></div></td>
                  <td><div className="h-4 bg-gray-300 rounded animate-pulse w-20"></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="top-links-section">
      <div className="section-header flex justify-between items-center">
        <h2 className="text-lg font-semibold">Top Performing Links</h2>
        <button className="text-sm text-green-600 hover:text-green-800 font-medium">
          View All
        </button>
      </div>
      <div className="table-container">
        <table className="w-full">
          <thead className="border-b">
            <tr className="text-left text-sm text-gray-600">
              <th className="pb-2">Slug</th>
              <th className="pb-2">Title</th>
              <th className="pb-2 text-right">Total Clicks</th>
            </tr>
          </thead>
          <tbody>
            {links.map((link, index) => (
              <tr key={link.slug || index} className="border-b hover:bg-gray-50">
                <td className="py-3">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                    {link.slug}
                  </code>
                </td>
                <td className="py-3">
                  <div className="flex flex-col">
                    <span className="font-medium">{link.title}</span>
                    {index < 3 && (
                      <span className="text-xs text-green-600 mt-1">
                        Rank #{index + 1}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 text-right">
                  <span className="font-semibold">
                    {link.click_count.toLocaleString()}
                  </span>
                  <br />
                  <span className={`text-xs ${
                    link.status === 'active' ? 'text-green-600' :
                    link.status === 'expired' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {getStatusBadge(link.status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}