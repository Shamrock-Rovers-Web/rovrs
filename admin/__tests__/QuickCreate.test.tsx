import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import QuickCreate from '../src/pages/QuickCreate';

// Mock the clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
  },
});

// Mock generateSlug to return consistent values for testing
jest.mock('@rovrs/shared', () => ({
  ...jest.requireActual('@rovrs/shared'),
  generateSlug: () => 'abc123',
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('QuickCreate Component', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });

  it('renders correctly with empty form', () => {
    renderWithRouter(<QuickCreate />);

    expect(screen.getByLabelText(/Destination URL/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Link/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  });

  it('shows validation error for empty URL', async () => {
    renderWithRouter(<QuickCreate />);

    const submitButton = screen.getByRole('button', { name: /Create Link/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Destination URL is required/i)).toBeInTheDocument();
    });
  });

  it('shows validation error for invalid URL', async () => {
    renderWithRouter(<QuickCreate />);

    const urlInput = screen.getByLabelText(/Destination URL/i);
    fireEvent.change(urlInput, { target: { value: 'not-a-valid-url' } });

    const submitButton = screen.getByRole('button', { name: /Create Link/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Please enter a valid URL/i)).toBeInTheDocument();
    });
  });

  it('creates link successfully with auto-generated slug', async () => {
    // Mock fetch API
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ slug: 'abc123' }),
      } as Response)
    );

    renderWithRouter(<QuickCreate />);

    const urlInput = screen.getByLabelText(/Destination URL/i);
    fireEvent.change(urlInput, { target: { value: 'https://example.com' } });

    const submitButton = screen.getByRole('button', { name: /Create Link/i });
    fireEvent.click(submitButton);

    // Wait for success state
    await waitFor(() => {
      expect(screen.getByText(/Link Created Successfully!/i)).toBeInTheDocument();
      expect(screen.getByText(/Short URL/i)).toBeInTheDocument();
    });

    // Verify the short URL is displayed
    const shortUrlInput = screen.getByDisplayValue(/http:\/\/localhost:8787\/abc123/i);
    expect(shortUrlInput).toBeInTheDocument();

    // Verify fetch was called with correct data
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8787/api/links',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: 'abc123',
          destination_url: 'https://example.com',
        }),
      })
    );
  });

  it('copies URL to clipboard when copy button is clicked', async () => {
    // Mock fetch API
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ slug: 'abc123' }),
      } as Response)
    );

    renderWithRouter(<QuickCreate />);

    // Fill form and submit
    const urlInput = screen.getByLabelText(/Destination URL/i);
    fireEvent.change(urlInput, { target: { value: 'https://example.com' } });

    const submitButton = screen.getByRole('button', { name: /Create Link/i });
    fireEvent.click(submitButton);

    // Wait for success state
    await waitFor(() => {
      expect(screen.getByText(/Link Created Successfully!/i)).toBeInTheDocument();
    });

    // Click copy button
    const copyButton = screen.getByRole('button', { name: /Copy/i });
    fireEvent.click(copyButton);

    // Verify clipboard was written to
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'http://localhost:8787/abc123'
    );
  });

  it('navigates to CreateLink page when Edit Details is clicked', async () => {
    // Mock fetch API
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ slug: 'abc123' }),
      } as Response)
    );

    // Mock window.location.href to check navigation
    delete (window as any).location;
    const mockLocation = { href: '' };
    window.location = mockLocation as any;

    renderWithRouter(<QuickCreate />);

    // Fill form and submit
    const urlInput = screen.getByLabelText(/Destination URL/i);
    fireEvent.change(urlInput, { target: { value: 'https://example.com' } });

    const submitButton = screen.getByRole('button', { name: /Create Link/i });
    fireEvent.click(submitButton);

    // Wait for success state
    await waitFor(() => {
      expect(screen.getByText(/Link Created Successfully!/i)).toBeInTheDocument();
    });

    // Click Edit Details button
    const editButton = screen.getByRole('button', { name: /Edit Details/i });
    fireEvent.click(editButton);

    // Verify navigation happened (checking location.href was set)
    expect(mockLocation.href).toContain('/create?slug=abc123&destination_url=https%3A%2F%2Fexample.com');
  });

  it('handles network errors gracefully', async () => {
    // Mock fetch API to return error
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ message: 'Network error' }),
      } as Response)
    );

    renderWithRouter(<QuickCreate />);

    const urlInput = screen.getByLabelText(/Destination URL/i);
    fireEvent.change(urlInput, { target: { value: 'https://example.com' } });

    const submitButton = screen.getByRole('button', { name: /Create Link/i });
    fireEvent.click(submitButton);

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/Network error. Please try again./i)).toBeInTheDocument();
    });
  });

  it('allows creating another link after successful creation', async () => {
    // Mock fetch API
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ slug: 'abc123' }),
      } as Response)
    );

    renderWithRouter(<QuickCreate />);

    // Fill form and submit
    const urlInput = screen.getByLabelText(/Destination URL/i);
    fireEvent.change(urlInput, { target: { value: 'https://example.com' } });

    const submitButton = screen.getByRole('button', { name: /Create Link/i });
    fireEvent.click(submitButton);

    // Wait for success state
    await waitFor(() => {
      expect(screen.getByText(/Link Created Successfully!/i)).toBeInTheDocument();
    });

    // Click "Create Another Link" button
    const createAnotherButton = screen.getByRole('button', { name: /Create Another Link/i });
    fireEvent.click(createAnotherButton);

    // Verify form is reset and back to initial state
    expect(screen.getByLabelText(/Destination URL/i)).toHaveValue('');
    expect(screen.getByText(/Quick Create Short Link/i)).toBeInTheDocument();
  });
});