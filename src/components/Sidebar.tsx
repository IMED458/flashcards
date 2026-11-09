import React from 'react';
import { AppView, StudyTab } from '../lib/store';
import {
  FileText,
  HelpCircle,
  Network,
  Layers,
  Edit3,
  FileCode,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Sliders,
  CheckCircle,
  Folder,
  Flame,
  Clock,
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  activeStudyTab: StudyTab;
  setActiveStudyTab: (tab: StudyTab) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  materialTitle?: string;
  progressPercent?: number;
  streakDays?: number;
  folders?: { id: string; name: string; color: string }[];
  selectedFolderId?: string;
  setSelectedFolderId?: (id: string | undefined) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  setCurrentView,
  activeStudyTab,
  setActiveStudyTab,
  isCollapsed,
  setIsCollapsed,
  materialTitle,
  progressPercent = 0,
  streakDays = 3,
  folders = [],
  selectedFolderId,
  setSelectedFolderId
}) => {
  const studyModules: { id: StudyTab; label: string; num: string; icon: React.FC<any> }[] = [
    { id: 'summary', label: 'ჩანაწერები', num: '1', icon: FileText },
    { id: 'quiz', label: 'ქვიზი', num: '2', icon: HelpCircle },
    { id: 'mindmap', label: 'ცოდნის რუკა', num: '3', icon: Network },
    { id: 'flashcards', label: 'ბარათები', num: '4', icon: Layers },
    { id: 'fill-in-the-blank', label: 'წერითი ტესტი', num: '5', icon: Edit3 },
    { id: 'content', label: 'კონტენტი', num: '6', icon: FileCode }
  ];

  return (
    <aside
      className={`relative shrink-0 flex flex-col justify-between border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-200 z-30 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top section */}
      <div className="p-3 space-y-4">
        {/* Collapse toggle */}
        <div className="flex items-center justify-between px-2">
          {!isCollapsed && (
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {currentView === 'study' ? 'მოდულები' : 'მენიუ'}
            </span>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-auto"
            title={isCollapsed ? 'გაშლა ([)' : 'ჩაკეცვა ([)'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* STUDY MODE NAVIGATION */}
        {currentView === 'study' ? (
          <div className="space-y-3">
            {/* Back to materials button */}
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`flex items-center gap-2.5 w-full py-2 px-2.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                isCollapsed ? 'justify-center' : ''
              }`}
              title="ყველა მასალაზე დაბრუნება"
            >
              <ArrowLeft className="w-4 h-4 shrink-0 text-slate-500" />
              {!isCollapsed && <span>ყველა მასალა</span>}
            </button>

            {/* Material info & Progress */}
            {!isCollapsed && materialTitle && (
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-2 font-serif">
                  {materialTitle}
                </p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span>სწავლის პროგრესი</span>
                  <span className="font-mono font-semibold">{progressPercent}%</span>
                </div>
                <div className="mt-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* 6 Study Modules */}
            <nav className="space-y-1">
              {studyModules.map((item) => {
                const Icon = item.icon;
                const isActive = activeStudyTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveStudyTab(item.id)}
                    className={`flex items-center justify-between w-full py-2 px-2.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                    } ${isCollapsed ? 'justify-center' : ''}`}
                    title={`${item.label} (${item.num})`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </div>
                    {!isCollapsed && (
                      <kbd className="text-[10px] font-mono px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400">
                        {item.num}
                      </kbd>
                    )}
                  </button>
                );
              })}

              {/* Review / Quality Edit Button */}
              <button
                onClick={() => setActiveStudyTab('review')}
                className={`flex items-center justify-between w-full py-2 px-2.5 mt-2 rounded-lg text-xs font-medium border border-dashed border-slate-300 dark:border-slate-700 transition-all ${
                  activeStudyTab === 'review'
                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                } ${isCollapsed ? 'justify-center' : ''}`}
                title="გადახედვა / ხარისხის რედაქტირება"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Sliders className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  {!isCollapsed && <span>გადახედვა / შეცვლა</span>}
                </div>
              </button>
            </nav>
          </div>
        ) : (
          /* DASHBOARD / GENERAL NAVIGATION */
          <div className="space-y-4">
            <nav className="space-y-1">
              <button
                onClick={() => {
                  if (setSelectedFolderId) setSelectedFolderId(undefined);
                  setCurrentView('dashboard');
                }}
                className={`flex items-center gap-2.5 w-full py-2 px-2.5 rounded-lg text-xs font-medium transition-colors ${
                  currentView === 'dashboard' && !selectedFolderId
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                } ${isCollapsed ? 'justify-center' : ''}`}
              >
                <Layers className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>სასწავლო ნაკრებები</span>}
              </button>

              <button
                onClick={() => setCurrentView('focus')}
                className={`flex items-center gap-2.5 w-full py-2 px-2.5 rounded-lg text-xs font-medium transition-colors ${
                  currentView === 'focus'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                } ${isCollapsed ? 'justify-center' : ''}`}
              >
                <Clock className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>ფოკუსი</span>}
              </button>
            </nav>

            {/* Folders List */}
            {!isCollapsed && folders.length > 0 && (
              <div className="pt-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2">
                  ფოლდერები
                </span>
                <div className="mt-1 space-y-0.5">
                  {folders.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        if (setSelectedFolderId) setSelectedFolderId(f.id);
                        setCurrentView('dashboard');
                      }}
                      className={`flex items-center gap-2 w-full py-1.5 px-2 rounded-lg text-xs text-left transition-colors ${
                        selectedFolderId === f.id
                          ? 'bg-slate-100 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <Folder className="w-3.5 h-3.5 shrink-0" style={{ color: f.color }} />
                      <span className="truncate">{f.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom user profile / streak */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800">
        {!isCollapsed ? (
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                სტ
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">სტუდენტი</p>
                <p className="text-[10px] text-slate-400">ლოკალური პროფილი</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-mono text-xs font-bold" title="დღეები ზედიზედ">
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>{streakDays}</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center" title="სტუდენტის პროფილი">
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
              სტ
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
