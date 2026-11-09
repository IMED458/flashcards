import React, { useState, useRef } from 'react';
import { MaterialRecord, FolderRecord, db, saveProcessedMaterial } from '../lib/db';
import {
  Upload,
  Video,
  FileText,
  Search,
  Plus,
  FolderPlus,
  MoreVertical,
  Layers,
  HelpCircle,
  Trash2,
  Edit2,
  Folder,
  Calendar,
  Sparkles,
  ArrowRight,
  X,
  FileUp,
  Sliders,
  CheckSquare
} from 'lucide-react';
import { EngineOptions } from '../lib/engine/types';
import { extractTextFromFile, ACCEPTED_FILE_TYPES, MAX_TEXT_CHARS } from '../lib/extractText';
import type { ProcessingStage } from './ProcessingView';

export type ProcessingJob = (
  report: (stage: ProcessingStage, message?: string) => void
) => Promise<{ materialId: string; notice?: string }>;

interface DashboardProps {
  materials: MaterialRecord[];
  folders: FolderRecord[];
  onSelectMaterial: (id: string, initialTab?: any) => void;
  onRefreshMaterials: () => void;
  onStartProcessing: (title: string, job: ProcessingJob) => void;
  selectedFolderId?: string;
  setSelectedFolderId: (id: string | undefined) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  materials,
  folders,
  onSelectMaterial,
  onRefreshMaterials,
  onStartProcessing,
  selectedFolderId,
  setSelectedFolderId
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'title'>('date');
  const [isDragOver, setIsDragOver] = useState(false);

  // Modals state
  const [activeModal, setActiveModal] = useState<'none' | 'file' | 'video' | 'text' | 'newFolder'>('none');

  // Text modal form
  const [rawTextInput, setRawTextInput] = useState('');
  const [rawTextTitle, setRawTextTitle] = useState('');

  // Video modal form
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [videoTranscript, setVideoTranscript] = useState('');

  // File modal form
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New folder modal
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#2563EB');

  // Generation options
  const [showOptions, setShowOptions] = useState(false);
  const [options, setOptions] = useState<EngineOptions>({
    flashcardsCount: 50,
    quizCount: 30,
    fillBlanksCount: 30,
    summaryLengthPercent: 40
  });

  // Action menu for card
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Filter materials
  const filteredMaterials = materials
    .filter((m) => {
      if (selectedFolderId && m.folderId !== selectedFolderId) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return m.title.toLowerCase().includes(q) || m.rawText.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  // Handle Drag and Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setActiveModal('file');
    }
  };

  // Submit Text Material
  const handleProcessText = () => {
    if (!rawTextInput.trim() || rawTextInput.length < 50) return;
    const title = rawTextTitle.trim() || 'ახალი ჩანაწერი';
    const text = rawTextInput.slice(0, MAX_TEXT_CHARS);
    const opts = options;
    const folderId = selectedFolderId;
    setActiveModal('none');
    setRawTextInput('');
    setRawTextTitle('');

    onStartProcessing(title, async report => {
      const id = 'mat-' + Date.now();
      report('analyzing');
      await saveProcessedMaterial({ id, title, sourceType: 'text', rawText: text, coverColor: '#2563EB', folderId, options: opts });
      report('saving');
      return { materialId: id };
    });
  };

  // Submit Video Material
  const handleProcessVideo = () => {
    if (!youtubeUrl.trim()) return;
    const title = videoTitle.trim() || 'ვიდეო ლექცია';
    const url = youtubeUrl;
    const transcript = videoTranscript.trim().slice(0, MAX_TEXT_CHARS);
    const opts = options;
    const folderId = selectedFolderId;
    setActiveModal('none');
    setYoutubeUrl('');
    setVideoTitle('');
    setVideoTranscript('');

    onStartProcessing(title, async report => {
      if (transcript.length < 50) {
        throw new Error('ვიდეოს დასამუშავებლად ჩასვით მისი ტრანსკრიპტი (მინიმუმ 50 სიმბოლო). YouTube-ის ტრანსკრიპტს ბრაუზერიდან ავტომატურად ვერ ვიღებთ.');
      }
      const id = 'mat-' + Date.now();
      report('analyzing');
      await saveProcessedMaterial({
        id,
        title,
        sourceType: 'video',
        rawText: transcript,
        coverColor: '#DC2626',
        youtubeUrl: url,
        folderId,
        options: opts
      });
      report('saving');
      return { materialId: id };
    });
  };

