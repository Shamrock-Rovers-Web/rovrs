/**
 * Shared TypeScript interfaces for CSV Import/Export functionality
 * Provides type safety across components for the Shamrock Rovers link shortener
 */

// CSV Row Structure - matches the import API interface
export interface CSVRow {
  slug?: string;
  destination_url: string;
  title?: string;
  campaign?: string;
  channel?: string;
  expires_at?: string;
  match_info?: string;
  is_offsite?: string;
  show_preview?: string;
  is_stable_evergreen?: string;
  owner?: string;
  sponsor?: string;
  opponent?: string;
  competition?: string;
  match_date?: string;
  home_away?: string;
  notes?: string;
}

// Processed CSV Row with parsed values
export interface ProcessedCSVRow extends Omit<CSVRow, 'expires_at' | 'match_info' | 'is_offsite' | 'show_preview' | 'is_stable_evergreen'> {
  expires_at?: string; // ISO date string
  match_info?: {
    opponent?: string;
    competition?: string;
    match_date?: string;
    home_away?: string;
  };
  is_offsite?: boolean;
  show_preview?: boolean;
  is_stable_evergreen?: boolean;
  destination_domain?: string; // Parsed from destination_url
}

// Import Error Types
export interface ImportError {
  row: number;
  field: string;
  message: string;
  suggested_fix?: string;
}

// Import Job Status Types
export type ImportJobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

// Import Job Tracking
export interface ImportJob {
  id: number;
  job_id: string;
  status: ImportJobStatus;
  total_rows: number;
  created_rows: number;
  skipped_rows: number;
  errors: ImportError[];
  created_at: string;
  completed_at?: string;
  file_name?: string;
  file_size?: number;
}

// Import Progress Tracking
export interface ImportProgress {
  job_id: string;
  status: ImportJobStatus;
  current_row?: number;
  total_rows: number;
  created_rows: number;
  skipped_rows: number;
  errors_count: number;
  progress_percent: number;
  estimated_completion_time?: string;
  processing_speed?: number; // rows per second
}

// Export Filter Options
export interface ExportFilters {
  status?: 'active' | 'paused' | 'expired' | 'deleted';
  campaign?: string;
  channel?: string;
  date_range?: {
    start: string; // ISO date string
    end: string; // ISO date string
  };
  owner?: string;
  sponsor?: string;
  has_qr?: boolean;
  is_offsite_ticket?: boolean;
  is_stable_evergreen?: boolean;
  slug_search?: string;
  limit?: number;
  offset?: number;
}

// Export Data Structure
export interface ExportDataRow {
  id: string;
  slug: string;
  destination_url: string;
  destination_domain: string;
  title?: string;
  campaign?: string;
  channel?: string;
  owner?: string;
  sponsor?: string;
  opponent?: string;
  competition?: string;
  match_date?: string;
  home_away?: string;
  status: 'active' | 'paused' | 'expired' | 'deleted';
  redirect_code: number;
  is_qr: boolean;
  is_offsite_ticket: boolean;
  show_offsite_preview: boolean;
  created_at: string;
  updated_at?: string;
  expires_at?: string;
  notes?: string;
  created_by?: string;
  updated_by?: string;
  total_clicks?: number; // Include if loading analytics
  last_clicked_at?: string; // Include if loading analytics
}

// API Response Types
export interface ImportResponse {
  success: boolean;
  data?: {
    job_id: string;
    status: ImportJobStatus;
    total_rows: number;
    valid_rows: number;
    invalid_rows: number;
    errors?: ImportError[];
  };
  error?: string;
}

export interface ExportResponse {
  success: boolean;
  data?: {
    total_rows: number;
    exported_rows: number;
    file_url?: string;
    file_name?: string;
    file_size?: number;
  };
  error?: string;
}

export interface ImportJobsResponse {
  success: boolean;
  data?: ImportJob[];
  error?: string;
}

// Progress Callback Types
export type ProgressCallback = (progress: ImportProgress) => void;

export type ImportStartCallback = (jobId: string) => void;

export type ImportCompleteCallback = (result: ImportResponse) => void;

export type ImportErrorCallback = (error: Error) => void;

// CSV Upload Options
export interface CSVUploadOptions {
  file: File;
  validateOnly?: boolean;
  onProgress?: ProgressCallback;
  onStart?: ImportStartCallback;
  onComplete?: ImportCompleteCallback;
  onError?: ImportErrorCallback;
  autoStart?: boolean;
  chunkSize?: number; // For large file processing
}

// Export Options
export interface ExportOptions {
  format: 'csv' | 'json';
  filters: ExportFilters;
  includeAnalytics?: boolean;
  includeMetadata?: boolean;
  filename?: string;
  compression?: boolean;
}

// Component Props Types
export interface CSVUploaderProps {
  onUploadComplete?: (jobId: string) => void;
  onError?: (error: Error) => void;
  disabled?: boolean;
  acceptedFormats?: string[];
  maxSize?: number; // in bytes
  className?: string;
}

