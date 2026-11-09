/**
 * Runs the study-module engine in a Web Worker so heavy documents never freeze the page.
 * Falls back to running inline if Workers are unavailable.
 */
import type { EngineOptions, EngineResult } from './types';

const ENGINE_TIMEOUT_MS = 90_000;

export class EngineTimeoutError extends Error {}

export async function runEngine(text: string, options?: EngineOptions): Promise<EngineResult> {
  let worker: Worker;
  try {
    worker = new Worker(new URL('./engine.worker.ts', import.meta.url), { type: 'module' });
  } catch {
    const { processTextToStudyModules } = await import('./index');
    return processTextToStudyModules(text, options);
  }

  return new Promise<EngineResult>((resolve, reject) => {
    const timer = setTimeout(() => {
      worker.terminate();
      reject(new EngineTimeoutError('დამუშავებას ძალიან დიდი დრო დასჭირდა. სცადეთ უფრო მოკლე დოკუმენტი.'));
    }, ENGINE_TIMEOUT_MS);

    worker.onmessage = (e: MessageEvent<{ ok: boolean; result?: EngineResult; error?: string }>) => {
      clearTimeout(timer);
      worker.terminate();
      if (e.data.ok && e.data.result) resolve(e.data.result);
      else reject(new Error(e.data.error || 'დამუშავება ვერ მოხერხდა.'));
    };
    worker.onerror = ev => {
      clearTimeout(timer);
      worker.terminate();
      reject(new Error(ev.message || 'დამუშავება ვერ მოხერხდა.'));
    };
    worker.postMessage({ text, options });
  });
}
