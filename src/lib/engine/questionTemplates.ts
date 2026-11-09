/**
 * Georgian Question Formation Templates
 * Converts structured facts into grammatically sound flashcards, quiz questions, and fill-in-the-blank items.
 */
import { Fact, Flashcard, QuizQuestion, FillBlank, Term } from './types';
import { generateDistractors, createSeededRandom } from './distractors';
import { generateAcceptedAnswers } from './acceptedAnswers';
import { isMostlyLatin } from './en/facts';

export function createFlashcardFromFact(fact: Fact): Flashcard | null {
  let front = '';
  let back = '';

  const english = isMostlyLatin(fact.sentence);
  switch (english && fact.type !== 'definition' && fact.type !== 'enumeration' ? 'cloze' : fact.type) {
    case 'definition':
      front = `რა არის ${fact.subject}?`;
      back = fact.object;
      break;

    case 'date':
      front = `როდის მოხდა ან რომელ პერიოდს განეკუთვნება: „${fact.subject}“?`;
      back = fact.answerSpan;
      break;

    case 'number':
      front = `რამდენია ${fact.subject}?`;
      back = fact.answerSpan;
      break;

    case 'who_did_what':
      front = `ვინ ${fact.predicate} ${fact.object}?`;
      back = fact.subject;
      break;

    case 'enumeration':
      front = `რისგან შედგება ან რას მოიცავს ${fact.subject}?`;
      back = fact.object;
      break;

    case 'cause':
      front = `რა იყო ძირითადი მიზეზი ან შედეგი სექციაში „${fact.subject}“?`;
      back = fact.sentence;
      break;

    case 'contrast':
      front = `რა ძირითადი განსხვავებაა აღნიშნული სექციაში „${fact.subject}“?`;
      back = fact.sentence;
      break;

    default:
      // Safe cloze fallback
      const clozeSentence = fact.sentence.replace(fact.answerSpan, '________');
      front = `შეავსე გამოტოვებული ადგილი:\n${clozeSentence}`;
      back = fact.answerSpan;
      break;
  }

  if (!front || !back || front.length < 5 || back.length < 2) {
    return null;
  }

  return {
    id: `card-${fact.id}`,
    front,
    back,
    factId: fact.id,
    sectionId: fact.sectionId,
    sourceRef: fact.sourceRef,
    quality: fact.confidence,
    origin: 'auto',
    starred: false
  };
}

export function createQuizQuestionFromFact(
  fact: Fact,
  allFacts: Fact[],
  allTerms: Term[],
  seed = 42
): QuizQuestion | null {
  const rng = createSeededRandom(seed);
  let question = '';

  const english = isMostlyLatin(fact.sentence);
  switch (english && fact.type !== 'definition' ? 'cloze' : fact.type) {
    case 'definition':
      // Rotate between "რა არის X?" and "რომელ ცნებას შეესაბამება: Y?"
      if (fact.subject.length <= 25 && rng() > 0.4) {
        question = `რა არის ${fact.subject}?`;
      } else {
        const truncatedObj = fact.object.length > 100 ? fact.object.slice(0, 100) + '...' : fact.object;
        question = `რომელ ცნებას ან ტერმინს შეესაბამება შემდეგი განმარტება: „${truncatedObj}“?`;
      }
      break;

    case 'date':
      question = `რომელ წელს ან პერიოდში აღინიშნება შემდეგი ფაქტი: „${fact.sentence.slice(0, 110)}“?`;
      break;

    case 'who_did_what':
      question = `ვინ ${fact.predicate} ${fact.object}?`;
      break;

    case 'number':
      question = `რამდენ ${fact.subject}-ს შეადგენს აღნიშნული მონაცემი დოკუმენტის მიხედვით?`;
      break;

    default:
      // Fallback Cloze question
      const cloze = fact.sentence.replace(fact.answerSpan, '________');
      question = `შეავსე გამოტოვებული ადგილი:\n„${cloze}“`;
      break;
  }

  const distractorResult = generateDistractors(fact, allFacts, allTerms, rng);
  if (!distractorResult) return null;

  return {
    id: `quiz-${fact.id}`,
    question,
    options: distractorResult.options,
    correctIndex: distractorResult.correctIndex,
    explanation: fact.sentence,
    sourceSentence: fact.sentence,
    factId: fact.id,
    sectionId: fact.sectionId,
    sourceRef: fact.sourceRef,
    quality: Math.round(fact.confidence * 95) / 100,
    origin: 'auto'
  };
}

export function createFillBlankFromFact(fact: Fact): FillBlank | null {
  const answer = fact.answerSpan.trim();
  if (!answer || answer.length < 2 || answer.length > 50) return null;

  const sentence = fact.sentence;
  const idx = sentence.indexOf(answer);
  if (idx === -1) return null;

  const before = sentence.slice(0, idx);
  const after = sentence.slice(idx + answer.length);

  // Generate automated hints based on answer type
  let hint = '';
  if (/^[0-9]{4}$/.test(answer)) {
    hint = 'წელი (4 ციფრი)';
  } else if (/^[IVXLCDM]+$/i.test(answer)) {
    hint = 'საუკუნე (რომაული ციფრი)';
  } else if (/^[0-9]+$/.test(answer)) {
    hint = 'რიცხვითი მნიშვნელობა';
  } else {
    // Word: first letter + letter count e.g. "ე _ _ _ _ _ _ (7 ასო)"
    const cleanWord = answer.replace(/[.,!?:;„"“”]/g, '');
    const firstChar = cleanWord.charAt(0);
    const len = cleanWord.length;
    const blanks = Array(Math.max(1, len - 1)).fill('_').join(' ');
    hint = `${firstChar} ${blanks} (${len} ასო)`;
  }

  const accepted = generateAcceptedAnswers(answer);

  return {
    id: `fill-${fact.id}`,
    before,
    blank: answer,
    after,
    answer,
    acceptedAnswers: accepted,
    hint,
    factId: fact.id,
    sectionId: fact.sectionId,
    sourceRef: fact.sourceRef,
    quality: fact.confidence,
    origin: 'auto'
  };
}
