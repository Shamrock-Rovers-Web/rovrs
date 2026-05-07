import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { PDFDocument } from 'pdf-lib';
import type { Link } from '@rovrs/shared';

const QRPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchSlug, setSearchSlug] = useState('');
  const [link, setLink] = useState<Link | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [qrSize, setQrSize] = useState(256);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expiryWarning, setExpiryWarning] = useState(false);

  const baseUrl = window.location.origin === 'http://localhost:3000' ? 'http://localhost:8787' : 'https://rov.rs';

  const searchLink = async () => {
    if (!searchSlug.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/links/${searchSlug}`);
      if (response.ok) {
        const data = await response.json();
        setLink(data);

        // Check for expiry warning
        if (data.expires_at) {
          const expiryDate = new Date(data.expires_at);
          const now = new Date();
          const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntilExpiry < 30) {
            setExpiryWarning(true);
          }
        }
      } else if (response.status === 404) {
        setError('Link not found');
        setLink(null);
        setExpiryWarning(false);
      } else {
        throw new Error('Failed to fetch link');
      }
    } catch (err) {
      setError('Failed to fetch link');
      setLink(null);
      setExpiryWarning(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQRSizeChange = (size: number) => {
    setQrSize(size);
  };

  const copyToClipboard = async () => {
    if (!link) return;

    const fullUrl = `${baseUrl}/${link.slug}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      alert('URL copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const removeExpiry = async () => {
    if (!link) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/links/${link.slug}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expires_at: null }),
      });

      if (response.ok) {
        const updatedLink = await response.json();
        setLink(updatedLink);
        setExpiryWarning(false);
        alert('Expiry removed successfully!');
      } else {
        throw new Error('Failed to remove expiry');
      }
    } catch (err) {
      alert('Failed to remove expiry');
    } finally {
      setIsLoading(false);
    }
  };

  const generatePDF = async () => {
    if (!link) return;

    setIsGenerating(true);

    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]); // A4 size

      // Add title
      page.drawText(`${link.title || 'Link'} - ${link.slug}`, {
        x: 50,
        y: 750,
        size: 24,
        color: rgb(0, 0, 0),
      });

      // Add subtitle
      page.drawText(`Generated on ${new Date().toLocaleDateString()}`, {
        x: 50,
        y: 720,
        size: 12,
        color: rgb(0.5, 0.5, 0.5),
      });

      // Create temporary canvas for QR code
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      canvas.width = qrSize;
      canvas.height = qrSize;

      // Draw QR code to canvas
      const qrCanvas = (
        <QRCodeCanvas
          value={`${baseUrl}/${link.slug}`}
          size={qrSize}
          bgColor="#ffffff"
          fgColor="#000000"
          level="H"
        />
      );

      // Convert canvas to image and add to PDF
      const qrImage = await pdfDoc.embedPng(canvas.toDataURL());
      page.drawImage(qrImage, {
        x: 50,
        y: 650,
        width: qrSize,
        height: qrSize,
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-${link.slug}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const generatePNG = () => {
    if (!link) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = qrSize;
    canvas.height = qrSize;

    const qrCanvas = (
      <QRCodeCanvas
        value={`${baseUrl}/${link.slug}`}
        size={qrSize}
        bgColor="#ffffff"
        fgColor="#000000"
        level="H"
      />
    );

    // Convert canvas to image
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `qr-${link.slug}-${qrSize}px.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">QR Code Generator</h1>

      <div className="mb-6">
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={searchSlug}
            onChange={(e) => setSearchSlug(e.target.value)}
            placeholder="Enter link slug to generate QR code"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md"
            onKeyDown={(e) => e.key === 'Enter' && searchLink()}
          />
          <button
            onClick={searchLink}
            disabled={isLoading || !searchSlug.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:opacity-50"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {error && (
          <div className="text-red-500 mb-4">{error}</div>
        )}
      </div>

      {link && (
        <div className="space-y-6">
          {/* Link Details */}
          <div className="bg-gray-50 p-4 rounded-md">
            <h2 className="text-xl font-semibold mb-2">Link Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p><strong>Slug:</strong> {link.slug}</p>
                <p><strong>Destination:</strong> {link.destination_url}</p>
              </div>
              <div>
                <p><strong>Title:</strong> {link.title || 'None'}</p>
                {link.expires_at && (
                  <p><strong>Expires:</strong> {new Date(link.expires_at).toLocaleDateString()}</p>
                )}
              </div>
            </div>
          </div>

          {/* Expiry Warning */}
          {expiryWarning && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
              <h3 className="text-lg font-semibold mb-2">⚠️ Link Expiring Soon</h3>
              <p className="mb-4">This link will expire on {new Date(link.expires_at!).toLocaleDateString()}.</p>
              <div className="flex gap-2">
                <button
                  onClick={removeExpiry}
                  disabled={isLoading}
                  className="px-4 py-2 bg-green-500 text-white rounded-md disabled:opacity-50"
                >
                  Remove Expiry
                </button>
                <button
                  onClick={() => setExpiryWarning(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md"
                >
                  Generate Anyway
                </button>
              </div>
            </div>
          )}

          {/* Size Selection */}
          <div>
            <h2 className="text-xl font-semibold mb-2">QR Code Size</h2>
            <div className="flex gap-2">
              {[256, 512, 1024].map((size) => (
                <button
                  key={size}
                  onClick={() => handleQRSizeChange(size)}
                  className={`px-4 py-2 rounded-md ${
                    qrSize === size
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {size}px
                </button>
              ))}
            </div>
          </div>

          {/* QR Code Display */}
          <div className="bg-white p-8 rounded-md shadow-sm border">
            <div className="flex justify-center mb-4">
              <QRCodeCanvas
                value={`${baseUrl}/${link.slug}`}
                size={qrSize}
                bgColor="#ffffff"
                fgColor="#000000"
                level="H"
                includeMargin={true}
              />
            </div>
            <p className="text-center text-sm text-gray-600">
              Scan to visit: {baseUrl}/{link.slug}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={copyToClipboard}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Copy Short URL
            </button>
            <button
              onClick={generatePNG}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
            >
              Download PNG ({qrSize}px)
            </button>
            <button
              onClick={generatePDF}
              disabled={isGenerating}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50"
            >
              {isGenerating ? 'Generating PDF...' : 'Download PDF'}
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              Back to Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function for RGB colors
function rgb(r: number, g: number, b: number) {
  return {
    r: r / 255,
    g: g / 255,
    b: b / 255,
  };
}

export default QRPage;