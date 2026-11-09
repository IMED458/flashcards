import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, ArrowRight, BookOpen, ArrowLeft } from 'lucide-react';

export type ProcessingStage = 'extracting' | 'analyzing' | 'saving' | 'done' | 'error';

export interface ProcessingState {
  title: string;
  stage: ProcessingStage;
  message?: string;
  error?: string;
  notice?: string;
  materialId?: string;
}

interface ProcessingViewProps {
  state: ProcessingState;
  onFinish: () => void;
  onGoToReview: () => void;
  onBack: () => void;
}

const STEPS: { stage: ProcessingStage; label: string }[] = [
  { stage: 'extracting', label: 'ტექსტის ამოღება ფაილიდან' },
  { stage: 'analyzing', label: 'სტრუქტურის, ტერმინების და ფაქტების ანალიზი' },
  { stage: 'saving', label: 'მოდულების შენახვა (ჩანაწერები, ქვიზი, ბარათები, რუკა)' }
];

const STAGE_INDEX: Record<ProcessingStage, number> = {
  extracting: 0,
  analyzing: 1,
  saving: 2,
  done: 3,
  error: -1
};

export const ProcessingView: React.FC<ProcessingViewProps> = ({ state, onFinish, onGoToReview, onBack }) => {
  const { title, stage, message, error, notice } = state;
  const isDone = stage === 'done';
  const isError = stage === 'error';
  const stepIdx = STAGE_INDEX[stage];
  const progressPercent = isDone ? 100 : Math.max(5, Math.round(((stepIdx + 0.5) / STEPS.length) * 100));

  return (
    <div className="max-w-2xl mx-auto my-12 p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
      <div className="text-center space-y-2">
        <div
          className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center ${
            isError
              ? 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400'
              : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
          }`}
        >
          {isError ? <AlertTriangle className="w-6 h-6" /> : <BookOpen className={`w-6 h-6 ${isDone ? '' : 'animate-pulse'}`} />}
        </div>
        <h2 className="text-xl font-bold font-serif text-slate-900 dark:text-white">
          {isError ? 'დამუშავება ვერ მოხერხდა' : isDone ? 'მასალა მზადაა' : 'ვამუშავებთ მასალას'}
        </h2>
        <p className="text-xs text-slate-500 font-serif line-clamp-1 max-w-md mx-auto">„{title}“</p>
      </div>

      {isError ? (
        <div className="mt-8 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-sm text-red-800 dark:text-red-300">
          {error || 'უცნობი შეცდომა.'}
        </div>
      ) : (
        <>
          <div className="mt-8 space-y-2">
            <div className="flex items-center justify-between gap-4 text-xs text-slate-500 font-medium">
              <span className="truncate">{isDone ? 'დამუშავება წარმატებით დასრულდა' : message || STEPS[stepIdx]?.label}</span>
              <span className="font-mono tabular-nums">{progressPercent}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="mt-8 space-y-3">
            {STEPS.map((s, idx) => {
              const completed = stepIdx > idx;
              const current = stepIdx === idx;
              return (
                <div
                  key={s.stage}
                  className={`flex items-center gap-3 p-3 rounded-lg border text-xs transition-colors ${
                    completed
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-300'
                      : current
                      ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/40 text-indigo-900 dark:text-indigo-300'
                      : 'bg-slate-50/40 dark:bg-slate-800/30 border-transparent text-slate-400'
                  }`}
                >
                  {completed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : current ? (
                    <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <span className="font-medium">{s.label}</span>
                </div>
              );
            })}
          </div>

          {isDone && notice && (
            <div className="mt-6 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300">
              {notice}
            </div>
          )}
        </>
      )}

      {(isDone || isError) && (
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          {isError ? (
            <button
              onClick={onBack}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>უკან დაბრუნება</span>
            </button>
          ) : (
            <>
              <button
                onClick={onGoToReview}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                გადახედვა და რედაქტირება
              </button>
              <button
                onClick={onFinish}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-sm transition-all"
              >
                <span>სწავლის დაწყება</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
