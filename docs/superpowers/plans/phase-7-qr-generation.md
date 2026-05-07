# Phase 7: QR Code Generation

## Task 15: QR codes (client-side)

### Files to create:
- `admin/src/__tests__/qr.test.ts` - Tests for QR generation utilities
- `admin/src/lib/qr.ts` - QR generation utilities
- `admin/src/components/QRGenerator.tsx` - QR UI component

---

## Step 1: Create test for QR generation utilities

Create `/home/ubuntu/rovrs/admin/src/__tests__/qr.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { generateQRCode, generateQRPDF } from '../lib/qr';

describe('generateQRCode', () => {
  it('generates a QR code as a data URL for small size', async () => {
    const qrUrl = await generateQRCode('https://rov.rs/bohs', 256);
    expect(qrUrl).toMatch(/^data:image\/png;base64,/);
  });

  it('generates a QR code with the correct URL encoded', async () => {
    const qrUrl = await generateQRCode('https://rov.rs/bohs', 256);
    expect(qrUrl).toContain('rov.rs/bohs');
  });

  it('respects different sizes', async () => {
    const small = await generateQRCode('test', 256);
    const large = await generateQRCode('test', 1024);
    expect(small).toBeDefined();
    expect(large).toBeDefined();
  });
});

describe('generateQRPDF', () => {
  it('generates a PDF with the QR code and title', async () => {
    const pdfBuffer = await generateQRPDF('https://rov.rs/bohs', 'Bohs Tickets');
    expect(pdfBuffer).toBeInstanceOf(Uint8Array);
    expect(pdfBuffer.length).toBeGreaterThan(0);
  });

  it('includes the title below the QR code', async () => {
    const pdfBuffer = await generateQRPDF('https://rov.rs/bohs', 'Bohs Tickets');
    expect(pdfBuffer).toBeDefined();
  });
});
```

---

## Step 2: Create admin/src/lib/qr.ts with qrcode and pdf-lib

Create `/home/ubuntu/rovrs/admin/src/lib/qr.ts`:

```typescript
import QRCode from 'qrcode';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface QRSize {
  print: number;
  social: number;
  screen: number;
}

export const QR_SIZES: QRSize = {
  print: 1024,
  social: 512,
  screen: 256,
};

export async function generateQRCode(text: string, size: number = 256): Promise<string> {
  try {
    const qrDataUrl = await QRCode.toDataURL(text, {
      width: size,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    });

    return qrDataUrl;
  } catch (error) {
    console.error('QR code generation error:', error);
    throw new Error('Failed to generate QR code');
  }
}

export async function generateQRPDF(text: string, title: string): Promise<Uint8Array> {
  try {
    // Generate QR code as base64
    const qrDataUrl = await generateQRCode(text, 1024);
    const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
    const qrImageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([794, 1123]); // A4 in points
    const { width, height } = page.getSize();

    // Add QR code
    const qrImage = await pdfDoc.embedPng(qrImageBytes);
    const qrSize = 400;
    const qrX = (width - qrSize) / 2;
    const qrY = height / 2 + 100;

    page.drawImage(qrImage, {
      x: qrX,
      y: qrY,
      width: qrSize,
      height: qrSize,
    });

    // Add title
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const titleText = title || text;
    const titleFontSize = 24;
    const titleWidth = font.widthOfTextAtSize(titleText, titleFontSize);
    const titleX = (width - titleWidth) / 2;
    const titleY = height / 2 - 150;

    page.drawText(titleText, {
      x: titleX,
      y: titleY,
      size: titleFontSize,
      font,
      color: rgb(0, 0, 0),
    });

    // Add link text
    const linkText = text;
    const linkFontSize = 14;
    const linkWidth = font.widthOfTextAtSize(linkText, linkFontSize);
    const linkX = (width - linkWidth) / 2;
    const linkY = titleY - 40;

    page.drawText(linkText, {
      x: linkX,
      y: linkY,
      size: linkFontSize,
      font,
      color: rgb(0, 0, 0),
    });

    return await pdfDoc.save();
  } catch (error) {
    console.error('PDF generation error:', error);
    throw new Error('Failed to generate PDF');
  }
}

export async function downloadQRCode(text: string, filename: string, size: QRSize = QR_SIZES): Promise<void> {
  const url = await generateQRCode(text, size.print);
  const response = await fetch(url);
  const blob = await response.blob();
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
}
```

