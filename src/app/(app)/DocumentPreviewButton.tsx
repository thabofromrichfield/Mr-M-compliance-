'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/clientFetch';
import { formatDate } from '@/lib/format';
import type { ComplianceDocument } from '@/lib/types';

type Props = { document: ComplianceDocument; className?: string; label?: string };

export function DocumentPreviewButton({ document, className = 'preview-action', label = 'Preview certificate' }: Props) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  async function openPreview() {
    setError('');
    try {
      const response = await apiFetch(`/api/documents/${document.id}/file?preview=1`);
      if (!response.ok) throw new Error('Could not open this certificate.');
      setUrl(URL.createObjectURL(await response.blob()));
    } catch { setError('Preview unavailable.'); }
  }
  function closePreview() {
    if (url) URL.revokeObjectURL(url);
    setUrl('');
  }
  async function downloadOriginal() {
    try {
      const response = await apiFetch(`/api/documents/${document.id}/file`);
      if (!response.ok) throw new Error('Download failed.');
      const downloadUrl = URL.createObjectURL(await response.blob());
      const anchor = window.document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = document.name;
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch { setError('Download unavailable.'); }
  }

  return <>
    <button className={className} title={`Preview ${document.name}`} aria-label={`Preview ${document.name}`} onClick={openPreview}>
      <span aria-hidden="true">◉</span>{label}
    </button>
    {error && <span className="preview-inline-error" role="status">{error}</span>}
    {url && <div className="modal-backdrop preview-backdrop" onClick={closePreview}>
      <section className="modal certificate-preview-modal" role="dialog" aria-modal="true" aria-labelledby={`preview-${document.id}`} onClick={event => event.stopPropagation()}>
        <header className="certificate-preview-header"><div><div className="eyebrow">CERTIFICATE PREVIEW</div><h2 id={`preview-${document.id}`}>{document.name}</h2><p>{document.category} · Expires {formatDate(document.expiryDate)}</p></div><div className="certificate-preview-actions"><button className="secondary-btn" onClick={downloadOriginal}>↓ Download</button><button className="icon-button" aria-label="Close preview" onClick={closePreview}>×</button></div></header>
        {document.mimeType === 'application/pdf' || document.mimeType.startsWith('text/')
          ? <iframe className="certificate-preview-frame" src={url} title={`Preview of ${document.name}`} />
          : document.mimeType.startsWith('image/')
            ? <div className="certificate-image-stage"><img src={url} alt={`Preview of ${document.name}`} /></div>
            : <div className="empty-state preview-unavailable"><strong>Preview is not available for this file type.</strong><span>Download the original document to view it.</span></div>}
      </section>
    </div>}
  </>;
}
