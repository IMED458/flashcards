import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, AlertTriangle, ArrowRight, BookOpen, Layers } from 'lucide-react';

interface ProcessingViewProps {
  title: string;
  onFinish: () => void;
  onGoToReview: () => void;
}

export const ProcessingView: React.FC<ProcessingViewProps> = ({
  title,
  onFinish,
  onGoToReview
}) => {
  const [step, setStep] = useState(0);
  const [isDone, setIsDone] = useState(false);

  const steps = [
    { label: 'ტექსტის ამოღება და ნორმალიზაცია', duration: 400 },
    { label: 'სტრუქტურისა და იერარქიის ანალიზი', duration: 450 },
    { label: 'საკვანძო ტერმინებისა და ფაქტების ამოცნობა', duration: 500 },
    { label: 'სასწავლო მოდულების გენერაცია (ჩანაწერები, ქვიზი, რუკა...)', duration: 550 }
  ];

  const modules = [
    { name: 'ჩანაწერები', ready: step >= 2 },
    { name: 'ქვიზი', ready: step >= 3 },
    { name: 'ცოდნის რუკა', ready: step >= 2 },
    { name: 'ბარათები', ready: step >= 3 },
    { name: 'წერითი ტესტი', ready: step >= 3 },
    { name: 'კონტენტი', ready: step >= 1 }
  ];

  useEffect(() => {
    let current = 0;
    const runNextStep = () => {
      if (current < steps.length - 1) {
        current++;
        setStep(current);
        setTimeout(runNextStep, steps[current].duration);
      } else {
        setStep(steps.length);
        setIsDone(true);
      }
    };
    const t = setTimeout(runNextStep, steps[0].duration);
    return () => clearTimeout(t);
  }, []);

  const progressPercent = Math.min(100, Math.round(((step + 1) / (steps.length + 1)) * 100));

  return (
    <div className="max-w-2xl mx-auto my-12 p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 mx-auto rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
          <BookOpen className="w-6 h-6 animate-pulse" />
        </div>
        <h2 className="text-xl font-bold font-serif text-slate-900 dark:text-white">
          ვამუშავებთ მასალას
        </h2>
        <p className="text-xs text-slate-500 font-serif line-clamp-1 max-w-md mx-auto">
          „{title}“
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mt-8 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>{isDone ? 'დამუშავება წარმატებით დასრულდა' : steps[Math.min(step, steps.length - 1)].label}</span>
          <span className="font-mono tabular-nums">{progressPercent}%</span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Steps Checkmarks */}
      <div className="mt-8 space-y-3">
        {steps.map((s, idx) => {
          const completed = step > idx || isDone;
          const current = step === idx && !isDone;
          return (
            <div
              key={idx}
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

      {/* Module Ready Statuses */}
      <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-3">
          მოდულების სტატუსი
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {modules.map((m, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-between p-2 rounded-lg text-xs ${
                m.ready
                  ? 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                  : 'bg-slate-50/50 dark:bg-slate-800/40 text-slate-400'
              }`}
            >
              <span className="font-medium">{m.name}</span>
              {m.ready ? (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">მზადაა ✓</span>
              ) : (
                <span className="text-[11px] text-slate-400">მუშავდება...</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons when done */}
      {isDone && (
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-200">
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
        </div>
      )}
    </div>
  );
};
