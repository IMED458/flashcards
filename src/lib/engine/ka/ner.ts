/**
 * Named Entity and Concept Heuristics for Georgian Text
 */

const GEORGIAN_TITLE_PREFIXES = [
  'მეფე', 'კათალიკოსი', 'პატრიარქი', 'პროფესორი', 'წმინდა', 'დედოფალი',
  'მთავარეპისკოპოსი', 'ერისთავი', 'მწიგნობართუხუცესი', 'სარდალი', 'ავტორი',
  'მეცნიერი', 'მკვლევარი', 'ფილოსოფოსი', 'ისტორიკოსი', 'სწავლული', 'მამა'
];

const SURNAME_SUFFIXES = [
  'შვილი', 'ძე', 'ია', 'ავა', 'ური', 'ანი', 'ელი', 'იანი', 'უა'
];

export interface ExtractedEntity {
  text: string;
  type: 'person' | 'location' | 'title' | 'concept' | 'date';
  confidence: number;
}

export function detectGeorgianEntities(text: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];
  const words = text.split(/\s+/);

  // 1. Quoted names and titles: e.g. „მცირე სჯულისკანონი“
  const quoteMatches = text.matchAll(/„([^“„"]+)[“„"]/g);
  for (const m of quoteMatches) {
    const content = m[1].trim();
    if (content.length > 2 && content.length < 50) {
      entities.push({
        text: content,
        type: 'title',
        confidence: 0.95
      });
    }
  }

  // 2. Title + Person constructs: e.g. "მეფე დავითი", "კათალიკოსი გიორგი"
  for (let i = 0; i < words.length - 1; i++) {
    const cleanWord = words[i].replace(/[.,!?:;()„"“”]/g, '');
    if (GEORGIAN_TITLE_PREFIXES.includes(cleanWord)) {
      const nextWord = words[i + 1].replace(/[.,!?:;()„"“”]/g, '');
      if (nextWord.length >= 3 && !GEORGIAN_TITLE_PREFIXES.includes(nextWord)) {
        entities.push({
          text: `${cleanWord} ${nextWord}`,
          type: 'person',
          confidence: 0.9
        });
      }
    }
  }

  // 3. Surnames with known Georgian patronymic/regional suffixes
  for (const w of words) {
    const clean = w.replace(/[.,!?:;()„"“”]/g, '');
    if (clean.length < 5) continue;
    for (const suffix of SURNAME_SUFFIXES) {
      if (clean.endsWith(suffix) || clean.endsWith(suffix + 'ს') || clean.endsWith(suffix + 'მა') || clean.endsWith(suffix + 'ის')) {
        entities.push({
          text: clean,
          type: 'person',
          confidence: 0.8
        });
        break;
      }
    }

    // Place names ending with -ეთი (e.g. საქართველო, იმერეთი, კახეთი, ქართლი)
    if (clean.endsWith('ეთი') || clean.endsWith('ეთს') || clean.endsWith('ეთის') || clean.endsWith('ეთში')) {
      entities.push({
        text: clean,
        type: 'location',
        confidence: 0.85
      });
    }
  }

  // 4. Latin capitalized words (e.g. DNA, RNA, ATP, etc.)
  for (const w of words) {
    const clean = w.replace(/[.,!?:;()]/g, '');
    if (/^[A-Z][A-Za-z0-9_-]{1,}$/.test(clean)) {
      entities.push({
        text: clean,
        type: 'concept',
        confidence: 0.85
      });
    }
  }

  return entities;
}
