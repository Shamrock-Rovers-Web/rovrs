import { useState, useEffect } from 'react';
import { getLinks, getDaysUntilExpiry } from '../api/client';

interface AlertProps {
  type: 'warning' | 'error' | 'info';
  title: string;
  message: string;
}

function Alert({ type, title, message }: AlertProps) {
  const getAlertClass = () => {
    switch (type) {
      case 'warning': return 'alert-warning';
      case 'error': return 'alert-error';
      default: return 'alert-info';
    }
  };

  const getAlertIcon = () => {
    switch (type) {
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  };

  return (
    <div className={`alert ${getAlertClass()}`}>
      <div className="alert-header">
        <span className="alert-icon">{getAlertIcon()}</span>
        <h4 className="alert-title">{title}</h4>
      </div>
      <p className="alert-message">{message}</p>
    </div>
  );
}

export function DashboardAlerts() {
  const [expiringSoonCount, setExpiringSoonCount] = useState<number>(0);
  const [expiredCount, setExpiredCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        // Get active links to check for expiring ones
        const activeLinks = await getLinks({ status: 'active' });

        let expiringSoon = 0;

        activeLinks.data.forEach(link => {
          const daysUntilExpiry = getDaysUntilExpiry(link.expires_at);
          if (daysUntilExpiry >= 0 && daysUntilExpiry <= 7) {
            expiringSoon++;
          }
        });

        // Count expired links
        const expiredLinks = await getLinks({ status: 'expired' });
        const activeLinksCount = activeLinks.pagination.total;

        setExpiringSoonCount(expiringSoon);
        setExpiredCount(expiredLinks.pagination.total);
      } catch (error) {
        console.error('Failed to fetch alerts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Alerts</h2>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Alerts</h2>
      <div className="space-y-3">
        {expiringSoonCount > 0 && (
          <Alert
            type="warning"
            title="Links Expiring Soon"
            message={`${expiringSoonCount} link${expiringSoonCount > 1 ? 's' : ''} are expiring within the next 7 days. Renew them to avoid interruption.`}
          />
        )}

        {expiredCount > 0 && (
          <Alert
            type="error"
            title="Expired Links"
            message={`${expiredCount} link${expiredCount > 1 ? 's' : ''} have expired and are redirecting to tickets page. Review and renew or remove.`}
          />
        )}

        {expiringSoonCount === 0 && expiredCount === 0 && (
          <Alert
            type="info"
            title="No Alerts"
            message="All links are properly managed. No alerts at this time."
          />
        )}
      </div>
    </div>
  );
}