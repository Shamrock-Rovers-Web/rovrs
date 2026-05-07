import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock qrcode.react before importing QRPage
vi.mock('qrcode.react', () => ({
  QRCodeCanvas: vi.fn((props) => {
    return React.createElement('canvas', {
      width: props.size,
      height: props.size,
      'data-testid': 'qrcode-canvas',
    });
  }),
}));

// Mock pdf-lib
vi.mock('pdf-lib', async () => {
  const actual = await vi.importActual('pdf-lib');
  return {
    PDFDocument: {
      create: vi.fn(() => Promise.resolve({
        addPage: vi.fn(() => ({
          drawText: vi.fn(),
          drawImage: vi.fn(),
        })),
        embedPng: vi.fn(() => ({
          width: 256,
          height: 256,
        })),
        save: vi.fn(() => new Uint8Array([1, 2, 3])),
      })),
      save: vi.fn(() => new Uint8Array([1, 2, 3])),
    },
  };
});

import QRPage from './QR';

// Mock fetch
global.fetch = vi.fn();

describe('QRPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch mock
    fetch.mockReset();
  });

  it('should render search input initially', () => {
    render(<QRPage />);

    expect(screen.getByPlaceholderText('Enter link slug to generate QR code')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
  });

  it('should show loading state when searching', async () => {
    fetch.mockImplementationOnce(() => new Promise(() => {})); // Never resolves

    render(<QRPage />);

    const input = screen.getByPlaceholderText('Enter link slug to generate QR code');
    const button = screen.getByRole('button', { name: 'Search' });

    fireEvent.change(input, { target: { value: 'test-slug' } });
    fireEvent.click(button);

    expect(screen.getByText('Searching...')).toBeInTheDocument();
  });

  it('should display error when link not found', async () => {
    fetch.mockImplementationOnce(() => Promise.resolve({
      ok: false,
      status: 404,
    }));

    render(<QRPage />);

    const input = screen.getByPlaceholderText('Enter link slug to generate QR code');
    const button = screen.getByRole('button', { name: 'Search' });

    fireEvent.change(input, { target: { value: 'not-found' } });
    fireEvent.click(button);

    await vi.waitFor(() => {
      expect(screen.getByText('Link not found')).toBeInTheDocument();
    });
  });

  it('should display link details when found', async () => {
    const mockLink = {
      slug: 'test-slug',
      destination_url: 'https://example.com',
      title: 'Test Link',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    fetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockLink),
    }));

    render(<QRPage />);

    const input = screen.getByPlaceholderText('Enter link slug to generate QR code');
    const button = screen.getByRole('button', { name: 'Search' });

    fireEvent.change(input, { target: { value: 'test-slug' } });
    fireEvent.click(button);

    await vi.waitFor(() => {
      expect(screen.getByText('Link Details')).toBeInTheDocument();
      expect(screen.getByText('Slug: test-slug')).toBeInTheDocument();
      expect(screen.getByText('Destination: https://example.com')).toBeInTheDocument();
      expect(screen.getByText('Title: Test Link')).toBeInTheDocument();
    });

    // Check that QR code is displayed
    expect(screen.getByTestId('qrcode-canvas')).toBeInTheDocument();
  });

  it('should show expiry warning for expiring link', async () => {
    const mockLink = {
      slug: 'test-slug',
      destination_url: 'https://example.com',
      title: 'Test Link',
      expires_at: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days from now
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    fetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockLink),
    }));

    render(<QRPage />);

    const input = screen.getByPlaceholderText('Enter link slug to generate QR code');
    const button = screen.getByRole('button', { name: 'Search' });

    fireEvent.change(input, { target: { value: 'test-slug' } });
    fireEvent.click(button);

    await vi.waitFor(() => {
      expect(screen.getByText('⚠️ Link Expiring Soon')).toBeInTheDocument();
    });
  });

  it('should allow QR size selection', async () => {
    const mockLink = {
      slug: 'test-slug',
      destination_url: 'https://example.com',
      title: 'Test Link',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    fetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockLink),
    }));

    render(<QRPage />);

    // Search for link
    const input = screen.getByPlaceholderText('Enter link slug to generate QR code');
    const button = screen.getByRole('button', { name: 'Search' });

    fireEvent.change(input, { target: { value: 'test-slug' } });
    fireEvent.click(button);

    await vi.waitFor(() => {
      expect(screen.getByText('Link Details')).toBeInTheDocument();
    });

    // Test size buttons
    const size256Button = screen.getByRole('button', { name: '256px' });
    const size512Button = screen.getByRole('button', { name: '512px' });

    fireEvent.click(size512Button);

    // QR code should still be present
    expect(screen.getByTestId('qrcode-canvas')).toBeInTheDocument();
  });
});