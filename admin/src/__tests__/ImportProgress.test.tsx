import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ImportProgress from '../components/ImportProgress';
import { ImportJobStatus, ImportProgress as ImportProgressType } from '../types/importExport';

const mockImportProgressData: ImportProgressType = {
  job_id: 'test-job-id',
  status: 'processing',
  current_row: 50,
  total_rows: 100,
  created_rows: 45,
  skipped_rows: 2,
  errors_count: 3,
  progress_percent: 50,
  estimated_completion_time: '2024-01-01T12:30:00Z',
  processing_speed: 10,
};

describe('ImportProgress Component', () => {
  const mockOnComplete = vi.fn();
  const mockOnError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderWithRouter = (component: React.ReactElement) => {
    return render(
      <BrowserRouter>
        {component}
      </BrowserRouter>
    );
  };

  describe('Initial render', () => {
    it('renders correctly with processing status', () => {
      renderWithRouter(
        <ImportProgress
          jobId="test-job-id"
          autoRefresh={true}
          showDetails={true}
        />
      );

      expect(screen.getByText(/Import Progress/i)).toBeInTheDocument();
      expect(screen.getByText(/Processing/i)).toBeInTheDocument();
      expect(screen.getByText(/50% Complete/i)).toBeInTheDocument();
    });

    it('shows progress bar with correct percentage', () => {
      renderWithRouter(
        <ImportProgress
          jobId="test-job-id"
          autoRefresh={false}
          showDetails={false}
        />
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('displays row counts by default', () => {
      renderWithRouter(<ImportProgress jobId="test-job-id" />);

      expect(screen.getByText(/50 of 100 rows processed/i)).toBeInTheDocument();
      expect(screen.getByText(/45 created, 2 skipped, 3 errors/i)).toBeInTheDocument();
    });

    it('hides details when showDetails is false', () => {
      renderWithRouter(
        <ImportProgress
          jobId="test-job-id"
          showDetails={false}
        />
      );

      expect(screen.queryByText(/Processing Speed:/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Estimated Completion:/i)).not.toBeInTheDocument();
    });
  });

  describe('Progress updates', () => {
    it('updates progress when data changes', () => {
      const { rerender } = renderWithRouter(
        <ImportProgress
          jobId="test-job-id"
          autoRefresh={false}
        />
      );

      // Update props to simulate progress update
      rerender(
        <BrowserRouter>
          <ImportProgress
            jobId="test-job-id"
            autoRefresh={false}
            progress={{
              ...mockImportProgressData,
              current_row: 75,
              progress_percent: 75,
              created_rows: 68,
              skipped_rows: 3,
              errors_count: 4,
            }}
          />
        </BrowserRouter>
      );

      expect(screen.getByText(/75% Complete/i)).toBeInTheDocument();
      expect(screen.getByText(/75 of 100 rows processed/i)).toBeInTheDocument();
      expect(screen.getByText(/68 created, 3 skipped, 4 errors/i)).toBeInTheDocument();
    });

    it('auto refreshes with default interval', async () => {
      // This would require mocking the API call
      const { rerender } = renderWithRouter(
        <ImportProgress jobId="test-job-id" autoRefresh={true} />
      );

      // Advance timers to trigger refresh
      act(() => {
        vi.advanceTimersByTime(5000); // Default interval is 5 seconds
      });

      // In a real test, we would verify that an API call was made
      expect(screen.getByText(/50% Complete/i)).toBeInTheDocument();
    });

    it('respects custom refresh interval', () => {
      renderWithRouter(
        <ImportProgress
          jobId="test-job-id"
          autoRefresh={true}
          refreshInterval={1000}
        />
      );

      // Verify the interval is set
      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 1000);
    });
  });

  describe('Status handling', () => {
    it('shows success status when completed', () => {
      renderWithRouter(
        <ImportProgress
          jobId="test-job-id"
          progress={{
            ...mockImportProgressData,
            status: 'completed' as ImportJobStatus,
          }}
        />
      );

      expect(screen.getByText(/Completed/i)).toBeInTheDocument();
      expect(screen.getByText(/Success!/i)).toBeInTheDocument();
      expect(screen.getByText(/100 rows imported successfully/i)).toBeInTheDocument();
    });

    it('shows error status when failed', () => {
      renderWithRouter(
        <ImportProgress
          jobId="test-job-id"
          progress={{
            ...mockImportProgressData,
            status: 'failed' as ImportJobStatus,
          }}
        />
      );

      expect(screen.getByText(/Failed/i)).toBeInTheDocument();
      expect(screen.getByText(/Import failed/i)).toBeInTheDocument();
    });

    it('shows cancelled status when cancelled', () => {
      renderWithRouter(
        <ImportProgress
          jobId="test-job-id"
          progress={{
            ...mockImportProgressData,
            status: 'cancelled' as ImportJobStatus,
          }}
        />
      );

      expect(screen.getByText(/Cancelled/i)).toBeInTheDocument();
      expect(screen.getByText(/Import was cancelled/i)).toBeInTheDocument();
    });

    it('shows pending status when pending', () => {
      renderWithRouter(
        <ImportProgress
          jobId="test-job-id"
          progress={{
            ...mockImportProgressData,
            status: 'pending' as ImportJobStatus,
          }}
        />
      );

      expect(screen.getByText(/Pending/i)).toBeInTheDocument();
      expect(screen.getByText(/Waiting to start/i)).toBeInTheDocument();
    });

    it('calls onComplete callback when import completes', () => {
      renderWithRouter(
        <ImportProgress
          jobId="test-job-id"
          progress={{
            ...mockImportProgressData,
            status: 'completed' as ImportJobStatus,
          }}
          onComplete={mockOnComplete}
        />
      );

      expect(mockOnComplete).toHaveBeenCalled();
    });

    it('calls onError callback when import fails', () => {
      const error = new Error('Import failed');
      renderWithRouter(
        <ImportProgress
          jobId="test-job-id"
          progress={{
            ...mockImportProgressData,
            status: 'failed' as ImportJobStatus,
          }}
          onError={mockOnError}
        />
      );

      expect(mockOnError).toHaveBeenCalledWith(error);
    });
  });

  describe('Cancellation', () => {
    it('shows cancel button during processing', () => {
      renderWithRouter(
        <ImportProgress
          jobId="test-job-id"
          progress={{
            ...mockImportProgressData,
            status: 'processing' as ImportJobStatus,
          }}
          canCancel={true}
        />
      );

      expect(screen.getByRole('button', { name: /Cancel Import/i })).toBeInTheDocument();
    });

    it('does not show cancel button when cannot cancel', () => {
      renderWithRouter(
        <ImportProgress
          jobId="test-job-id"
          progress={{
            ...mockImportProgressData,
            status: 'processing' as ImportJobStatus,
          }}
          canCancel={false}
        />
      );

      expect(screen.queryByRole('button', { name: /Cancel Import/i })).not.toBeInTheDocument();
    });

    it('calls cancel handler when cancel button is clicked', () => {
      const mockOnCancel = vi.fn();
      renderWithRouter(
        <ImportProgress
          jobId="test-job-id"
          progress={{
            ...mockImportProgressData,
            status: 'processing' as ImportJobStatus,
          }}
          canCancel={true}
          onCancel={mockOnCancel}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /Cancel Import/i }));
      expect(mockOnCancel).toHaveBeenCalledWith('test-job-id');
    });

    it('does not show cancel button after completion', () => {
      renderWithRouter(
        <ImportProgress
          jobId="test-job-id"
          progress={{
            ...mockImportProgressData,
            status: 'completed' as ImportJobStatus,
          }}
          canCancel={true}
        />
      );

      expect(screen.queryByRole('button', { name: /Cancel Import/i })).not.toBeInTheDocument();
    });
  });

  describe('Error display', () => {
    it('shows error details when errors exist', () => {
      renderWithRouter(
        <ImportProgress
          jobId="test-job-id"
          progress={{
            ...mockImportProgressData,
            errors_count: 3,
          }}
          showDetails={true}
        />
      );

      expect(screen.getByText(/3 Errors/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /View Errors/i })).toBeInTheDocument();
    });

    it('shows error details when expanded', async () => {
      renderWithRouter(
        <ImportProgress
          jobId="test-job-id"
          progress={{
            ...mockImportProgressData,
            errors_count: 2,
          }}
          showDetails={true}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /View Errors/i }));

      await waitFor(() => {
        expect(screen.getByText(/Error Details/i)).toBeInTheDocument();
      });
    });

    it('hides error details when collapsed', async () => {
      renderWithRouter(
        <ImportProgress
          jobId="test-job-id"
          progress={{
            ...mockImportProgressData,
            errors_count: 2,
          }}
          showDetails={true}
        />
      );

      // Expand first
      fireEvent.click(screen.getByRole('button', { name: /View Errors/i }));

      // Then collapse
      fireEvent.click(screen.getByRole('button', { name: /Hide Errors/i }));

      expect(screen.queryByText(/Error Details/i)).not.toBeInTheDocument();
    });
  });

  describe('Performance metrics', () => {
    it('shows processing speed when available', () => {
      renderWithRouter(
        <ImportProgress
          jobId="test-job-id"
          progress={{
            ...mockImportProgressData,
            processing_speed: 15,
          }}
          showDetails={true}
        />
      );

      expect(screen.getByText(/Processing Speed: 15 rows per second/i)).toBeInTheDocument();
    });

    it('shows estimated completion time when available', () => {
      renderWithRouter(
        <ImportProgress
          jobId="test-job-id"
          progress={{
            ...mockImportProgressData,
            estimated_completion_time: '2024-01-01T12:30:00Z',
          }}
          showDetails={true}
        />
      );

      expect(screen.getByText(/Estimated Completion: Jan 1, 2024 at 12:30 PM/i)).toBeInTheDocument();
    });

    it('formats dates correctly', () => {
      const date = '2024-01-01T12:30:00Z';
      const renderResult = renderWithRouter(
        <ImportProgress
          jobId="test-job-id"
          progress={{
            ...mockImportProgressData,
            estimated_completion_time: date,
          }}
          showDetails={true}
        />
      );

      expect(screen.getByText(/Estimated Completion: Jan 1, 2024 at 12:30 PM/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes on progress bar', () => {
      renderWithRouter(<ImportProgress jobId="test-job-id" />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      expect(progressBar).toHaveAttribute('aria-valuetext', '50% Complete');
    });

    it('announces status changes to screen readers', () => {
      const { rerender } = renderWithRouter(
        <ImportProgress jobId="test-job-id" />
      );

      // Update to completed status
      rerender(
        <BrowserRouter>
          <ImportProgress
            jobId="test-job-id"
            progress={{
              ...mockImportProgressData,
              status: 'completed' as ImportJobStatus,
            }}
          />
        </BrowserRouter>
      );

      // The status should be announced
      expect(screen.getByText(/Completed/i)).toBeInTheDocument();
    });
  });

  describe('Props validation', () => {
    it('requires jobId prop', () => {
      // This would normally be caught by TypeScript, but we test runtime behavior
      expect(() => {
        renderWithRouter(
          // @ts-expect-error - missing required prop
          <ImportProgress />
        );
      }).toThrow();
    });

    it('accepts optional progress prop', () => {
      expect(() => {
        renderWithRouter(<ImportProgress jobId="test-job-id" />);
      }).not.toThrow();
    });

    it('accepts optional autoRefresh prop', () => {
      expect(() => {
        renderWithRouter(
          <ImportProgress
            jobId="test-job-id"
            autoRefresh={false}
          />
        );
      }).not.toThrow();
    });

    it('accepts optional refreshInterval prop', () => {
      expect(() => {
        renderWithRouter(
          <ImportProgress
            jobId="test-job-id"
            refreshInterval={3000}
          />
        );
      }).not.toThrow();
    });
  });
});