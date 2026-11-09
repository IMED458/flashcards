/**
 * English fact extraction rules (the main rules in ../facts.ts are Georgian-specific).
 * Used for sentences written mostly in Latin script.
 */
import type { FactType } from '../types';

const PRONOUN_SUBJECTS = /^(it|this|that|these|those|they|there|he|she|we|you|i|each|all|some|any|your|our|their|its|his|her|which|what|who|here|one|both|such|other)\b/i;

const UNITS =
  'days?|weeks?|months?|years?|hours?|minutes?|seconds?|words?|pages?|reviewers?|authors?|keywords?|figures?|tables?|references?|steps?|stages?|items?|times|percent|MB|GB|KB|dpi|px|characters?|copies|articles?|issues?|members?|editors?|rounds?|points?|sections?|parts?|chapters?|levels?|types?|kinds?';

export function isMostlyLatin(text: string): boolean {
  const latin = text.match(/[A-Za-z]/g)?.length ?? 0;
  const georgian = text.match(/[ა-ჰ]/g)?.length ?? 0;
  return latin > 20 && latin > georgian * 2;
}

type Draft = { type: FactType; subject: string; predicate: string; object: string; answerSpan: string; confidence: number };

/** A blank must leave enough of the sentence to be answerable. */
function leavesContext(sentence: string, span: string): boolean {
  const rest = sentence.replace(span, ' ').replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/).filter(w => w.length > 1);
  return rest.length >= 3 && span.length <= sentence.length * 0.6;
}

export function extractEnglishFact(sentence: string, sectionTitle: string): Draft | null {
  const s = sentence.trim();

  // A. Definition: "Peer review is a process ...", "Copyediting is the stage where ..."
  const def = s.match(
    /^(?:The |A |An )?([A-Za-z][A-Za-z0-9\-/'’ ]{1,45}?)\s+(?:is|are|refers to|means|is defined as|is called)\s+((?:a|an|the)\s+[^.!?]{5,160}|[^.!?]{8,160})/
  );
  if (def) {
    const subject = def[1].trim();
    const words = subject.split(/\s+/);
    // Skip passive voice ("DOI is registered through ...") — not a definition.
    const passive = /^(?!a\b|an\b|the\b)\w+ed\b/i.test(def[2].trim());
    if (!passive && words.length <= 5 && !PRONOUN_SUBJECTS.test(subject) && !/\b(not|also|only|then)$/i.test(subject)) {
      const object = def[2].trim().replace(/[.;:,]+$/, '');
      return { type: 'definition', subject, predicate: 'is', object, answerSpan: object, confidence: 0.93 };
    }
  }

  // B. Year: "... in 1953", "since 2010"
  const year = s.match(/\b(?:in|In|since|Since|by|By|from|From|until|Until|of|during|During)\s+((?:1[5-9]|20)\d\d)\b/);
  if (year) {
    return { type: 'date', subject: sectionTitle, predicate: 'year', object: year[1], answerSpan: year[1], confidence: 0.9 };
  }

  // C. Number with unit: "within 3 days", "max 250 words", "21 days", "300 dpi"
  const num = s.match(new RegExp(`\\b(\\d+(?:[.,]\\d+)?%?)\\s*(${UNITS})\\b`, 'i'));
  if (num) {
    const span = `${num[1]} ${num[2]}`;
    return { type: 'number', subject: num[2], predicate: 'amount', object: num[1], answerSpan: span, confidence: 0.88 };
  }

  // D. Enumeration: "The decision can be Accept, Minor Revisions, Major Revisions or Decline."
  const en = s.match(/^(.{3,60}?)\s+(?:include|includes|consist of|consists of|can be|are|is one of)\s*:?\s+([^.!?]*,[^.!?]*\b(?:and|or)\b[^.!?]+)/i);
  if (en && !PRONOUN_SUBJECTS.test(en[1]) && leavesContext(s, en[2].trim())) {
    const object = en[2].trim();
    if (object.length <= 140) {
      return { type: 'enumeration', subject: en[1].trim(), predicate: 'includes', object, answerSpan: object, confidence: 0.85 };
    }
  }

  // E. UI path / menu navigation: "Go to Submissions → New Submission."
  const path = s.match(/([A-Z][\w ]{1,30}(?:\s*(?:→|->|>)\s*[A-Z][\w ]{1,30})+)/);
  if (path && leavesContext(s, path[1].trim())) {
    const span = path[1].trim();
    return { type: 'key_sentence', subject: sectionTitle, predicate: 'path', object: span, answerSpan: span, confidence: 0.82 };
  }

  // F. Quoted UI label / term: click „Save and Continue“
  const quoted = s.match(/[„"“]([^„"“”]{3,40})[„"“”]/);
  if (quoted && leavesContext(s, quoted[1].trim())) {
    const span = quoted[1].trim();
    return { type: 'key_sentence', subject: sectionTitle, predicate: 'label', object: span, answerSpan: span, confidence: 0.8 };
  }

  // G. Capitalised multi-word term inside an instruction: "assigns a Section Editor within ..."
  const term = s.slice(1).match(/\b((?:[A-Z][a-z]+|[A-Z]{2,})(?:[ -](?:[A-Z][a-z]+|[A-Z]{2,})){1,3})\b/);
  if (term && s.split(/\s+/).length >= 6 && leavesContext(s, term[1])) {
    const span = term[1];
    return { type: 'key_sentence', subject: sectionTitle, predicate: 'term', object: span, answerSpan: span, confidence: 0.75 };
  }

  return null;
}
