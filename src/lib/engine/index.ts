/**
 * Core NLP Engine Orchestrator
 * Local-first, 100% deterministic, rule-based & classical statistical NLP.
 * NO LLM, NO Generative AI APIs.
 */
import {
  DocNode,
  EngineOptions,
  EngineResult,
  Flashcard,
  QuizQuestion,
  FillBlank,
  MindNode,
  Notes,
  NoteSection,
  Callout,
  Fact,
  Term
} from './types';
import { parseDocumentStructure } from './structure';
import { extractKeyTerms } from './terms';
import { extractFactsFromDocument } from './facts';
import { rankSentencesTextRank, summarizeTextTextRank } from './textrank';
import {
  createFlashcardFromFact,
  createQuizQuestionFromFact,
  createFillBlankFromFact
} from './questionTemplates';
import { stemGeorgian } from './ka/stemmer';

export * from './types';
export * from './structure';
export * from './terms';
export * from './facts';
export * from './textrank';
export * from './distractors';
export * from './acceptedAnswers';
export * from './stringSimilarity';
export * from './ka/stopwords';
export * from './ka/stemmer';
export * from './ka/sentenceSplitter';
export * from './ka/ner';

export function processTextToStudyModules(
  rawText: string,
  options: EngineOptions = {}
): EngineResult {
  const seed = options.seed ?? 42;

  // 1. Structure Analysis & Tree Building
  const tree: DocNode = parseDocumentStructure(rawText);

  // 2. Key Term Extraction (TF-IDF + RAKE)
  const terms: Term[] = extractKeyTerms(tree);
  const keyTermStems = new Set(terms.slice(0, 20).map(t => stemGeorgian(t.text)));

  // 3. Deterministic Fact Extraction
  // Cap facts so quiz/distractor generation stays fast on very long documents.
  const MAX_FACTS = 600;
  let allFacts: Fact[] = extractFactsFromDocument(tree);
  if (allFacts.length > MAX_FACTS) {
    const keep = new Set(
      allFacts
        .map((f, i) => ({ i, c: f.confidence }))
        .sort((a, b) => b.c - a.c)
        .slice(0, MAX_FACTS)
        .map(x => x.i)
    );
    allFacts = allFacts.filter((_, i) => keep.has(i));
  }

  // 4. Build Structured Notes Module (§8)
  const noteSections: NoteSection[] = tree.sections.map((sec, idx) => {
    const secNumber = String(idx + 1).padStart(2, '0');
    const allSecText = sec.blocks.map(b => b.text).join('\n');
    const secSentences = summarizeTextTextRank(allSecText, 6);

    const intro = secSentences.length > 0 ? secSentences[0] : sec.title;
    const bullets = secSentences.slice(1, 4);

    // Callout detection: Definition, Common Error, or Remember
    let callout: Callout | undefined;
    const secDef = allFacts.find(f => f.sectionId === sec.id && f.type === 'definition');
    const secContrast = allFacts.find(f => f.sectionId === sec.id && f.type === 'contrast');

    if (secContrast) {
      callout = {
        type: 'common_error',
        title: 'ხშირი შეცდომა / განსხვავება',
        text: secContrast.sentence
      };
    } else if (secDef) {
      callout = {
        type: 'term',
        title: `ტერმინი: ${secDef.subject}`,
        text: secDef.object
      };
    } else if (secSentences.length > 1) {
      callout = {
        type: 'remember',
        title: 'დაიმახსოვრე',
        text: secSentences[1]
      };
    }

    return {
      id: sec.id,
      numberStr: secNumber,
      title: sec.title,
      intro,
      bullets: bullets.length > 0 ? bullets : [intro],
      callout
    };
  });

  // Notes: Quick Review (Top sentences across sections)
  const quickReviewSentences = noteSections.map(s => s.intro).slice(0, 8);

  // Notes: Glossary (Top definitions)
  const glossaryDefs = allFacts
    .filter(f => f.type === 'definition')
    .map(f => ({ term: f.subject, definition: f.object }))
    .slice(0, 15);

  const totalWords = tree.metadata?.wordCount || 100;
  const readingTimeMin = Math.max(1, Math.round(totalWords / 180));

  const notes: Notes = {
    title: tree.title,
    readingTimeMin,
    sections: noteSections,
    quickReview: quickReviewSentences,
    glossary: glossaryDefs,
    summary: noteSections.map(s => `${s.title}: ${s.intro}`)
  };

  // 5. Build Flashcards (§11)
  const candidateCards: Flashcard[] = [];
  const seenCardStems = new Set<string>();

  for (const fact of allFacts) {
    const card = createFlashcardFromFact(fact);
    if (card) {
      const stem = stemGeorgian(card.front);
      if (!seenCardStems.has(stem)) {
        seenCardStems.add(stem);
        candidateCards.push(card);
      }
    }
  }

  // 6. Build Quiz Questions (§9)
  const candidateQuiz: QuizQuestion[] = [];
  const seenQuizStems = new Set<string>();

  for (let i = 0; i < allFacts.length; i++) {
    const fact = allFacts[i];
    const quizItem = createQuizQuestionFromFact(fact, allFacts, terms, seed + i);
    if (quizItem) {
      const stem = stemGeorgian(quizItem.question);
      if (!seenQuizStems.has(stem)) {
        seenQuizStems.add(stem);
        candidateQuiz.push(quizItem);
      }
    }
  }

  // 7. Build Fill-in-the-blank items (§12)
  const candidateFill: FillBlank[] = [];
  const seenFillStems = new Set<string>();

  for (const fact of allFacts) {
    const fillItem = createFillBlankFromFact(fact);
    if (fillItem) {
      const stem = stemGeorgian(fillItem.blank);
      if (!seenFillStems.has(stem)) {
        seenFillStems.add(stem);
        candidateFill.push(fillItem);
      }
    }
  }

  // Round-robin & Quality balanced selection
  const targetCardsCount = options.flashcardsCount ?? Math.min(50, Math.max(15, candidateCards.length));
  const targetQuizCount = options.quizCount ?? Math.min(30, Math.max(10, candidateQuiz.length));
  const targetFillCount = options.fillBlanksCount ?? Math.min(30, Math.max(10, candidateFill.length));

  const flashcards = candidateCards.slice(0, targetCardsCount);
  const quiz = candidateQuiz.slice(0, targetQuizCount);
  const fillBlanks = candidateFill.slice(0, targetFillCount);

  // 8. Build Mind Map (§10)
  const mindmap: MindNode = {
    id: 'root',
    label: tree.title,
    fullText: tree.title,
    level: 0,
    children: tree.sections.map((sec, sIdx) => {
      // Find top terms for this section
      const secTerms = terms
        .filter(t => t.sections.includes(sec.id))
        .slice(0, 4);

      // Find top facts for this section
      const secFacts = allFacts.filter(f => f.sectionId === sec.id);

      return {
        id: `m-sec-${sIdx}`,
        label: sec.title.length > 40 ? sec.title.slice(0, 38) + '...' : sec.title,
        fullText: sec.title,
        level: 1,
        sectionId: sec.id,
        facts: secFacts.map(f => f.sentence),
        children: secTerms.map((term, tIdx) => {
          const relatedFact = secFacts.find(f => f.subject.includes(term.text) || f.sentence.includes(term.text));
          return {
            id: `m-term-${sIdx}-${tIdx}`,
            label: term.text,
            fullText: relatedFact ? relatedFact.sentence : term.text,
            level: 2,
            sectionId: sec.id,
            children: relatedFact ? [
              {
                id: `m-fact-${sIdx}-${tIdx}`,
                label: relatedFact.answerSpan.length > 35 ? relatedFact.answerSpan.slice(0, 32) + '...' : relatedFact.answerSpan,
                fullText: relatedFact.sentence,
                level: 3,
                children: []
              }
            ] : []
          };
        })
      };
    })
  };

  // 9. Warnings and Stats calculation
  const warnings: string[] = [];
  if (flashcards.length < 15) {
    warnings.push(`ამ მასალიდან მხოლოდ ${flashcards.length} ბარათის შექმნა მოხერხდა. დაამატე ბარათები ხელით ან ატვირთე უფრო სტრუქტურირებული ვერსია.`);
  }

  const defCount = allFacts.filter(f => f.type === 'definition').length;

  return {
    title: tree.title,
    tree,
    terms,
    facts: allFacts,
    notes,
    flashcards,
    quiz,
    fillBlanks,
    mindmap,
    stats: {
      words: totalWords,
      sentences: allFacts.length + noteSections.length * 4,
      sections: tree.sections.length,
      definitions: defCount,
      warnings
    }
  };
}
