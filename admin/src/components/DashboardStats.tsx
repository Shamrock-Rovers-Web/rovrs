import { useState, useEffect } from 'react';

interface Stats {
  total_links: number;
  active_links: number;
  clicks_today: number;
  clicks_7d: number;
  clicks_30d: number;
  qr_clicks_today: number;
  qr_clicks_7d: number;
  qr_clicks_30d: number;
  top_links: Array<{ slug: string; title: string; clicks: number }>;
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

export function DashboardStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/stats');
        if (res.ok) {
          const result = await res.json();
          setStats(result.data || result);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Statistics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 border border-gray-200 animate-pulse">
              <div className="h-4 w-24 bg-gray-300 rounded mb-2"></div>
              <div className="h-8 w-20 bg-gray-300 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Statistics</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Total Links" value={stats.total_links.toLocaleString()} />
        <StatCard title="Active Links" value={stats.active_links.toLocaleString()} />
        <StatCard title="Clicks Today" value={stats.clicks_today.toLocaleString()} />
        <StatCard title="Clicks (7d)" value={stats.clicks_7d.toLocaleString()} />
        <StatCard title="Clicks (30d)" value={stats.clicks_30d.toLocaleString()} />
        <StatCard title="QR Clicks (30d)" value={stats.qr_clicks_30d.toLocaleString()} />
      </div>

      {stats.top_links && stats.top_links.length > 0 && (
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900">Top Links (7 days)</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {stats.top_links.map((link) => (
              <div key={link.slug} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <span className="text-sm font-mono text-gray-900">{link.slug}</span>
                  {link.title && (
                    <span className="ml-2 text-sm text-gray-500">{link.title}</span>
                  )}
                </div>
                <span className="text-sm font-medium text-gray-700">{link.clicks.toLocaleString()} clicks</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
