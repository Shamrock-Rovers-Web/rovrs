import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { CSVUploader } from '../components/CSVUploader'
import { ImportProgress } from '../components/ImportProgress'
import { ExportFilters } from '../components/ExportFilters'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import type { ImportJob, ExportFilters as ExportFiltersType } from '../types/importExport'

export function ImportExport() {
  const [activeTab, setActiveTab] = useState('import')
  const [importJob, setImportJob] = useState<ImportJob | null>(null)
  const [exportFilters, setExportFilters] = useState<ExportFiltersType>({
    dateFrom: '',
    dateTo: '',
    statuses: [],
    campaign: '',
    channel: '',
    search: ''
  })

  const handleImportComplete = (job: ImportJob) => {
    setImportJob(job)
  }

  const handleExportFiltersChange = (filters: ExportFiltersType) => {
    setExportFilters(filters)
  }

  const handleExport = () => {
    // TODO: Implement actual export functionality
    console.log('Export with filters:', exportFilters)
    alert('Export functionality will be implemented in the next iteration')
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Import/Export</h1>
        <p className="text-muted-foreground">
          Manage bulk operations for your links through CSV import and export
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="import">Import Links</TabsTrigger>
          <TabsTrigger value="export">Export Links</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Import Links from CSV</CardTitle>
                <CardDescription>
                  Upload a CSV file to create multiple links at once. Your CSV should
                  contain columns for destination URL, campaign, channel, and any other metadata.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CSVUploader onImportComplete={handleImportComplete} />
              </CardContent>
            </Card>

            {importJob && (
              <Card>
                <CardHeader>
                  <CardTitle>Import Progress</CardTitle>
                  <CardDescription>
                    Track the progress of your CSV import operation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ImportProgress job={importJob} />
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="export" className="space-y-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Export Links to CSV</CardTitle>
                <CardDescription>
                  Export your links to a CSV file. You can filter the results using
                  the options below to include only specific links.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ExportFilters
                  filters={exportFilters}
                  onFiltersChange={handleExportFiltersChange}
                />
                <div className="mt-6 flex justify-end">
                  <Button onClick={handleExport}>
                    Export CSV
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}