export interface ImportProgressProps {
  jobId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onComplete?: () => void;
  onError?: (error: Error) => void;
  showDetails?: boolean;
}

export interface ExportFiltersProps {
  onApply: (filters: ExportFilters) => void;
  onReset?: () => void;
  initialFilters?: ExportFilters;
  availableCampaigns?: string[];
  availableChannels?: string[];
  className?: string;
}

// UI State Types
export interface ImportExportState {
  activeTab: 'import' | 'export';
  importJobs: ImportJob[];
  isUploading: boolean;
  exportFilters: ExportFilters;
  isExporting: boolean;
  selectedJob?: ImportJob;
}

// Action Types
export type ImportExportAction =
  | { type: 'SET_ACTIVE_TAB'; payload: 'import' | 'export' }
  | { type: 'SET_IMPORT_JOBS'; payload: ImportJob[] }
  | { type: 'ADD_IMPORT_JOB'; payload: ImportJob }
  | { type: 'UPDATE_IMPORT_JOB'; payload: { jobId: string; updates: Partial<ImportJob> } }
  | { type: 'SET_UPLOADING'; payload: boolean }
  | { type: 'SET_EXPORT_FILTERS'; payload: ExportFilters }
  | { type: 'SET_EXPORTING'; payload: boolean }
  | { type: 'SELECT_JOB'; payload: ImportJob | undefined }
  | { type: 'RESET_STATE' };

// Validation Types
export interface ValidationResult {
  isValid: boolean;
  errors: ImportError[];
  warnings?: ImportError[];
  validRows: CSVRow[];
  totalRows: number;
  processingTime: number;
}

// CSV Validation Rules
export interface CSVValidationRules {
  requiredFields: string[];
  optionalFields: string[];
  fieldValidation: {
    [key: string]: {
      required?: boolean;
      type?: 'string' | 'number' | 'date' | 'boolean';
      enum?: string[];
      regex?: string;
      max_length?: number;
      min_length?: number;
    };
  };
  dateFormats: string[];
  booleanValues: string[];
}

// File Processing Types
export interface FileProcessingOptions {
  maxFileSize: number;
  allowedFormats: string[];
  maxRows: number;
  chunkSize: number;
  timeout: number;
}

// Error Handling Types
export interface ImportExportError extends Error {
  code?: 'INVALID_FILE' | 'INVALID_CSV' | 'VALIDATION_FAILED' | 'PROCESSING_ERROR' | 'NETWORK_ERROR';
  details?: any;
  jobId?: string;
}

// Analytics Types (for export)
export interface LinkAnalytics {
  slug: string;
  total_clicks: number;
  unique_clicks: number;
  last_clicked_at?: string;
  top_referrers?: Array<{ referrer: string; count: number }>;
  top_countries?: Array<{ country: string; count: number }>;
  utm_distribution?: {
    source: { [key: string]: number };
    medium: { [key: string]: number };
    campaign: { [key: string]: number };
  };
}

// Export with Analytics
export interface ExportDataRowWithAnalytics extends ExportDataRow {
  analytics?: LinkAnalytics;
}

// Constants
export const EXPORT_FORMATS = ['csv', 'json'] as const;
export const IMPORT_STATUSES = ['pending', 'processing', 'completed', 'failed', 'cancelled'] as const;
export const LINK_STATUSES = ['active', 'paused', 'expired', 'deleted'] as const;
export const VALID_CHANNELS = ['organic', 'social', 'email', 'sms', 'paid', 'referral'] as const;
export const VALID_DATE_FORMATS = [
  'YYYY-MM-DD',
  'MM/DD/YYYY',
  'DD-MM-YYYY',
  'YYYY-MM-DD HH:mm:ss',
  'MM/DD/YYYY HH:mm:ss',
  'DD-MM-YYYY HH:mm:ss'
] as const;

// Utility Types
export type FormatFileSize = (bytes: number) => string;
export type FormatDate = (date: string | Date, format?: string) => string;
export type FormatPercentage = (value: number, total: number) => string;

// CSV Header Mapping
export interface CSVHeaderMapping {
  csvHeader: string;
  field: keyof ProcessedCSVRow;
  required: boolean;
  transform?: (value: string) => any;
  validate?: (value: any) => boolean | string;
}

// Default CSV Headers
export const DEFAULT_CSV_HEADERS: CSVHeaderMapping[] = [
  { csvHeader: 'slug', field: 'slug', required: false },
  { csvHeader: 'destination_url', field: 'destination_url', required: true },
  { csvHeader: 'title', field: 'title', required: false },
  { csvHeader: 'campaign', field: 'campaign', required: false },
  { csvHeader: 'channel', field: 'channel', required: false },
  { csvHeader: 'expires_at', field: 'expires_at', required: false },
  { csvHeader: 'match_info', field: 'match_info', required: false },
  { csvHeader: 'is_offsite', field: 'is_offsite', required: false },
  { csvHeader: 'show_preview', field: 'show_preview', required: false },
  { csvHeader: 'is_stable_evergreen', field: 'is_stable_evergreen', required: false }
];