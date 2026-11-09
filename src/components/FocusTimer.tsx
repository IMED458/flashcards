import React, { useState, useEffect } from 'react';
import { FocusTimerState } from '../lib/store';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Volume2,
  VolumeX,
  CloudRain,
  Coffee,
  Wind,
  CheckCircle2,
  X
} from 'lucide-react';
import { playTimerFinishSound, ambientPlayer } from '../lib/sounds';
import { db } from '../lib/db';

interface FocusTimerProps {
  timer: FocusTimerState;
  setTimer: React.Dispatch<React.SetStateAction<FocusTimerState>>;
  isPopover?: boolean;
  onClosePopover?: () => void;
}

export const FocusTimer: React.FC<FocusTimerProps> = ({
  timer,
  setTimer,
  isPopover = false,
  onClosePopover
}) => {
  const [activeAmbient, setActiveAmbient] = useState<'none' | 'rain' | 'cafe' | 'whitenoise'>('none');
  const [ambientVolume, setAmbientVolume] = useState(0.3);
  const [completedToday, setCompletedToday] = useState(3);

  // Tick effect
  useEffect(() => {
    let interval: any = null;
    if (timer.isRunning) {
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev.seconds > 0) {
            return { ...prev, seconds: prev.seconds - 1 };
          } else if (prev.minutes > 0) {
            return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
          } else {
            // Timer expired!
            if (prev.soundEnabled) {
              playTimerFinishSound();
            }

            // Save completed session to DB
            db.focusSessions.add({
              id: 'sess-' + Date.now(),
              minutes: prev.selectedDuration,
              completed: true,
              startedAt: new Date().toISOString()
            }).catch(() => {});

            setCompletedToday(c => c + 1);

            // Cycle modes: 4 sessions then long break, otherwise short break
            const nextCount = prev.sessionCount >= 4 ? 1 : prev.sessionCount + 1;
            const nextMode = prev.mode === 'work'
              ? (prev.sessionCount >= 4 ? 'longBreak' : 'shortBreak')
              : 'work';
            const nextMinutes = nextMode === 'work' ? prev.selectedDuration : (nextMode === 'shortBreak' ? 5 : 15);

            return {
              ...prev,
              minutes: nextMinutes,
              seconds: 0,
              isRunning: false,
              mode: nextMode,
              sessionCount: nextCount
            };
          }
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer.isRunning, timer.soundEnabled, timer.selectedDuration]);

  // Handle ambient sounds
  const handleToggleAmbient = (type: 'rain' | 'cafe' | 'whitenoise') => {
    if (activeAmbient === type) {
      ambientPlayer.stop();
      setActiveAmbient('none');
    } else {
      ambientPlayer.start(type, ambientVolume);
      setActiveAmbient(type);
    }
  };

  const handleSetDuration = (mins: number) => {
    setTimer(prev => ({
      ...prev,
      selectedDuration: mins,
      minutes: mins,
      seconds: 0,
      isRunning: false
    }));
  };

  const handleReset = () => {
    setTimer(prev => ({
      ...prev,
      minutes: prev.mode === 'work' ? prev.selectedDuration : (prev.mode === 'shortBreak' ? 5 : 15),
      seconds: 0,
      isRunning: false
    }));
  };

  const handleSkip = () => {
    const nextMode = timer.mode === 'work' ? 'shortBreak' : 'work';
    const nextMinutes = nextMode === 'work' ? timer.selectedDuration : 5;
    setTimer(prev => ({
      ...prev,
      mode: nextMode,
      minutes: nextMinutes,
      seconds: 0,
      isRunning: false
    }));
  };

  const formattedTime = `${String(timer.minutes).padStart(2, '0')}:${String(timer.seconds).padStart(2, '0')}`;

  const modeLabel = timer.mode === 'work'
    ? 'სამუშაო სესია'
    : timer.mode === 'shortBreak'
    ? 'მოკლე შესვენება'
    : 'გრძელი შესვენება';

  const containerClasses = isPopover
    ? 'w-80 p-5 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800'
    : 'max-w-2xl mx-auto p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 my-8';

  return (
    <div className={containerClasses}>
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>ფოკუს-ტაიმერი</span>
            <span className="text-xs font-normal text-slate-400">· {modeLabel}</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">სესია {timer.sessionCount} / 4</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTimer(t => ({ ...t, soundEnabled: !t.soundEnabled }))}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={timer.soundEnabled ? 'ხმის გამორთვა' : 'ხმის ჩართვა'}
          >
            {timer.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>

          {isPopover && onClosePopover && (
            <button
              onClick={onClosePopover}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Big Timer Display */}
      <div className="my-6 text-center">
        <div className="text-5xl font-mono font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
          {formattedTime}
        </div>
        <p className="text-xs text-slate-400 mt-2">
          {timer.isRunning ? 'ფოკუსირება ჩართულია' : 'პაუზა'}
        </p>
      </div>

      {/* Preset duration buttons */}
      <div className="flex items-center justify-center gap-1.5 mb-6">
        {[15, 25, 45, 60, 90].map((mins) => (
          <button
            key={mins}
            onClick={() => handleSetDuration(mins)}
            disabled={timer.isRunning}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              timer.selectedDuration === mins && timer.mode === 'work'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50'
            }`}
          >
            {mins} წთ
          </button>
        ))}
      </div>

      {/* Action Controls */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={handleReset}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="თავიდან დაწყება"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={() => setTimer(t => ({ ...t, isRunning: !t.isRunning }))}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all ${
            timer.isRunning
              ? 'bg-amber-600 hover:bg-amber-700'
              : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {timer.isRunning ? (
            <>
              <Pause className="w-4 h-4 fill-current" />
              <span>პაუზა</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>დაწყება</span>
            </>
          )}
        </button>

        <button
          onClick={handleSkip}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="შესვენებაზე გადასვლა"
        >
          <SkipForward className="w-4 h-4" />
        </button>
      </div>

      {/* Ambient Sound Generators */}
      <div className="mt-8 pt-5 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            ფონური ხმები (ოფლაინ)
          </span>
          {activeAmbient !== 'none' && (
            <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
              აქტიურია
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleToggleAmbient('rain')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
              activeAmbient === 'rain'
                ? 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200 border border-blue-300 dark:border-blue-700'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <CloudRain className="w-3.5 h-3.5" />
            <span>წვიმა</span>
          </button>

          <button
            onClick={() => handleToggleAmbient('cafe')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
              activeAmbient === 'cafe'
                ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Coffee className="w-3.5 h-3.5" />
            <span>კაფე</span>
          </button>

          <button
            onClick={() => handleToggleAmbient('whitenoise')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
              activeAmbient === 'whitenoise'
                ? 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-white border border-slate-400'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Wind className="w-3.5 h-3.5" />
            <span>ხმაური</span>
          </button>
        </div>
      </div>

      {/* Completed counter */}
      <div className="mt-4 pt-3 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>დღეს დასრულებული სესიები:</span>
        </div>
        <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
          {completedToday} სესია
        </span>
      </div>
    </div>
  );
};
