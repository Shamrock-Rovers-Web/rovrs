interface ChannelData {
  channel: string;
  clicks: number;
  percentage: number;
}

interface TopLinkData {
  slug: string;
  title: string;
  totalClicks: number;
  channels: ChannelData[];
}

function ChannelBreakdown({ channels }: { channels: ChannelData[] }) {
  return (
    <div className="channel-breakdown">
      <h4>Channel Breakdown</h4>
      <div className="channel-list">
        {channels.map((channel, index) => (
          <div key={index} className="channel-item">
            <span className="channel-name">{channel.channel}</span>
            <div className="channel-stats">
              <span className="channel-clicks">{channel.clicks.toLocaleString()}</span>
              <span className="channel-percentage">{channel.percentage}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TopLinks() {
  const topLinks: TopLinkData[] = [
    {
      slug: 'season-tickets',
      title: 'Season Ticket Renewal',
      totalClicks: 1234,
      channels: [
        { channel: 'email', clicks: 823, percentage: 67 },
        { channel: 'social', clicks: 234, percentage: 19 },
        { channel: 'direct', clicks: 123, percentage: 10 },
        { channel: 'referral', clicks: 54, percentage: 4 }
      ]
    },
    {
      slug: 'fixture-releases',
      title: 'Match Fixture Releases',
      totalClicks: 892,
      channels: [
        { channel: 'email', clicks: 456, percentage: 51 },
        { channel: 'social', clicks: 234, percentage: 26 },
        { channel: 'direct', clicks: 134, percentage: 15 },
        { channel: 'referral', clicks: 68, percentage: 8 }
      ]
    },
    {
      slug: 'merchandise',
      title: 'Online Merchandise Store',
      totalClicks: 756,
      channels: [
        { channel: 'social', clicks: 378, percentage: 50 },
        { channel: 'email', clicks: 227, percentage: 30 },
        { channel: 'direct', clicks: 113, percentage: 15 },
        { channel: 'referral', clicks: 38, percentage: 5 }
      ]
    },
    {
      slug: 'youth-academy',
      title: 'Youth Academy Registration',
      totalClicks: 623,
      channels: [
        { channel: 'direct', clicks: 312, percentage: 50 },
        { channel: 'email', clicks: 187, percentage: 30 },
        { channel: 'social', clicks: 93, percentage: 15 },
        { channel: 'referral', clicks: 31, percentage: 5 }
      ]
    },
    {
      slug: 'hospitality-packages',
      title: 'Corporate Hospitality',
      totalClicks: 489,
      channels: [
        { channel: 'email', clicks: 293, percentage: 60 },
        { channel: 'referral', clicks: 98, percentage: 20 },
        { channel: 'direct', clicks: 73, percentage: 15 },
        { channel: 'social', clicks: 25, percentage: 5 }
      ]
    }
  ];

  return (
    <div className="top-links-section">
      <div className="section-header">
        <h2>Top Performing Links</h2>
        <button className="view-all-button">View All</button>
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
            {topLinks.map((link, index) => (
              <tr key={index}>
                <td className="slug-column">{link.slug}</td>
                <td>
                  <div className="link-info">
                    <span>{link.title}</span>
                    <ChannelBreakdown channels={link.channels} />
                  </div>
                </td>
                <td className="clicks-column">{link.totalClicks.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}