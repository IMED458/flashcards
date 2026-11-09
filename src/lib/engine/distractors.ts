/**
 * Type-Safe Distractor Generator for Quiz Questions
 * Generates 3 strictly type-congruent incorrect options with seeded pseudo-random distribution.
 */
import { Fact, Term } from './types';
import { stemGeorgian } from './ka/stemmer';

// Pseudo-random number generator with deterministic seed
export function createSeededRandom(seed = 42) {
  let s = seed;
  return function () {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function generateDistractors(
  fact: Fact,
  allFacts: Fact[],
  allTerms: Term[],
  rng: () => number = createSeededRandom(42)
): { options: string[]; correctIndex: number } | null {
  const correct = fact.answerSpan.trim();
  if (!correct) return null;

  const correctStem = stemGeorgian(correct);
  const distractors: string[] = [];

  function isDistinct(cand: string): boolean {
    const cTrim = cand.trim();
    if (!cTrim || cTrim.toLowerCase() === correct.toLowerCase()) return false;
    if (distractors.some(d => d.toLowerCase() === cTrim.toLowerCase())) return false;
    const cStem = stemGeorgian(cTrim);
    if (cStem.length >= 3 && cStem === correctStem) return false;
    if (cTrim.includes(correct) || correct.includes(cTrim)) return false;
    return true;
  }

  // 1. DATE / YEAR DISTRACTORS
  const yearMatch = correct.match(/\b([0-9]{3,4})\b/);
  const romanMatch = correct.match(/\b([IVXLCDM]+)\b/i);

  if (yearMatch) {
    const origYear = parseInt(yearMatch[1], 10);
    // Find other years in document facts
    const docYears: number[] = [];
    for (const f of allFacts) {
      const ym = f.answerSpan.match(/\b([0-9]{3,4})\b/) || f.sentence.match(/\b([0-9]{3,4})\b/);
      if (ym) {
        const y = parseInt(ym[1], 10);
        if (y !== origYear && Math.abs(y - origYear) < 300) {
          docYears.push(y);
        }
      }
    }

    // Add unique doc years
    for (const dy of docYears) {
      const formatted = correct.replace(/\b[0-9]{3,4}\b/, String(dy));
      if (isDistinct(formatted)) {
        distractors.push(formatted);
        if (distractors.length >= 3) break;
      }
    }

    // If needed, generate plausible shifts
    const offsets = [-15, 20, -35, 45, -50, 10];
    for (const off of offsets) {
      if (distractors.length >= 3) break;
      const fakeYear = origYear + off;
      const formatted = correct.replace(/\b[0-9]{3,4}\b/, String(fakeYear));
      if (isDistinct(formatted)) {
        distractors.push(formatted);
      }
    }
  } else if (romanMatch) {
    // Century: e.g. "XI საუკუნე" or "IX ს."
    const romanTable = ['VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI'];
    const curRoman = romanMatch[1].toUpperCase();
    const curIdx = romanTable.indexOf(curRoman);

    const neighbors = curIdx !== -1
      ? [romanTable[curIdx - 1], romanTable[curIdx + 1], romanTable[curIdx - 2], romanTable[curIdx + 2]].filter(Boolean)
      : ['X', 'XII', 'IX'];

    for (const fakeRom of neighbors) {
      const formatted = correct.replace(/\b[IVXLCDM]+\b/i, fakeRom);
      if (isDistinct(formatted)) {
        distractors.push(formatted);
        if (distractors.length >= 3) break;
      }
    }
  }

  // 2. NUMBER + UNIT DISTRACTORS
  if (distractors.length < 3 && fact.type === 'number') {
    const numPart = correct.match(/\b([0-9]+)\b/);
    if (numPart) {
      const origNum = parseInt(numPart[1], 10);
      const multiOffsets = [Math.round(origNum * 0.7), Math.round(origNum * 1.3), Math.round(origNum * 1.5), origNum + 5, origNum - 5];
      for (const offNum of multiOffsets) {
        if (offNum > 0 && offNum !== origNum) {
          const fakeStr = correct.replace(/\b[0-9]+\b/, String(offNum));
          if (isDistinct(fakeStr)) {
            distractors.push(fakeStr);
            if (distractors.length >= 3) break;
          }
        }
      }
    }
  }

  // 3. PERSON / AGENT DISTRACTORS
  if (distractors.length < 3 && fact.type === 'who_did_what') {
    // Pick other agents from facts
    for (const otherFact of allFacts) {
      if (otherFact.type === 'who_did_what' && isDistinct(otherFact.subject)) {
        distractors.push(otherFact.subject);
        if (distractors.length >= 3) break;
      }
    }
  }

  // 4. DEFINITION / CONCEPT DISTRACTORS
  if (distractors.length < 3 && fact.type === 'definition') {
    // Find other definition objects of comparable length (±50%)
    for (const otherFact of allFacts) {
      if (otherFact.id !== fact.id && otherFact.type === 'definition') {
        const cand = otherFact.answerSpan;
        if (isDistinct(cand) && Math.abs(cand.length - correct.length) < Math.max(25, correct.length * 0.6)) {
          distractors.push(cand);
          if (distractors.length >= 3) break;
        }
      }
    }
  }

  // 5. KEY TERM / CONCEPT FALLBACK
  if (distractors.length < 3) {
    // Use other high-scoring terms of similar length
    for (const t of allTerms) {
      if (isDistinct(t.text)) {
        distractors.push(t.text);
        if (distractors.length >= 3) break;
      }
    }
  }

  // If we still could not gather 3 valid, distinct distractors of consistent quality, return null
  if (distractors.length < 3) {
    return null;
  }

  // Pick top 3 distractors
  const finalDistractors = distractors.slice(0, 3);

  // Combine and shuffle deterministically
  const allOptions = [correct, ...finalDistractors];

  // Seeded Fisher-Yates shuffle
  for (let i = allOptions.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [allOptions[i], allOptions[j]] = [allOptions[j], allOptions[i]];
  }

  const correctIndex = allOptions.indexOf(correct);

  return {
    options: allOptions,
    correctIndex
  };
}
