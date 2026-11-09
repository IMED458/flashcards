/**
 * Deterministic Fact Extraction Engine
 * Extracts structured facts (Definition, Date, Number, Agent-Action, Enumeration, Cause, Contrast, Key Sentence)
 */
import { DocNode, Fact, FactType } from './types';
import { splitGeorgianSentences } from './ka/sentenceSplitter';

const ACTION_VERBS = [
  'შეადგინა', 'თარგმნა', 'შექმნა', 'აღმოაჩინა', 'მოიწვია', 'დააარსა',
  'მიიღო', 'გამოსცა', 'დაწერა', 'გაატარა', 'ააგო', 'დაამარცხა', 'გააერთიანა',
  'დააწესა', 'შეიმუშავა', 'დაადგინა', 'გამოაქვეყნა', 'მოახდინა', 'ჩამოაყალიბა',
  'განახორციელა', 'ხელმძღვანელობდა', 'მართავდა', 'განმარტა', 'აღწერა'
];

// Dangling sentence starters that depend on previous context
const DANGLING_STARTERS = [
  /^ის\s+/i, /^ეს\s+/i, /^იგი\s+/i, /^ამიტომ\s+/i, /^თუმცა\s+/i,
  /^ასევე\s+/i, /^ამის\s+/i, /^იმის\s+/i, /^აქედან\s+/i, /^შესაბამისად\s+/i
];

