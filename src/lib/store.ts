/**
 * Application State Store & Route Management
 */
import { useState, useEffect } from 'react';

export type AppView = 'landing' | 'dashboard' | 'study' | 'focus' | 'settings';
export type StudyTab =
  | 'summary'
  | 'quiz'
  | 'mindmap'
  | 'flashcards'
  | 'fill-in-the-blank'
  | 'content'
  | 'review';

export interface FocusTimerState {
  minutes: number;
  seconds: number;
  isRunning: boolean;
  mode: 'work' | 'shortBreak' | 'longBreak';
  sessionCount: number;
  soundEnabled: boolean;
  selectedDuration: number; // 15, 25, 45, 60, 90
}

const DEFAULT_TIMER: FocusTimerState = {
  minutes: 25,
  seconds: 0,
  isRunning: false,
  mode: 'work',
  sessionCount: 1,
  soundEnabled: true,
  selectedDuration: 25
};

export function getInitialTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined') {
    try {
      const saved = window.localStorage.getItem('study_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {
      /* storage unavailable (private mode) */
    }
    try {
      if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
    } catch {
      /* ignore */
    }
  }
  return 'light';
}
