/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppView, StudyTab, FocusTimerState, getInitialTheme } from './lib/store';
import {
  db,
  initializeDatabase,
  MaterialRecord,
  FolderRecord,
  NotesRecord,
  DocTreeRecord,
  MindmapRecord
} from './lib/db';
import { Flashcard, QuizQuestion, FillBlank, Notes, MindNode } from './lib/engine/types';

import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { LandingPage } from './components/LandingPage';
import { FocusTimer } from './components/FocusTimer';
import { SettingsPage } from './components/SettingsPage';
import { ProcessingView } from './components/ProcessingView';
import { ShortcutsModal } from './components/ShortcutsModal';

import { NotesModule } from './components/modules/NotesModule';
import { QuizModule } from './components/modules/QuizModule';
import { MindMapModule } from './components/modules/MindMapModule';
import { FlashcardsModule } from './components/modules/FlashcardsModule';
import { FillBlankModule } from './components/modules/FillBlankModule';
import { ContentModule } from './components/modules/ContentModule';
import { ReviewScreen } from './components/modules/ReviewScreen';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [activeStudyTab, setActiveStudyTab] = useState<StudyTab>('summary');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme());

  // Database records
  const [materials, setMaterials] = useState<MaterialRecord[]>([]);
  const [folders, setFolders] = useState<FolderRecord[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  // Active study material
  const [activeMaterialId, setActiveMaterialId] = useState<string | null>(null);
  const [currentMaterial, setCurrentMaterial] = useState<MaterialRecord | null>(null);
  const [notesData, setNotesData] = useState<Notes | null>(null);
  const [cardsData, setCardsData] = useState<Flashcard[]>([]);
  const [quizData, setQuizData] = useState<QuizQuestion[]>([]);
  const [fillData, setFillData] = useState<FillBlank[]>([]);
  const [mindmapData, setMindmapData] = useState<MindNode | null>(null);

  // Processing state
  const [processingTitle, setProcessingTitle] = useState<string | null>(null);

  // Focus timer state
  const [isFocusPopoverOpen, setIsFocusPopoverOpen] = useState(false);
  const [focusTimer, setFocusTimer] = useState<FocusTimerState>({
    minutes: 25,
    seconds: 0,
    isRunning: false,
    mode: 'work',
    sessionCount: 1,
    soundEnabled: true,
    selectedDuration: 25
  });

  // Shortcuts modal
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Initialize DB and load materials
  const loadData = async () => {
    try {
      await initializeDatabase();
      const mats = await db.materials.toArray();
      const flds = await db.folders.toArray();
      setMaterials(mats);
      setFolders(flds);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to initialize database', err);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Theme synchronization with documentElement
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('study_theme', theme);
    } catch {
      /* storage unavailable */
    }
  }, [theme]);

  // Load active material details
  useEffect(() => {
    if (!activeMaterialId) return;

    const fetchMaterialDetails = async () => {
      const mat = await db.materials.get(activeMaterialId);
      if (mat) {
        setCurrentMaterial(mat);
        const nRec = await db.notes.get(activeMaterialId);
        if (nRec) setNotesData(nRec.auto);

        const cards = await db.flashcards.where('materialId').equals(activeMaterialId).toArray();
        setCardsData(cards);

        const quiz = await db.quizQuestions.where('materialId').equals(activeMaterialId).toArray();
        setQuizData(quiz);

        const fills = await db.fillBlanks.where('materialId').equals(activeMaterialId).toArray();
        setFillData(fills);

        const mRec = await db.mindmaps.get(activeMaterialId);
        if (mRec) setMindmapData(mRec.auto);
      }
    };

    fetchMaterialDetails();
  }, [activeMaterialId]);

  // Global keyboard shortcuts (1-6 for modules, [ for sidebar, ? for help)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsOpen(prev => !prev);
      } else if (e.key === '[') {
        e.preventDefault();
        setIsSidebarCollapsed(prev => !prev);
      } else if (currentView === 'study') {
        if (e.key === '1') setActiveStudyTab('summary');
        else if (e.key === '2') setActiveStudyTab('quiz');
        else if (e.key === '3') setActiveStudyTab('mindmap');
        else if (e.key === '4') setActiveStudyTab('flashcards');
        else if (e.key === '5') setActiveStudyTab('fill-in-the-blank');
        else if (e.key === '6') setActiveStudyTab('content');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentView]);

  // Select material to study
  const handleSelectMaterial = (id: string, initialTab: StudyTab = 'summary') => {
    setActiveMaterialId(id);
    setActiveStudyTab(initialTab);
    setCurrentView('study');
  };

  // Start processing view
  const handleStartProcessing = (title: string) => {
    setProcessingTitle(title);
  };

  const handleFinishProcessing = () => {
    setProcessingTitle(null);
    loadData();
    // Select the newest material
    db.materials.toArray().then(mats => {
      if (mats.length > 0) {
        const sorted = mats.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        handleSelectMaterial(sorted[0].id, 'summary');
      }
    });
  };

  const handleGoToReview = () => {
    setProcessingTitle(null);
    loadData();
    db.materials.toArray().then(mats => {
      if (mats.length > 0) {
        const sorted = mats.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        handleSelectMaterial(sorted[0].id, 'review');
      }
    });
  };

  const timerText = `${String(focusTimer.minutes).padStart(2, '0')}:${String(focusTimer.seconds).padStart(2, '0')}`;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* TopBar */}
      <TopBar
        currentView={currentView}
        setCurrentView={setCurrentView}
        currentMaterialTitle={currentMaterial?.title}
        theme={theme}
        setTheme={setTheme}
        openFocusPopover={() => setIsFocusPopoverOpen(!isFocusPopoverOpen)}
        focusTimerText={timerText}
        isTimerRunning={focusTimer.isRunning}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />

      {/* Focus Timer Popover */}
      {isFocusPopoverOpen && (
        <div className="fixed top-16 right-6 z-50 animate-in fade-in zoom-in-95 duration-150">
          <FocusTimer
            timer={focusTimer}
            setTimer={setFocusTimer}
            isPopover={true}
            onClosePopover={() => setIsFocusPopoverOpen(false)}
          />
        </div>
      )}

      {/* Main Body with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar (shown in study and dashboard views) */}
        {(currentView === 'dashboard' || currentView === 'study') && (
          <Sidebar
            currentView={currentView}
            setCurrentView={setCurrentView}
            activeStudyTab={activeStudyTab}
            setActiveStudyTab={setActiveStudyTab}
            isCollapsed={isSidebarCollapsed}
            setIsCollapsed={setIsSidebarCollapsed}
            materialTitle={currentMaterial?.title}
            progressPercent={85}
            streakDays={3}
            folders={folders}
            selectedFolderId={selectedFolderId}
            setSelectedFolderId={setSelectedFolderId}
          />
        )}

        {/* Content View Routing */}
        <main className="flex-1 overflow-y-auto">
          {processingTitle ? (
            <ProcessingView
              title={processingTitle}
              onFinish={handleFinishProcessing}
              onGoToReview={handleGoToReview}
            />
          ) : currentView === 'landing' ? (
            <LandingPage onStartLearning={() => setCurrentView('dashboard')} />
          ) : currentView === 'dashboard' ? (
            <Dashboard
              materials={materials}
              folders={folders}
              onSelectMaterial={handleSelectMaterial}
              onRefreshMaterials={loadData}
              onStartProcessing={handleStartProcessing}
              selectedFolderId={selectedFolderId}
              setSelectedFolderId={setSelectedFolderId}
            />
          ) : currentView === 'focus' ? (
            <div className="p-6">
              <FocusTimer timer={focusTimer} setTimer={setFocusTimer} />
            </div>
          ) : currentView === 'settings' ? (
            <SettingsPage
              theme={theme}
              setTheme={setTheme}
              onRefreshAll={loadData}
            />
          ) : currentView === 'study' && currentMaterial ? (
            /* STUDY MODULES VIEW */
            <div>
              {activeStudyTab === 'summary' && notesData && (
                <NotesModule
                  materialId={currentMaterial.id}
                  notes={notesData}
                  onNavigateToQuiz={() => setActiveStudyTab('quiz')}
                  onNavigateToFlashcards={() => setActiveStudyTab('flashcards')}
                />
              )}

              {activeStudyTab === 'quiz' && (
                <QuizModule
                  materialId={currentMaterial.id}
                  questions={quizData}
                  onNavigateToFlashcards={() => setActiveStudyTab('flashcards')}
                  onNavigateToNotes={() => setActiveStudyTab('summary')}
                />
              )}

              {activeStudyTab === 'mindmap' && mindmapData && (
                <div className="p-6 max-w-7xl mx-auto">
                  <MindMapModule
                    initialMindmap={mindmapData}
                    onNavigateToNotesSection={() => setActiveStudyTab('summary')}
                  />
                </div>
              )}

              {activeStudyTab === 'flashcards' && (
                <FlashcardsModule
                  materialId={currentMaterial.id}
                  cards={cardsData}
                  onRefreshCards={loadData}
                />
              )}

              {activeStudyTab === 'fill-in-the-blank' && (
                <FillBlankModule
                  materialId={currentMaterial.id}
                  items={fillData}
                  onNavigateToFlashcards={() => setActiveStudyTab('flashcards')}
                />
              )}

              {activeStudyTab === 'content' && (
                <ContentModule material={currentMaterial} />
              )}

              {activeStudyTab === 'review' && (
                <ReviewScreen
                  materialId={currentMaterial.id}
                  flashcards={cardsData}
                  quizQuestions={quizData}
                  fillBlanks={fillData}
                  onRefreshAll={loadData}
                  onGoToStudy={() => setActiveStudyTab('summary')}
                />
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400">
              იტვირთება...
            </div>
          )}
        </main>
      </div>

      {/* Keyboard Shortcuts Modal */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
}