export function extractFactsFromDocument(doc: DocNode): Fact[] {
  const facts: Fact[] = [];
  let factIdCounter = 0;

  for (const sec of doc.sections) {
    for (const blk of sec.blocks) {
      const sentences = splitGeorgianSentences(blk.text);

      for (const sentence of sentences) {
        const words = sentence.split(/\s+/).filter(Boolean);
        if (words.length < 5 || words.length > 50) continue;

        // Check if sentence starts with dangling pronouns
        const isDangling = DANGLING_STARTERS.some(pat => pat.test(sentence));
        if (isDangling) continue;

        // Try extracting specific fact types in order of specificity

        // A. Definition: "X არის Y" or "X წარმოადგენს Y-ს" or "X — Y"
        const defMatch = sentence.match(/^([ა-ჰA-Za-z0-9„][^,]{2,45})\s+(?:არის|წარმოადგენს|ეწოდება|ნიშნავს|გულისხმობს)\s+([^.!?]{5,150})/i) ||
          sentence.match(/^([„"][^“„"]+[“„"]|[ა-ჰA-Za-z0-9]{3,35})\s*[-—–]\s*([^.!?]{8,150})/);

        if (defMatch) {
          const subject = defMatch[1].trim().replace(/^„|“$/g, '');
          const answer = defMatch[2].trim();
          if (subject.length >= 3 && answer.length >= 5 && subject.toLowerCase() !== answer.toLowerCase()) {
            facts.push({
              id: `fact-${factIdCounter++}`,
              type: 'definition',
              subject,
              predicate: 'არის',
              object: answer,
              answerSpan: answer,
              sentence,
              sectionId: sec.id,
              sectionTitle: sec.title,
              sourceRef: { page: blk.page || sec.page || 1, sectionTitle: sec.title },
              confidence: 0.95
            });
            continue;
          }
        }

        // B. Date & Period Facts
        // e.g. "1103 წელს", "1089–1125 წლებში", "XI საუკუნეში", "XII საუკუნის დასაწყისში"
        const dateMatch = sentence.match(/\b([0-9]{3,4}(?:[-–][0-9]{3,4})?)\s*(?:წელს|წლებში|წ\.)\b/) ||
          sentence.match(/\b([IVXLCDM]+(?:[-–][IVXLCDM]+)?)\s*(?:საუკუნეში|საუკუნის|საუკუნე|ს\.)\b/i);

        if (dateMatch) {
          const dateStr = dateMatch[0].trim();
          facts.push({
            id: `fact-${factIdCounter++}`,
            type: 'date',
            subject: sec.title,
            predicate: 'მოხდა',
            object: dateStr,
            answerSpan: dateStr,
            sentence,
            sectionId: sec.id,
            sectionTitle: sec.title,
            sourceRef: { page: blk.page || sec.page || 1, sectionTitle: sec.title },
            confidence: 0.92
          });
          continue;
        }

        // C. Numbered Facts
        // e.g. "45 მუხლი", "222 მუხლისგან", "85%", "5 ეტაპი"
        const numMatch = sentence.match(/\b([0-9]+(?:,[0-9]+)?%?)\s+([ა-ჰ]{3,25})\b/);
        if (numMatch && !dateMatch) {
          const numValue = numMatch[1];
          const unit = numMatch[2];
          // Filter out generic numbering like "1-ლი" or tiny page indices
          if (!['წლის', 'წელს', 'საუკუნე'].includes(unit)) {
            facts.push({
              id: `fact-${factIdCounter++}`,
              type: 'number',
              subject: unit,
              predicate: 'რაოდენობა',
              object: numValue,
              answerSpan: `${numValue} ${unit}`,
              sentence,
              sectionId: sec.id,
              sectionTitle: sec.title,
              sourceRef: { page: blk.page || sec.page || 1, sectionTitle: sec.title },
              confidence: 0.88
            });
            continue;
          }
        }

        // D. Agent - Action (Ergative -მა/-მ + Action Verb)
        // e.g. "დავით აღმაშენებელმა მოიწვია რუის-ურბნისის კრება"
        for (const verb of ACTION_VERBS) {
          const verbIdx = sentence.indexOf(verb);
          if (verbIdx > 5) {
            const beforeVerb = sentence.slice(0, verbIdx).trim();
            const afterVerb = sentence.slice(verbIdx + verb.length).trim().replace(/[.!?]$/, '');

            // Check if beforeVerb has an ergative ending (-მა, -მ)
            const agentMatch = beforeVerb.match(/([ა-ჰA-Za-z0-9„][^,]{2,40}(?:მა|მ))$/);
            if (agentMatch && afterVerb.length > 3) {
              const agent = agentMatch[1].trim();
              facts.push({
                id: `fact-${factIdCounter++}`,
                type: 'who_did_what',
                subject: agent,
                predicate: verb,
                object: afterVerb,
                answerSpan: agent,
                sentence,
                sectionId: sec.id,
                sectionTitle: sec.title,
                sourceRef: { page: blk.page || sec.page || 1, sectionTitle: sec.title },
                confidence: 0.90
              });
              break;
            }
          }
        }

        // E. Enumeration Facts: "X მოიცავს: A, B და C" or "X შედგება N ნაწილისგან"
        const enumMatch = sentence.match(/^([^,:]{3,40})\s*(?:მოიცავს|შედგება|იყოფა)\s*:?\s*([^.!?]{10,120})/i);
        if (enumMatch) {
          facts.push({
            id: `fact-${factIdCounter++}`,
            type: 'enumeration',
            subject: enumMatch[1].trim(),
            predicate: 'შედგება',
            object: enumMatch[2].trim(),
            answerSpan: enumMatch[2].trim(),
            sentence,
            sectionId: sec.id,
            sectionTitle: sec.title,
            sourceRef: { page: blk.page || sec.page || 1, sectionTitle: sec.title },
            confidence: 0.85
          });
          continue;
        }

        // F. Contrast / Distinction: "X, ხოლო Y" or "X-ისგან განსხვავებით Y"
        if (sentence.includes('განსხვავებით') || sentence.includes(', ხოლო ') || sentence.includes('არ უნდა აგვერიოს')) {
          facts.push({
            id: `fact-${factIdCounter++}`,
            type: 'contrast',
            subject: sec.title,
            predicate: 'განსხვავება',
            object: sentence,
            answerSpan: sentence,
            sentence,
            sectionId: sec.id,
            sectionTitle: sec.title,
            sourceRef: { page: blk.page || sec.page || 1, sectionTitle: sec.title },
            confidence: 0.84
          });
          continue;
        }

        // G. Cause / Effect: "გამო", "რადგან", "შედეგად"
        if (sentence.includes(' შედეგად') || sentence.includes(' გამო ') || sentence.includes('რადგან ')) {
          facts.push({
            id: `fact-${factIdCounter++}`,
            type: 'cause',
            subject: sec.title,
            predicate: 'მიზეზ-შედეგი',
            object: sentence,
            answerSpan: sentence,
            sentence,
            sectionId: sec.id,
            sectionTitle: sec.title,
            sourceRef: { page: blk.page || sec.page || 1, sectionTitle: sec.title },
            confidence: 0.80
          });
        }
      }
    }
  }

  return facts;
}
