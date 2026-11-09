/**
 * Accepted Answers Generation and Roman/Arabic/Ordinal Normalization
 */
import { stemGeorgian } from './ka/stemmer';

const ROMAN_MAP: Record<string, string> = {
  'I': '1', 'II': '2', 'III': '3', 'IV': '4', 'V': '5',
  'VI': '6', 'VII': '7', 'VIII': '8', 'IX': '9', 'X': '10',
  'XI': '11', 'XII': '12', 'XIII': '13', 'XIV': '14', 'XV': '15',
  'XVI': '16', 'XVII': '17', 'XVIII': '18', 'XIX': '19', 'XX': '20'
};

const ARABIC_TO_ORDINAL: Record<string, string> = {
  '1': 'პირველი', '2': 'მეორე', '3': 'მესამე', '4': 'მეოთხე', '5': 'მეხუთე',
  '6': 'მეექვსე', '7': 'მეშვიდე', '8': 'მერვე', '9': 'მეცხრე', '10': 'მეათე',
  '11': 'მეთერთმეტე', '12': 'მეთორმეტე', '13': 'მეცამეტე', '14': 'მეთოთხმეტე',
  '15': 'მეთხუთმეტე', '16': 'მეთექვსმეტე', '17': 'მეჩვიდმეტე', '18': 'მეთვრამეტე',
  '19': 'მეცხრამეტე', '20': 'მეოცე'
};

export function generateAcceptedAnswers(answer: string): string[] {
  const set = new Set<string>();
  const trimmed = answer.trim();
  set.add(trimmed);
  set.add(trimmed.toLowerCase());

  // Check Roman Numeral
  const romanMatch = trimmed.match(/\b([IVXLCDM]+)\b/i);
  if (romanMatch) {
    const rom = romanMatch[1].toUpperCase();
    const arabic = ROMAN_MAP[rom];
    if (arabic) {
      set.add(rom);
      set.add(rom.toLowerCase());
      set.add(arabic);
      set.add(`მე-${arabic}`);
      const ordWord = ARABIC_TO_ORDINAL[arabic];
      if (ordWord) set.add(ordWord);

      // Substitute into the full answer if answer is e.g. "XI საუკუნე"
      const withArabic = trimmed.replace(new RegExp(`\\b${rom}\\b`, 'i'), arabic);
      const withHyphen = trimmed.replace(new RegExp(`\\b${rom}\\b`, 'i'), `მე-${arabic}`);
      set.add(withArabic);
      set.add(withHyphen);
    }
  }

  // Check Arabic Numeral: e.g. "11" or "მე-11"
  const arabicMatch = trimmed.match(/\b(?:მე-)?([0-9]+)\b/);
  if (arabicMatch) {
    const num = arabicMatch[1];
    set.add(num);
    set.add(`მე-${num}`);
    // Find reverse Roman
    for (const [r, a] of Object.entries(ROMAN_MAP)) {
      if (a === num) {
        set.add(r);
        set.add(r.toLowerCase());
        break;
      }
    }
    const ordWord = ARABIC_TO_ORDINAL[num];
    if (ordWord) set.add(ordWord);
  }

  // Dash variations: e.g. 1005–1028 and 1005-1028
  if (trimmed.includes('–')) {
    set.add(trimmed.replace(/–/g, '-'));
  }
  if (trimmed.includes('-')) {
    set.add(trimmed.replace(/-/g, '–'));
  }

  // Common Georgian Case variations for nouns
  const stem = stemGeorgian(trimmed);
  if (stem.length >= 3) {
    set.add(stem + 'ი');
    set.add(stem + 'ს');
    set.add(stem + 'მა');
    set.add(stem + 'ით');
    set.add(stem + 'ად');
  }

  return Array.from(set).filter(Boolean);
}
