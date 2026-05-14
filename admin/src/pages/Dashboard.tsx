import { useState, useEffect } from 'react';
import { DashboardStats } from '../components/DashboardStats';
import { DashboardAlerts } from '../components/DashboardAlerts';
import { RecentLinks } from '../components/RecentLinks';
import { TopLinks } from '../components/TopLinks';
import { useResponsive } from '../hooks/useResponsive';

export default function Dashboard() {
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const { isMobile } = useResponsive();

  const handleRefresh = async () => {
    setRefreshing(true);
    // Force a re-render by updating the timestamp
    setLastRefresh(new Date());
    // Add a small delay to show loading state
    await new Promise(resolve => setTimeout(resolve, 500));
    setRefreshing(false);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      handleRefresh();
    }, 60000); // Auto-refresh every 60 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`px-4 py-2 bg-green-600 text-white rounded-lg font-medium transition-colors ${
              refreshing ? 'bg-gray-400 cursor-not-allowed' : 'hover:bg-green-700'
            }`}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <span className="text-sm text-gray-500 text-right sm:text-left">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Stats Section */}
      <DashboardStats />

      {/* Alerts Section */}
      <DashboardAlerts />

      {/* Grid Layout */}
      <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-6`}>
        <div className="bg-white rounded-lg shadow p-6">
          <RecentLinks />
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <TopLinks />
        </div>
      </div>
    </div>
  );
}