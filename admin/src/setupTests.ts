import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock window object
Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost:3000',
  },
  writable: true,
});

// Mock canvas
Object.defineProperty(global, 'HTMLCanvasElement', {
  value: class HTMLCanvasElement {
    constructor() {
      this.width = 0;
      this.height = 0;
      this.getContext = vi.fn(() => ({
        fillText: vi.fn(),
        fillRect: vi.fn(),
      }));
    }
    toDataURL() {
      return 'data:image/png;base64,test';
    }
  },
});

// Mock qrcode canvas element
vi.mock('qrcode.react', () => ({
  QRCodeCanvas: vi.fn((props) => {
    return React.createElement('canvas', {
      width: props.size,
      height: props.size,
      'data-testid': 'qrcode-canvas',
    });
  }),
}));

// Mock PDFDocument
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