'use client';

import React, { useState } from 'react';
import { FileText, Download, ExternalLink, ZoomIn, ZoomOut } from 'lucide-react';

interface MaterialItem {
  id: string;
  title: string;
  fileUrl: string;
  fileType?: string;
  sizeBytes?: number;
}

interface PDFDocumentViewerProps {
  materials: MaterialItem[];
}

export default function PDFDocumentViewer({ materials }: PDFDocumentViewerProps) {
  const [selectedDoc, setSelectedDoc] = useState<MaterialItem>(materials[0]);
  const [zoom, setZoom] = useState(100);

  if (!materials || materials.length === 0) {
    return (
      <div className="glass-panel p-12 text-center rounded-3xl border border-slate-800 space-y-3">
        <FileText className="w-10 h-10 text-slate-600 mx-auto" />
        <h3 className="text-base font-bold text-white">No Study Materials Attached</h3>
        <p className="text-xs text-slate-400">
          This lesson does not contain supplementary PDF lecture notes or summary sheets.
        </p>
      </div>
    );
  }

  const activeDoc = selectedDoc || materials[0];

  return (
    <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden space-y-4 animate-fadeIn">
      {/* Top Toolbar */}
      <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/60">
        {/* Document Selector Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {materials.map((m) => (
            <button
              key={m.id || m.fileUrl}
              onClick={() => setSelectedDoc(m)}
              className={`py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                activeDoc.fileUrl === m.fileUrl
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{m.title || 'Document'}</span>
            </button>
          ))}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setZoom((z) => Math.max(50, z - 25))}
              className="text-slate-400 hover:text-white p-1"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-slate-300 px-1">{zoom}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(200, z + 25))}
              className="text-slate-400 hover:text-white p-1"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <a
            href={activeDoc.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shadow-md"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </a>
        </div>
      </div>

      {/* Embedded Document Frame */}
      <div className="p-4 bg-slate-950/80 min-h-[500px] flex items-center justify-center">
        {activeDoc.fileUrl.endsWith('.pdf') || activeDoc.fileType === 'pdf' ? (
          <iframe
            src={`${activeDoc.fileUrl}#toolbar=0&navpanes=0`}
            title={activeDoc.title}
            className="w-full h-[600px] rounded-2xl border border-slate-800 bg-white"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
          />
        ) : (
          <div className="text-center p-8 space-y-3">
            <FileText className="w-12 h-12 text-indigo-400 mx-auto" />
            <h4 className="text-sm font-bold text-white">{activeDoc.title}</h4>
            <p className="text-xs text-slate-400 max-w-sm">
              Click below to view or download this study document in a new tab.
            </p>
            <a
              href={activeDoc.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition shadow-lg"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Document</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
