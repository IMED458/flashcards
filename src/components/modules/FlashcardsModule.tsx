import React, { useState, useEffect } from 'react';
import { Flashcard } from '../../lib/engine/types';
import { db } from '../../lib/db';
import {
  RotateCw,
  Check,
  X,
  Star,
  Shuffle,
  RotateCcw,
  Plus,
  Download,
  Edit2,
  Trash2,
  BookOpen,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import { playFlipSound, playCorrectSound, playIncorrectSound } from '../../lib/sounds';
import confetti from 'canvas-confetti';

interface FlashcardsModuleProps {
  materialId: string;
  cards: Flashcard[];
  onRefreshCards?: () => void;
}

export const FlashcardsModule: React.FC<FlashcardsModuleProps> = ({
  materialId,
  cards,
  onRefreshCards
}) => {
  const [activeCards, setActiveCards] = useState<Flashcard[]>(cards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knewCount, setKnewCount] = useState(0);
  const [didNotKnowCount, setDidNotKnowCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'starred' | 'due'>('all');
  const [unknownCards, setUnknownCards] = useState<Flashcard[]>([]);

  // Manual Add Card Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');

  useEffect(() => {
    setActiveCards(cards);
  }, [cards]);

  // Keyboard navigation: Space = Flip, Left = Don't Know, Right = Know
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showAddModal || isFinished) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (isFlipped) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          handleRateCard(false);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          handleRateCard(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, currentIndex, activeCards, isFinished, showAddModal]);

  const currentCard = activeCards[currentIndex];

  const handleFlip = () => {
    playFlipSound();
    setIsFlipped(!isFlipped);
  };

  const handleRateCard = async (knew: boolean) => {
    if (!currentCard) return;

    if (knew) {
      setKnewCount(k => k + 1);
      playCorrectSound();
    } else {
      setDidNotKnowCount(d => d + 1);
      setUnknownCards(prev => [...prev, currentCard]);
      playIncorrectSound();
    }

    // Save review record in IndexedDB
    db.reviews.add({
      id: 'rev-' + Date.now(),
      flashcardId: currentCard.id,
      rating: knew ? 'knew' : 'did_not_know',
      reviewedAt: new Date().toISOString()
    }).catch(() => {});

    // Update FSRS interval on card
    const nextInterval = knew ? (currentCard.fsrs?.intervalDays || 1) * 2 : 1;
    const dueDate = new Date(Date.now() + nextInterval * 24 * 60 * 60 * 1000).toISOString();
    await db.flashcards.update(currentCard.id, {
      fsrs: {
        repetitions: (currentCard.fsrs?.repetitions || 0) + 1,
        intervalDays: nextInterval,
        easeFactor: currentCard.fsrs?.easeFactor || 2.5,
        dueDate,
        lastReviewed: new Date().toISOString()
      }
    });

    if (currentIndex < activeCards.length - 1) {
      setIsFlipped(false);
      setCurrentIndex(c => c + 1);
    } else {
      setIsFinished(true);
      if ((knewCount + (knew ? 1 : 0)) / activeCards.length >= 0.75) {
        try {
          confetti({ particleCount: 60, spread: 55, origin: { y: 0.6 } });
        } catch (e) {}
      }
    }
  };

  // Toggle star
  const handleToggleStar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentCard) return;
    const nextStarred = !currentCard.starred;
    await db.flashcards.update(currentCard.id, { starred: nextStarred });
    setActiveCards(prev =>
      prev.map(c => (c.id === currentCard.id ? { ...c, starred: nextStarred } : c))
    );
  };

  // Shuffle cards
  const handleShuffle = () => {
    const shuffled = [...activeCards].sort(() => Math.random() - 0.5);
    setActiveCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsFinished(false);
  };

  // Restart
  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnewCount(0);
    setDidNotKnowCount(0);
    setUnknownCards([]);
    setIsFinished(false);
  };

  // Repeat unknown
  const handleRepeatUnknown = () => {
    if (unknownCards.length === 0) return;
    setActiveCards(unknownCards);
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnewCount(0);
    setDidNotKnowCount(0);
    setUnknownCards([]);
    setIsFinished(false);
  };

  // Export Anki CSV
  const handleExportAnki = () => {
    const csvContent = activeCards
      .map(c => `"${c.front.replace(/"/g, '""')}"\t"${c.back.replace(/"/g, '""')}"`)
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/tab-separated-values;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ბარათები_Anki.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Add manual card
  const handleAddManualCard = async () => {
    if (!newFront.trim() || !newBack.trim()) return;
    const newCard: Flashcard = {
      id: 'card-man-' + Date.now(),
      materialId,
      front: newFront.trim(),
      back: newBack.trim(),
      sourceRef: { sectionTitle: 'ხელით დამატებული' },
      quality: 1.0,
      origin: 'manual',
      starred: false
    };
    await db.flashcards.add(newCard);
    setActiveCards(prev => [...prev, newCard]);
    setNewFront('');
    setNewBack('');
    setShowAddModal(false);
    if (onRefreshCards) onRefreshCards();
  };

  if (!currentCard && !isFinished) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <Layers className="w-10 h-10 mx-auto text-slate-400" />
        <h3 className="text-base font-bold font-serif text-slate-800 dark:text-slate-200">
          ბარათები ვერ მოიძებნა
        </h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
        >
          ბარათის ხელით დამატება
        </button>
      </div>
    );
  }

  // ROUND FINISHED SCREEN
  if (isFinished) {
    const total = knewCount + didNotKnowCount;
    const pct = total > 0 ? Math.round((knewCount / total) * 100) : 100;

    return (
      <div className="max-w-xl mx-auto my-8 p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-6 animate-in fade-in">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
          <Layers className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold font-serif text-slate-900 dark:text-white">
            რაუნდი დასრულდა!
          </h2>
          <div className="mt-3 text-3xl font-mono font-bold text-slate-900 dark:text-white">
            {knewCount} <span className="text-emerald-600 text-lg font-normal">ვიცოდი</span> · {didNotKnowCount} <span className="text-red-500 text-lg font-normal">არ ვიცოდი</span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            შედეგი: {pct}%
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handleRestart}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>თავიდან დაწყება</span>
          </button>

          {unknownCards.length > 0 && (
            <button
              onClick={handleRepeatUnknown}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-all"
            >
              <span>არცოდნილების გამეორება ({unknownCards.length})</span>
            </button>
          )}

          <button
            onClick={handleShuffle}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors"
          >
            <Shuffle className="w-4 h-4" />
            <span>არევა</span>
          </button>
        </div>
      </div>
    );
  }

  // ACTIVE CARD SCREEN
  const progressPercent = Math.round(((currentIndex + 1) / activeCards.length) * 100);

  return (
    <div className="max-w-2xl mx-auto my-6 px-4 space-y-6">
      {/* Top Controls Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <span>
            ბარათი <span className="font-mono font-bold text-slate-900 dark:text-white">{currentIndex + 1}</span> / {activeCards.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShuffle}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="არევა (Shuffle)"
          >
            <Shuffle className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="ბარათის დამატება"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportAnki}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Anki ექსპორტი"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* 3D Flip Card Container */}
      <div
        onClick={handleFlip}
        className="perspective-1000 w-full min-h-[340px] cursor-pointer"
      >
        <div
          className={`relative w-full h-full min-h-[340px] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-transform duration-300 transform-style-preserve-3d ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* FRONT SIDE */}
          <div className="absolute inset-0 backface-hidden p-8 flex flex-col justify-between bg-white dark:bg-slate-900 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                კითხვა
              </span>
              <button onClick={handleToggleStar} className="p-1 text-slate-300 hover:text-amber-500 transition-colors">
                <Star className={`w-5 h-5 ${currentCard.starred ? 'fill-amber-400 text-amber-400' : ''}`} />
              </button>
            </div>

            <div className="my-auto py-4">
              <h2 className="text-xl sm:text-2xl font-bold font-serif text-slate-900 dark:text-white leading-relaxed text-center">
                {currentCard.front}
              </h2>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-4 border-t border-slate-100 dark:border-slate-800/80">
              <span>{currentCard.sourceRef?.sectionTitle ? `სექცია: ${currentCard.sourceRef.sectionTitle}` : ''}</span>
              <span className="text-indigo-500 font-medium">დააჭირე ან [Space] · პასუხის სანახავად</span>
            </div>
          </div>

          {/* BACK SIDE */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 p-8 flex flex-col justify-between bg-indigo-50/30 dark:bg-slate-900 rounded-2xl border-indigo-200 dark:border-indigo-900/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                ✓ პასუხი
              </span>
              <button onClick={handleToggleStar} className="p-1 text-slate-300 hover:text-amber-500 transition-colors">
                <Star className={`w-5 h-5 ${currentCard.starred ? 'fill-amber-400 text-amber-400' : ''}`} />
              </button>
            </div>

            <div className="my-auto py-4">
              <p className="text-lg sm:text-xl font-medium text-slate-900 dark:text-white leading-relaxed text-center">
                {currentCard.back}
              </p>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-4 border-t border-slate-200/60 dark:border-slate-800">
              <span>{currentCard.sourceRef?.sectionTitle ? `წყარო: ${currentCard.sourceRef.sectionTitle}` : ''}</span>
              <span className="text-slate-400">← არ ვიცოდი · ვიცოდი →</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Rating Controls (Visible after flip) */}
      {isFlipped ? (
        <div className="flex items-center justify-center gap-4 animate-in fade-in duration-150">
          <button
            onClick={() => handleRateCard(false)}
            className="flex-1 max-w-xs flex items-center justify-center gap-2 py-3 px-6 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-100 font-semibold text-xs transition-colors"
          >
            <X className="w-4 h-4" />
            <span>არ ვიცოდი (←)</span>
          </button>
          <button
            onClick={() => handleRateCard(true)}
            className="flex-1 max-w-xs flex items-center justify-center gap-2 py-3 px-6 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-semibold text-xs transition-colors"
          >
            <Check className="w-4 h-4" />
            <span>ვიცოდი (→)</span>
          </button>
        </div>
      ) : (
        <div className="text-center text-xs text-slate-400 py-2">
          დააჭირეთ ბარათს ან დააჭირეთ <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">Space</kbd> პასუხის სანახავად
        </div>
      )}

      {/* Manual Add Card Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="text-base font-bold font-serif text-slate-900 dark:text-white">
              ახალი ბარათის დამატება
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">
                  წინა მხარე (კითხვა / ტერმინი):
                </label>
                <textarea
                  rows={2}
                  value={newFront}
                  onChange={(e) => setNewFront(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  placeholder="მაგ: რა არის დნმ?"
                />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">
                  უკანა მხარე (პასუხი / განმარტება):
                </label>
                <textarea
                  rows={3}
                  value={newBack}
                  onChange={(e) => setNewBack(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  placeholder="მაგ: დეზოქსირიბონუკლეინის მჟავა..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600"
              >
                გაუქმება
              </button>
              <button
                onClick={handleAddManualCard}
                disabled={!newFront.trim() || !newBack.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                დამატება
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
