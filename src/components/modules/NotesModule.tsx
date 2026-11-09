import React, { useState, useEffect } from 'react';
import { Notes, NoteSection } from '../../lib/engine/types';
import { db, NotesRecord } from '../../lib/db';
import {
  BookOpen,
  Edit,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Printer,
  Download,
  RotateCcw,
  Sparkles,
  ArrowRight,
  AlertCircle,
  HelpCircle,
  Layers,
  Copy,
  Highlighter,
  Plus
} from 'lucide-react';

interface NotesModuleProps {
  materialId: string;
  notes: Notes;
  onNavigateToQuiz: () => void;
  onNavigateToFlashcards: () => void;
}

export const NotesModule: React.FC<NotesModuleProps> = ({
  materialId,
  notes,
  onNavigateToQuiz,
  onNavigateToFlashcards
}) => {
  const [readSections, setReadSections] = useState<Set<string>>(new Set());
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [activeSectionId, setActiveSectionId] = useState<string>('');

  // Text selection popup
  const [selectedText, setSelectedText] = useState('');
  const [selectionPosition, setSelectionPosition] = useState<{ x: number; y: number } | null>(null);

  // Load saved notes state
  useEffect(() => {
    db.notes.get(materialId).then((record) => {
      if (record) {
        if (record.readSections) setReadSections(new Set(record.readSections));
        if (record.edited) setEditedText(record.edited);
      }
    });
  }, [materialId]);

  // Toggle section read state
  const handleToggleRead = async (secId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(readSections);
    if (next.has(secId)) next.delete(secId);
    else next.add(secId);
    setReadSections(next);

    await db.notes.update(materialId, {
      readSections: Array.from(next)
    });
  };

  // Toggle collapse
  const handleToggleCollapse = (secId: string) => {
    const next = new Set(collapsedSections);
    if (next.has(secId)) next.delete(secId);
    else next.add(secId);
    setCollapsedSections(next);
  };

  const handleCollapseAll = () => {
    if (collapsedSections.size === notes.sections.length) {
      setCollapsedSections(new Set());
    } else {
      setCollapsedSections(new Set(notes.sections.map(s => s.id)));
    }
  };

  // Export to Markdown
  const handleExportMarkdown = () => {
    let md = `# ${notes.title}\n\n`;
    notes.sections.forEach(s => {
      md += `## ${s.numberStr}. ${s.title}\n\n${s.intro}\n\n`;
      s.bullets.forEach(b => {
        md += `- ${b}\n`;
      });
      if (s.callout) {
        md += `\n> **${s.callout.title}**: ${s.callout.text}\n`;
      }
      md += '\n---\n\n';
    });
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${notes.title}_ჩანაწერები.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Print PDF
  const handlePrint = () => {
    window.print();
  };

  // Handle text selection in notes
  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (sel && sel.toString().trim().length > 3) {
      const text = sel.toString().trim();
      setSelectedText(text);
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectionPosition({
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY - 45
      });
    } else {
      setSelectionPosition(null);
    }
  };

  // Create flashcard from selected text
  const handleCreateCardFromSelection = async () => {
    if (!selectedText) return;
    await db.flashcards.add({
      id: 'card-manual-' + Date.now(),
      materialId,
      front: selectedText,
      back: 'დაამატეთ განმარტება...',
      sourceRef: { sectionTitle: 'მონიშნული ტექსტიდან' },
      quality: 1.0,
      origin: 'manual',
      starred: true
    });
    setSelectionPosition(null);
    window.getSelection()?.removeAllRanges();
  };

  return (
    <div className="relative max-w-6xl mx-auto px-4 py-8 lg:px-8" onMouseUp={handleMouseUp}>
      {/* Floating text selection menu */}
      {selectionPosition && (
        <div
          style={{ top: `${selectionPosition.y}px`, left: `${selectionPosition.x}px` }}
          className="fixed z-50 flex items-center gap-1.5 p-1 bg-slate-900 text-white rounded-lg shadow-xl text-xs -translate-x-1/2 animate-in fade-in"
        >
          <button
            onClick={handleCreateCardFromSelection}
            className="flex items-center gap-1 px-2.5 py-1 rounded hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>შექმენი ბარათი</span>
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(selectedText);
              setSelectionPosition(null);
            }}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-800 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>კოპირება</span>
          </button>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">
            <BookOpen className="w-4 h-4" />
            <span>ჩანაწერები</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900 dark:text-white">
            {notes.title}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            ~{notes.readingTimeMin} წუთი წასაკითხად · {notes.sections.length} სექცია · {readSections.size} წაკითხული
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 no-print">
          <button
            onClick={handleCollapseAll}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {collapsedSections.size === notes.sections.length ? 'ყველას გაშლა' : 'ყველას ჩაკეცვა'}
          </button>
          <button
            onClick={handleExportMarkdown}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Markdown ექსპორტი"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={handlePrint}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="ბეჭდვა / PDF"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Two column layout: Main Content + Right Table of Contents */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content (3 cols) */}
        <div className="lg:col-span-3 space-y-6">
          {notes.sections.map((sec) => {
            const isRead = readSections.has(sec.id);
            const isCollapsed = collapsedSections.has(sec.id);

            return (
              <section
                key={sec.id}
                id={sec.id}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isRead
                    ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs'
                }`}
              >
                {/* Section Header */}
                <div
                  onClick={() => handleToggleCollapse(sec.id)}
                  className="flex items-center justify-between p-5 cursor-pointer bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => handleToggleRead(sec.id, e)}
                      className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${
                        isRead
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-slate-300 dark:border-slate-600 text-transparent hover:border-emerald-500'
                      }`}
                      title={isRead ? 'მონიშნულია წაკითხულად' : 'მონიშვნა წაკითხულად'}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <div>
                      <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-semibold mr-2">
                        {sec.numberStr}
                      </span>
                      <h2 className="inline text-base font-bold font-serif text-slate-900 dark:text-white">
                        {sec.title}
                      </h2>
                    </div>
                  </div>

                  <div className="p-1 text-slate-400">
                    {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {/* Section Content */}
                {!isCollapsed && (
                  <div className="p-6 space-y-5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    {/* Intro paragraph */}
                    <p className="font-medium text-slate-900 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-800/30 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      {sec.intro}
                    </p>

                    {/* Bullet points */}
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        ძირითადი პუნქტები:
                      </span>
                      <ul className="space-y-2.5">
                        {sec.bullets.map((bullet, bIdx) => (
                          <li key={bIdx} className="flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Callout box */}
                    {sec.callout && (
                      <div
                        className={`p-4 rounded-xl border text-xs leading-relaxed space-y-1 ${
                          sec.callout.type === 'common_error'
                            ? 'bg-amber-50/60 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200'
                            : sec.callout.type === 'term'
                            ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200'
                            : 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/40 text-indigo-900 dark:text-indigo-200'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold">
                          {sec.callout.type === 'common_error' ? (
                            <AlertCircle className="w-4 h-4 text-amber-600" />
                          ) : (
                            <Sparkles className="w-4 h-4 text-indigo-600" />
                          )}
                          <span>{sec.callout.title}</span>
                        </div>
                        <p>{sec.callout.text}</p>
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          })}

          {/* Key Terms Glossary */}
          {notes.glossary.length > 0 && (
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <h3 className="text-base font-bold font-serif text-slate-900 dark:text-white">
                საკვანძო ტერმინები (ლექსიკონი)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {notes.glossary.map((g, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 text-xs">
                    <span className="font-bold text-slate-900 dark:text-white block mb-0.5">
                      {g.term}
                    </span>
                    <span className="text-slate-600 dark:text-slate-400">
                      {g.definition}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Review */}
          {notes.quickReview.length > 0 && (
            <div className="p-6 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 space-y-3">
              <h3 className="text-base font-bold font-serif text-indigo-950 dark:text-indigo-200">
                სწრაფი გამეორება (ძირითადი თეზისები)
              </h3>
              <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                {notes.quickReview.map((rev, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                    <span>{rev}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Next Steps Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 no-print">
            <h3 className="text-base font-bold font-serif text-slate-900 dark:text-white">
              აქციე ცოდნად — წაკითხვა პირველი ნაბიჯია!
            </h3>
            <p className="text-xs text-slate-500">
              წაკითხული მასალის გასამყარებლად და მეხსიერებაში ჩასაბეჭდად შეამოწმე თავი ბარათებითა და ქვიზით.
            </p>

            {/* 3 Step Indicator */}
            <div className="flex items-center gap-3 text-xs font-semibold py-2">
              <span className="text-emerald-600 dark:text-emerald-400">1. წაკითხვა ✓</span>
              <span className="text-slate-300">→</span>
              <span className="text-indigo-600 dark:text-indigo-400">2. გამეორება</span>
              <span className="text-slate-300">→</span>
              <span className="text-slate-400">3. შემოწმება</span>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={onNavigateToFlashcards}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all"
              >
                <Layers className="w-4 h-4" />
                <span>ბარათებით გამეორება</span>
              </button>
              <button
                onClick={onNavigateToQuiz}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors"
              >
                <HelpCircle className="w-4 h-4" />
                <span>ქვიზით შემოწმება</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Table of Contents (1 col sticky) */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="sticky top-20 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block pb-1 border-b border-slate-100 dark:border-slate-800">
              სარჩევი
            </span>
            <nav className="space-y-1 max-h-[70vh] overflow-y-auto text-xs pr-1">
              {notes.sections.map((sec) => (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  className="flex items-center justify-between py-1.5 px-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                >
                  <span className="truncate pr-2 font-serif">{sec.title}</span>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    {readSections.has(sec.id) ? '✓' : sec.numberStr}
                  </span>
                </a>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};
