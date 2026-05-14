import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

const QR_UTM = '?utm_source=qr&utm_medium=qr-code';

interface QRLink {
  id: string;
  slug: string;
  destination_url: string;
  title?: string;
  status: string;
  is_qr: number;
  click_count: number;
  qr_click_count: number;
  created_at: string;
  expires_at?: string;
}

interface QRListResponse {
  success: boolean;
  data: QRLink[];
  pagination: { total: number; limit: number; offset: number; has_more: boolean };
}

const QRPage: React.FC = () => {
  const [links, setLinks] = useState<QRLink[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchSlug, setSearchSlug] = useState('');
  const [selectedLink, setSelectedLink] = useState<QRLink | null>(null);
  const [qrSize, setQrSize] = useState(512);
  const qrRef = useRef<HTMLDivElement>(null);

  const [editSlug, setEditSlug] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const [deleteSlug, setDeleteSlug] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [markingQr, setMarkingQr] = useState<string | null>(null);

  const fetchQrLinks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/qr?limit=100');
      if (!res.ok) throw new Error('Failed to load QR links');
      const result: QRListResponse = await res.json();
      setLinks(result.data || []);
      setTotal(result.pagination?.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchQrLinks(); }, [fetchQrLinks]);

  const filteredLinks = searchSlug
    ? links.filter(l => l.slug.includes(searchSlug.toLowerCase()) || (l.title || '').toLowerCase().includes(searchSlug.toLowerCase()))
    : links;

  const toggleQrFlag = async (slug: string, currentFlag: number) => {
    setMarkingQr(slug);
    try {
      const res = await fetch(`/api/links/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_qr: currentFlag ? 0 : 1 }),
      });
      if (!res.ok) throw new Error();
      fetchQrLinks();
      if (selectedLink?.slug === slug) {
        setSelectedLink(prev => prev ? { ...prev, is_qr: currentFlag ? 0 : 1 } : null);
      }
    } catch {
      alert('Failed to update QR flag');
    } finally {
      setMarkingQr(null);
    }
  };

  const startEdit = (link: QRLink) => {
    setEditSlug(link.slug);
    setEditUrl(link.destination_url);
  };

  const saveEdit = async () => {
    if (!editSlug) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/links/${editSlug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination_url: editUrl }),
      });
      if (!res.ok) throw new Error();
      setEditSlug(null);
      fetchQrLinks();
      if (selectedLink?.slug === editSlug) {
        setSelectedLink(prev => prev ? { ...prev, destination_url: editUrl } : null);
      }
    } catch {
      alert('Failed to update link');
    } finally {
      setEditSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteSlug) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/links/${deleteSlug}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setDeleteSlug(null);
      if (selectedLink?.slug === deleteSlug) setSelectedLink(null);
      fetchQrLinks();
    } catch {
      alert('Failed to delete link');
    } finally {
      setDeleting(false);
    }
  };

  const qrUrl = selectedLink ? `https://rov.rs/${selectedLink.slug}${QR_UTM}` : '';

  const downloadPNG = useCallback(() => {
    if (!qrRef.current || !selectedLink) return;
    const canvas = qrRef.current.querySelector('canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `rovrs-${selectedLink.slug}-qr.png`;
    a.click();
  }, [selectedLink]);

  const downloadPDF = useCallback(async () => {
    if (!qrRef.current || !selectedLink) return;
    const canvas = qrRef.current.querySelector('canvas');
    if (!canvas) return;
    try {
      const { PDFDocument, rgb } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]);
      const titleText = selectedLink.title || selectedLink.slug;
      page.drawText(titleText, { x: 50, y: 780, size: 20, color: rgb(0, 0, 0) });
      page.drawText(`rov.rs/${selectedLink.slug}`, { x: 50, y: 755, size: 12, color: rgb(0.4, 0.4, 0.4) });
      page.drawText(`Generated ${new Date().toLocaleDateString()}`, { x: 50, y: 735, size: 10, color: rgb(0.6, 0.6, 0.6) });
      const pngDataUrl = canvas.toDataURL('image/png');
      const pngBytes = Uint8Array.from(atob(pngDataUrl.split(',')[1]), c => c.charCodeAt(0));
      const qrImage = await pdfDoc.embedPng(pngBytes);
      const dim = 300;
      page.drawImage(qrImage, { x: (595 - dim) / 2, y: 400, width: dim, height: dim });
      page.drawText('Scan to visit', { x: (595 - 80) / 2, y: 380, size: 14, color: rgb(0.4, 0.4, 0.4) });
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rovrs-${selectedLink.slug}-qr.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to generate PDF');
    }
  }, [selectedLink]);

  // Selected link detail view
  if (selectedLink) {
    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedLink(null)} className="text-green-600 hover:text-green-800 text-sm font-medium">
          &larr; Back to QR Codes
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* QR Code */}
          <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center" ref={qrRef}>
            <QRCodeCanvas value={qrUrl} size={qrSize} bgColor="#ffffff" fgColor="#000000" level="H" includeMargin />
            <p className="mt-4 text-sm text-gray-500 font-mono">{qrUrl}</p>
            <p className="text-xs text-gray-400 mt-1">Includes UTM tracking for QR scan analytics</p>

            <div className="flex gap-2 mt-4">
              {[256, 512, 1024].map(s => (
                <button key={s} onClick={() => setQrSize(s)}
                  className={`px-3 py-1 text-sm rounded border ${qrSize === s ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                  {s}px
                </button>
              ))}
            </div>

            <div className="flex gap-3 mt-4">
              <button onClick={downloadPNG} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm">
                Download PNG
              </button>
              <button onClick={downloadPDF} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm">
                Download PDF
              </button>
              <button onClick={() => navigator.clipboard.writeText(qrUrl)} className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 text-sm">
                Copy QR URL
              </button>
            </div>
          </div>

          {/* Link details */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-3">Link Details</h2>
              <dl className="space-y-2 text-sm">
                <div><dt className="font-medium text-gray-700 inline">Slug: </dt><dd className="inline font-mono">{selectedLink.slug}</dd></div>
                <div><dt className="font-medium text-gray-700 inline">Title: </dt><dd className="inline">{selectedLink.title || '—'}</dd></div>
                <div><dt className="font-medium text-gray-700 inline">Destination: </dt><dd className="inline"><a href={selectedLink.destination_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{selectedLink.destination_url}</a></dd></div>
                <div><dt className="font-medium text-gray-700 inline">Status: </dt><dd className="inline">{selectedLink.status}</dd></div>
                {selectedLink.expires_at && (
                  <div><dt className="font-medium text-gray-700 inline">Expires: </dt><dd className="inline">{new Date(selectedLink.expires_at).toLocaleDateString()}</dd></div>
                )}
              </dl>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-3">Click Stats</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded">
                  <div className="text-2xl font-bold text-gray-900">{selectedLink.click_count.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">Total Clicks</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded">
                  <div className="text-2xl font-bold text-green-700">{selectedLink.qr_click_count.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">QR Scans</div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => toggleQrFlag(selectedLink.slug, selectedLink.is_qr)} disabled={!!markingQr}
                className={`px-4 py-2 rounded-md text-sm ${selectedLink.is_qr ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-green-600 text-white hover:bg-green-700'} disabled:opacity-50`}>
                {markingQr === selectedLink.slug ? '...' : selectedLink.is_qr ? 'Remove QR Flag' : 'Mark as QR'}
              </button>
              <button onClick={() => startEdit(selectedLink)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
                Edit
              </button>
              <button onClick={() => setDeleteSlug(selectedLink.slug)} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm">
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* Edit Modal */}
        {editSlug && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <h2 className="text-lg font-semibold mb-4">Edit: {editSlug}</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Destination URL</label>
                <input type="url" value={editUrl} onChange={e => setEditUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div className="mt-4 flex justify-end gap-3">
                <button onClick={() => setEditSlug(null)} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
                <button onClick={saveEdit} disabled={editSaving || !editUrl} className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:opacity-50">
                  {editSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {deleteSlug && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-lg font-semibold text-red-600 mb-2">Delete Link</h2>
              <p className="text-sm text-gray-600 mb-4">
                Delete <code className="bg-gray-100 px-1 rounded">{deleteSlug}</code>? The slug will become available for reuse.
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setDeleteSlug(null)} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
                <button onClick={confirmDelete} disabled={deleting} className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:opacity-50">
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">QR Codes</h1>
          <p className="text-sm text-gray-600 mt-1">Links marked for QR use, with scan tracking via UTM parameters.</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <input type="text" placeholder="Filter by slug or title..." value={searchSlug}
          onChange={e => setSearchSlug(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-lg shadow p-8">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-24 h-6 bg-gray-300 rounded" />
                <div className="flex-1 h-6 bg-gray-300 rounded" />
                <div className="w-16 h-6 bg-gray-300 rounded" />
                <div className="w-16 h-6 bg-gray-300 rounded" />
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && filteredLinks.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <h3 className="mt-2 text-lg font-medium text-gray-900">No QR links found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchSlug ? 'No links match your filter.' : 'No links are flagged as QR codes yet. Mark links as QR from the Links page or create a new one.'}
          </p>
        </div>
      )}

      {!loading && !error && filteredLinks.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slug</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Destination</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Clicks</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">QR Scans</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLinks.map(link => (
                  <tr key={link.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">{link.slug}</code>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-[150px] truncate">{link.title || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate" title={link.destination_url}>{link.destination_url}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{link.click_count.toLocaleString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-green-700">{link.qr_click_count.toLocaleString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        link.status === 'active' ? 'bg-green-100 text-green-800' :
                        link.status === 'paused' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                      }`}>{link.status}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <div className="flex gap-3">
                        <button onClick={() => setSelectedLink(link)} className="text-green-600 hover:text-green-800 font-medium">
                          QR Code
                        </button>
                        <button onClick={() => startEdit(link)} className="text-blue-600 hover:text-blue-800">Edit</button>
                        <button onClick={() => setDeleteSlug(link.slug)} className="text-red-600 hover:text-red-800">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-200 text-sm text-gray-500">
            Showing {filteredLinks.length} of {total} QR links
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editSlug && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <h2 className="text-lg font-semibold mb-4">Edit: {editSlug}</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Destination URL</label>
              <input type="url" value={editUrl} onChange={e => setEditUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setEditSlug(null)} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={saveEdit} disabled={editSaving || !editUrl} className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:opacity-50">
                {editSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteSlug && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-red-600 mb-2">Delete Link</h2>
            <p className="text-sm text-gray-600 mb-4">
              Delete <code className="bg-gray-100 px-1 rounded">{deleteSlug}</code>? The slug will become available for reuse.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteSlug(null)} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={confirmDelete} disabled={deleting} className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:opacity-50">
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QRPage;
