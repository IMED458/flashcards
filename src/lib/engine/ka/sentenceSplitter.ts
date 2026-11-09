/**
 * Robust Georgian Sentence Splitter
 * Preserves abbreviations, initials, Roman numerals, decimals, and quoted clauses.
 */

const KNOWN_ABBREVIATIONS = [
  'წ.', 'სს.', 'ს.', 'მაგ.', 'ე.ი.', 'ე.წ.', 'ა.შ.', 'სხვ.',
  'გვ.', 'ტ.', 'ქ.', 'მ.შ.', 'ძვ.წ.', 'ახ.წ.', 'ბ-ნი', 'ქ-ნი',
  'ნაწ.', 'თავ.', 'მუხ.', 'პუნქტ.', 'იხ.', 'შდრ.', 'რედ.'
];

export function splitGeorgianSentences(rawText: string): string[] {
  if (!rawText || !rawText.trim()) return [];

  // Normalize quotes and spaces
  let text = rawText
    .replace(/\r\n/g, '\n')
    .replace(/[“”"]/g, '„')
    .replace(/  +/g, ' ')
    .trim();

  // Temporary mask for known abbreviations
  const placeholderMap = new Map<string, string>();
  let maskCounter = 0;

  function mask(str: string): string {
    const key = `__MASK_${maskCounter++}__`;
    placeholderMap.set(key, str);
    return key;
  }

  // 1. Mask Roman numerals with period: e.g. XI. or IV.
  text = text.replace(/\b([IVXLCDM]+)\.\s+/gi, (m, roman) => {
    return mask(`${roman}.`) + ' ';
  });

  // 2. Mask Decimals: e.g. 3.5 or 12.8
  text = text.replace(/\b(\d+)\.(\d+)\b/g, (m, intPart, decPart) => {
    return mask(`${intPart}.${decPart}`);
  });

  // 3. Mask Georgian Person Initials: e.g. "ი. ჭავჭავაძე" or "დ. აღმაშენებელი"
  text = text.replace(/\b([ა-ჰ])\.\s+([ა-ჰ]{3,})/g, (m, initial, surname) => {
    return mask(`${initial}.`) + ' ' + surname;
  });

  // 4. Mask Known abbreviations
  for (const abbr of KNOWN_ABBREVIATIONS) {
    const escaped = abbr.replace(/\./g, '\\.');
    const regex = new RegExp(`(?<=^|\\s)(${escaped})(?=\\s|$)`, 'gi');
    text = text.replace(regex, (m) => mask(m));
  }

  // 5. Mask quoted strings so periods inside quotes don't split
  text = text.replace(/„([^“„"]+)[“„"]/g, (m) => {
    return mask(m);
  });

  // 6. Split sentences by period, exclamation, question mark or ellipsis followed by space or newline
  const rawSentences = text.split(/(?<=[.!?…])\s+(?=[A-ZА-Я0-9ა-ჰ„])/g);

  const cleanSentences: string[] = [];

  for (let s of rawSentences) {
    let sentence = s.trim();
    if (!sentence) continue;

    // Restore masks
    placeholderMap.forEach((orig, key) => {
      sentence = sentence.replaceAll(key, orig);
    });

    // Cleanup whitespace
    sentence = sentence.replace(/\s+/g, ' ').trim();
    if (sentence.length > 0) {
      cleanSentences.push(sentence);
    }
  }

  return cleanSentences;
}
