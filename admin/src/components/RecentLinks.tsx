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

export function RecentLinks() {
  const [links, setLinks] = useState<LinkData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLinks = async () => {
      try {
        const response = await getLinks({ limit: 5 });
        setLinks(response.data);
      } catch (error) {
        console.error('Failed to fetch recent links:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLinks();
  }, []);

  if (loading) {
    return (
      <div className="recent-links-section">
        <div className="section-header flex justify-between items-center">
          <h2 className="text-lg font-semibold">Recent Links</h2>
          <div className="h-8 w-16 bg-gray-300 rounded animate-pulse"></div>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Slug</th>
                <th>Title</th>
                <th>Clicks</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i}>
                  <td><div className="h-4 bg-gray-300 rounded animate-pulse w-20"></div></td>
                  <td><div className="h-4 bg-gray-300 rounded animate-pulse w-32"></div></td>
                  <td><div className="h-4 bg-gray-300 rounded animate-pulse w-16"></div></td>
                  <td><div className="h-6 w-16 bg-gray-300 rounded animate-pulse"></div></td>
                  <td><div className="h-4 bg-gray-300 rounded animate-pulse w-16"></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="recent-links-section">
      <div className="section-header flex justify-between items-center">
        <h2 className="text-lg font-semibold">Recent Links</h2>
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
              <th className="pb-2 text-right">Clicks</th>
              <th className="pb-2 text-center">Status</th>
              <th className="pb-2">Created</th>
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
                <td className="py-3">{link.title}</td>
                <td className="py-3 text-right">
                  {link.click_count.toLocaleString()}
                </td>
                <td className="py-3 text-center">
                  {getStatusBadge(link.status)}
                </td>
                <td className="py-3 text-sm text-gray-600">
                  {formatDate(link.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}