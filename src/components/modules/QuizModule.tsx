import React, { useState, useEffect } from 'react';
import { QuizQuestion } from '../../lib/engine/types';
import { db } from '../../lib/db';
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  BookOpen,
  Award,
  Layers,
  HelpCircle,
  Clock
} from 'lucide-react';
import { playCorrectSound, playIncorrectSound } from '../../lib/sounds';
import confetti from 'canvas-confetti';

interface QuizModuleProps {
  materialId: string;
  questions: QuizQuestion[];
  onNavigateToFlashcards: () => void;
  onNavigateToNotes: () => void;
}

export const QuizModule: React.FC<QuizModuleProps> = ({
  materialId,
  questions,
  onNavigateToFlashcards,
  onNavigateToNotes
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [activeQuestions, setActiveQuestions] = useState<QuizQuestion[]>(questions);
  const [startTime] = useState<number>(Date.now());
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    setActiveQuestions(questions);
  }, [questions]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFinished) return;

      if (!isAnswered) {
        if (['1', '2', '3', '4'].includes(e.key)) {
          const idx = parseInt(e.key, 10) - 1;
          const currentQ = activeQuestions[currentIndex];
          if (currentQ && idx < currentQ.options.length) {
            handleSelectOption(idx);
          }
        }
      } else {
        if (e.key === 'Enter' || e.key === 'ArrowRight') {
          handleNextQuestion();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, isAnswered, isFinished, activeQuestions]);

  const currentQ = activeQuestions[currentIndex];

  const handleSelectOption = (index: number) => {
    if (isAnswered || !currentQ) return;
    setSelectedOption(index);
    setIsAnswered(true);

    const isCorrect = index === currentQ.correctIndex;
    setUserAnswers(prev => ({ ...prev, [currentIndex]: index }));

    if (isCorrect) {
      playCorrectSound();
    } else {
      playIncorrectSound();
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex < activeQuestions.length - 1) {
      setCurrentIndex(c => c + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      // Finished!
      const totalSec = Math.round((Date.now() - startTime) / 1000);
      setElapsedSec(totalSec);
      setIsFinished(true);

      // Calculate score
      let correctCount = 0;
      activeQuestions.forEach((q, idx) => {
        if (userAnswers[idx] === q.correctIndex) correctCount++;
      });

      if (correctCount / activeQuestions.length >= 0.8) {
        try {
          confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        } catch (e) {}
      }

      // Record attempt in IndexedDB
      db.attempts.add({
        id: 'att-' + Date.now(),
        materialId,
        type: 'quiz',
        score: correctCount,
        total: activeQuestions.length,
        answers: userAnswers,
        durationSec: totalSec,
        finishedAt: new Date().toISOString()
      }).catch(() => {});
    }
  };

  const handleRestart = () => {
    setActiveQuestions(questions);
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setUserAnswers({});
    setIsFinished(false);
  };

  const handleRetryMistakes = () => {
    const mistakes = activeQuestions.filter((q, idx) => userAnswers[idx] !== q.correctIndex);
    if (mistakes.length === 0) return;
    setActiveQuestions(mistakes);
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setUserAnswers({});
    setIsFinished(false);
  };

  if (!currentQ && !isFinished) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <HelpCircle className="w-10 h-10 mx-auto text-slate-400" />
        <h3 className="text-base font-bold font-serif text-slate-800 dark:text-slate-200">
          ამ მასალისთვის ქვიზის კითხვები არ მოიძებნა
        </h3>
        <p className="text-xs text-slate-400">
          სცადეთ უფრო ვრცელი ან სტრუქტურირებული ტექსტის ატვირთვა.
        </p>
      </div>
    );
  }

  // RESULTS SCREEN
  if (isFinished) {
    let correctCount = 0;
    activeQuestions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correctIndex) correctCount++;
    });
    const percent = Math.round((correctCount / activeQuestions.length) * 100);
    const mistakes = activeQuestions.filter((q, idx) => userAnswers[idx] !== q.correctIndex);

    return (
      <div className="max-w-2xl mx-auto my-8 p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-8 animate-in fade-in duration-200">
        {/* Score Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <Award className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold font-serif text-slate-900 dark:text-white">
            ტესტი დასრულდა!
          </h2>
          <div className="text-4xl font-mono font-bold text-slate-900 dark:text-white">
            {correctCount} / {activeQuestions.length}{' '}
            <span className="text-2xl font-normal text-slate-400">· {percent}%</span>
          </div>
          <p className="text-xs text-slate-500">
            დრო: {Math.floor(elapsedSec / 60)} წთ {elapsedSec % 60} წმ
          </p>
        </div>

        {/* Mistakes List */}
        {mistakes.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              შესწორებები ({mistakes.length} შეცდომა):
            </h3>
            <div className="space-y-3">
              {mistakes.map((m, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-red-100 dark:border-red-900/40 bg-red-50/30 dark:bg-red-950/20 text-xs space-y-1.5"
                >
                  <p className="font-bold text-slate-900 dark:text-slate-100 font-serif">
                    {m.question}
                  </p>
                  <p className="text-emerald-700 dark:text-emerald-300 font-semibold">
                    ✓ სწორი პასუხი: {m.options[m.correctIndex]}
                  </p>
                  <p className="text-slate-500 italic pt-1 border-t border-red-100 dark:border-red-900/20">
                    წყარო: „{m.sourceSentence}“
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
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

  // ACTIVE QUESTION SCREEN
  const progressPercent = Math.round(((currentIndex + 1) / activeQuestions.length) * 100);

  return (
    <div className="max-w-2xl mx-auto my-8 p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
      {/* Top progress row */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>
            კითხვა <span className="font-mono font-bold text-slate-900 dark:text-white">{currentIndex + 1}</span> / {activeQuestions.length}
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

      {/* Question Text */}
      <div className="py-2">
        <h2 className="text-lg sm:text-xl font-bold font-serif text-slate-900 dark:text-white leading-relaxed">
          {currentQ.question}
        </h2>
      </div>

      {/* 4 Options Grid */}
      <div className="space-y-3">
        {currentQ.options.map((opt, idx) => {
          const isSelected = selectedOption === idx;
          const isCorrect = idx === currentQ.correctIndex;

          let btnClass = 'border-slate-200 dark:border-slate-800 hover:border-indigo-400 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200';

          if (isAnswered) {
            if (isCorrect) {
              btnClass = 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 font-semibold shadow-xs';
            } else if (isSelected) {
              btnClass = 'border-red-500 bg-red-50/70 dark:bg-red-950/40 text-red-950 dark:text-red-100 line-through';
            } else {
              btnClass = 'border-slate-200 dark:border-slate-800 opacity-40 bg-white dark:bg-slate-900';
            }
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelectOption(idx)}
              disabled={isAnswered}
              className={`w-full flex items-center justify-between p-4 rounded-xl border text-xs sm:text-sm text-left transition-all ${btnClass}`}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <span className="leading-snug">{opt}</span>
              </div>

              {isAnswered && (
                <div>
                  {isCorrect ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : isSelected ? (
                    <XCircle className="w-5 h-5 text-red-600" />
                  ) : null}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Explanation Box when Answered */}
      {isAnswered && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>განმარტება და წყარო:</span>
            </span>
            {currentQ.sourceRef?.sectionTitle && (
              <span className="text-slate-400">
                სექცია: {currentQ.sourceRef.sectionTitle}
              </span>
            )}
          </div>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed italic">
            „{currentQ.sourceSentence}“
          </p>
        </div>
      )}

      {/* Bottom control bar */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
        <div>
          {!isAnswered ? (
            <span>1–4 · პასუხის ასარჩევად</span>
          ) : (
            <span className="text-indigo-600 dark:text-indigo-400 font-medium">
              Enter · გასაგრძელებლად
            </span>
          )}
        </div>

        {isAnswered && (
          <button
            onClick={handleNextQuestion}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all shadow-xs"
          >
            <span>{currentIndex < activeQuestions.length - 1 ? 'შემდეგი' : 'შედეგები'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
