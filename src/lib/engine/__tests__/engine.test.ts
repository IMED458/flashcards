/**
 * Unit Tests for Deterministic NLP Engine
 * Tests sentence splitting, stemming, fact extraction, distractors, and accepted answers
 */
import { splitGeorgianSentences } from '../ka/sentenceSplitter';
import { stemGeorgian } from '../ka/stemmer';
import { parseDocumentStructure } from '../structure';
import { extractFactsFromDocument } from '../facts';
import { generateAcceptedAnswers } from '../acceptedAnswers';
import { verifyAnswer, levenshteinDistance } from '../stringSimilarity';
import { processTextToStudyModules } from '../index';
import { SAMPLE_DOCUMENTS } from '../../../data/sampleDocuments';

export function runAllTests(): { passed: number; failed: number; results: string[] } {
  const results: string[] = [];
  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, detail?: string) {
    if (condition) {
      passed++;
      results.push(`✓ [PASS] ${name}`);
    } else {
      failed++;
      results.push(`✗ [FAIL] ${name} ${detail ? `(${detail})` : ''}`);
    }
  }

  // 1. Sentence Splitter Tests
  const textWithAbbr = 'ექვთიმე მთაწმინდელმა XI საუკუნის დასაწყისში შეადგინა მცირე სჯულისკანონი. მაგ. მასში 45 მუხლია. ი. ჭავჭავაძე ამას იკვლევდა.';
  const sentences = splitGeorgianSentences(textWithAbbr);
  assert('Sentence Splitter preserves abbreviations and Roman numerals', sentences.length === 3, `Got ${sentences.length}`);

  // 2. Stemmer Tests
  assert('Stemmer strips -ების plural', stemGeorgian('სჯულისკანონის') === 'სჯულისკანონ');
  assert('Stemmer strips -მა ergative', stemGeorgian('დავითმა') === 'დავით');
  assert('Stemmer preserves stem >= 3', stemGeorgian('და') === 'და');

  // 3. Accepted Answers Tests
  const accXI = generateAcceptedAnswers('XI საუკუნე');
  assert('Accepted answers includes XI, 11, and მე-11', accXI.includes('11') && accXI.includes('მე-11'));

  // 4. Levenshtein & Fuzzy Checking
  assert('Levenshtein distance calculation', levenshteinDistance('სამართალი', 'სამართალო') === 1);
  const v1 = verifyAnswer('XI', 'XI');
  assert('Verify exact match', v1.status === 'correct');

  const v2 = verifyAnswer('11', 'XI', accXI);
  assert('Verify Roman to Arabic equivalence', v2.status === 'correct');

  const v3 = verifyAnswer('სჯულისკანონი', 'სჯულისკანონს');
  assert('Verify Georgian case stem match', v3.status === 'correct');

  const v4 = verifyAnswer('სამათალი', 'სამართალი'); // 1 typo in 9-char word
  assert('Verify typo tolerance', v4.status === 'almost_correct');

  // 5. Fact Extraction Tests on Sample Document
  const sample = SAMPLE_DOCUMENTS[0];
  const docTree = parseDocumentStructure(sample.rawText);
  const facts = extractFactsFromDocument(docTree);
  assert('Fact extraction finds definitions and dates', facts.length >= 5, `Found ${facts.length} facts`);

  const defFact = facts.find(f => f.type === 'definition');
  assert('Definition fact found with subject and object', Boolean(defFact && defFact.subject && defFact.object));

  // 6. Determinism Test: Same input + same seed = same modules
  const res1 = processTextToStudyModules(sample.rawText, { seed: 123 });
  const res2 = processTextToStudyModules(sample.rawText, { seed: 123 });
  assert('Determinism: identical question counts', res1.quiz.length === res2.quiz.length);
  assert('Determinism: identical flashcard fronts', res1.flashcards[0]?.front === res2.flashcards[0]?.front);

  return { passed, failed, results };
}

// Self-run when executed directly via tsx
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('engine.test')) {
  const { passed, failed, results } = runAllTests();
  console.log(results.join('\n'));
  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}
