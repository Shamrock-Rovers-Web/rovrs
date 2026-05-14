import React, { useState, useRef } from 'react'

export default function ImportExport() {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)
  const [importError, setImportError] = useState('')
  const [exporting, setExporting] = useState(false)
  const [exportFilters, setExportFilters] = useState({ status: '', channel: '', campaign: '', sponsor: '' })
  const fileRef = useRef<HTMLInputElement>(null)

  const handleImport = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) return

    setImporting(true)
    setImportError('')
    setImportResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/import/csv', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.success) {
        setImportResult(data.data)
      } else {
        setImportError(data.error || 'Import failed')
      }
    } catch {
      setImportError('Network error during import')
    } finally {
      setImporting(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (exportFilters.status) params.set('status', exportFilters.status)
      if (exportFilters.channel) params.set('channel', exportFilters.channel)
      if (exportFilters.campaign) params.set('campaign', exportFilters.campaign)
      if (exportFilters.sponsor) params.set('sponsor', exportFilters.sponsor)

      const res = await fetch(`/api/export/csv?${params.toString()}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `rovrs-links-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Import / Export</h1>
        <p className="text-gray-500">Manage bulk operations for your links</p>
      </div>

      <div className="flex border-b mb-6">
        {(['import', 'export'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium border-b-2 -mb-px capitalize ${
              activeTab === tab
                ? 'border-green-700 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab} Links
          </button>
        ))}
      </div>

      {activeTab === 'import' && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-2">Import from CSV</h2>
          <p className="text-gray-500 text-sm mb-4">
            Upload a CSV file with columns: <code className="bg-gray-100 px-1">slug</code>, <code className="bg-gray-100 px-1">destination_url</code> (required), plus optional title, campaign, channel, expires_at, notes.
          </p>

          <div className="space-y-4">
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
            />

            <button
              onClick={handleImport}
              disabled={importing}
              className="bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800 disabled:opacity-50"
            >
              {importing ? 'Importing...' : 'Import CSV'}
            </button>

            {importError && (
              <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm">{importError}</div>
            )}

            {importResult && (
              <div className="bg-green-50 border border-green-200 rounded p-4">
                <p className="font-medium text-green-800">Import complete</p>
                <p className="text-sm text-green-700 mt-1">
                  {importResult.created} created, {importResult.errors} errors out of {importResult.total_rows} rows
                </p>
                {importResult.error_details?.length > 0 && (
                  <ul className="mt-2 text-sm text-red-600 list-disc list-inside">
                    {importResult.error_details.map((e: any, i: number) => (
                      <li key={i}>Row {e.row}: {e.error}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'export' && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-2">Export to CSV</h2>
          <p className="text-gray-500 text-sm mb-4">Export your links with optional filters.</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={exportFilters.status}
                onChange={(e) => setExportFilters({ ...exportFilters, status: e.target.value })}
                className="w-full rounded border-gray-300 text-sm"
              >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Channel</label>
              <input
                type="text"
                value={exportFilters.channel}
                onChange={(e) => setExportFilters({ ...exportFilters, channel: e.target.value })}
                placeholder="e.g., Instagram"
                className="w-full rounded border-gray-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Campaign</label>
              <input
                type="text"
                value={exportFilters.campaign}
                onChange={(e) => setExportFilters({ ...exportFilters, campaign: e.target.value })}
                placeholder="e.g., League 2026"
                className="w-full rounded border-gray-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sponsor</label>
              <input
                type="text"
                value={exportFilters.sponsor}
                onChange={(e) => setExportFilters({ ...exportFilters, sponsor: e.target.value })}
                placeholder="Sponsor name"
                className="w-full rounded border-gray-300 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800 disabled:opacity-50"
            >
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
