import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { ImportJobStatus, ImportProgress as ImportProgressType } from '../types/importExport';

interface ImportProgressProps {
  jobId: string;
  progress?: ImportProgressType;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onComplete?: () => void;
  onError?: (error: Error) => void;
  showDetails?: boolean;
  canCancel?: boolean;
  onCancel?: (jobId: string) => void;
}

const ImportProgress: React.FC<ImportProgressProps> = ({
  jobId,
  progress,
  autoRefresh = true,
  refreshInterval = 5000,
  onComplete,
  onError,
  showDetails = true,
  canCancel = false,
  onCancel,
}) => {
  const [currentProgress, setCurrentProgress] = useState<ImportProgressType | null>(
    progress || {
      job_id: jobId,
      status: 'pending',
      total_rows: 0,
      created_rows: 0,
      skipped_rows: 0,
      errors_count: 0,
      progress_percent: 0,
    }
  );
  const [isExpanded, setIsExpanded] = useState(showDetails);
  const [isLoading, setIsLoading] = useState(false);
  const [errorsVisible, setErrorsVisible] = useState(false);

  // Simulate API calls to fetch progress updates
  const fetchProgress = useCallback(async () => {
    if (!autoRefresh || currentProgress?.status === 'completed' || currentProgress?.status === 'failed' || currentProgress?.status === 'cancelled') {
      return;
    }

    setIsLoading(true);
    try {
      // In a real implementation, this would be an API call
      // const response = await fetch(`/api/import-progress/${jobId}`);
      // const data = await response.json();

      // For demo purposes, simulate progress updates
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Simulate progress advancement
      if (currentProgress && currentProgress.status === 'processing') {
        const newProgress = {
          ...currentProgress,
          current_row: (currentProgress.current_row || 0) + 10,
          progress_percent: Math.min(100, (currentProgress.current_row || 0) + 10),
          created_rows: currentProgress.created_rows + 8,
          skipped_rows: currentProgress.skipped_rows + 1,
          errors_count: currentProgress.errors_count + 1,
        };

        if (newProgress.progress_percent >= 100) {
          newProgress.status = 'completed';
          newProgress.completed_at = new Date().toISOString();
        }

        setCurrentProgress(newProgress);

        if (newProgress.status === 'completed' && onComplete) {
          onComplete();
        }
      }
    } catch (error) {
      if (onError) {
        onError(error as Error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [autoRefresh, jobId, currentProgress, onComplete, onError]);

  // Set up interval for auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchProgress();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchProgress]);

  // Handle manual refresh
  const handleRefresh = () => {
    fetchProgress();
  };

  // Handle cancel
  const handleCancel = () => {
    if (canCancel && onCancel) {
      onCancel(jobId);
    }
  };

  // Toggle error details
  const toggleErrors = () => {
    setErrorsVisible(!errorsVisible);
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get status display properties
  const getStatusDisplay = () => {
    const status = currentProgress?.status || 'pending';

    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          text: 'Pending',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
        };
      case 'processing':
        return {
          icon: RefreshCw,
          text: 'Processing',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
        };
      case 'completed':
        return {
          icon: CheckCircle,
          text: 'Completed',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
        };
      case 'failed':
        return {
          icon: XCircle,
          text: 'Failed',
          color: 'text-red-600',
          bgColor: 'bg-red-100',
        };
      case 'cancelled':
        return {
          icon: AlertTriangle,
          text: 'Cancelled',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
        };
      default:
        return {
          icon: Clock,
          text: 'Unknown',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
        };
    }
  };

  const statusDisplay = getStatusDisplay();
  const IconComponent = statusDisplay.icon;

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <h2 className="text-2xl font-bold text-gray-900">Import Progress</h2>
          {isLoading && (
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
              <span className="text-sm text-gray-600">Refreshing...</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {canCancel && currentProgress?.status === 'processing' && (
            <button
              onClick={handleCancel}
              className="flex items-center space-x-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors"
            >
              <XCircle className="w-4 h-4" />
              <span>Cancel Import</span>
            </button>
          )}
        </div>
      </div>

      {/* Status */}
      <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full ${statusDisplay.bgColor} ${statusDisplay.color} mb-6`}>
        <IconComponent className="w-5 h-5" />
        <span className="font-medium">{statusDisplay.text}</span>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            {currentProgress?.progress_percent || 0}% Complete
          </span>
          <span className="text-sm text-gray-500">
            {currentProgress?.current_row || 0} of {currentProgress?.total_rows || 0} rows processed
          </span>
        </div>
        <div
          className="w-full bg-gray-200 rounded-full h-3"
          role="progressbar"
          aria-valuenow={currentProgress?.progress_percent || 0}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={`${currentProgress?.progress_percent || 0}% Complete`}
        >
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${currentProgress?.progress_percent || 0}%` }}
          />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Created</p>
          <p className="text-2xl font-bold text-green-700">{currentProgress?.created_rows || 0}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Skipped</p>
          <p className="text-2xl font-bold text-yellow-700">{currentProgress?.skipped_rows || 0}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Errors</p>
          <p className="text-2xl font-bold text-red-700">{currentProgress?.errors_count || 0}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Total Rows</p>
          <p className="text-2xl font-bold text-blue-700">{currentProgress?.total_rows || 0}</p>
        </div>
      </div>

      {/* Error Summary */}
      {currentProgress?.errors_count && currentProgress.errors_count > 0 && (
        <div className="mb-6">
          <button
            onClick={toggleErrors}
            className="flex items-center space-x-2 w-full p-4 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
          >
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="font-medium text-red-800">
              {currentProgress.errors_count} Error{currentProgress.errors_count !== 1 ? 's' : ''}
            </span>
            {errorsVisible ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {errorsVisible && (
            <div className="mt-4 p-4 bg-red-100 rounded-lg">
              <h4 className="font-medium text-red-800 mb-3">Error Details</h4>
              <p className="text-sm text-red-700">
                Error details would be displayed here. In a real implementation, this would show:
              </p>
              <ul className="mt-2 text-sm text-red-700 space-y-1">
                <li>• Row numbers where errors occurred</li>
                <li>• Specific error messages for each row</li>
                <li>• Suggested fixes for common errors</li>
              </ul>
              <button className="mt-4 px-4 py-2 bg-red-200 hover:bg-red-300 text-red-800 rounded-md text-sm transition-colors">
                Download Error Report
              </button>
            </div>
          )}
        </div>
      )}

      {/* Detailed Information (Expandable) */}
      {showDetails && (
        <div className="border-t pt-6">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-2 w-full text-left"
          >
            <h3 className="text-lg font-semibold text-gray-900">
              {isExpanded ? 'Hide Details' : 'Show Details'}
            </h3>
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {isExpanded && (
            <div className="mt-4 space-y-4">
              {/* Processing Speed */}
              {currentProgress?.processing_speed && (
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Processing Speed</span>
                  <span className="font-medium text-gray-900">
                    {currentProgress.processing_speed} rows per second
                  </span>
                </div>
              )}

              {/* Estimated Completion */}
              {currentProgress?.estimated_completion_time && (
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Estimated Completion</span>
                  <span className="font-medium text-gray-900">
                    {formatDate(currentProgress.estimated_completion_time)}
                  </span>
                </div>
              )}

              {/* Job ID */}
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Job ID</span>
                <span className="font-mono text-sm text-gray-900">{jobId}</span>
              </div>

              {/* Created At */}
              {currentProgress?.created_at && (
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Started At</span>
                  <span className="font-medium text-gray-900">
                    {formatDate(currentProgress.created_at)}
                  </span>
                </div>
              )}

              {/* Completed At */}
              {currentProgress?.completed_at && (
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Completed At</span>
                  <span className="font-medium text-gray-900">
                    {formatDate(currentProgress.completed_at)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Completion Message */}
      {currentProgress?.status === 'completed' && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <h3 className="font-semibold text-green-900">Success!</h3>
              <p className="text-green-700">
                {currentProgress.created_rows} of {currentProgress.total_rows} rows imported successfully.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Failure Message */}
      {currentProgress?.status === 'failed' && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <XCircle className="w-6 h-6 text-red-600" />
            <div>
              <h3 className="font-semibold text-red-900">Import failed</h3>
              <p className="text-red-700">
                The import process encountered errors. Please check the error details above.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cancelled Message */}
      {currentProgress?.status === 'cancelled' && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-6 h-6 text-yellow-600" />
            <div>
              <h3 className="font-semibold text-yellow-900">Import was cancelled</h3>
              <p className="text-yellow-700">
                The import process was cancelled before completion.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportProgress;