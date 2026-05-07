import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, RouterProvider, createMemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import CreateLink from './CreateLink';

const CHANNELS = ['Tickets', 'Instagram', 'Facebook', 'X/Twitter', 'TikTok', 'LinkedIn', 'QR code', 'Email', 'Sponsor', 'Matchday', 'Other'];

// Mock the validateSlug and validateDestinationURL functions
vi.mock('@rovrs/shared', () => ({
  validateSlug: vi.fn(),
  validateDestinationURL: vi.fn(),
  validateLinkInput: vi.fn(),
}));

const mockValidateSlug = vi.mocked(require('@rovrs/shared').validateSlug);
const mockValidateDestinationURL = vi.mocked(require('@rovrs/shared').validateDestinationURL);
const mockValidateLinkInput = vi.mocked(require('@rovrs/shared').validateLinkInput);

describe('CreateLink', () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateSlug.mockReturnValue(null);
    mockValidateDestinationURL.mockReturnValue(null);
    mockValidateLinkInput.mockReturnValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderWithRouter = (component: React.ReactElement, route = '/') => {
    const router = createMemoryRouter([{ path: route, element: component }], {
      initialEntries: [route],
      initialIndex: 0,
    });
    return render(<RouterProvider router={router} />);
  };

  test('renders form with all fields', () => {
    renderWithRouter(<CreateLink />);

    expect(screen.getByLabelText(/Slug/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Destination URL/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Channel/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Campaign/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Owner/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Sponsor/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Opponent/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Competition/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Match Date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Home\/Away/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Expires At/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Notes/i)).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /Create Link/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  });

  test('validates slug in real-time', () => {
    renderWithRouter(<CreateLink />);

    const slugInput = screen.getByLabelText(/Slug/i);

    // Invalid slug
    fireEvent.change(slugInput, 'invalid slug with spaces');
    expect(mockValidateSlug).toHaveBeenCalledWith('invalid slug with spaces');

    // Valid slug
    fireEvent.change(slugInput, 'valid-slug');
    expect(mockValidateSlug).toHaveBeenCalledWith('valid-slug');
  });

  test('validates destination URL in real-time', () => {
    renderWithRouter(<CreateLink />);

    const urlInput = screen.getByLabelText(/Destination URL/i);

    // Invalid URL
    fireEvent.change(urlInput, 'not-a-url');
    expect(mockValidateDestinationURL).toHaveBeenCalledWith('not-a-url');

    // Valid URL
    fireEvent.change(urlInput, 'https://example.com');
    expect(mockValidateDestinationURL).toHaveBeenCalledWith('https://example.com');
  });

  test('shows slug validation error', () => {
    mockValidateSlug.mockReturnValue({ field: 'slug', message: 'Invalid slug format' });

    renderWithRouter(<CreateLink />);

    const slugInput = screen.getByLabelText(/Slug/i);
    fireEvent.change(slugInput, 'invalid-slug');

    expect(screen.getByText(/Invalid slug format/i)).toBeInTheDocument();
  });

  test('shows URL validation error', () => {
    mockValidateDestinationURL.mockReturnValue({ field: 'destination_url', message: 'Invalid URL format' });

    renderWithRouter(<CreateLink />);

    const urlInput = screen.getByLabelText(/Destination URL/i);
    fireEvent.change(urlInput, 'invalid-url');

    expect(screen.getByText(/Invalid URL format/i)).toBeInTheDocument();
  });

  test('submits form with valid data', async () => {
    const mockFetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ slug: 'test-slug' })
      } as Response)
    );

    global.fetch = mockFetch;

    renderWithRouter(<CreateLink />);

    fireEvent.change(screen.getByLabelText(/Slug/i), 'test-slug');
    fireEvent.change(screen.getByLabelText(/Destination URL/i), 'https://example.com');

    fireEvent.click(screen.getByRole('button', { name: /Create Link/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/links'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('test-slug')
        })
      );
    });
  });

  test('handles form submission error', async () => {
    const mockFetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ message: 'Slug already exists' })
      } as Response)
    );

    global.fetch = mockFetch;

    renderWithRouter(<CreateLink />);

    fireEvent.change(screen.getByLabelText(/Slug/i), 'existing-slug');
    fireEvent.change(screen.getByLabelText(/Destination URL/i), 'https://example.com');

    fireEvent.click(screen.getByRole('button', { name: /Create Link/i }));

    await waitFor(() => {
      expect(screen.getByText(/Slug already exists/i)).toBeInTheDocument();
    });
  });

  test('handles network error', async () => {
    const mockFetch = jest.fn(() => Promise.reject(new Error('Network error')));

    global.fetch = mockFetch;

    renderWithRouter(<CreateLink />);

    fireEvent.change(screen.getByLabelText(/Slug/i), 'test-slug');
    fireEvent.change(screen.getByLabelText(/Destination URL/i), 'https://example.com');

    fireEvent.click(screen.getByRole('button', { name: /Create Link/i }));

    await waitFor(() => {
      expect(screen.getByText(/Network error. Please try again./i)).toBeInTheDocument();
    });
  });

  test('shows success state after creating link', async () => {
    const mockFetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ slug: 'test-slug' })
      } as Response)
    );

    global.fetch = mockFetch;

    renderWithRouter(<CreateLink />);

    fireEvent.change(screen.getByLabelText(/Slug/i), 'test-slug');
    fireEvent.change(screen.getByLabelText(/Destination URL/i), 'https://example.com');

    fireEvent.click(screen.getByRole('button', { name: /Create Link/i }));

    await waitFor(() => {
      expect(screen.getByText(/Link Created Successfully!/i)).toBeInTheDocument();
      expect(screen.getByText(/https:\/\/admin.rov.rs\/test-slug/i)).toBeInTheDocument();
    });
  });

  test('copy button works', async () => {
    const mockWriteText = vi.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    });

    const mockFetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ slug: 'test-slug' })
      } as Response)
    );

    global.fetch = mockFetch;

    renderWithRouter(<CreateLink />);

    fireEvent.change(screen.getByLabelText(/Slug/i), 'test-slug');
    fireEvent.change(screen.getByLabelText(/Destination URL/i), 'https://example.com');

    fireEvent.click(screen.getByRole('button', { name: /Create Link/i }));

    await waitFor(() => {
      const copyButton = screen.getByRole('button', { name: /Copy/i });
      fireEvent.click(copyButton);
      expect(mockWriteText).toHaveBeenCalledWith('https://admin.rov.rs/test-slug');
    });
  });

  test('validation errors prevent submission', () => {
    mockValidateLinkInput.mockReturnValue([
      { field: 'slug', message: 'Invalid slug' },
      { field: 'destination_url', message: 'Invalid URL' }
    ]);

    renderWithRouter(<CreateLink />);

    const submitButton = screen.getByRole('button', { name: /Create Link/i });
    expect(submitButton).toBeDisabled();
  });

  test('resets form when clicking "Create Another Link"', async () => {
    const mockFetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ slug: 'test-slug' })
      } as Response)
    );

    global.fetch = mockFetch;

    renderWithRouter(<CreateLink />);

    fireEvent.change(screen.getByLabelText(/Slug/i), 'test-slug');
    fireEvent.change(screen.getByLabelText(/Destination URL/i), 'https://example.com');

    fireEvent.click(screen.getByRole('button', { name: /Create Link/i }));

    await waitFor(() => {
      const createAnotherButton = screen.getByRole('button', { name: /Create Another Link/i });
      fireEvent.click(createAnotherButton);
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/Slug/i)).toHaveValue('');
      expect(screen.getByLabelText(/Destination URL/i)).toHaveValue('');
    });
  });

  test('navigation to links page on cancel', () => {
    renderWithRouter(<CreateLink />);

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    cancelButton.onclick = mockNavigate;

    fireEvent.click(cancelButton);
    expect(mockNavigate).toHaveBeenCalledWith('/links');
  });

  test('radio buttons for home/away work correctly', () => {
    renderWithRouter(<CreateLink />);

    const homeRadio = screen.getByLabelText(/Home/i);
    const awayRadio = screen.getByLabelText(/Away/i);

    expect(homeRadio).not.toBeChecked();
    expect(awayRadio).not.toBeChecked();

    fireEvent.click(homeRadio);
    expect(homeRadio).toBeChecked();

    fireEvent.click(awayRadio);
    expect(awayRadio).toBeChecked();
    expect(homeRadio).not.toBeChecked();
  });

  test('all optional fields can be filled', () => {
    renderWithRouter(<CreateLink />);

    fireEvent.change(screen.getByLabelText(/Title/i), 'Match Day Link');
    fireEvent.change(screen.getByLabelText(/Channel/i), 'Instagram');
    fireEvent.change(screen.getByLabelText(/Campaign/i), 'bohs');
    fireEvent.change(screen.getByLabelText(/Owner/i), 'John Doe');
    fireEvent.change(screen.getByLabelText(/Sponsor/i), 'ACME Corp');
    fireEvent.change(screen.getByLabelText(/Opponent/i), 'Bohemian FC');
    fireEvent.change(screen.getByLabelText(/Competition/i), 'Premier Division');
    fireEvent.change(screen.getByLabelText(/Match Date/i), '2024-05-15');
    fireEvent.change(screen.getByLabelText(/Notes/i), 'Important match');
    fireEvent.click(screen.getByLabelText(/Home/i));

    expect(screen.getByLabelText(/Title/i)).toHaveValue('Match Day Link');
    expect(screen.getByLabelText(/Channel/i)).toHaveValue('Instagram');
    expect(screen.getByLabelText(/Campaign/i)).toHaveValue('bohs');
    expect(screen.getByLabelText(/Owner/i)).toHaveValue('John Doe');
    expect(screen.getByLabelText(/Sponsor/i)).toHaveValue('ACME Corp');
    expect(screen.getByLabelText(/Opponent/i)).toHaveValue('Bohemian FC');
    expect(screen.getByLabelText(/Competition/i)).toHaveValue('Premier Division');
    expect(screen.getByLabelText(/Match Date/i)).toHaveValue('2024-05-15');
    expect(screen.getByLabelText(/Notes/i)).toHaveValue('Important match');
    expect(screen.getByLabelText(/Home/i)).toBeChecked();
  });
});