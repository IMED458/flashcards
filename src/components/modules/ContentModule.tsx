import React, { useState } from 'react';
import { MaterialRecord } from '../../lib/db';
import {
  FileText,
  Download,
  ExternalLink,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Video,
  FileCode,
  Layers
} from 'lucide-react';

interface ContentModuleProps {
  material: MaterialRecord;
  highlightQuery?: string;
}

export const ContentModule: React.FC<ContentModuleProps> = ({
  material,
  highlightQuery = ''
}) => {
  const [searchWord, setSearchWord] = useState(highlightQuery);
  const [zoomLevel, setZoomLevel] = useState(100);

  // Download raw document / text
  const handleDownload = () => {
    let blob = material.blob;
    if (!blob) {
      blob = new Blob([material.rawText], { type: 'text/plain;charset=utf-8' });
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = material.fileName || `${material.title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenRaw = () => {
    const blob = new Blob([material.rawText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const paragraphs = material.rawText.split('\n\n').filter(p => p.trim());

  return (
    <div className="max-w-4xl mx-auto my-6 px-4 space-y-6">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
            {material.sourceType === 'video' ? <Video className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-base font-bold font-serif text-slate-900 dark:text-white line-clamp-1">
              {material.title}
            </h2>
            <p className="text-xs text-slate-400">
              {material.sourceType === 'video' ? 'ვიდეო მასალა' : 'დოკუმენტი'} · {material.rawText.split(/\s+/).length} სიტყვა
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 text-xs">
            <button
              onClick={() => setZoomLevel(z => Math.max(80, z - 10))}
              className="p-1 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
              title="დაპატარავება"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono tabular-nums text-slate-500">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel(z => Math.min(140, z + 10))}
              className="p-1 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
              title="გადიდება"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ჩამოტვირთვა</span>
          </button>
          <button
            onClick={handleOpenRaw}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="გახსნა ახალ ჩანართში"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="ძიება ორიგინალ ტექსტში..."
          value={searchWord}
          onChange={(e) => setSearchWord(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      {/* Document Sheet Display */}
      <div className="p-8 sm:p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm leading-relaxed space-y-4">
        <div style={{ fontSize: `${zoomLevel}%` }} className="space-y-4 font-sans text-slate-800 dark:text-slate-200">
          {paragraphs.map((p, idx) => {
            const isHeading = p.startsWith('#');
            if (isHeading) {
              const cleanHeading = p.replace(/^#+\s*/, '');
              return (
                <h3 key={idx} className="text-xl font-bold font-serif text-slate-900 dark:text-white pt-4 pb-1 border-b border-slate-100 dark:border-slate-800">
                  {cleanHeading}
                </h3>
              );
            }

            // Highlight matches if searchWord exists
            if (searchWord && searchWord.length >= 2 && p.toLowerCase().includes(searchWord.toLowerCase())) {
              const regex = new RegExp(`(${searchWord})`, 'gi');
              const parts = p.split(regex);
              return (
                <p key={idx} className="leading-relaxed">
                  {parts.map((part, i) =>
                    part.toLowerCase() === searchWord.toLowerCase() ? (
                      <mark key={i} className="bg-amber-200 dark:bg-amber-900 text-slate-950 dark:text-white px-1 rounded">
                        {part}
                      </mark>
                    ) : (
                      part
                    )
                  )}
                </p>
              );
            }

            return (
              <p key={idx} className="leading-relaxed">
                {p}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
};
