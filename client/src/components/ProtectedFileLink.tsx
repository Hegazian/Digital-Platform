'use client';

import { useState, type ButtonHTMLAttributes } from 'react';
import { resolveDocumentUrl } from '@/lib/protected-files';
import { useAppStore } from '@/lib/store';

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & { fileUrl: string; fileName?: string };

export default function ProtectedFileLink({ fileUrl, fileName, children, ...props }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const lang = useAppStore((state) => state.lang);
  const download = async () => {
    setBusy(true);
    setError(false);
    try {
      const source = await resolveDocumentUrl(fileUrl);
      const anchor = document.createElement('a');
      anchor.href = source.url;
      anchor.download = fileName || 'document';
      anchor.rel = 'noopener noreferrer';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      // Allow the browser to consume the blob before releasing its memory.
      window.setTimeout(source.revoke, 60_000);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  return <>
    <button {...props} type="button" onClick={download} disabled={busy || props.disabled} aria-busy={busy}>{children}</button>
    {error && <span role="alert" className="text-xs text-red-400">{lang === 'ar' ? 'تعذر تنزيل الملف. حاول مرة أخرى.' : 'Download failed. Please try again.'}</span>}
  </>;
}
