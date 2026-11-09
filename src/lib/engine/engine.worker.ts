/// <reference lib="webworker" />
import { processTextToStudyModules } from './index';
import type { EngineOptions } from './types';

self.onmessage = (e: MessageEvent<{ text: string; options?: EngineOptions }>) => {
  try {
    const result = processTextToStudyModules(e.data.text, e.data.options);
    self.postMessage({ ok: true, result });
  } catch (err) {
    self.postMessage({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
