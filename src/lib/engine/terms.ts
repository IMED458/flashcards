/**
 * Deterministic Key Term Extraction
 * Combines TF-IDF, RAKE, structural weighting, and Georgian stem clustering.
 */
import { DocNode, Term } from './types';
import { isStopword } from './ka/stopwords';
import { stemGeorgian } from './ka/stemmer';

interface RawTermCandidate {
  text: string;
  stem: string;
  count: number;
  sectionIds: Set<string>;
  inHeading: boolean;
  inQuotes: boolean;
  isDefinitionSubject: boolean;
}

export function extractKeyTerms(doc: DocNode): Term[] {
  const candidateMap = new Map<string, RawTermCandidate>();
  const totalSections = Math.max(1, doc.sections.length);

  // Helper to add candidate
  function addCandidate(
    phrase: string,
    sectionId: string,
    inHeading = false,
    inQuotes = false,
    isDef = false
  ) {
    const clean = phrase.trim().replace(/^[.,!?:;„"“”()]+|[.,!?:;„"“”()]+$/g, '');
    if (!clean || clean.length < 3) return;

    const words = clean.split(/\s+/);
    if (words.length > 4) return;
    if (isStopword(words[0]) || isStopword(words[words.length - 1])) return;

    const stem = words.map(w => stemGeorgian(w)).join(' ');
    if (stem.length < 3) return;

    const existing = candidateMap.get(stem);
    if (existing) {
      existing.count += 1;
      existing.sectionIds.add(sectionId);
      if (inHeading) existing.inHeading = true;
      if (inQuotes) existing.inQuotes = true;
      if (isDef) existing.isDefinitionSubject = true;
      // Prefer shorter or capitalized/clean canonical representation
      if (clean.length < existing.text.length && clean.endsWith('ი')) {
        existing.text = clean;
      }
    } else {
      candidateMap.set(stem, {
        text: clean,
        stem,
        count: 1,
        sectionIds: new Set([sectionId]),
        inHeading,
        inQuotes,
        isDefinitionSubject: isDef
      });
    }
  }

  // Traverse sections
  for (const sec of doc.sections) {
    // 1. Heading words
    const headingWords = sec.title.split(/\s+/);
    for (let i = 0; i < headingWords.length; i++) {
      const w = headingWords[i];
      if (!isStopword(w)) {
        addCandidate(w, sec.id, true);
        if (i < headingWords.length - 1 && !isStopword(headingWords[i + 1])) {
          addCandidate(`${w} ${headingWords[i + 1]}`, sec.id, true);
        }
      }
    }

    // 2. Blocks
    for (const blk of sec.blocks) {
      const text = blk.text;

      // Extract quoted terms: e.g. „მცირე სჯულისკანონი“
      const quotes = text.matchAll(/„([^“„"]+)[“„"]/g);
      for (const q of quotes) {
        addCandidate(q[1], sec.id, false, true);
      }

      // Check definitions: "X არის Y" or "X — Y"
      const defMatch = text.match(/^([ა-ჰA-Za-z0-9 ]{3,40})\s+(?:არის|წარმოადგენს|—|–)\s+/);
      if (defMatch) {
        addCandidate(defMatch[1], sec.id, false, false, true);
      }

      // Single words and bigrams
      const words = text.split(/\s+/);
      for (let wIdx = 0; wIdx < words.length; wIdx++) {
        const w1 = words[wIdx].replace(/[.,!?:;„"“”()]/g, '');
        if (w1.length >= 4 && !isStopword(w1)) {
          addCandidate(w1, sec.id);

          if (wIdx < words.length - 1) {
            const w2 = words[wIdx + 1].replace(/[.,!?:;„"“”()]/g, '');
            if (w2.length >= 3 && !isStopword(w2)) {
              addCandidate(`${w1} ${w2}`, sec.id);
            }
          }
        }
      }
    }
  }

  // Calculate scores
  const results: Term[] = [];

  candidateMap.forEach((cand) => {
    // TF: term frequency
    const tf = Math.log(1 + cand.count);
    // IDF across sections: log(totalSections / docFrequency)
    const df = cand.sectionIds.size;
    const idf = Math.log(1 + (totalSections / df));

    let score = tf * idf;

    // Bonuses
    if (cand.inHeading) score *= 1.8;
    if (cand.isDefinitionSubject) score *= 2.5;
    if (cand.inQuotes) score *= 1.5;
    if (cand.text.includes(' ')) score *= 1.2; // Multi-word terms are often more specific

    results.push({
      text: cand.text,
      stem: cand.stem,
      score: Math.round(score * 100) / 100,
      type: cand.isDefinitionSubject ? 'concept' : cand.inQuotes ? 'entity' : 'keyword',
      sections: Array.from(cand.sectionIds),
      sentences: []
    });
  });

  // Sort descending by score
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, 50);
}
