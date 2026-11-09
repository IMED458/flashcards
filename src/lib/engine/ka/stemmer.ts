/**
 * Georgian Light Stemmer (Rule-based suffix stripping)
 * Strips enclitics, postpositions, case markers and plurals in hierarchical order.
 * Ensures minimum stem length >= 3 characters.
 * Used strictly for grouping, clustering, frequency analysis and fuzzy comparison.
 */

const PARTICLES = ['ვე', 'ც'];

const POSTPOSITIONS = [
  'ისთვის', 'ისკენ', 'იდან', 'ივით',
  'თვის', 'ამდე', 'თან', 'დან', 'კენ', 'ზედ', 'მდე', 'ში', 'ზე'
];

const PLURALS = ['ების', 'ებით', 'ებად', 'ებმა', 'ებს', 'ები', 'ებო', 'ებ', 'თა'];

const CASES = [
  'ითა', 'ით', 'ის', 'მა', 'ად', 'სა', 'თა', 'ში', 'ზე',
  'ს', 'მ', 'დ', 'ო', 'ი'
];

export function stemGeorgian(word: string): string {
  if (!word || word.length < 4) return word ? word.toLowerCase().trim() : '';

  let stem = word.toLowerCase().trim().replace(/^[„"“”()]+|[.,!?:;„"“”()]+$/g, '');

  if (stem.length < 4) return stem;

  // 1. Strip enclitic particles (-ც, -ვე)
  for (const p of PARTICLES) {
    if (stem.endsWith(p) && stem.length - p.length >= 3) {
      stem = stem.slice(0, -p.length);
      break;
    }
  }

  // 2. Strip postpositions (-ისთვის, -დან, -ზე, -ში...)
  for (const post of POSTPOSITIONS) {
    if (stem.endsWith(post) && stem.length - post.length >= 3) {
      stem = stem.slice(0, -post.length);
      break;
    }
  }

  // 3. Strip plural suffixes (-ები, -ებს, -ების...)
  for (const pl of PLURALS) {
    if (stem.endsWith(pl) && stem.length - pl.length >= 3) {
      stem = stem.slice(0, -pl.length);
      break;
    }
  }

  // 4. Strip case endings (-ის, -მა, -ს, -ით, -ად, -ი...)
  for (const c of CASES) {
    if (stem.endsWith(c) && stem.length - c.length >= 3) {
      stem = stem.slice(0, -c.length);
      break;
    }
  }

  return stem;
}

export function areStemsEqual(w1: string, w2: string): boolean {
  if (!w1 || !w2) return false;
  const s1 = stemGeorgian(w1);
  const s2 = stemGeorgian(w2);
  return s1.length >= 3 && s1 === s2;
}
