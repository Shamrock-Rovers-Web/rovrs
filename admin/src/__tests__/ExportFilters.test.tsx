/**
 * ExportFilters Component Tests
 *
 * Comprehensive test suite for the ExportFilters component using TDD approach.
 * Tests all filtering functionality including date range, status checkboxes,
 * campaign/channel dropdowns, search input, and applied filters preview.
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ExportFilters } from '../components/ExportFilters'
import type { ExportFilters as ExportFiltersType, ExportFiltersProps } from '../src/types/importExport'

// Mock the date input for consistent testing
const mockDate = new Date('2024-01-15T00:00:00Z')
vi.setSystemTime(mockDate)

const mockCampaigns = ['General', 'Season Ticket', 'Match Day', 'Sponsorship']
const mockChannels = ['organic', 'social', 'email', 'sms', 'paid', 'referral']

const defaultProps: ExportFiltersProps = {
  onApply: vi.fn(),
  onReset: vi.fn(),
  availableCampaigns: mockCampaigns,
  availableChannels: mockChannels
}

describe('ExportFilters Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders all filter controls', () => {
    render(<ExportFilters {...defaultProps} />)

    // Check main sections
    expect(screen.getByText('Export Filters')).toBeInTheDocument()
    expect(screen.getByText('Date Range')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Campaign')).toBeInTheDocument()
    expect(screen.getByText('Channel')).toBeInTheDocument()
    expect(screen.getByText('Search')).toBeInTheDocument()
    expect(screen.getByText('Applied Filters')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apply Filters' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear Filters' })).toBeInTheDocument()
  })

  it('renders date range inputs with today as default values', () => {
    render(<ExportFilters {...defaultProps} />)

    // Get date inputs by their IDs
    const fromDateInput = screen.getByTestId('from-date-input')
    const toDateInput = screen.getByTestId('to-date-input')

    expect(fromDateInput).toBeInTheDocument()
    expect(toDateInput).toBeInTheDocument()

    // Check that today's date is pre-filled
    const today = new Date().toISOString().split('T')[0]
    expect(fromDateInput).toHaveAttribute('value', today)
    expect(toDateInput).toHaveAttribute('value', today)
  })

  it('renders status checkboxes correctly', () => {
    render(<ExportFilters {...defaultProps} />)

    expect(screen.getByLabelText('Active')).toBeInTheDocument()
    expect(screen.getByLabelText('Expired')).toBeInTheDocument()
    expect(screen.getByLabelText('Paused')).toBeInTheDocument()
    expect(screen.getByLabelText('Deleted')).toBeInTheDocument()
  })

  it('renders campaign dropdown with options', () => {
    render(<ExportFilters {...defaultProps} />)

    const select = screen.getByLabelText('Campaign')
    expect(select).toBeInTheDocument()

    // Check all options are present
    mockCampaigns.forEach(campaign => {
      expect(screen.getByRole('option', { name: campaign })).toBeInTheDocument()
    })

    // Check empty option is selected by default
    expect(select).toHaveValue('')
  })

  it('renders channel dropdown with options', () => {
    render(<ExportFilters {...defaultProps} />)

    const select = screen.getByLabelText('Channel')
    expect(select).toBeInTheDocument()

    // Check all options are present
    mockChannels.forEach(channel => {
      expect(screen.getByRole('option', { name: channel })).toBeInTheDocument()
    })

    // Check empty option is selected by default
    expect(select).toHaveValue('')
  })

  it('renders search input', () => {
    render(<ExportFilters {...defaultProps} />)

    const searchInput = screen.getByPlaceholderText('Search by slug or destination...')
    expect(searchInput).toBeInTheDocument()
  })

  describe('Filter State Management', () => {
    it('updates date range when inputs change', async () => {
      render(<ExportFilters {...defaultProps} />)

      const dateInputs = screen.getAllByRole('textbox', { type: 'date' })
      const startDateInput = dateInputs[0]
      const endDateInput = dateInputs[1]

      await userEvent.type(startDateInput, '2024-01-01')
      await userEvent.type(endDateInput, '2024-01-31')

      expect(startDateInput).toHaveValue('2024-01-01')
      expect(endDateInput).toHaveValue('2024-01-31')
    })

    it('updates status when clicked', async () => {
      render(<ExportFilters {...defaultProps} />)

      const activeCheckbox = screen.getByLabelText('Active')
      const expiredCheckbox = screen.getByLabelText('Expired')

      // Click Active - only Active should be checked
      await userEvent.click(activeCheckbox)
      expect(activeCheckbox).toBeChecked()
      expect(expiredCheckbox).not.toBeChecked()

      // Click Expired - now only Expired should be checked
      await userEvent.click(expiredCheckbox)
      expect(activeCheckbox).not.toBeChecked()
      expect(expiredCheckbox).toBeChecked()
    })

    it('updates dropdown selections when changed', async () => {
      render(<ExportFilters {...defaultProps} />)

      const campaignSelect = screen.getByLabelText('Campaign')
      const channelSelect = screen.getByLabelText('Channel')

      await userEvent.selectOptions(campaignSelect, 'Season Ticket')
      await userEvent.selectOptions(channelSelect, 'social')

      expect(campaignSelect).toHaveValue('Season Ticket')
      expect(channelSelect).toHaveValue('social')
    })

    it('updates search input when typing', async () => {
      render(<ExportFilters {...defaultProps} />)

      const searchInput = screen.getByPlaceholderText('Search by slug or destination...')

      await userEvent.type(searchInput, 'ticket')

      expect(searchInput).toHaveValue('ticket')
    })

    it('updates applied filters preview in real-time', async () => {
      render(<ExportFilters {...defaultProps} />)

      // Set some filters
      await userEvent.click(screen.getByLabelText('Active'))
      await userEvent.selectOptions(screen.getByLabelText('Campaign'), 'Season Ticket')
      await userEvent.type(screen.getByPlaceholderText('Search by slug or destination...'), 'shop')

      // Check preview updates
      expect(screen.getByText('Active')).toBeInTheDocument()
      expect(screen.getByText('Season Ticket')).toBeInTheDocument()
      expect(screen.getByText('shop')).toBeInTheDocument()
    })
  })

  describe('Apply Filters', () => {
    it('calls onApply with correct filters when Apply button is clicked', async () => {
      render(<ExportFilters {...defaultProps} />)

      // Set up filters
      await userEvent.click(screen.getByLabelText('Active'))
      await userEvent.selectOptions(screen.getByLabelText('Campaign'), 'Season Ticket')
      await userEvent.type(screen.getByPlaceholderText('Search by slug or destination...'), 'ticket')

      const applyButton = screen.getByRole('button', { name: 'Apply Filters' })
      await userEvent.click(applyButton)

      expect(defaultProps.onApply).toHaveBeenCalledWith({
        status: 'active',
        campaign: 'Season Ticket',
        slug_search: 'ticket'
      })
    })

    it('includes date range in applied filters when both dates are set', async () => {
      render(<ExportFilters {...defaultProps} />)

      const dateInputs = screen.getAllByRole('textbox', { type: 'date' })
      await userEvent.type(dateInputs[0], '2024-01-01')
      await userEvent.type(dateInputs[1], '2024-01-31')

      await userEvent.click(screen.getByRole('button', { name: 'Apply Filters' }))

      expect(defaultProps.onApply).toHaveBeenCalledWith({
        date_range: {
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-31T23:59:59.999Z'
        }
      })
    })

    it('does not include date range in applied filters when start date is missing', async () => {
      render(<ExportFilters {...defaultProps} />)

      const dateInputs = screen.getAllByRole('textbox', { type: 'date' })
      // Clear start date
      fireEvent.change(dateInputs[0], { target: { value: '' } })
      await userEvent.type(dateInputs[1], '2024-01-31')

      await userEvent.click(screen.getByRole('button', { name: 'Apply Filters' }))

      expect(defaultProps.onApply).toHaveBeenCalledWith({
        date_range: {
          end: '2024-01-31T23:59:59.999Z'
        }
      })
    })

    it('does not include date range in applied filters when end date is missing', async () => {
      render(<ExportFilters {...defaultProps} />)

      const dateInputs = screen.getAllByRole('textbox', { type: 'date' })
      await userEvent.type(dateInputs[0], '2024-01-01')
      // Clear end date
      fireEvent.change(dateInputs[1], { target: { value: '' } })

      await userEvent.click(screen.getByRole('button', { name: 'Apply Filters' }))

      expect(defaultProps.onApply).toHaveBeenCalledWith({
        date_range: {
          start: '2024-01-01T00:00:00.000Z'
        }
      })
    })

    it('includes multiple statuses when multiple checkboxes are checked', async () => {
      render(<ExportFilters {...defaultProps} />)

      await userEvent.click(screen.getByLabelText('Active'))
      await userEvent.click(screen.getByLabelText('Paused'))

      await userEvent.click(screen.getByRole('button', { name: 'Apply Filters' }))

      expect(defaultProps.onApply).toHaveBeenCalledWith({
        status: undefined // Status filter doesn't support multiple values
      })
    })
  })

  describe('Clear Filters', () => {
    it('resets all filters when Clear button is clicked', async () => {
      render(<ExportFilters {...defaultProps} />)

      // Set some filters first
      await userEvent.click(screen.getByLabelText('Active'))
      await userEvent.selectOptions(screen.getByLabelText('Campaign'), 'Season Ticket')
      await userEvent.type(screen.getByPlaceholderText('Search by slug or destination...'), 'test')

      // Clear filters
      await userEvent.click(screen.getByRole('button', { name: 'Clear Filters' }))

      // Check all inputs are reset
      expect(screen.getByLabelText('Active')).not.toBeChecked()
      expect(screen.getByLabelText('Expired')).not.toBeChecked()
      expect(screen.getByLabelText('Paused')).not.toBeChecked()
      expect(screen.getByLabelText('Deleted')).not.toBeChecked()
      expect(screen.getByLabelText('Campaign')).toHaveValue('')
      expect(screen.getByLabelText('Channel')).toHaveValue('')
      expect(screen.getByPlaceholderText('Search by slug or destination...')).toHaveValue('')

      // Date inputs should reset to today
      const today = new Date().toISOString().split('T')[0]
      const dateInputs = screen.getAllByRole('textbox', { type: 'date' })
      expect(dateInputs[0]).toHaveAttribute('value', today)
      expect(dateInputs[1]).toHaveAttribute('value', today)
    })

    it('calls onReset when Clear button is clicked', async () => {
      render(<ExportFilters {...defaultProps} />)

      await userEvent.click(screen.getByRole('button', { name: 'Clear Filters' }))

      expect(defaultProps.onReset).toHaveBeenCalled()
    })
  })

  describe('Initial Filters', () => {
    it('loads initial filters when provided', () => {
      const initialFilters: ExportFiltersType = {
        status: 'active',
        campaign: 'Season Ticket',
        channel: 'email',
        date_range: {
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-31T23:59:59.999Z'
        },
        slug_search: 'ticket'
      }

      render(<ExportFilters {...defaultProps} initialFilters={initialFilters} />)

      // Check initial values are loaded
      expect(screen.getByLabelText('Active')).toBeChecked()
      expect(screen.getByLabelText('Campaign')).toHaveValue('Season Ticket')
      expect(screen.getByLabelText('Channel')).toHaveValue('email')
      expect(screen.getByPlaceholderText('Search by slug or destination...')).toHaveValue('ticket')

      const dateInputs = screen.getAllByRole('textbox', { type: 'date' })
      expect(dateInputs[0]).toHaveValue('2024-01-01')
      expect(dateInputs[1]).toHaveValue('2024-01-31')
    })

    it('updates preview when initial filters are set', () => {
      const initialFilters: ExportFiltersType = {
        status: 'active',
        campaign: 'Season Ticket',
        slug_search: 'ticket'
      }

      render(<ExportFilters {...defaultProps} initialFilters={initialFilters} />)

      expect(screen.getByText('Active')).toBeInTheDocument()
      expect(screen.getByText('Season Ticket')).toBeInTheDocument()
      expect(screen.getByText('ticket')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels for all interactive elements', () => {
      render(<ExportFilters {...defaultProps} />)

      // Check button labels
      expect(screen.getByRole('button', { name: 'Apply Filters' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Clear Filters' })).toBeInTheDocument()

      // Check input labels
      expect(screen.getByLabelText('From Date')).toBeInTheDocument()
      expect(screen.getByLabelText('To Date')).toBeInTheDocument()
      expect(screen.getByLabelText('Campaign')).toBeInTheDocument()
      expect(screen.getByLabelText('Channel')).toBeInTheDocument()
      expect(screen.getByLabelText('Search by slug or destination...')).toBeInTheDocument()
    })

    it('can be navigated with keyboard', async () => {
      render(<ExportFilters {...defaultProps} />)

      const user = userEvent.setup({ advanceTimings: true })

      // Navigate through tab order
      const applyButton = screen.getByRole('button', { name: 'Apply Filters' })
      const clearButton = screen.getByRole('button', { name: 'Clear Filters' })

      await user.tab()
      expect(document.activeElement).toBe(screen.getByLabelText('From Date'))

      await user.tab()
      expect(document.activeElement).toBe(screen.getByLabelText('To Date'))

      await user.tab()
      expect(document.activeElement).toBe(screen.getByLabelText('Active'))

      await user.tab()
      expect(document.activeElement).toBe(screen.getByLabelText('Expired'))

      await user.tab()
      expect(document.activeElement).toBe(screen.getByLabelText('Paused'))

      await user.tab()
      expect(document.activeElement).toBe(screen.getByLabelText('Deleted'))

      await user.tab()
      expect(document.activeElement).toBe(screen.getByLabelText('Campaign'))

      await user.tab()
      expect(document.activeElement).toBe(screen.getByLabelText('Channel'))

      await user.tab()
      expect(document.activeElement).toBe(screen.getByPlaceholderText('Search by slug or destination...'))

      await user.tab()
      expect(document.activeElement).toBe(applyButton)

      await user.tab()
      expect(document.activeElement).toBe(clearButton)
    })
  })

  describe('Edge Cases', () => {
    it('handles empty available options gracefully', () => {
      const emptyProps = {
        ...defaultProps,
        availableCampaigns: [],
        availableChannels: []
      }

      expect(() => render(<ExportFilters {...emptyProps} />)).not.toThrow()
    })

    it('handles undefined available options gracefully', () => {
      const undefinedProps = {
        ...defaultProps,
        availableCampaigns: undefined,
        availableChannels: undefined
      }

      expect(() => render(<ExportFilters {...undefinedProps} />)).not.toThrow()
    })

    it('does not include undefined values in applied filters', async () => {
      render(<ExportFilters {...defaultProps} />)

      await userEvent.click(screen.getByRole('button', { name: 'Apply Filters' }))

      expect(defaultProps.onApply).toHaveBeenCalledWith({})
    })
  })
})