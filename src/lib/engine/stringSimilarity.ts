/**
 * Levenshtein Distance & Answer Verification for Fill-in-the-Blank Questions
 */
import { stemGeorgian } from './ka/stemmer';

export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}

export interface VerificationResult {
  status: 'correct' | 'almost_correct' | 'incorrect';
  isCorrect: boolean;
  feedbackText: string;
}

export function verifyAnswer(
  userRawInput: string,
  targetAnswer: string,
  acceptedAnswers: string[] = []
): VerificationResult {
  const user = userRawInput.trim().toLowerCase().replace(/[.,!?:;„"“”]/g, '');
  const target = targetAnswer.trim().toLowerCase().replace(/[.,!?:;„"“”]/g, '');

  if (!user) {
    return {
      status: 'incorrect',
      isCorrect: false,
      feedbackText: 'შეიყვანეთ პასუხი'
    };
  }

  // 1. Direct match with target or accepted answers
  if (user === target) {
    return {
      status: 'correct',
      isCorrect: true,
      feedbackText: 'სწორია!'
    };
  }

  for (const acc of acceptedAnswers) {
    const accNorm = acc.trim().toLowerCase().replace(/[.,!?:;„"“”]/g, '');
    if (user === accNorm) {
      return {
        status: 'correct',
        isCorrect: true,
        feedbackText: 'სწორია!'
      };
    }
  }

  // 2. Strict verification for numbers and dates: exact match only
  const isNumericOrDate = /^[0-9IVXLCDM\s–-]+$/i.test(target);
  if (isNumericOrDate) {
    return {
      status: 'incorrect',
      isCorrect: false,
      feedbackText: `სწორი პასუხი: ${targetAnswer}`
    };
  }

  // 3. Stem matching (user typed word in another Georgian grammatical case)
  const userStem = stemGeorgian(user);
  const targetStem = stemGeorgian(target);
  if (userStem.length >= 3 && userStem === targetStem) {
    return {
      status: 'correct',
      isCorrect: true,
      feedbackText: 'სწორია (ბრუნვის სხვა ფორმა)!'
    };
  }

  // 4. Fuzzy Levenshtein tolerance
  const dist = levenshteinDistance(user, target);
  const len = target.length;

  if ((len >= 5 && len <= 8 && dist <= 1) || (len >= 9 && dist <= 2)) {
    return {
      status: 'almost_correct',
      isCorrect: true,
      feedbackText: `თითქმის სწორია (სწორად: ${targetAnswer})`
    };
  }

  return {
    status: 'incorrect',
    isCorrect: false,
    feedbackText: `სწორი პასუხი: ${targetAnswer}`
  };
}
