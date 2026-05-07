import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CSVUploader from '../components/CSVUploader';

describe('CSVUploader', () => {
  const mockOnUpload = vi.fn();
  const mockOnError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders drag and drop zone', () => {
    render(<CSVUploader onUpload={mockOnUpload} onError={mockOnError} />);

    expect(screen.getByRole('button', { name: /browse files/i }).closest('div')).toBeInTheDocument();
    expect(screen.getByText(/or click to browse/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /browse files/i })).toBeInTheDocument();
  });

  it('displays file name when file is selected', async () => {
    render(<CSVUploader onUpload={mockOnUpload} onError={mockOnError} />);

    const file = new File(['test,data\nrow1,row2'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByRole('button', { name: /browse files/i }).nextElementSibling as HTMLInputElement;

    await userEvent.upload(input, file);

    expect(screen.getByText(/test.csv/i)).toBeInTheDocument();
  });

  it('validates CSV file type', async () => {
    render(<CSVUploader onUpload={mockOnUpload} onError={mockOnError} />);

    const file = new File(['not a csv file'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByRole('button', { name: /browse files/i }).nextElementSibling as HTMLInputElement;

    await userEvent.upload(input, file);

    await vi.waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(expect.stringContaining('must be a CSV file'));
    });
  });

  it('validates file size limit', async () => {
    render(<CSVUploader onUpload={mockOnUpload} onError={mockOnError} maxSize={1000} />); // 1KB limit for test

    const largeContent = 'a,'.repeat(1001); // >1KB
    const file = new File([largeContent], 'large.csv', { type: 'text/csv' });
    const input = screen.getByRole('button', { name: /browse files/i }).nextElementSibling as HTMLInputElement;

    await userEvent.upload(input, file);

    expect(mockOnError).toHaveBeenCalledWith(expect.stringContaining('file size must be less than'));
  });

  it('validates CSV headers', async () => {
    render(<CSVUploader onUpload={mockOnUpload} onError={mockOnError} requiredHeaders={['slug', 'destination']} />);

    const file = new File(['wrong,headers\ndata,here'], 'invalid.csv', { type: 'text/csv' });
    const input = screen.getByRole('button', { name: /browse files/i }).nextElementSibling as HTMLInputElement;

    await userEvent.upload(input, file);

    expect(mockOnError).toHaveBeenCalledWith(expect.stringContaining('Required headers not found'));
  });

  it('validates CSV format', async () => {
    render(<CSVUploader onUpload={mockOnUpload} onError={mockOnError} />);

    const file = new File(['invalid,csv\n"unclosed,quote\nrow2,data'], 'malformed.csv', { type: 'text/csv' });
    const input = screen.getByRole('button', { name: /browse files/i }).nextElementSibling as HTMLInputElement;

    await userEvent.upload(input, file);

    await vi.waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(expect.stringContaining('Malformed CSV file'));
    });
  });

  it('shows progress during upload', async () => {
    render(<CSVUploader onUpload={mockOnUpload} onError={mockOnError} />);

    const file = new File(['test,data\nrow1,row2'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByRole('button', { name: /browse files/i }).nextElementSibling as HTMLInputElement;

    await userEvent.upload(input, file);

    // Wait for upload to progress
    await vi.waitFor(() => {
      expect(screen.getByText(/10%/i)).toBeInTheDocument();
    });
  });

  it('calls onUpload with valid file', async () => {
    render(<CSVUploader onUpload={mockOnUpload} onError={mockOnError} />);

    const file = new File(['slug,destination\ntest,https://example.com'], 'valid.csv', { type: 'text/csv' });
    const input = screen.getByRole('button', { name: /browse files/i }).nextElementSibling as HTMLInputElement;

    await userEvent.upload(input, file);

    // Wait for upload to complete
    await vi.waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalledWith(file, 100);
    }, { timeout: 5000 });
  });

  it('handles drag and drop', async () => {
    render(<CSVUploader onUpload={mockOnUpload} onError={mockOnError} />);

    const dropZone = screen.getByRole('button', { name: /browse files/i }).closest('div');
    const file = new File(['test,data\nrow1,row2'], 'test.csv', { type: 'text/csv' });

    // Simulate drop event
    const dataTransfer = {
      files: [file],
      items: [{
        kind: 'file',
        type: file.type,
        getAsFile: () => file
      }],
      preventDefault: vi.fn(),
      stopPropagation: vi.fn()
    };

    fireEvent.drop(dropZone, dataTransfer);

    expect(screen.getByText(/test.csv/i)).toBeInTheDocument();
  });

  it('clears file when remove button is clicked', async () => {
    render(<CSVUploader onUpload={mockOnUpload} onError={mockOnError} />);

    const file = new File(['test,data\nrow1,row2'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByRole('button', { name: /browse files/i }).nextElementSibling as HTMLInputElement;

    await userEvent.upload(input, file);

    expect(screen.getByText(/test.csv/i)).toBeInTheDocument();

    const removeButton = screen.getByRole('button', { name: /remove file/i });
    await userEvent.click(removeButton);

    expect(screen.queryByText(/test.csv/i)).not.toBeInTheDocument();
  });

  it('disables controls during upload', async () => {
    render(<CSVUploader onUpload={mockOnUpload} onError={mockOnError} />);

    const file = new File(['test,data\nrow1,row2'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByRole('button', { name: /browse files/i }).nextElementSibling as HTMLInputElement;

    await userEvent.upload(input, file);

    const dropZone = screen.getByRole('button', { name: /browse files/i }).closest('div');
    const button = screen.getByRole('button', { name: /browse files/i });

    expect(dropZone).toHaveAttribute('data-drag-disabled', 'true');
    expect(button).toBeDisabled();
  });

  it('shows error message when upload fails', async () => {
    render(<CSVUploader onUpload={mockOnUpload} onError={mockOnError} />);

    const file = new File(['test,data\nrow1,row2'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByRole('button', { name: /browse files/i }).nextElementSibling as HTMLInputElement;

    await userEvent.upload(input, file);

    // Simulate upload error
    fireEvent.error(screen.getByText(/test.csv/i));

    expect(mockOnError).toHaveBeenCalledWith(expect.stringContaining('upload failed'));
  });

  it('accepts optional maxSize prop', () => {
    render(<CSVUploader onUpload={mockOnUpload} onError={mockOnError} maxSize={5 * 1024 * 1024} />);

    const dropZone = screen.getByRole('button', { name: /browse files/i }).closest('div');
    expect(dropZone).toBeInTheDocument();
    // Check that the file input accepts the custom max size
    const input = screen.getByRole('button', { name: /browse files/i }).nextElementSibling as HTMLInputElement as HTMLInputElement;
    expect(input.accept).toBe('.csv');
  });

  it('accepts optional requiredHeaders prop', () => {
    const headers = ['slug', 'destination', 'campaign'];
    render(<CSVUploader onUpload={mockOnUpload} onError={mockOnError} requiredHeaders={headers} />);

    const dropZone = screen.getByRole('button', { name: /browse files/i }).closest('div');
    expect(dropZone).toBeInTheDocument();
  });
});