import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ImportExport } from '../src/pages/ImportExport'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock the components
vi.mock('../src/components/CSVUploader', () => ({
  CSVUploader: ({ onImportComplete }: { onImportComplete: (job: any) => void }) => (
    <button
      onClick={() => onImportComplete({
        id: 'test-job-1',
        status: 'completed',
        totalRows: 100,
        processedRows: 100,
        successCount: 95,
        errorCount: 5
      })}
    >
      Mock CSV Uploader
    </button>
  )
}))

vi.mock('../src/components/ImportProgress', () => ({
  ImportProgress: ({ job }: { job: any }) => (
    <div>
      <div>Job ID: {job.id}</div>
      <div>Status: {job.status}</div>
      <div>Success: {job.successCount}</div>
      <div>Errors: {job.errorCount}</div>
    </div>
  )
}))

vi.mock('../src/components/ExportFilters', () => ({
  ExportFilters: ({ filters, onFiltersChange }: {
    filters: any;
    onFiltersChange: (filters: any) => void
  }) => (
    <div>
      <input
        data-testid="search-input"
        value={filters.search || ''}
        onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
      />
    </div>
  )
}))

describe('ImportExport Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders import tab by default', () => {
    render(<ImportExport />)

    expect(screen.getByText('Import Links')).toBeInTheDocument()
    expect(screen.getByText('Export Links')).toBeInTheDocument()
    expect(screen.getByText('Import Links from CSV')).toBeInTheDocument()
    expect(screen.queryByText('Export Links to CSV')).not.toBeInTheDocument()
  })

  it('switches to export tab when clicked', () => {
    render(<ImportExport />)

    const exportTab = screen.getByText('Export Links')
    fireEvent.click(exportTab)

    expect(screen.getByText('Export Links to CSV')).toBeInTheDocument()
    expect(screen.queryByText('Import Links from CSV')).not.toBeInTheDocument()
  })

  it('shows CSV uploader in import tab', () => {
    render(<ImportExport />)

    expect(screen.getByText('Mock CSV Uploader')).toBeInTheDocument()
  })

  it('shows import progress after import completes', async () => {
    render(<ImportExport />)

    const uploader = screen.getByText('Mock CSV Uploader')
    fireEvent.click(uploader)

    await waitFor(() => {
      expect(screen.getByText('Job ID: test-job-1')).toBeInTheDocument()
      expect(screen.getByText('Status: completed')).toBeInTheDocument()
      expect(screen.getByText('Success: 95')).toBeInTheDocument()
      expect(screen.getByText('Errors: 5')).toBeInTheDocument()
    })
  })

  it('updates export filters when changed', () => {
    render(<ImportExport />)

    const exportTab = screen.getByText('Export Links')
    fireEvent.click(exportTab)

    const searchInput = screen.getByTestId('search-input')
    fireEvent.change(searchInput, { target: { value: 'test search' } })

    expect(searchInput).toHaveValue('test search')
  })

  it('has proper accessibility attributes', () => {
    render(<ImportExport />)

    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(2)
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false')
  })
})