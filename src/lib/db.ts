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
  EngineOptions
} from './engine/types';
import { runEngine } from './engine/runEngine';
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
  await db.settings.put({ key: 'generatedIdsV2', value: true });

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

  await db.transaction('rw', [
    db.materials,
    db.docTrees,
    db.notes,
    db.flashcards,
    db.quizQuestions,
    db.fillBlanks,
    db.mindmaps
  ], async () => {
    // 1. Material Record
    await db.materials.put(materialRecord);

    // 2. DocTree Record
    await db.docTrees.put({
      materialId: params.id,
      tree: engineResult.tree,
      terms: engineResult.terms,
      facts: engineResult.facts,
      stats: engineResult.stats
    });

    // 3. Notes Record
    await db.notes.put({
      materialId: params.id,
      auto: engineResult.notes,
      readSections: []
    });

    // 4. Flashcards
    // Remove previous auto cards for this material if updating
    await db.flashcards.where('materialId').equals(params.id).delete();
    // IDs from the engine (e.g. `card-fact-1`) repeat across documents: namespace them per material,
    // otherwise a new upload overwrites the previous material's cards/quiz/fill-blanks.
    const cardsWithMatId = engineResult.flashcards.map(c => ({ ...c, id: `${params.id}:${c.id}`, materialId: params.id }));
    await db.flashcards.bulkPut(cardsWithMatId);

    // 5. Quiz Questions
    await db.quizQuestions.where('materialId').equals(params.id).delete();
    const quizWithMatId = engineResult.quiz.map(q => ({ ...q, id: `${params.id}:${q.id}`, materialId: params.id }));
    await db.quizQuestions.bulkPut(quizWithMatId);

    // 6. Fill in the Blanks
    await db.fillBlanks.where('materialId').equals(params.id).delete();
    const fillWithMatId = engineResult.fillBlanks.map(f => ({ ...f, id: `${params.id}:${f.id}`, materialId: params.id }));
    await db.fillBlanks.bulkPut(fillWithMatId);

    // 7. Mind Map
    await db.mindmaps.put({
      materialId: params.id,
      auto: engineResult.mindmap
    });
  });
}

/**
 * One-time repair for data saved before IDs were namespaced per material:
 * generated cards/quiz/fill-blanks overwrote each other across materials.
 * Regenerates them from each material's saved text. Manually created cards are kept.
 */
export async function repairGeneratedIds(): Promise<void> {
  const FLAG = 'generatedIdsV2';
  const done = await db.settings.get(FLAG);
  if (done?.value) return;

  const isLegacyGenerated = (id: string) => !id.includes(':') && !id.startsWith('card-man');
  const materials = await db.materials.toArray();

  for (const mat of materials) {
    if (!mat.rawText) continue;
    try {
      const r = await runEngine(mat.rawText, mat.options);
      await db.transaction('rw', [db.flashcards, db.quizQuestions, db.fillBlanks], async () => {
        await db.flashcards.bulkPut(r.flashcards.map(c => ({ ...c, id: `${mat.id}:${c.id}`, materialId: mat.id })));
        await db.quizQuestions.bulkPut(r.quiz.map(q => ({ ...q, id: `${mat.id}:${q.id}`, materialId: mat.id })));
        await db.fillBlanks.bulkPut(r.fillBlanks.map(f => ({ ...f, id: `${mat.id}:${f.id}`, materialId: mat.id })));
      });
    } catch (err) {
      console.warn('Repair failed for material', mat.id, err);
    }
  }

  await db.transaction('rw', [db.flashcards, db.quizQuestions, db.fillBlanks, db.settings], async () => {
    await db.flashcards.filter(c => isLegacyGenerated(c.id)).delete();
    await db.quizQuestions.filter(q => isLegacyGenerated(q.id)).delete();
    await db.fillBlanks.filter(f => isLegacyGenerated(f.id)).delete();
    await db.settings.put({ key: FLAG, value: true });
  });
}
