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
  return (
    <div className="alerts-section">
      <h2>Alerts</h2>
      <div className="alerts-list">
        <Alert
          type="warning"
          title="Links Expiring Soon"
          message="15 links are expiring within the next 7 days. Renew them to avoid interruption."
        />
        <Alert
          type="error"
          title="Expired Links"
          message="8 links have expired and are redirecting to tickets page. Review and renew or remove."
        />
        <Alert
          type="info"
          title="Low Engagement Links"
          message="23 links have received no clicks in the last 90 days. Consider archiving."
        />
        <Alert
          type="warning"
          title="Destination Changes"
          message="5 links had their destination URLs changed in the last 48 hours. Verify redirects are working."
        />
      </div>
    </div>
  );
}