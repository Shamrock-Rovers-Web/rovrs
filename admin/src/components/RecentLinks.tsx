interface LinkData {
  slug: string;
  title: string;
  clicks: number;
  status: 'active' | 'expired' | 'paused' | 'deleted';
  created: string;
}

function getStatusBadge(status: string) {
  const getStatusClass = () => {
    switch (status) {
      case 'active': return 'status-active';
      case 'expired': return 'status-expired';
      case 'paused': return 'status-paused';
      case 'deleted': return 'status-deleted';
      default: return 'status-unknown';
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
    <span className={`status-badge ${getStatusClass()}`}>
      {getStatusText()}
    </span>
  );
}

export function RecentLinks() {
  const recentLinks: LinkData[] = [
    {
      slug: 'champions-league-final',
      title: 'Champions League Final Tickets',
      clicks: 234,
      status: 'active',
      created: '2024-05-01'
    },
    {
      slug: 'summer-camp-2024',
      title: 'Summer Camp Registration',
      clicks: 189,
      status: 'active',
      created: '2024-04-30'
    },
    {
      slug: 'home-opener',
      title: 'Season Home Opener',
      clicks: 456,
      status: 'active',
      created: '2024-04-29'
    },
    {
      slug: 'matchday-parking',
      title: 'Matchday Parking Info',
      clicks: 78,
      status: 'expired',
      created: '2024-04-28'
    },
    {
      slug: 'charity-gala',
      title: 'Charity Gala Dinner',
      clicks: 0,
      status: 'paused',
      created: '2024-04-27'
    }
  ];

  return (
    <div className="recent-links-section">
      <div className="section-header">
        <h2>Recent Links</h2>
        <button className="view-all-button">View All</button>
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
            {recentLinks.map((link, index) => (
              <tr key={index}>
                <td className="slug-column">{link.slug}</td>
                <td>{link.title}</td>
                <td>{link.clicks.toLocaleString()}</td>
                <td>{getStatusBadge(link.status)}</td>
                <td>{new Date(link.created).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}