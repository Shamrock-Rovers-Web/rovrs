/**
 * ExportFilters Component
 *
 * React component for filtering export data in the Shamrock Rovers admin dashboard.
 * Provides comprehensive filtering options including date range, status, campaign,
 * channel, and search functionality.
 */

import { useState, useEffect } from 'react'
import { ExportFilters as ExportFiltersType } from '../types/importExport'

interface ExportFiltersProps {
  onApply: (filters: ExportFiltersType) => void
  onReset?: () => void
  initialFilters?: ExportFiltersType
  availableCampaigns?: string[]
  availableChannels?: string[]
  className?: string
}

const DEFAULT_CAMPAIGNS = ['General', 'Season Ticket', 'Match Day', 'Sponsorship']
const DEFAULT_CHANNELS = ['organic', 'social', 'email', 'sms', 'paid', 'referral']

const STATUS_LABELS = {
  active: 'Active',
  expired: 'Expired',
  paused: 'Paused',
  deleted: 'Deleted'
} as const

export function ExportFilters({
  onApply,
  onReset,
  initialFilters,
  availableCampaigns = DEFAULT_CAMPAIGNS,
  availableChannels = DEFAULT_CHANNELS,
  className = ''
}: ExportFiltersProps) {
  const [filters, setFilters] = useState<ExportFiltersType>(() => {
    const defaultFilters: ExportFiltersType = {
      date_range: {
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      }
    }
    return initialFilters ? { ...defaultFilters, ...initialFilters } : defaultFilters
  })
  const [appliedFilters, setAppliedFilters] = useState<ExportFiltersType>(() => {
    const defaultFilters: ExportFiltersType = {
      date_range: {
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      }
    }
    return initialFilters ? { ...defaultFilters, ...initialFilters } : defaultFilters
  })

  const handleDateChange = (field: 'start' | 'end', value: string) => {
    setFilters(prev => ({
      ...prev,
      date_range: {
        ...prev.date_range,
        [field]: value || undefined
      }
    }))
  }

  const handleStatusChange = (status: keyof typeof STATUS_LABELS) => {
    setFilters(prev => ({
      ...prev,
      status: prev.status === status ? undefined : status
    }))
  }

  const handleCampaignChange = (campaign: string) => {
    setFilters(prev => ({
      ...prev,
      campaign: campaign === '' ? undefined : campaign
    }))
  }

  const handleChannelChange = (channel: string) => {
    setFilters(prev => ({
      ...prev,
      channel: channel === '' ? undefined : channel
    }))
  }

  const handleSearchChange = (search: string) => {
    setFilters(prev => ({
      ...prev,
      slug_search: search || undefined
    }))
  }

  const applyFilters = () => {
    setAppliedFilters(filters)
    onApply(filters)
  }

  const clearFilters = () => {
    const defaultFilters: ExportFiltersType = {
      date_range: {
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      }
    }

    setFilters(defaultFilters)
    setAppliedFilters(defaultFilters)
    onReset?.()
  }

  const getAppliedFiltersCount = () => {
    let count = 0

    if (filters.status) count++
    if (filters.campaign) count++
    if (filters.channel) count++
    if (filters.slug_search) count++
    if (filters.date_range?.start || filters.date_range?.end) count++

    return count
  }

  const renderAppliedFilters = () => {
    const filtersArray = []

    if (appliedFilters.status) {
      filtersArray.push(
        <span key="status" className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Status: {STATUS_LABELS[appliedFilters.status]}
        </span>
      )
    }

    if (appliedFilters.campaign) {
      filtersArray.push(
        <span key="campaign" className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Campaign: {appliedFilters.campaign}
        </span>
      )
    }

    if (appliedFilters.channel) {
      filtersArray.push(
        <span key="channel" className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          Channel: {appliedFilters.channel}
        </span>
      )
    }

    if (appliedFilters.slug_search) {
      filtersArray.push(
        <span key="search" className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Search: {appliedFilters.slug_search}
        </span>
      )
    }

    if (appliedFilters.date_range?.start || appliedFilters.date_range?.end) {
      const dateRange = []
      if (appliedFilters.date_range?.start) {
        dateRange.push(`From: ${new Date(appliedFilters.date_range.start).toLocaleDateString()}`)
      }
      if (appliedFilters.date_range?.end) {
        dateRange.push(`To: ${new Date(appliedFilters.date_range.end).toLocaleDateString()}`)
      }
      filtersArray.push(
        <span key="date-range" className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
          {dateRange.join(', ')}
        </span>
      )
    }

    return filtersArray.length > 0 ? filtersArray : null
  }

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Export Filters</h2>

      <div className="space-y-6">
        {/* Date Range Section */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Date Range</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="from-date" className="block text-sm font-medium text-gray-700 mb-1">
                From Date
              </label>
              <input
                type="date"
                id="from-date"
                data-testid="from-date-input"
                value={filters.date_range?.start || ''}
                onChange={(e) => handleDateChange('start', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="to-date" className="block text-sm font-medium text-gray-700 mb-1">
                To Date
              </label>
              <input
                type="date"
                id="to-date"
                data-testid="to-date-input"
                value={filters.date_range?.end || ''}
                onChange={(e) => handleDateChange('end', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Status Section */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Status</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(STATUS_LABELS).map(([status, label]) => (
              <label key={status} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.status === status}
                  onChange={() => handleStatusChange(status as keyof typeof STATUS_LABELS)}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Campaign and Channel Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="campaign" className="block text-sm font-medium text-gray-700 mb-3">Campaign</label>
            <select
              id="campaign"
              value={filters.campaign || ''}
              onChange={(e) => handleCampaignChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">All Campaigns</option>
              {availableCampaigns.map(campaign => (
                <option key={campaign} value={campaign}>
                  {campaign}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="channel" className="block text-sm font-medium text-gray-700 mb-3">Channel</label>
            <select
              id="channel"
              value={filters.channel || ''}
              onChange={(e) => handleChannelChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">All Channels</option>
              {availableChannels.map(channel => (
                <option key={channel} value={channel}>
                  {channel}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Section */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Search</h3>
          <input
            type="text"
            placeholder="Search by slug or destination..."
            value={filters.slug_search || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {/* Applied Filters Preview */}
        {getAppliedFiltersCount() > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Applied Filters</h3>
            <div className="flex flex-wrap gap-2">
              {renderAppliedFilters()}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={applyFilters}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
          >
            Apply Filters
          </button>
          <button
            onClick={clearFilters}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>
    </div>
  )
}