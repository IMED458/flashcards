import React, { useState, useEffect, useRef } from 'react';
import { FillBlank } from '../../lib/engine/types';
import { verifyAnswer, VerificationResult } from '../../lib/engine/stringSimilarity';
import { db } from '../../lib/db';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Lightbulb,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Award,
  Layers
} from 'lucide-react';
import { playCorrectSound, playIncorrectSound } from '../../lib/sounds';
import confetti from 'canvas-confetti';

interface FillBlankModuleProps {
  materialId: string;
  items: FillBlank[];
  onNavigateToFlashcards: () => void;
}

export const FillBlankModule: React.FC<FillBlankModuleProps> = ({
  materialId,
  items,
  onNavigateToFlashcards
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [userHistory, setUserHistory] = useState<Record<number, { input: string; isCorrect: boolean }>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [activeItems, setActiveItems] = useState<FillBlank[]>(items);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setActiveItems(items);
  }, [items]);

  useEffect(() => {
    if (!isAnswered && !isFinished) {
      inputRef.current?.focus();
    }
  }, [currentIndex, isAnswered, isFinished]);

  const currentItem = activeItems[currentIndex];

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isAnswered || !currentItem) return;

    const res = verifyAnswer(userInput, currentItem.answer, currentItem.acceptedAnswers);
    setResult(res);
    setIsAnswered(true);

    setUserHistory(prev => ({
      ...prev,
      [currentIndex]: { input: userInput, isCorrect: res.isCorrect }
    }));

    if (res.isCorrect) {
      playCorrectSound();
    } else {
      playIncorrectSound();
    }
  };

  const handleGiveUp = () => {
    if (isAnswered || !currentItem) return;
    const res: VerificationResult = {
      status: 'incorrect',
      isCorrect: false,
      feedbackText: `სწორი პასუხი: ${currentItem.answer}`
    };
    setResult(res);
    setIsAnswered(true);
    setUserHistory(prev => ({
      ...prev,
      [currentIndex]: { input: 'ვერ გავიხსენე', isCorrect: false }
    }));
    playIncorrectSound();
  };

  const handleNext = () => {
    if (currentIndex < activeItems.length - 1) {
      setCurrentIndex(c => c + 1);
      setUserInput('');
      setShowHint(false);
      setIsAnswered(false);
      setResult(null);
    } else {
      setIsFinished(true);

      // Save attempt
      let correctCount = 0;
      activeItems.forEach((_, idx) => {
        if (userHistory[idx]?.isCorrect) correctCount++;
      });
      db.attempts.add({
        id: 'att-fill-' + Date.now(),
        materialId,
        type: 'fill',
        score: correctCount,
        total: activeItems.length,
        answers: userHistory,
        durationSec: 60,
        finishedAt: new Date().toISOString()
      }).catch(() => {});

      if (correctCount / activeItems.length >= 0.75) {
        try {
          confetti({ particleCount: 65, spread: 55, origin: { y: 0.6 } });
        } catch (e) {}
      }
    }
  };

  const handleRestart = () => {
    setActiveItems(items);
    setCurrentIndex(0);
    setUserInput('');
    setShowHint(false);
    setIsAnswered(false);
    setResult(null);
    setUserHistory({});
    setIsFinished(false);
  };

  const handleRetryMistakes = () => {
    const mistakes = activeItems.filter((_, idx) => !userHistory[idx]?.isCorrect);
    if (mistakes.length === 0) return;
    setActiveItems(mistakes);
    setCurrentIndex(0);
    setUserInput('');
    setShowHint(false);
    setIsAnswered(false);
    setResult(null);
    setUserHistory({});
    setIsFinished(false);
  };

  if (!currentItem && !isFinished) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <HelpCircle className="w-10 h-10 mx-auto text-slate-400" />
        <h3 className="text-base font-bold font-serif text-slate-800 dark:text-slate-200">
          ამ მასალისთვის წერითი კითხვები არ მოიძებნა
        </h3>
      </div>
    );
  }

  // FINISHED SCREEN
  if (isFinished) {
    let correctCount = 0;
    activeItems.forEach((_, idx) => {
      if (userHistory[idx]?.isCorrect) correctCount++;
    });
    const percent = Math.round((correctCount / activeItems.length) * 100);
    const mistakes = activeItems.filter((_, idx) => !userHistory[idx]?.isCorrect);

    return (
      <div className="max-w-2xl mx-auto my-8 p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 text-center animate-in fade-in">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
          <Award className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-2xl font-bold font-serif text-slate-900 dark:text-white">
            წერითი ტესტი დასრულდა!
          </h2>
          <div className="mt-2 text-4xl font-mono font-bold text-slate-900 dark:text-white">
            {correctCount} / {activeItems.length}{' '}
            <span className="text-2xl font-normal text-slate-400">· {percent}%</span>
          </div>
        </div>

        {/* Mistakes */}
        {mistakes.length > 0 && (
          <div className="text-left space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              შესწორებები ({mistakes.length} შეცდომა):
            </h3>
            <div className="space-y-2.5">
              {mistakes.map((m, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-red-100 dark:border-red-900/30 bg-red-50/20 text-xs space-y-1">
                  <p className="font-serif text-slate-900 dark:text-slate-100">
                    {m.before} <span className="font-bold underline text-emerald-600">{m.answer}</span> {m.after}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handleRestart}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>თავიდან დაწყება</span>
          </button>

          {mistakes.length > 0 && (
            <button
              onClick={handleRetryMistakes}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-all"
            >
              <span>მხოლოდ შეცდომების გამეორება ({mistakes.length})</span>
            </button>
          )}

          <button
            onClick={onNavigateToFlashcards}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all"
          >
            <Layers className="w-4 h-4" />
            <span>ბარათებზე გადასვლა</span>
          </button>
        </div>
      </div>
    );
  }

  // ACTIVE ITEM
  const progressPercent = Math.round(((currentIndex + 1) / activeItems.length) * 100);

  return (
    <div className="max-w-2xl mx-auto my-8 p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
      {/* Top progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>
            კითხვა <span className="font-mono font-bold text-slate-900 dark:text-white">{currentIndex + 1}</span> / {activeItems.length}
          </span>
          <span className="font-mono tabular-nums">{progressPercent}%</span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Sentence with blank block */}
      <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 leading-relaxed text-base sm:text-lg font-serif text-slate-900 dark:text-white">
        <span>{currentItem.before} </span>
        <span
          className={`inline-block px-3 py-0.5 rounded-lg border font-mono font-semibold transition-all ${
            isAnswered
              ? result?.isCorrect
                ? 'bg-emerald-100 dark:bg-emerald-950 border-emerald-500 text-emerald-800 dark:text-emerald-200'
                : 'bg-red-100 dark:bg-red-950 border-red-500 text-red-800 dark:text-red-200'
              : 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-500 min-w-24 text-center'
          }`}
        >
          {isAnswered ? currentItem.answer : '______'}
        </span>
        <span> {currentItem.after}</span>
      </div>

      {/* Form Input */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            placeholder="ჩაწერე პასუხი..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            disabled={isAnswered}
            className={`flex-1 p-3.5 rounded-xl border text-sm font-sans focus:outline-none transition-all ${
              isAnswered
                ? result?.status === 'correct'
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200'
                  : result?.status === 'almost_correct'
                  ? 'border-amber-500 bg-amber-50/50 text-amber-900'
                  : 'border-red-500 bg-red-50/50 text-red-900'
                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
            }`}
          />

          {!isAnswered ? (
            <button
              type="submit"
              disabled={!userInput.trim()}
              className="px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs transition-colors shadow-xs"
            >
              შემოწმება
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-xs"
            >
              <span>შემდეგი</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Feedback text */}
        {isAnswered && result && (
          <div
            className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
              result.status === 'correct'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : result.status === 'almost_correct'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {result.status === 'correct' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <XCircle className="w-4 h-4 text-red-600" />
            )}
            <span>{result.feedbackText}</span>
          </div>
        )}

        {/* Hint button & Give up link */}
        <div className="flex items-center justify-between text-xs pt-1">
          {currentItem.hint && !isAnswered && (
            <button
              type="button"
              onClick={() => setShowHint(!showHint)}
              className="flex items-center gap-1 text-slate-500 hover:text-indigo-600 transition-colors"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>{showHint ? `მინიშნება: ${currentItem.hint}` : '💡 მინიშნება'}</span>
            </button>
          )}

          {!isAnswered && (
            <button
              type="button"
              onClick={handleGiveUp}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 ml-auto transition-colors"
            >
              ვერ ვიხსენებ, ვნახოთ პასუხი
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
