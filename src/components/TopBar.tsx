import React from 'react';
import { AppView, StudyTab } from '../lib/store';
import {
  BookOpen,
  Timer,
  Moon,
  Sun,
  HelpCircle,
  FolderOpen,
  Home,
  CheckCircle2
} from 'lucide-react';

interface TopBarProps {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  currentMaterialTitle?: string;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  openFocusPopover: () => void;
  focusTimerText: string;
  isTimerRunning: boolean;
  onOpenShortcuts: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentView,
  setCurrentView,
  currentMaterialTitle,
  theme,
  setTheme,
  openFocusPopover,
  focusTimerText,
  isTimerRunning,
  onOpenShortcuts
}) => {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-8 px-6 py-3.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      {/* Zone 1: Brand wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => setCurrentView('landing')}
          className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap group hover:opacity-90 transition-opacity"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
            <BookOpen className="w-4 h-4" />
          </div>
          <span className="font-serif">სწავლა</span>
        </button>
      </div>

      {/* Zone 2: Single-line clean navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
        <button
          onClick={() => setCurrentView('landing')}
          className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
            currentView === 'landing' ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : ''
          }`}
        >
          მთავარი
        </button>
        <button
          onClick={() => setCurrentView('dashboard')}
          className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
            currentView === 'dashboard' ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : ''
          }`}
        >
          სასწავლო მასალები
        </button>
        <button
          onClick={() => setCurrentView('focus')}
          className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
            currentView === 'focus' ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : ''
          }`}
        >
          ფოკუსი
        </button>
        <button
          onClick={() => setCurrentView('settings')}
          className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
            currentView === 'settings' ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : ''
          }`}
        >
          პარამეტრები
        </button>

        {currentMaterialTitle && currentView === 'study' && (
          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 max-w-xs truncate">
            <span>/</span>
            <span className="text-slate-800 dark:text-slate-200 truncate font-semibold font-serif">
              {currentMaterialTitle}
            </span>
          </div>
        )}
      </nav>

      {/* Zone 3: Primary Action / Utilities */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Focus timer trigger */}
        <button
          onClick={openFocusPopover}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            isTimerRunning
              ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
          title="ფოკუს-ტაიმერი (პომოდორო)"
        >
          <Timer className="w-3.5 h-3.5" />
          <span className="font-mono tabular-nums">{focusTimerText}</span>
          <span className="hidden sm:inline">ფოკუსი</span>
        </button>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={theme === 'dark' ? 'ნათელი თემა' : 'მუქი თემა'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Shortcuts ? button */}
        <button
          onClick={onOpenShortcuts}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="კლავიატურის შორთქათები (?)"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
