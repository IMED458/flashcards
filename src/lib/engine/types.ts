/**
 * Core Engine Data Structures & Types
 * Pure TypeScript, deterministic, local-first
 */

export type DocNodeType = 'document' | 'section' | 'subsection' | 'paragraph' | 'list' | 'table';

export interface BlockNode {
  id: string;
  type: 'paragraph' | 'list' | 'table' | 'definition';
  text: string;
  items?: string[];
  tableData?: { headers: string[]; rows: string[][] };
  page?: number;
  isBold?: boolean;
}

export interface SectionNode {
  id: string;
  title: string;
  level: number;
  blocks: BlockNode[];
  subsections: SectionNode[];
  page?: number;
}

export interface DocNode {
  title: string;
  sections: SectionNode[];
  metadata?: {
    wordCount: number;
    pageCount: number;
  };
}

export interface Term {
  text: string;
  stem: string;
  score: number;
  type: 'concept' | 'entity' | 'keyword';
  sections: string[];
  sentences: string[];
}

export type FactType =
  | 'definition'
  | 'date'
  | 'number'
  | 'who_did_what'
  | 'enumeration'
  | 'cause'
  | 'contrast'
  | 'key_sentence';

export interface Fact {
  id: string;
  type: FactType;
  subject: string;
  predicate: string;
  object: string;
  answerSpan: string;
  sentence: string;
  sectionId: string;
  sectionTitle?: string;
  sourceRef: { page?: number; slide?: number; timestamp?: number; sectionTitle?: string };
  confidence: number;
}

export interface Callout {
  type: 'remember' | 'common_error' | 'term';
  title: string;
  text: string;
}

export interface NoteSection {
  id: string;
  numberStr: string;
  title: string;
  intro: string;
  bullets: string[];
  callout?: Callout;
  steps?: string[];
  table?: { headers: string[]; rows: string[][] };
}

export interface Notes {
  title: string;
  readingTimeMin: number;
  sections: NoteSection[];
  quickReview: string[];
  glossary: { term: string; definition: string }[];
  summary: string[];
}

export interface Flashcard {
  id: string;
  materialId?: string;
  front: string;
  back: string;
  factId?: string;
  sectionId?: string;
  sourceRef: { page?: number; sectionTitle?: string };
  quality: number;
  origin: 'auto' | 'manual' | 'edited';
  starred?: boolean;
  tags?: string[];
  fsrs?: {
    repetitions: number;
    intervalDays: number;
    easeFactor: number;
    dueDate: string;
    lastReviewed?: string;
  };
}

export interface QuizQuestion {
  id: string;
  materialId?: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  sourceSentence: string;
  factId?: string;
  sectionId?: string;
  sourceRef: { page?: number; sectionTitle?: string };
  quality: number;
  origin: 'auto' | 'manual' | 'edited';
}

export interface FillBlank {
  id: string;
  materialId?: string;
  before: string;
  blank: string;
  after: string;
  answer: string;
  acceptedAnswers: string[];
  hint: string;
  factId?: string;
  sectionId?: string;
  sourceRef: { page?: number; sectionTitle?: string };
  quality: number;
  origin: 'auto' | 'manual' | 'edited';
}

export interface MindNode {
  id: string;
  label: string;
  fullText?: string;
  level: number;
  children: MindNode[];
  facts?: string[];
  sectionId?: string;
}

export interface EngineStats {
  words: number;
  sentences: number;
  sections: number;
  definitions: number;
  warnings: string[];
}

export interface EngineResult {
  title: string;
  tree: DocNode;
  terms: Term[];
  facts: Fact[];
  notes: Notes;
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
  fillBlanks: FillBlank[];
  mindmap: MindNode;
  stats: EngineStats;
}

export interface EngineOptions {
  flashcardsCount?: number;
  quizCount?: number;
  fillBlanksCount?: number;
  summaryLengthPercent?: 25 | 40 | 60;
  modules?: {
    notes?: boolean;
    quiz?: boolean;
    mindmap?: boolean;
    flashcards?: boolean;
    fillBlanks?: boolean;
  };
  seed?: number;
}