  // Submit File Material
  const handleProcessFile = () => {
    if (!selectedFile) return;
    const file = selectedFile;
    const title = file.name.replace(/\.[^/.]+$/, '');
    const opts = options;
    const folderId = selectedFolderId;
    setActiveModal('none');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    onStartProcessing(title, async report => {
      const id = 'mat-' + Date.now();
      report('extracting', 'ფაილის წაკითხვა…');
      const { text, truncated, usedOcr } = await extractTextFromFile(file, msg => report('extracting', msg));

      report('analyzing');
      await saveProcessedMaterial({
        id,
        title,
        sourceType: 'file',
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        // Large files are not stored to avoid exceeding browser storage quota.
        blob: file.size <= 15 * 1024 * 1024 ? file : undefined,
        rawText: text,
        coverColor: '#059669',
        folderId,
        options: opts
      });
      report('saving');

      const notices: string[] = [];
      if (truncated) notices.push('დოკუმენტი ძალიან დიდია — დამუშავდა მხოლოდ პირველი ნაწილი (~120 000 სიმბოლო).');
      if (usedOcr) notices.push('ტექსტი ამოცნობილია სურათიდან (OCR) — შესაძლოა შეიცავდეს შეცდომებს.');
      return { materialId: id, notice: notices.join(' ') || undefined };
    });
  };