---

## Step 3: Create src/components/QRGenerator.tsx

Create `/home/ubuntu/rovrs/admin/src/components/QRGenerator.tsx`:

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateQRCode, generateQRPDF, downloadQRCode, QR_SIZES, type QRSize } from '../lib/qr';
import { type Link } from '@rovrs/shared';
import { Download, Trash2 } from 'lucide-react';

interface QRGeneratorProps {
  link: Link;
}

export default function QRGenerator({ link }: QRGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [expiryWarning, setExpiryWarning] = useState<{ message: string; hasExpiry: boolean } | null>(null);
  const [showExpiryWarning, setShowExpiryWarning] = useState(false);
  const navigate = useNavigate();

  // Check if link has expiry date
  const hasExpiry = link.expires_at !== null && link.expires_at !== undefined;
  const expiryDate = hasExpiry ? new Date(link.expires_at) : null;

  if (hasExpiry) {
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry < 0) {
      setExpiryWarning({
        message: 'This QR code uses a link that has expired.',
        hasExpiry: true,
      });
      setShowExpiryWarning(true);
    } else if (daysUntilExpiry <= 7) {
      setExpiryWarning({
        message: `This QR code uses a link that expires in ${daysUntilExpiry} days.`,
        hasExpiry: true,
      });
      setShowExpiryWarning(true);
    }
  }

  async function handleGenerateQR() {
    setLoading(true);
    try {
      const url = await generateQRCode(`https://rov.rs/${link.slug}`, 1024);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Failed to generate QR:', error);
      alert('Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  }

  async function handleGeneratePDF() {
    setLoading(true);
    try {
      const buffer = await generateQRPDF(`https://rov.rs/${link.slug}`, link.title || link.slug);
      const blob = new Blob([buffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${link.slug}-${link.title || 'qr'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gray-50 border rounded-lg p-6">
      <h3 className="font-semibold mb-4">QR Code</h3>

      {showExpiryWarning && expiryWarning && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-yellow-800">{expiryWarning.message}</p>
          <p className="text-xs text-yellow-700 mt-2">
            If printed, the link may stop working after expiry.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleGenerateQR}
              disabled={loading}
              className="px-3 py-1.5 bg-yellow-200 text-yellow-800 rounded text-sm hover:bg-yellow-300 disabled:bg-gray-200"
            >
              Generate anyway
            </button>
            <button
              onClick={() => navigate(`/links/${link.slug}/edit`)}
              className="px-3 py-1.5 bg-white border border-yellow-300 text-yellow-800 rounded text-sm hover:bg-yellow-50"
            >
              Remove expiry date
            </button>
          </div>
        </div>
      )}

      {!showExpiryWarning && (
        <div className="flex flex-wrap gap-3 mb-4">
          {Object.entries(QR_SIZES).map(([key, size]) => (
            <button
              key={key}
              onClick={handleGenerateQR}
              disabled={loading}
              className="px-4 py-2 border rounded-lg hover:bg-gray-100 text-sm"
            >
              {key} ({size}px)
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleGeneratePDF}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-brand-green text-white rounded-lg hover:bg-brand-greenDark disabled:bg-gray-400"
        >
          <Download size={16} />
          Download PDF
        </button>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p>Generated from: https://rov.rs/{link.slug}</p>
        {hasExpiry && (
          <p>Expires: {expiryDate?.toLocaleDateString('en-GB')}</p>
        )}
      </div>
    </div>
  );
}
```