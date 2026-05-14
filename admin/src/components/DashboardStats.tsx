import { useState, useEffect } from 'react';
import { getLinks } from '../api/client';

interface StatCardProps {
  title: string;
  value: number | string;
  change?: {
    type: 'positive' | 'negative' | 'neutral';
    value: number;
    label: string;
  };
  icon?: string;
}

function StatCard({ title, value, change, icon }: StatCardProps) {
  const getChangeColor = (type: string) => {
    switch (type) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <div className="flex items-center gap-3 mb-4">
        {icon && <span className="text-2xl">{icon}</span>}
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-2">{value}</div>
      {change && (
        <div className={`text-sm ${getChangeColor(change.type)}`}>
          {change.type === 'positive' ? '+' : ''}
          {change.value}% {change.label}
        </div>
      )}
    </div>
  );
}

export function DashboardStats() {
  const [totalLinks, setTotalLinks] = useState<number>(0);
  const [activeLinks, setActiveLinks] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get total links
        const totalResponse = await getLinks({ limit: 1 });
        setTotalLinks(totalResponse.pagination.total);

        // Get active links
        const activeResponse = await getLinks({ limit: 1, status: 'active' });
        setActiveLinks(activeResponse.pagination.total);
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
              <div className="flex items-center gap-3 mb-4">
                <div className="h-6 w-6 bg-gray-300 rounded"></div>
                <div className="h-4 w-24 bg-gray-300 rounded"></div>
              </div>
              <div className="h-8 w-20 bg-gray-300 rounded mb-2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Statistics</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Links"
          value={totalLinks.toLocaleString()}
          icon="📊"
        />
        <StatCard
          title="Active Links"
          value={activeLinks.toLocaleString()}
          icon="✅"
        />
        <StatCard
          title="Clicks Today"
          value="—"
          icon="👆"
        />
        <StatCard
          title="Clicks (7d)"
          value="—"
          icon="📈"
        />
        <StatCard
          title="Clicks (30d)"
          value="—"
          icon="📊"
        />
      </div>
    </div>
  );
}