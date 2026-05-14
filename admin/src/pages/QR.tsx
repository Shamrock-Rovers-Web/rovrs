import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';

interface Link {
  slug: string;
  destination_url: string;
  title?: string;
  expires_at?: string;
}

const QRPage: React.FC = () => {
  const navigate = useNavigate();
  const qrRef = useRef<HTMLDivElement>(null);
  const [searchSlug, setSearchSlug] = useState('');
  const [link, setLink] = useState<Link | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [qrSize, setQrSize] = useState(256);
  const [expiryWarning, setExpiryWarning] = useState(false);

  const searchLink = async () => {
    if (!searchSlug.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/links/${searchSlug.trim()}`);
      if (response.ok) {
        const result = await response.json();
        const data = result.data || result;
        setLink(data);

        if (data.expires_at) {
          const expiryDate = new Date(data.expires_at);
          const now = new Date();
          const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          setExpiryWarning(daysUntilExpiry < 30);
        } else {
          setExpiryWarning(false);
        }
      } else if (response.status === 404) {
        setError('Link not found — check the slug and try again');
        setLink(null);
        setExpiryWarning(false);
      } else {
        throw new Error('Failed to fetch link');
      }
    } catch (err) {
      setError('Failed to fetch link — please try again');
      setLink(null);
      setExpiryWarning(false);
    } finally {
      setIsLoading(false);
    }
  };

  const shortUrl = link ? `https://rov.rs/${link.slug}` : '';

  const copyToClipboard = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(shortUrl);
    } catch {
      const input = document.createElement('input');
      input.value = shortUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
  };

  const removeExpiry = async () => {
    if (!link) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/links/${link.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expires_at: null }),
      });
      if (response.ok) {
        const result = await response.json();
        const data = result.data || result;
        setLink(data);
        setExpiryWarning(false);
      } else {
        throw new Error('Failed to remove expiry');
      }
    } catch {
      setError('Failed to remove expiry');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadPNG = useCallback(() => {
    if (!qrRef.current || !link) return;
    const canvas = qrRef.current.querySelector('canvas');
    if (!canvas) return;

    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `rovrs-${link.slug}-${qrSize}px.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [link, qrSize]);

  const downloadPDF = useCallback(async () => {
    if (!qrRef.current || !link) return;
    const canvas = qrRef.current.querySelector('canvas');
    if (!canvas) return;

    try {
      const { PDFDocument, rgb } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]);

      const titleText = link.title || link.slug;
      page.drawText(titleText, { x: 50, y: 780, size: 20, color: rgb(0, 0, 0) });
      page.drawText(`rov.rs/${link.slug}`, { x: 50, y: 755, size: 12, color: rgb(0.4, 0.4, 0.4) });
      page.drawText(`Generated ${new Date().toLocaleDateString()}`, { x: 50, y: 735, size: 10, color: rgb(0.6, 0.6, 0.6) });

      const pngDataUrl = canvas.toDataURL('image/png');
      const pngBytes = Uint8Array.from(atob(pngDataUrl.split(',')[1]), c => c.charCodeAt(0));
      const qrImage = await pdfDoc.embedPng(pngBytes);

      const qrPageWidth = 300;
      const qrPageHeight = 300;
      page.drawImage(qrImage, {
        x: (595 - qrPageWidth) / 2,
        y: 400,
        width: qrPageWidth,
        height: qrPageHeight,
      });

      page.drawText('Scan to visit', { x: (595 - 80) / 2, y: 380, size: 14, color: rgb(0.4, 0.4, 0.4) });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rovrs-${link.slug}-qr.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF generation failed:', err);
      setError('Failed to generate PDF');
    }
  }, [link]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">QR Code Generator</h1>
      <p className="text-gray-600 mb-6">
        Search for an existing link by its slug, then download the QR code as a PNG image or PDF document.
        The QR code encodes the short URL (rov.rs/slug) — when scanned, it redirects to the destination.
      </p>

      {/* Search */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Link Slug</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchSlug}
            onChange={(e) => setSearchSlug(e.target.value)}
            placeholder="e.g. vs-bohemians"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            onKeyDown={(e) => e.key === 'Enter' && searchLink()}
          />
          <button
            onClick={searchLink}
            disabled={isLoading || !searchSlug.trim()}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {isLoading ? 'Searching...' : 'Find Link'}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      {link && (
        <div className="space-y-6">
          {/* Link Info */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h2 className="text-lg font-semibold mb-2">Link Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div><span className="font-medium text-gray-700">Slug:</span> {link.slug}</div>
              <div><span className="font-medium text-gray-700">Title:</span> {link.title || '—'}</div>
              <div><span className="font-medium text-gray-700">Short URL:</span> {shortUrl}</div>
              <div><span className="font-medium text-gray-700">Destination:</span>{' '}
                <a href={link.destination_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate inline-block max-w-[250px]">
                  {link.destination_url}
                </a>
              </div>
              {link.expires_at && (
                <div><span className="font-medium text-gray-700">Expires:</span>{' '}
                  {new Date(link.expires_at).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          {/* Expiry Warning */}
          {expiryWarning && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
              <h3 className="text-lg font-semibold mb-2">Link Expiring Soon</h3>
              <p className="mb-4">This link will expire on {new Date(link.expires_at!).toLocaleDateString()}.
                QR codes pointing to expired links will redirect to the fallback page.</p>
              <div className="flex gap-2">
                <button
                  onClick={removeExpiry}
                  disabled={isLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  Remove Expiry
                </button>
                <button
                  onClick={() => setExpiryWarning(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Generate Anyway
                </button>
              </div>
            </div>
          )}

          {/* Size Selection */}
          <div>
            <h2 className="text-lg font-semibold mb-2">QR Code Size</h2>
            <p className="text-sm text-gray-600 mb-2">Larger sizes are better for print (posters, flyers). Smaller sizes work for screen display.</p>
            <div className="flex gap-2">
              {[
                { size: 256, label: '256px', desc: 'Screen' },
                { size: 512, label: '512px', desc: 'Print' },
                { size: 1024, label: '1024px', desc: 'Large print' },
              ].map(({ size, label, desc }) => (
                <button
                  key={size}
                  onClick={() => setQrSize(size)}
                  className={`px-4 py-2 rounded-md border ${
                    qrSize === size
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium">{label}</div>
                  <div className="text-xs opacity-75">{desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* QR Code */}
          <div className="bg-white p-8 rounded-lg shadow-sm border flex flex-col items-center" ref={qrRef}>
            <QRCodeCanvas
              value={shortUrl}
              size={qrSize}
              bgColor="#ffffff"
              fgColor="#000000"
              level="H"
              includeMargin={true}
            />
            <p className="mt-4 text-sm text-gray-500">Scans to: {shortUrl}</p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={copyToClipboard}
              className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900"
            >
              Copy Short URL
            </button>
            <button
              onClick={downloadPNG}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Download PNG ({qrSize}px)
            </button>
            <button
              onClick={downloadPDF}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Download PDF
            </button>
            <button
              onClick={() => navigate('/links')}
              className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              View All Links
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QRPage;
