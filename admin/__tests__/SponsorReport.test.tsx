import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SponsorReport from '../src/pages/SponsorReport'

// Mock the API module
vi.mock('../src/api/sponsorReport', () => ({
  fetchUniqueSponsors: vi.fn(),
  fetchSponsorReport: vi.fn(),
}))

const mockFetchUniqueSponsors = require('../src/api/sponsorReport').fetchUniqueSponsors
const mockFetchSponsorReport = require('../src/api/sponsorReport').fetchSponsorReport

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost:3000',
  },
  writable: true,
})

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('SponsorReport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchUniqueSponsors.mockResolvedValue(['Sponsor A', 'Sponsor B', 'Sponsor C'])
    mockFetchSponsorReport.mockResolvedValue([
      {
        date: '2024-01-01',
        slug: 'sponsor-a-link',
        destination: 'https://sponsor-a.com',
        click_count: 150,
        channels: [
          { channel: 'social', clicks: 100 },
          { channel: 'email', clicks: 50 }
        ]
      },
      {
        date: '2024-01-02',
        slug: 'sponsor-b-link',
        destination: 'https://sponsor-b.com',
        click_count: 75,
        channels: [
          { channel: 'web', clicks: 75 }
        ]
      }
    ])
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders the sponsor report page', () => {
    render(<SponsorReport />, { wrapper: createWrapper() })

    expect(screen.getByText('Sponsor Reports')).toBeInTheDocument()
    expect(screen.getByText('Select Sponsor')).toBeInTheDocument()
    expect(screen.getByText('Start Date')).toBeInTheDocument()
    expect(screen.getByText('End Date')).toBeInTheDocument()
  })

  it('loads sponsors on mount', async () => {
    render(<SponsorReport />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(mockFetchUniqueSponsors).toHaveBeenCalledTimes(1)
    })

    const select = screen.getByLabelText('Select Sponsor')
    expect(select).toHaveValue('')
    expect(screen.getByText('All Sponsors')).toBeInTheDocument()
  })

  it('allows selecting a sponsor', async () => {
    render(<SponsorReport />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(mockFetchUniqueSponsors).toHaveBeenCalledTimes(1)
    })

    const select = screen.getByLabelText('Select Sponsor')
    fireEvent.change(select, { target: { value: 'Sponsor A' } })

    expect(select).toHaveValue('Sponsor A')
  })

  it('shows loading state when fetching data', async () => {
    // Mock the API to simulate loading
    mockFetchUniqueSponsors.mockImplementationOnce(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
      return ['Sponsor A']
    })

    const { container } = render(<SponsorReport />, { wrapper: createWrapper() })

    // Initially shows loading spinner
    expect(screen.getByRole('status')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })
  })

  it('displays report data when loaded', async () => {
    render(<SponsorReport />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(mockFetchSponsorReport).toHaveBeenCalledWith('', expect.any(String), expect.any(String))
    })

    expect(screen.getByText('Sponsor Report')).toBeInTheDocument()
    expect(screen.getByText('Total Clicks')).toBeInTheDocument()
    expect(screen.getByText('Links Tracked')).toBeInTheDocument()
    expect(screen.getByText('Date Range')).toBeInTheDocument()

    // Check if data is displayed in the table
    expect(screen.getByText('sponsor-a-link')).toBeInTheDocument()
    expect(screen.getByText('sponsor-b-link')).toBeInTheDocument()
    expect(screen.getByText('https://sponsor-a.com')).toBeInTheDocument()
    expect(screen.getByText('150')).toBeInTheDocument()
    expect(screen.getByText('75')).toBeInTheDocument()
  })

  it('displays channel breakdown', async () => {
    render(<SponsorReport />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(mockFetchSponsorReport).toHaveBeenCalled()
    })

    expect(screen.getByText('Channel Breakdown')).toBeInTheDocument()
  })

  it('shows error message when API fails', async () => {
    mockFetchUniqueSponsors.mockRejectedValue(new Error('API Error'))

    render(<SponsorReport />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Failed to load sponsors')).toBeInTheDocument()
    })
  })

  it('validates date range constraints', async () => {
    render(<SponsorReport />, { wrapper: createWrapper() })

    // Wait for initial load
    await waitFor(() => {
      expect(mockFetchSponsorReport).toHaveBeenCalled()
    })

    // Set invalid date range (end before start)
    const startDateInput = screen.getByLabelText('Start Date')
    const endDateInput = screen.getByLabelText('End Date')

    fireEvent.change(startDateInput, { target: { value: '2024-01-03' } })
    fireEvent.change(endDateInput, { target: { value: '2024-01-01' } })

    expect(screen.getByText('Start date must be before end date')).toBeInTheDocument()
  })

  it('limits date range to 1 year', async () => {
    render(<SponsorReport />, { wrapper: createWrapper() })

    // Wait for initial load
    await waitFor(() => {
      expect(mockFetchSponsorReport).toHaveBeenCalled()
    })

    // Set date range exceeding 1 year
    const startDateInput = screen.getByLabelText('Start Date')
    const endDateInput = screen.getByLabelText('End Date')

    fireEvent.change(startDateInput, { target: { value: '2023-01-01' } })
    fireEvent.change(endDateInput, { target: { value: '2024-01-02' } })

    expect(screen.getByText('Date range cannot exceed 1 year')).toBeInTheDocument()
  })

  it('exports data to CSV', async () => {
    const mockCreateObjectURL = vi.fn()
    const mockRevokeObjectURL = vi.fn()
    const mockClick = vi.fn()

    global.URL.createObjectURL = mockCreateObjectURL
    global.URL.revokeObjectURL = mockRevokeObjectURL
    global.document.createElement = vi.fn().mockReturnValue({
      href: '',
      download: '',
      style: {},
      click: mockClick,
    })
    global.document.body.appendChild = vi.fn()
    global.document.body.removeChild = vi.fn()

    render(<SponsorReport />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(mockFetchSponsorReport).toHaveBeenCalled()
    })

    const exportButton = screen.getByRole('button', { name: /export csv/i })
    fireEvent.click(exportButton)

    expect(mockCreateObjectURL).toHaveBeenCalled()
    expect(mockClick).toHaveBeenCalled()
    expect(mockRevokeObjectURL).toHaveBeenCalled()
    expect(global.document.body.appendChild).toHaveBeenCalled()
    expect(global.document.body.removeChild).toHaveBeenCalled()
  })

  it('shows no data message when no results', async () => {
    mockFetchSponsorReport.mockResolvedValue([])

    render(<SponsorReport />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(mockFetchSponsorReport).toHaveBeenCalled()
    })

    expect(screen.getByText('No data available for the selected criteria')).toBeInTheDocument()
  })

  it('calculates summary statistics correctly', async () => {
    mockFetchSponsorReport.mockResolvedValue([
      {
        date: '2024-01-01',
        slug: 'test-link-1',
        destination: 'https://example.com',
        click_count: 100,
        channels: [{ channel: 'social', clicks: 100 }]
      },
      {
        date: '2024-01-02',
        slug: 'test-link-2',
        destination: 'https://example.com',
        click_count: 200,
        channels: [{ channel: 'email', clicks: 200 }]
      }
    ])

    render(<SponsorReport />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(mockFetchSponsorReport).toHaveBeenCalled()
    })

    expect(screen.getByText('300')) // Total clicks (100 + 200)
    expect(screen.getByText('2')) // Links tracked
  })

  it('handles truncation of long destination URLs', async () => {
    mockFetchSponsorReport.mockResolvedValue([
      {
        date: '2024-01-01',
        slug: 'test-link',
        destination: 'https://very-long-destination-url-that-should-be-truncated-in-the-display.com/very/long/path/with/many/components',
        click_count: 50,
        channels: [{ channel: 'social', clicks: 50 }]
      }
    ])

    render(<SponsorReport />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(mockFetchSponsorReport).toHaveBeenCalled()
    })

    const destinationElement = screen.getByText(/very-long-destination-url/i)
    expect(destinationElement).toHaveClass('truncate')
  })
})