  // Create new folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await db.folders.add({
      id: 'folder-' + Date.now(),
      name: newFolderName.trim(),
      color: newFolderColor,
      createdAt: new Date().toISOString()
    });
    setNewFolderName('');
    setActiveModal('none');
    onRefreshMaterials();
  };

  // Delete material
  const handleDeleteMaterial = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('დარწმუნებული ხართ, რომ გსურთ ამ მასალის წაშლა?')) {
      await db.materials.delete(id);
      await db.notes.delete(id);
      await db.docTrees.delete(id);
      await db.flashcards.where('materialId').equals(id).delete();
      await db.quizQuestions.where('materialId').equals(id).delete();
      await db.fillBlanks.where('materialId').equals(id).delete();
      await db.mindmaps.delete(id);
      onRefreshMaterials();
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative min-h-[calc(100vh-65px)] p-6 lg:p-10 max-w-7xl mx-auto space-y-10"
    >
      {/* Drag and Drop Overlay */}
      {isDragOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-900/60 backdrop-blur-sm border-4 border-dashed border-white m-6 rounded-3xl">
          <div className="text-center text-white space-y-3">
            <FileUp className="w-16 h-16 mx-auto animate-bounce" />
            <h2 className="text-2xl font-bold font-serif">ჩააგდე ფაილი აქ</h2>
            <p className="text-sm opacity-90">PDF, Word, PowerPoint, სურათი ან ტექსტი</p>
          </div>
        </div>
      )}

      {/* Hero Welcome Banner */}
      <section className="space-y-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-serif tracking-tight">
          გამარჯობა! რისი სწავლა გინდა დღეს?
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
          ატვირთე ნებისმიერი მასალა და წამებში მიიღე ჩანაწერები, ბარათები, ტესტები და ცოდნის რუკა — 100% ლოკალურად, AI-ს და ინტერნეტის გარეშე.
        </p>
      </section>

      {/* 3 Upload Action Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: File Upload */}
        <button
          onClick={() => setActiveModal('file')}
          className="group text-left p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-md transition-all duration-200"
        >
          <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
            <Upload className="w-5 h-5" />
          </div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white font-serif">
            ატვირთვა
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            PDF, Word, PowerPoint, სურათი ან ტექსტი
          </p>
        </button>

        {/* Card 2: Video */}
        <button
          onClick={() => setActiveModal('video')}
          className="group text-left p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-red-500 dark:hover:border-red-500 hover:shadow-md transition-all duration-200"
        >
          <div className="w-11 h-11 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
            <Video className="w-5 h-5" />
          </div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white font-serif">
            ვიდეო
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            YouTube ვიდეო და ლექციები
          </p>
        </button>

        {/* Card 3: Raw Text */}
        <button
          onClick={() => setActiveModal('text')}
          className="group text-left p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-md transition-all duration-200"
        >
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
            <FileText className="w-5 h-5" />
          </div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white font-serif">
            ტექსტი
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            შეიყვანე ან ჩასვი შენი ჩანაწერები
          </p>
        </button>
      </section>

      {/* Library Section Header */}
      <section className="space-y-6 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white font-serif">
              ბიბლიოთეკა
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              ({filteredMaterials.length} მასალა)
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ძიება მასალებში..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 sm:w-64 pl-9 pr-3 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            {/* New Folder Button */}
            <button
              onClick={() => setActiveModal('newFolder')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>ახალი ფოლდერი</span>
            </button>
          </div>
        </div>

        {/* Folder filter tabs */}
        {folders.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setSelectedFolderId(undefined)}
              className={`px-3 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                !selectedFolderId
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              ყველა
            </button>
            {folders.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFolderId(f.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                  selectedFolderId === f.id
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: f.color }} />
                <span>{f.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Materials Grid (Book Cover Style) */}
        {filteredMaterials.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
            <Layers className="w-10 h-10 mx-auto text-slate-400" />
            <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">
              მასალები ვერ მოიძებნა
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              ატვირთე ფაილი, ვიდეო ან ჩასვი ტექსტი ახალი სასწავლო ნაკრების შესაქმნელად.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredMaterials.map((mat) => {
              const dateStr = new Date(mat.createdAt).toLocaleDateString('ka-GE', {
                month: 'short',
                day: 'numeric'
              });

              return (
                <div
                  key={mat.id}
                  onClick={() => onSelectMaterial(mat.id)}
                  className="group relative cursor-pointer flex flex-col justify-between rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden"
                >
                  {/* Book spine colored line */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-2.5"
                    style={{ backgroundColor: mat.coverColor || '#2563EB' }}
                  />

                  {/* Card Content */}
                  <div className="p-5 pl-7 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Top meta row */}
                      <div className="flex items-center justify-between text-xs text-slate-400 pb-3">
                        <div className="flex items-center gap-1.5 font-medium">
                          {mat.sourceType === 'video' ? (
                            <Video className="w-3.5 h-3.5 text-red-500" />
                          ) : mat.sourceType === 'file' ? (
                            <Upload className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <FileText className="w-3.5 h-3.5 text-blue-500" />
                          )}
                          <span className="capitalize">
                            {mat.sourceType === 'video' ? 'ვიდეო' : mat.sourceType === 'file' ? 'ფაილი' : 'ტექსტი'}
                          </span>
                        </div>
                        <span className="font-mono text-[11px]">{dateStr}</span>
                      </div>

                      {/* Title (2 lines) */}
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white font-serif line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {mat.title}
                      </h3>

                      {/* Excerpt */}
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {mat.rawText.slice(0, 120)}
                      </p>
                    </div>

                    {/* Progress Bar & Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
                        <span>მზადყოფნა</span>
                        <span className="font-mono font-semibold">100%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-indigo-600 h-1.5 rounded-full w-full" />
                      </div>

                      {/* Quick launch buttons */}
                      <div className="mt-3 flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectMaterial(mat.id, 'flashcards');
                            }}
                            className="px-2 py-1 text-[11px] rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 font-medium transition-colors"
                          >
                            ბარათები
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectMaterial(mat.id, 'quiz');
                            }}
                            className="px-2 py-1 text-[11px] rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 font-medium transition-colors"
                          >
                            ქვიზი
                          </button>
                        </div>

                        <button
                          onClick={(e) => handleDeleteMaterial(mat.id, e)}
                          className="p-1 rounded text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          title="წაშლა"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ================= MODALS ================= */}

      {/* 1. File Upload Modal */}
      {activeModal === 'file' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold font-serif text-slate-900 dark:text-white">
                მასალის დამატება ფაილიდან
              </h3>
              <button onClick={() => setActiveModal('none')} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-xl p-8 text-center cursor-pointer space-y-2 bg-slate-50 dark:bg-slate-800/40 transition-colors"
            >
              <Upload className="w-8 h-8 mx-auto text-indigo-600 dark:text-indigo-400" />
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {selectedFile ? selectedFile.name : 'ატვირთე ან ჩააგდე ფაილი'}
              </p>
              <p className="text-[11px] text-slate-400">
                PDF, Word, PowerPoint, Text ან სურათი · მაქს. 16MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept={ACCEPTED_FILE_TYPES}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
              />
            </div>

            {/* Collapsible Generation Parameters */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowOptions(!showOptions)}
                className="w-full flex items-center justify-between p-3 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60"
              >
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  <span>გენერაციის პარამეტრები</span>
                </div>
                <span>{showOptions ? '▲' : '▼'}</span>
              </button>

              {showOptions && (
                <div className="p-4 space-y-3 bg-white dark:bg-slate-900 text-xs">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1">
                      ბარათების რაოდენობა:
                    </label>
                    <select
                      value={options.flashcardsCount}
                      onChange={(e) => setOptions({ ...options, flashcardsCount: Number(e.target.value) })}
                      className="w-full p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value={0}>ავტომატური</option>
                      <option value={20}>20 ბარათი</option>
                      <option value={50}>50 ბარათი</option>
                      <option value={100}>100 ბარათი</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1">
                      კონსპექტის სიმოკლე:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[25, 40, 60].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setOptions({ ...options, summaryLengthPercent: pct as any })}
                          className={`py-1.5 text-center rounded border ${
                            options.summaryLengthPercent === pct
                              ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-semibold'
                              : 'border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {pct === 25 ? 'მოკლე (25%)' : pct === 40 ? 'სტანდარტული (40%)' : 'დეტალური (60%)'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setActiveModal('none')}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                გაუქმება
              </button>
              <button
                onClick={handleProcessFile}
                disabled={!selectedFile}
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors"
              >
                შემდეგი →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. YouTube Video Modal */}
      {activeModal === 'video' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold font-serif text-slate-900 dark:text-white">
                YouTube ვიდეოს დამატება
              </h3>
              <button onClick={() => setActiveModal('none')} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  ვიდეოს ბმული:
                </label>
                <input
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  ვიდეოს სათაური (არასავალდებულო):
                </label>
                <input
                  type="text"
                  placeholder="მაგ: სალექციო კურსი ისტორიაში"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  სუბტიტრები / ტრანსკრიპტი (არასავალდებულო):
                </label>
                <textarea
                  rows={4}
                  placeholder="ჩასვით ვიდეოს ტრანსკრიპტი ან შინაარსი..."
                  value={videoTranscript}
                  onChange={(e) => setVideoTranscript(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-[11px]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setActiveModal('none')}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                გაუქმება
              </button>
              <button
                onClick={handleProcessVideo}
                disabled={!youtubeUrl.trim()}
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors"
              >
                დამუშავება →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Text Modal */}
      {activeModal === 'text' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold font-serif text-slate-900 dark:text-white">
                ტექსტის შეყვანა
              </h3>
              <button onClick={() => setActiveModal('none')} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  სათაური:
                </label>
                <input
                  type="text"
                  placeholder="მაგ: კონსპექტი ფილოსოფიაში"
                  value={rawTextTitle}
                  onChange={(e) => setRawTextTitle(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-700 dark:text-slate-300 font-medium">
                    ჩანაწერების ტექსტი:
                  </label>
                  <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                    {rawTextInput.length} / 50 000 სიმბოლო
                  </span>
                </div>
                <textarea
                  rows={8}
                  placeholder="ჩასვი შენი ჩანაწერები აქ... (მინიმუმ 50 სიმბოლო)"
                  value={rawTextInput}
                  onChange={(e) => setRawTextInput(e.target.value)}
                  className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-sans leading-relaxed"
                />
              </div>

              {/* Best Results Advice Box */}
              <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-[11px] text-indigo-900 dark:text-indigo-300">
                <span className="font-semibold block mb-0.5">💡 რჩევა საუკეთესო შედეგისთვის:</span>
                გამოიყენე სათაურები (#), სიები (-) და მკაფიო განმარტებები ფორმით „X არის Y“ ან „X ეწოდება Y-ს“.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setActiveModal('none')}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                გაუქმება
              </button>
              <button
                onClick={handleProcessText}
                disabled={rawTextInput.trim().length < 50}
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors"
              >
                დამუშავება →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. New Folder Modal */}
      {activeModal === 'newFolder' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold font-serif text-slate-900 dark:text-white">
              ახალი ფოლდერი
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  ფოლდერის სახელი:
                </label>
                <input
                  type="text"
                  placeholder="მაგ: ეკონომიკა"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  ფერი:
                </label>
                <div className="flex items-center gap-2">
                  {['#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED', '#DB2777'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewFolderColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        newFolderColor === c ? 'scale-110 border-white ring-2 ring-indigo-500' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setActiveModal('none')}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                გაუქმება
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg"
              >
                შექმნა
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
