/**
 * TextRank Graph-Based Extractive Summarization
 * PageRank algorithm with Georgian stem overlap, position weighting and MMR.
 */
import { splitGeorgianSentences } from './ka/sentenceSplitter';
import { stemGeorgian } from './ka/stemmer';
import { isStopword } from './ka/stopwords';

export interface ScoredSentence {
  text: string;
  index: number;
  score: number;
  sectionId?: string;
}

function sentenceToStems(sentence: string): Set<string> {
  const words = sentence.toLowerCase().split(/\s+/);
  const stems = new Set<string>();
  for (const w of words) {
    const clean = w.replace(/[.,!?:;„"“”()]/g, '');
    if (clean.length >= 3 && !isStopword(clean)) {
      stems.add(stemGeorgian(clean));
    }
  }
  return stems;
}

function jaccardSimilarity(s1: Set<string>, s2: Set<string>): number {
  if (s1.size === 0 || s2.size === 0) return 0;
  let intersection = 0;
  s1.forEach(stem => {
    if (s2.has(stem)) intersection++;
  });
  const union = s1.size + s2.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** TextRank is O(n²) in memory and time; above this size we pre-select candidates. */
const MAX_TEXTRANK_SENTENCES = 150;

export function rankSentencesTextRank(
  sentences: string[],
  topCount = 10,
  keyTermStems: Set<string> = new Set()
): ScoredSentence[] {
  if (sentences.length > MAX_TEXTRANK_SENTENCES) {
    // Cheap O(n) pre-ranking by stem frequency, then TextRank on the best candidates only.
    const stemSets = sentences.map(s => sentenceToStems(s));
    const freq = new Map<string, number>();
    stemSets.forEach(set => set.forEach(st => freq.set(st, (freq.get(st) || 0) + 1)));
    const candidates = sentences
      .map((text, index) => {
        const words = text.split(/\s+/).length;
        let score = 0;
        stemSets[index].forEach(st => (score += Math.log(1 + (freq.get(st) || 0))));
        score /= Math.sqrt(Math.max(1, stemSets[index].size));
        if (words < 6 || words > 55) score *= 0.5;
        return { index, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_TEXTRANK_SENTENCES)
      .sort((a, b) => a.index - b.index);
    const subset = candidates.map(c => sentences[c.index]);
    return rankSentencesTextRank(subset, topCount, keyTermStems).map(r => ({
      ...r,
      index: candidates[r.index].index
    }));
  }
  if (sentences.length === 0) return [];
  if (sentences.length <= topCount) {
    return sentences.map((text, index) => ({ text, index, score: 1 }));
  }

  const n = sentences.length;
  const sentenceStems = sentences.map(s => sentenceToStems(s));

  // Build Adjacency Matrix
  const weights: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  const outWeights: number[] = Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const sim = jaccardSimilarity(sentenceStems[i], sentenceStems[j]);
      if (sim > 0.05) {
        weights[i][j] = sim;
        weights[j][i] = sim;
        outWeights[i] += sim;
        outWeights[j] += sim;
      }
    }
  }

  // PageRank iterations
  const damping = 0.85;
  const iterations = 30;
  let scores: number[] = Array(n).fill(1 / n);

  for (let it = 0; it < iterations; it++) {
    const nextScores: number[] = Array(n).fill((1 - damping) / n);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j && weights[j][i] > 0 && outWeights[j] > 0) {
          nextScores[i] += damping * (weights[j][i] / outWeights[j]) * scores[j];
        }
      }
    }
    scores = nextScores;
  }

  // Apply contextual bonuses and penalties
  const ranked: ScoredSentence[] = sentences.map((text, index) => {
    let score = scores[index];
    const words = text.split(/\s+/).filter(Boolean);

    // Sentence length filter
    if (words.length < 6 || words.length > 55) {
      score *= 0.6;
    }

    // First sentence bonus
    if (index === 0) {
      score *= 1.4;
    } else if (index < 3) {
      score *= 1.2;
    }

    // Key terms match bonus
    const stems = sentenceStems[index];
    let keyTermOverlap = 0;
    stems.forEach(stem => {
      if (keyTermStems.has(stem)) keyTermOverlap++;
    });
    if (keyTermOverlap > 0) {
      score *= 1 + Math.min(1.0, keyTermOverlap * 0.2);
    }

    // Definition bonus
    if (/(\bარის\b|\bწარმოადგენს\b|—|–)/.test(text)) {
      score *= 1.3;
    }

    return {
      text,
      index,
      score
    };
  });

  // Sort by score descending
  ranked.sort((a, b) => b.score - a.score);

  // MMR (Maximal Marginal Relevance) selection for diversity
  const selected: ScoredSentence[] = [];
  const selectedIndices = new Set<number>();

  for (const cand of ranked) {
    if (selected.length >= topCount) break;

    // Check similarity with already selected sentences to avoid repetition
    let tooSimilar = false;
    for (const sel of selected) {
      const sim = jaccardSimilarity(sentenceStems[cand.index], sentenceStems[sel.index]);
      if (sim > 0.45) {
        tooSimilar = true;
        break;
      }
    }

    if (!tooSimilar) {
      selected.push(cand);
      selectedIndices.add(cand.index);
    }
  }

  // Fallback if MMR was too aggressive
  if (selected.length < Math.min(topCount, sentences.length)) {
    for (const cand of ranked) {
      if (!selectedIndices.has(cand.index)) {
        selected.push(cand);
        selectedIndices.add(cand.index);
        if (selected.length >= topCount) break;
      }
    }
  }

  // Re-sort selected back to original document order
  selected.sort((a, b) => a.index - b.index);

  return selected;
}

export function summarizeTextTextRank(rawText: string, topCount = 5): string[] {
  const sentences = splitGeorgianSentences(rawText);
  return rankSentencesTextRank(sentences, topCount).map(s => s.text);
}
