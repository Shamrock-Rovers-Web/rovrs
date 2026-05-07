import React, { useState, useEffect } from 'react';
import {
  fetchUniqueSponsors,
  fetchSponsorReport,
  SponsorReportData,
  LinkClickData
} from '../api/sponsorReport';

interface SponsorSelectorProps {
  selectedSponsor: string;
  onSponsorChange: (sponsor: string) => void;
  sponsors: string[];
  loading: boolean;
}

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

interface ReportTableProps {
  data: LinkClickData[];
  onExportCSV: () => void;
  loading: boolean;
}

const SponsorSelector: React.FC<SponsorSelectorProps> = ({
  selectedSponsor,
  onSponsorChange,
  sponsors,
  loading
}) => {
  return (
    <div className="mb-6">
      <label htmlFor="sponsor" className="block text-sm font-medium text-gray-700 mb-2">
        Select Sponsor
      </label>
      <select
        id="sponsor"
        value={selectedSponsor}
        onChange={(e) => onSponsorChange(e.target.value)}
        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        disabled={loading}
      >
        <option value="">All Sponsors</option>
        {sponsors.map((sponsor) => (
          <option key={sponsor} value={sponsor}>{sponsor}</option>
        ))}
      </select>
    </div>
  );
};

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange
}) => {
  // Calculate default date range (last 30 days)
  const getDefaultDate = (daysBack: number): string => {
    const date = new Date();
    date.setDate(date.getDate() - daysBack);
    return date.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (!startDate) {
      onStartDateChange(getDefaultDate(30));
    }
    if (!endDate) {
      onEndDateChange(getDefaultDate(0));
    }
  }, [startDate, endDate, onStartDateChange, onEndDateChange]);

  const validateDateRange = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const oneYear = 365 * 24 * 60 * 60 * 1000; // milliseconds in a year

    if (start > end) {
      return 'Start date must be before end date';
    }
    if (end.getTime() - start.getTime() > oneYear) {
      return 'Date range cannot exceed 1 year';
    }
    return null;
  };

  const error = validateDateRange();

  return (
    <div className="mb-6 space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-2">
            Start Date
          </label>
          <input
            type="date"
            id="start-date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-2">
            End Date
          </label>
          <input
            type="date"
            id="end-date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

const ReportTable: React.FC<ReportTableProps> = ({ data, onExportCSV, loading }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  const getTotalClicks = () => {
    return data.reduce((sum, item) => sum + item.click_count, 0);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getChannelBreakdown = () => {
    const channelMap: Record<string, number> = {};
    data.forEach(item => {
      item.channels.forEach(channel => {
        channelMap[channel.channel] = (channelMap[channel.channel] || 0) + channel.clicks;
      });
    });
    return Object.entries(channelMap).map(([channel, clicks]) => ({
      channel,
      clicks,
      percentage: ((clicks / getTotalClicks()) * 100).toFixed(1)
    }));
  };

  const channelBreakdown = getChannelBreakdown();

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Sponsor Report</h3>
        <button
          onClick={onExportCSV}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Export CSV
        </button>
      </div>

      <div className="px-4 py-5 sm:p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Total Clicks</p>
            <p className="text-2xl font-bold text-gray-900">{getTotalClicks().toLocaleString()}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Links Tracked</p>
            <p className="text-2xl font-bold text-gray-900">{data.length}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Date Range</p>
            <p className="text-sm font-medium text-gray-900">
              {data.length > 0 ? `${formatDate(data[0].date)} - ${formatDate(data[data.length - 1].date)}` : 'No data'}
            </p>
          </div>
        </div>

        {/* Main Table */}
        {data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Link Slug
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Destination
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Click Count
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((item, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.slug}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="max-w-xs truncate" title={item.destination}>
                        {item.destination}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.click_count.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No data available for the selected criteria</p>
          </div>
        )}

        {/* Channel Breakdown */}
        {channelBreakdown.length > 0 && (
          <div className="mt-8">
            <h4 className="text-md font-medium text-gray-900 mb-4">Channel Breakdown</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {channelBreakdown.map((item, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-gray-700">{item.channel}</span>
                    <span className="text-sm text-gray-500">{item.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{item.clicks.toLocaleString()} clicks</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const SponsorReport: React.FC = () => {
  const [selectedSponsor, setSelectedSponsor] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sponsors, setSponsors] = useState<string[]>([]);
  const [reportData, setReportData] = useState<LinkClickData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSponsors = async () => {
    try {
      setLoading(true);
      const sponsorsData = await fetchUniqueSponsors();
      setSponsors(sponsorsData);
    } catch (err) {
      setError('Failed to load sponsors');
      console.error('Error loading sponsors:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadReportData = async () => {
    if (!startDate || !endDate) return;

    try {
      setLoading(true);
      setError(null);
      const data = await fetchSponsorReport(selectedSponsor, startDate, endDate);
      setReportData(data);
    } catch (err) {
      setError('Failed to load report data');
      console.error('Error loading report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSponsors();
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      loadReportData();
    }
  }, [selectedSponsor, startDate, endDate]);

  const exportToCSV = () => {
    if (reportData.length === 0) return;

    const headers = [
      'Date',
      'Link Slug',
      'Destination',
      'Click Count',
      'Channel',
      'Channel Clicks'
    ];

    const csvRows = [
      headers.join(','),
      ...reportData.map(item => {
        const row = [
          item.date,
          `"${item.slug}"`,
          `"${item.destination}"`,
          item.click_count,
          item.channels.map(c => `${c.channel}(${c.clicks})`).join(';')
        ].join(',');
        return row;
      })
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `sponsor-report-${startDate}-to-${endDate}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Sponsor Reports</h1>
          <p className="mt-1 text-sm text-gray-600">
            View performance metrics for sponsor links
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex flex-col lg:flex-row lg:items-end gap-4">
              <div className="flex-1">
                <SponsorSelector
                  selectedSponsor={selectedSponsor}
                  onSponsorChange={setSelectedSponsor}
                  sponsors={sponsors}
                  loading={loading}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-300"
                >
                  Clear Filters
                </button>
                <button
                  onClick={exportToCSV}
                  disabled={reportData.length === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  Export CSV
                </button>
              </div>
            </div>

            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />

            <ReportTable
              data={reportData}
              onExportCSV={exportToCSV}
              loading={loading}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default SponsorReport;