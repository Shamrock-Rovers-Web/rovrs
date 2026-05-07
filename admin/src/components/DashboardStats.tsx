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
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Statistics</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Links"
          value="1,234"
          change={{ type: 'positive', value: 12, label: 'from last week' }}
          icon="📊"
        />
        <StatCard
          title="Active Links"
          value="892"
          change={{ type: 'positive', value: 5, label: 'from last week' }}
          icon="✅"
        />
        <StatCard
          title="Clicks Today"
          value="5,678"
          change={{ type: 'positive', value: 18, label: 'from yesterday' }}
          icon="👆"
        />
        <StatCard
          title="Clicks (7d)"
          value="45,678"
          change={{ type: 'neutral', value: 0, label: 'no change' }}
          icon="📈"
        />
        <StatCard
          title="Clicks (30d)"
          value="234,567"
          change={{ type: 'positive', value: 8, label: 'from last month' }}
          icon="📊"
        />
      </div>
    </div>
  );
}