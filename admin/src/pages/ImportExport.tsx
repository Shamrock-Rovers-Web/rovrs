import React, { useState } from 'react'
import CSVUploader from '../components/CSVUploader'
import { ImportProgress } from '../components/ImportProgress'
import { ExportFilters } from '../components/ExportFilters'

export default function ImportExport() {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import')

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Import / Export</h1>
        <p className="text-gray-500">Manage bulk operations for your links</p>
      </div>

      {/* Tab buttons */}
      <div className="flex border-b mb-6">
        <button
          onClick={() => setActiveTab('import')}
          className={`px-4 py-2 font-medium border-b-2 -mb-px ${
            activeTab === 'import'
              ? 'border-green-700 text-green-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Import Links
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`px-4 py-2 font-medium border-b-2 -mb-px ${
            activeTab === 'export'
              ? 'border-green-700 text-green-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Export Links
        </button>
      </div>

      {activeTab === 'import' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-2">Import from CSV</h2>
            <p className="text-gray-500 text-sm mb-4">
              Upload a CSV file to create multiple links at once.
            </p>
            <CSVUploader
              onUpload={(file, progress) => console.log('Upload progress:', progress)}
              onError={(error) => console.error('Upload error:', error)}
              requiredHeaders={['slug', 'destination_url']}
            />
          </div>
        </div>
      )}

      {activeTab === 'export' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-2">Export to CSV</h2>
            <p className="text-gray-500 text-sm mb-4">
              Export your links to a CSV file with optional filters.
            </p>
            <ExportFilters
              onApply={(filters) => console.log('Filters applied:', filters)}
              onReset={() => console.log('Filters reset')}
            />
            <div className="mt-6 flex justify-end">
              <button className="bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800">
                Export CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
