/**
 * IndexedDB persistence layer using Dexie.js
 * Local-first storage for study materials, generated modules, attempts, reviews and settings.
 */
import Dexie, { type Table } from 'dexie';
import {
  DocNode,
  Term,
  Fact,
  Notes,
  Flashcard,
  QuizQuestion,
  FillBlank,
  MindNode,
  EngineStats,
  EngineOptions,
  EngineResult
} from './engine/types';
import { runEngine } from './engine/runEngine';
import { extractTextFromFile, readableRatio } from './extractText';
import { SAMPLE_DOCUMENTS } from '../data/sampleDocuments';

export interface MaterialRecord {
  id: string;
  title: string;
  sourceType: 'file' | 'video' | 'text';
  fileName?: string;
  mimeType?: string;
  size?: number;
  blob?: Blob;
  youtubeUrl?: string;
  rawText: string;
  coverColor: string;
  folderId?: string;
  options?: EngineOptions;
  status: 'pending' | 'processing' | 'ready' | 'error';
  engineVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface FolderRecord {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface DocTreeRecord {
  materialId: string;
  tree: DocNode;
  terms: Term[];
  facts: Fact[];
  stats: EngineStats;
}

export interface NotesRecord {
  materialId: string;
  auto: Notes;
  edited?: string; // HTML / Markdown edited version from TipTap
  readSections: string[];
}

export interface MindmapRecord {
  materialId: string;
  auto: MindNode;
  edited?: MindNode;
}

export interface AttemptRecord {
  id: string;
  materialId: string;
  type: 'quiz' | 'fill';
  score: number;
  total: number;
  answers: Record<string, any>;
  durationSec: number;
  finishedAt: string;
}

export interface FlashcardReviewRecord {
  id: string;
  flashcardId: string;
  rating: 'again' | 'hard' | 'good' | 'easy' | 'knew' | 'did_not_know';
  reviewedAt: string;
}

export interface FocusSessionRecord {
  id: string;
  minutes: number;
  completed: boolean;
  startedAt: string;
}

export interface SettingRecord {
  key: string;
  value: any;
}

export class StudyDatabase extends Dexie {
  materials!: Table<MaterialRecord, string>;
  folders!: Table<FolderRecord, string>;
  docTrees!: Table<DocTreeRecord, string>;
  notes!: Table<NotesRecord, string>;
  flashcards!: Table<Flashcard, string>;
  quizQuestions!: Table<QuizQuestion, string>;
  fillBlanks!: Table<FillBlank, string>;
  mindmaps!: Table<MindmapRecord, string>;
  attempts!: Table<AttemptRecord, string>;
  reviews!: Table<FlashcardReviewRecord, string>;
  focusSessions!: Table<FocusSessionRecord, string>;
  settings!: Table<SettingRecord, string>;

  constructor() {
    super('StudyPlatformDB');
    this.version(1).stores({
      materials: 'id, title, sourceType, folderId, status, createdAt',
      folders: 'id, name, createdAt',
      docTrees: 'materialId',
      notes: 'materialId',
      flashcards: 'id, materialId, factId, quality, origin, starred',
      quizQuestions: 'id, materialId, factId, quality, origin',
      fillBlanks: 'id, materialId, factId, quality, origin',
      mindmaps: 'materialId',
      attempts: 'id, materialId, type, finishedAt',
      reviews: 'id, flashcardId, reviewedAt',
      focusSessions: 'id, startedAt',
      settings: 'key'
    });
  }
}

export const db = new StudyDatabase();

/**
 * Initialize and seed initial documents if database is empty
 */
export async function initializeDatabase(): Promise<void> {
  const count = await db.materials.count();
  if (count > 0) return;
  await db.settings.put({ key: REPAIR_FLAG, value: true });

  // Add default folders
  const folderHistory: FolderRecord = {
    id: 'folder-history',
    name: 'ისტორია და სამართალი',
    color: '#2563EB',
    createdAt: new Date().toISOString()
  };
  const folderScience: FolderRecord = {
    id: 'folder-science',
    name: 'ბუნებისმეტყველება',
    color: '#059669',
    createdAt: new Date().toISOString()
  };
  await db.folders.bulkAdd([folderHistory, folderScience]);

  // Seed sample materials
  for (const sample of SAMPLE_DOCUMENTS) {
    const folderId = sample.id === 'sample-biologia' ? 'folder-science' : 'folder-history';
    await saveProcessedMaterial({
      id: sample.id,
      title: sample.title,
      sourceType: 'text',
      rawText: sample.rawText,
      coverColor: sample.coverColor,
      folderId,
      options: { summaryLengthPercent: 40 }
    });
  }
}

/**
 * Save new material and execute local-first engine
 */
export async function saveProcessedMaterial(params: {
  id: string;
  title: string;
  sourceType: 'file' | 'video' | 'text';
  rawText: string;
  coverColor: string;
  folderId?: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
  blob?: Blob;
  youtubeUrl?: string;
  options?: EngineOptions;
}): Promise<void> {
  const now = new Date().toISOString();

  // Run pure deterministic engine
  const engineResult = await runEngine(params.rawText, params.options);

  const materialRecord: MaterialRecord = {
    id: params.id,
    title: params.title || engineResult.title,
    sourceType: params.sourceType,
    fileName: params.fileName,
    mimeType: params.mimeType,
    size: params.size,
    blob: params.blob,
    youtubeUrl: params.youtubeUrl,
    rawText: params.rawText,
    coverColor: params.coverColor,
    folderId: params.folderId,
    options: params.options,
    status: 'ready',
    engineVersion: 1,
    createdAt: now,
    updatedAt: now
  };

  await storeEngineResult(materialRecord, engineResult);
}

/** Write a material and all generated modules. Manually created flashcards are kept. */
async function storeEngineResult(materialRecord: MaterialRecord, engineResult: EngineResult): Promise<void> {
  const id = materialRecord.id;
  // Engine IDs (e.g. `card-fact-1`) repeat across documents: namespace them per material,
  // otherwise one upload overwrites another material's cards/quiz/fill-blanks.
  const ns = <T extends { id: string }>(items: T[]) => items.map(x => ({ ...x, id: `${id}:${x.id}`, materialId: id }));

  await db.transaction(
    'rw',
    [db.materials, db.docTrees, db.notes, db.flashcards, db.quizQuestions, db.fillBlanks, db.mindmaps],
    async () => {
      await db.materials.put(materialRecord);
      await db.docTrees.put({
        materialId: id,
        tree: engineResult.tree,
        terms: engineResult.terms,
        facts: engineResult.facts,
        stats: engineResult.stats
      });
      await db.notes.put({ materialId: id, auto: engineResult.notes, readSections: [] });

      await db.flashcards.where('materialId').equals(id).filter(c => c.origin !== 'manual' && !c.id.startsWith('card-man')).delete();
      await db.flashcards.bulkPut(ns(engineResult.flashcards));
      await db.quizQuestions.where('materialId').equals(id).delete();
      await db.quizQuestions.bulkPut(ns(engineResult.quiz));
      await db.fillBlanks.where('materialId').equals(id).delete();
      await db.fillBlanks.bulkPut(ns(engineResult.fillBlanks));

      await db.mindmaps.put({ materialId: id, auto: engineResult.mindmap });
    }
  );
}

const REPAIR_FLAG = 'materialsV3';

/**
 * One-time background repair of materials saved by older versions:
 *  - PDF/DOCX/PPTX used to be read as raw binary, producing garbage notes with thousands of
 *    sections (opening them froze the page) and no quiz. If the original file was stored,
 *    its text is re-extracted properly; otherwise the material is marked as needing re-upload.
 *  - Generated IDs used to collide across materials (quizzes overwrote each other).
 *  - English documents now get quiz/cards (new English rules).
 * Returns true if anything was changed.
 */
export async function repairMaterials(): Promise<boolean> {
  const done = await db.settings.get(REPAIR_FLAG);
  if (done?.value) return false;

  const materials = await db.materials.toArray();
  for (const mat of materials) {
    try {
      let text = mat.rawText || '';
      if (readableRatio(text) < 0.85) {
        if (mat.blob && mat.fileName) {
          const file = new File([mat.blob], mat.fileName, { type: mat.mimeType || '' });
          text = (await extractTextFromFile(file)).text;
        } else {
          await db.materials.update(mat.id, { status: 'error' });
          continue;
        }
      }
      const result = await runEngine(text, mat.options);
      await storeEngineResult({ ...mat, rawText: text, status: 'ready', engineVersion: 2, updatedAt: new Date().toISOString() }, result);
    } catch (err) {
      console.warn('Repair failed for material', mat.id, err);
      await db.materials.update(mat.id, { status: 'error' }).catch(() => {});
    }
  }

  // Remove leftover rows with legacy (colliding) IDs.
  const isLegacy = (rowId: string) => !rowId.includes(':') && !rowId.startsWith('card-man');
  await db.transaction('rw', [db.flashcards, db.quizQuestions, db.fillBlanks, db.settings], async () => {
    await db.flashcards.filter(c => isLegacy(c.id)).delete();
    await db.quizQuestions.filter(q => isLegacy(q.id)).delete();
    await db.fillBlanks.filter(f => isLegacy(f.id)).delete();
    await db.settings.put({ key: REPAIR_FLAG, value: true });
  });
  return true;
}
