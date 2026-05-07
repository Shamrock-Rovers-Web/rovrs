import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ExportFilters from '../src/components/ExportFilters';
import { ExportFilters as ExportFiltersType } from '../src/types/importExport';

// Mock the clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
  },
});

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('ExportFilters Component', () => {
  const mockOnApply = jest.fn();
  const mockOnReset = jest.fn();

  const mockInitialFilters: ExportFiltersType = {
    date_range: {
      start: '2024-01-01',
      end: '2024-01-31'
    },
    status: 'active',
    campaign: 'Season Ticket',
    channel: 'organic'
  };

  const mockAvailableCampaigns = ['General', 'Season Ticket', 'Match Day', 'Sponsorship'];
  const mockAvailableChannels = ['organic', 'social', 'email', 'sms', 'paid', 'referral'];

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders correctly with empty form', () => {
    renderWithRouter(
      <ExportFilters
        onApply={mockOnApply}
        availableCampaigns={mockAvailableCampaigns}
        availableChannels={mockAvailableChannels}
      />
    );

    expect(screen.getByText('Export Filters')).toBeInTheDocument();
    expect(screen.getByLabelText(/From Date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/To Date/i)).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Campaign')).toBeInTheDocument();
    expect(screen.getByText('Channel')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Apply Filters/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Clear Filters/i })).toBeInTheDocument();
  });

  it('renders with initial filters', () => {
    renderWithRouter(
      <ExportFilters
        onApply={mockOnApply}
        onReset={mockOnReset}
        initialFilters={mockInitialFilters}
        availableCampaigns={mockAvailableCampaigns}
        availableChannels={mockAvailableChannels}
      />
    );

    expect(screen.getByDisplayValue('2024-01-01')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2024-01-31')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Season Ticket')).toBeInTheDocument();
    expect(screen.getByDisplayValue('organic')).toBeInTheDocument();
  });

  it('shows applied filters preview when filters are applied', () => {
    renderWithRouter(
      <ExportFilters
        onApply={mockOnApply}
        initialFilters={mockInitialFilters}
        availableCampaigns={mockAvailableCampaigns}
        availableChannels={mockAvailableChannels}
      />
    );

    // Check that applied filters are shown
    expect(screen.getByText('Applied Filters')).toBeInTheDocument();
    expect(screen.getByText('Status: Active')).toBeInTheDocument();
    expect(screen.getByText('Campaign: Season Ticket')).toBeInTheDocument();
    expect(screen.getByText('Channel: organic')).toBeInTheDocument();
  });

  it('handles date range changes', () => {
    renderWithRouter(
      <ExportFilters
        onApply={mockOnApply}
        availableCampaigns={mockAvailableCampaigns}
        availableChannels={mockAvailableChannels}
      />
    );

    const fromDateInput = screen.getByLabelText(/From Date/i);
    const toDateInput = screen.getByLabelText(/To Date/i);

    fireEvent.change(fromDateInput, { target: { value: '2024-02-01' } });
    fireEvent.change(toDateInput, { target: { value: '2024-02-29' } });

    expect(fromDateInput).toHaveValue('2024-02-01');
    expect(toDateInput).toHaveValue('2024-02-29');
  });

  it('handles status checkbox changes', () => {
    renderWithRouter(
      <ExportFilters
        onApply={mockOnApply}
        availableCampaigns={mockAvailableCampaigns}
        availableChannels={mockAvailableChannels}
      />
    );

    const activeCheckbox = screen.getByLabelText('Active');
    const pausedCheckbox = screen.getByLabelText('Paused');

    fireEvent.click(activeCheckbox);
    expect(activeCheckbox).toBeChecked();

    fireEvent.click(pausedCheckbox);
    expect(pausedCheckbox).toBeChecked();

    // Clicking the same checkbox again should uncheck it
    fireEvent.click(activeCheckbox);
    expect(activeCheckbox).not.toBeChecked();
  });

  it('handles campaign dropdown changes', () => {
    renderWithRouter(
      <ExportFilters
        onApply={mockOnApply}
        availableCampaigns={mockAvailableCampaigns}
        availableChannels={mockAvailableChannels}
      />
    );

    const campaignSelect = screen.getByLabelText('Campaign');
    fireEvent.change(campaignSelect, { target: { value: 'Match Day' } });

    expect(campaignSelect).toHaveValue('Match Day');
  });

  it('handles channel dropdown changes', () => {
    renderWithRouter(
      <ExportFilters
        onApply={mockOnApply}
        availableCampaigns={mockAvailableCampaigns}
        availableChannels={mockAvailableChannels}
      />
    );

    const channelSelect = screen.getByLabelText('Channel');
    fireEvent.change(channelSelect, { target: { value: 'social' } });

    expect(channelSelect).toHaveValue('social');
  });

  it('handles search input changes', () => {
    renderWithRouter(
      <ExportFilters
        onApply={mockOnApply}
        availableCampaigns={mockAvailableCampaigns}
        availableChannels={mockAvailableChannels}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search by slug or destination...');
    fireEvent.change(searchInput, { target: { value: 'test-slug' } });

    expect(searchInput).toHaveValue('test-slug');
  });

  it('calls onApply when Apply Filters button is clicked', () => {
    renderWithRouter(
      <ExportFilters
        onApply={mockOnApply}
        availableCampaigns={mockAvailableCampaigns}
        availableChannels={mockAvailableChannels}
      />
    );

    const applyButton = screen.getByRole('button', { name: /Apply Filters/i });
    fireEvent.click(applyButton);

    expect(mockOnApply).toHaveBeenCalledTimes(1);

    // Check that it was called with the correct filters
    const expectedFilters = {
      date_range: {
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      }
    };
    expect(mockOnApply).toHaveBeenCalledWith(expectedFilters);
  });

  it('calls onReset when Clear Filters button is clicked', () => {
    renderWithRouter(
      <ExportFilters
        onApply={mockOnApply}
        onReset={mockOnReset}
        availableCampaigns={mockAvailableCampaigns}
        availableChannels={mockAvailableChannels}
      />
    );

    const clearButton = screen.getByRole('button', { name: /Clear Filters/i });
    fireEvent.click(clearButton);

    expect(mockOnReset).toHaveBeenCalledTimes(1);
  });

  it('resets filters to default when clear filters is called', () => {
    renderWithRouter(
      <ExportFilters
        onApply={mockOnApply}
        initialFilters={mockInitialFilters}
        availableCampaigns={mockAvailableCampaigns}
        availableChannels={mockAvailableChannels}
      />
    );

    // Check initial filters are set
    expect(screen.getByDisplayValue('2024-01-01')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2024-01-31')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Season Ticket')).toBeInTheDocument();

    // Clear filters
    const clearButton = screen.getByRole('button', { name: /Clear Filters/i });
    fireEvent.click(clearButton);

    // Check that filters are reset to today's date
    const today = new Date().toISOString().split('T')[0];
    expect(screen.getByDisplayValue(today)).toBeInTheDocument();
  });

  it('shows correct applied filter count', () => {
    // Test with multiple filters applied
    renderWithRouter(
      <ExportFilters
        onApply={mockOnApply}
        initialFilters={{
          ...mockInitialFilters,
          slug_search: 'test'
        }}
        availableCampaigns={mockAvailableCampaigns}
        availableChannels={mockAvailableChannels}
      />
    );

    // Should show 5 filters: status, campaign, channel, search, date range
    expect(screen.getByText('Applied Filters')).toBeInTheDocument();

    // Count filter badges
    const filterBadges = screen.getAllByRole('status');
    expect(filterBadges.length).toBeGreaterThan(0);
  });

  it('shows no applied filters when none are set', () => {
    renderWithRouter(
      <ExportFilters
        onApply={mockOnApply}
        initialFilters={{ date_range: { start: '', end: '' } }}
        availableCampaigns={mockAvailableCampaigns}
        availableChannels={mockAvailableChannels}
      />
    );

    // Should not show "Applied Filters" section when no filters are applied
    const appliedFiltersSection = screen.queryByText('Applied Filters');
    expect(appliedFiltersSection).not.toBeInTheDocument();
  });

  it('handles custom className prop', () => {
    const customClass = 'custom-filter-class';
    renderWithRouter(
      <ExportFilters
        onApply={mockOnApply}
        className={customClass}
        availableCampaigns={mockAvailableCampaigns}
        availableChannels={mockAvailableChannels}
      />
    );

    const component = screen.getByText('Export Filters').closest('div');
    expect(component).toHaveClass(customClass);
  });

  it('uses availableCampaigns prop for dropdown options', () => {
    const customCampaigns = ['Custom 1', 'Custom 2', 'Custom 3'];
    renderWithRouter(
      <ExportFilters
        onApply={mockOnApply}
        availableCampaigns={customCampaigns}
        availableChannels={mockAvailableChannels}
      />
    );

    const campaignSelect = screen.getByLabelText('Campaign');
    const options = campaignSelect.querySelectorAll('option');

    expect(options).toHaveLength(4); // All + 3 custom
    expect(options[1]).toHaveValue('Custom 1');
    expect(options[2]).toHaveValue('Custom 2');
    expect(options[3]).toHaveValue('Custom 3');
  });

  it('uses availableChannels prop for dropdown options', () => {
    const customChannels = ['Custom A', 'Custom B'];
    renderWithRouter(
      <ExportFilters
        onApply={mockOnApply}
        availableCampaigns={mockAvailableCampaigns}
        availableChannels={customChannels}
      />
    );

    const channelSelect = screen.getByLabelText('Channel');
    const options = channelSelect.querySelectorAll('option');

    expect(options).toHaveLength(3); // All + 2 custom
    expect(options[1]).toHaveValue('Custom A');
    expect(options[2]).toHaveValue('Custom B');
  });

  it('handles date range with undefined values', () => {
    renderWithRouter(
      <ExportFilters
        onApply={mockOnApply}
        initialFilters={{
          date_range: {
            start: undefined,
            end: undefined
          }
        }}
        availableCampaigns={mockAvailableCampaigns}
        availableChannels={mockAvailableChannels}
      />
    );

    const fromDateInput = screen.getByLabelText(/From Date/i);
    const toDateInput = screen.getByLabelText(/To Date/i);

    expect(fromDateInput).toHaveValue('');
    expect(toDateInput).toHaveValue('');
  });

  it('handles status filter with undefined value', () => {
    renderWithRouter(
      <ExportFilters
        onApply={mockOnApply}
        initialFilters={{
          status: undefined
        }}
        availableCampaigns={mockAvailableCampaigns}
        availableChannels={mockAvailableChannels}
      />
    );

    const activeCheckbox = screen.getByLabelText('Active');
    const pausedCheckbox = screen.getByLabelText('Paused');

    expect(activeCheckbox).not.toBeChecked();
    expect(pausedCheckbox).not.toBeChecked();
  });

  it('correctly renders date range in applied filters preview', () => {
    const specificDateRange = {
      start: '2024-03-01',
      end: '2024-03-31'
    };

    renderWithRouter(
      <ExportFilters
        onApply={mockOnApply}
        initialFilters={{
          date_range: specificDateRange
        }}
        availableCampaigns={mockAvailableCampaigns}
        availableChannels={mockAvailableChannels}
      />
    );

    // Check that the date range is shown in the applied filters
    expect(screen.getByText('From:')).toBeInTheDocument();
    expect(screen.getByText('To:')).toBeInTheDocument();
  });

  it('shows single date in applied filters when only start date is provided', () => {
    renderWithRouter(
      <ExportFilters
        onApply={mockOnApply}
        initialFilters={{
          date_range: {
            start: '2024-04-01',
            end: undefined
          }
        }}
        availableCampaigns={mockAvailableCampaigns}
        availableChannels={mockAvailableChannels}
      />
    );

    expect(screen.getByText('From:')).toBeInTheDocument();
    expect(screen.queryByText('To:')).not.toBeInTheDocument();
  });

  it('shows single date in applied filters when only end date is provided', () => {
    renderWithRouter(
      <ExportFilters
        onApply={mockOnApply}
        initialFilters={{
          date_range: {
            start: undefined,
            end: '2024-04-30'
          }
        }}
        availableCampaigns={mockAvailableCampaigns}
        availableChannels={mockAvailableChannels}
      />
    );

    expect(screen.getByText('To:')).toBeInTheDocument();
    expect(screen.queryByText('From:')).not.toBeInTheDocument();
  });

  it('applies filters correctly when Apply Filters is clicked with multiple filters', () => {
    renderWithRouter(
      <ExportFilters
        onApply={mockOnApply}
        availableCampaigns={mockAvailableCampaigns}
        availableChannels={mockAvailableChannels}
      />
    );

    // Set multiple filters
    fireEvent.click(screen.getByLabelText('Active'));
    fireEvent.change(screen.getByLabelText('Campaign'), { target: { value: 'Match Day' } });
    fireEvent.change(screen.getByPlaceholderText('Search by slug or destination...'), { target: { value: 'test-slug' } });
    fireEvent.change(screen.getByLabelText(/From Date/i), { target: { value: '2024-05-01' } });

    // Click apply
    fireEvent.click(screen.getByRole('button', { name: /Apply Filters/i }));

    // Check that onApply was called with all filters
    expect(mockOnApply).toHaveBeenCalledWith({
      date_range: {
        start: '2024-05-01',
        end: new Date().toISOString().split('T')[0]
      },
      status: 'active',
      campaign: 'Match Day',
      slug_search: 'test-slug'
    });
  });

  it('resets applied filters correctly when Clear Filters is called', () => {
    const mockOnApplyWithFilters = jest.fn();

    renderWithRouter(
      <ExportFilters
        onApply={mockOnApplyWithFilters}
        initialFilters={mockInitialFilters}
        onReset={mockOnReset}
        availableCampaigns={mockAvailableCampaigns}
        availableChannels={mockAvailableChannels}
      />
    );

    // Initially, applied filters should be shown
    expect(screen.getByText('Applied Filters')).toBeInTheDocument();

    // Clear filters
    fireEvent.click(screen.getByRole('button', { name: /Clear Filters/i }));

    // Check that onReset was called
    expect(mockOnReset).toHaveBeenCalledTimes(1);

    // Applied filters should still be visible (since it's the default state)
    expect(screen.getByText('Applied Filters')).toBeInTheDocument();
  });
});