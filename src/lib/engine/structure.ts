/**
 * Document Structure Analyzer and Tree Builder
 * Transforms plain text or formatted text into a structured Document Tree.
 */
import { DocNode, SectionNode, BlockNode } from './types';

export function normalizeGeorgianText(raw: string): string {
  if (!raw) return '';
  return raw
    .normalize('NFC')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/[„“”"]/g, '„')
    .replace(/(\w+)-\n(\w+)/g, '$1$2') // De-hyphenate broken words across line breaks
    .trim();
}

/**
 * Filter out repetitive running headers and footers (>50% frequency) and page numbers
 */
export function removeHeaderFooters(lines: string[]): string[] {
  if (lines.length <= 10) return lines;

  const lineCounts = new Map<string, number>();
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0 && trimmed.length < 100) {
      lineCounts.set(trimmed, (lineCounts.get(trimmed) || 0) + 1);
    }
  }

  const threshold = Math.max(3, Math.floor(lines.length * 0.15));

  return lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return true;
    // Remove isolated page numbers e.g. "1", "- 12 -", "გვ. 5"
    if (/^[-—~]?\s*(\d+|გვ\.\s*\d+)\s*[-—~]?$/i.test(trimmed)) {
      return false;
    }
    const count = lineCounts.get(trimmed) || 0;
    if (count >= threshold && trimmed.length < 80) {
      return false;
    }
    return true;
  });
}

const SECTION_HEADER_PATTERNS = [
  /^(?:#+\s+)(.*)$/, // Markdown # Header
  /^(?:თავი|ნაწილი|კარი|პარაგრაფი|სექცია|მუხლი)\s+[0-9IVXLCDMIVX]+[:.]?\s*(.*)$/i, // Georgian Chapter/Section
  /^(?:§+\s*[0-9]+[:.]?\s*)(.*)$/, // § 1
  /^(?:[0-9]+|[IVXLCDM]+|[ა-ჰ])\.\s+([ა-ჰA-Za-z0-9„].{2,80})$/, // 1. Title or I. Title or ა. Title
  /^([0-9]+\.[0-9]+)\s+([ა-ჰA-Za-z0-9„].{2,80})$/ // 1.1 Title
];

export function isHeadingLine(line: string): { isHeading: boolean; title: string; level: number } {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 120) return { isHeading: false, title: '', level: 0 };

  // Markdown headers
  if (trimmed.startsWith('#')) {
    const m = trimmed.match(/^(#+)\s*(.+)$/);
    if (m) {
      return { isHeading: true, title: m[2].trim(), level: Math.min(3, m[1].length) };
    }
  }

  for (const pat of SECTION_HEADER_PATTERNS) {
    const m = trimmed.match(pat);
    if (m) {
      const title = m[1]?.trim() || trimmed;
      // Do not treat a full descriptive sentence with terminal period as a header
      if (title.length > 10 && (title.endsWith('.') || title.endsWith(';'))) {
        continue;
      }
      return { isHeading: true, title: trimmed, level: 2 };
    }
  }

  // Short bold or uppercase style line (< 70 chars, without trailing punctuation)
  if (trimmed.length >= 4 && trimmed.length <= 60 && !/[.!?,;:]$/.test(trimmed) && !trimmed.startsWith('-') && !trimmed.startsWith('•')) {
    // If it starts with a strong concept
    if (/^[ა-ჰA-Z0-9„][^.!?\n]{3,50}$/.test(trimmed)) {
      return { isHeading: true, title: trimmed, level: 2 };
    }
  }

  return { isHeading: false, title: '', level: 0 };
}

export function parseDocumentStructure(rawText: string, fallbackTitle?: string): DocNode {
  const normalized = normalizeGeorgianText(rawText);
  const rawLines = normalized.split('\n');
  const cleanLines = removeHeaderFooters(rawLines);

  let docTitle = fallbackTitle || 'სასწავლო მასალა';
  let titleFound = false;

  const sections: SectionNode[] = [];
  let currentSection: SectionNode = {
    id: 'sec-0',
    title: 'ზოგადი მიმოხილვა',
    level: 1,
    blocks: [],
    subsections: []
  };

  let currentBullets: string[] = [];
  let blockCounter = 0;

  function flushBullets() {
    if (currentBullets.length > 0) {
      currentSection.blocks.push({
        id: `blk-${blockCounter++}`,
        type: 'list',
        text: currentBullets.join('\n'),
        items: [...currentBullets]
      });
      currentBullets = [];
    }
  }

  for (let i = 0; i < cleanLines.length; i++) {
    const line = cleanLines[i].trim();
    if (!line) {
      flushBullets();
      continue;
    }

    // Check if line is a document title in first 5 lines
    if (!titleFound && i < 5) {
      const headingCheck = isHeadingLine(line);
      if (headingCheck.isHeading || (!fallbackTitle && line.length < 80 && !/[.!?]$/.test(line))) {
        docTitle = headingCheck.isHeading ? headingCheck.title : line;
        titleFound = true;
        continue;
      }
    }

    // Check for bullet list items
    if (/^[-•*–·]\s+/.test(line) || /^[0-9]+[)]\s+/.test(line) || /^[ა-ჰ][)]\s+/.test(line)) {
      const bulletText = line.replace(/^([-•*–·]|[0-9]+[)]|[ა-ჰ][)])\s+/, '').trim();
      currentBullets.push(bulletText);
      continue;
    }

    flushBullets();

    // Check for section header
    const heading = isHeadingLine(line);
    if (heading.isHeading) {
      if (currentSection.blocks.length > 0) {
        sections.push(currentSection);
      }
      currentSection = {
        id: `sec-${sections.length + 1}`,
        title: heading.title,
        level: heading.level,
        blocks: [],
        subsections: []
      };
      continue;
    }

    // Regular paragraph
    currentSection.blocks.push({
      id: `blk-${blockCounter++}`,
      type: 'paragraph',
      text: line
    });
  }

  flushBullets();
  if (currentSection.blocks.length > 0) {
    sections.push(currentSection);
  }

  // Fallback: If no distinct sections were recognized (continuous text), segment into ~4-paragraph sections
  if (sections.length <= 1 && sections[0]?.blocks.length > 4) {
    const allBlocks = sections[0].blocks;
    const chunkedSections: SectionNode[] = [];
    const chunkSize = Math.max(3, Math.ceil(allBlocks.length / 4));

    for (let c = 0; c < allBlocks.length; c += chunkSize) {
      const chunkBlocks = allBlocks.slice(c, c + chunkSize);
      const firstLineWords = chunkBlocks[0].text.split(/\s+/).slice(0, 5).join(' ');
      chunkedSections.push({
        id: `sec-${chunkedSections.length + 1}`,
        title: chunkBlocks[0].text.length < 60 ? chunkBlocks[0].text : `ნაწილი ${chunkedSections.length + 1}: ${firstLineWords}...`,
        level: 2,
        blocks: chunkBlocks,
        subsections: []
      });
    }
    return {
      title: docTitle,
      sections: chunkedSections,
      metadata: {
        wordCount: normalized.split(/\s+/).filter(Boolean).length,
        pageCount: Math.max(1, Math.ceil(cleanLines.length / 35))
      }
    };
  }

  return {
    title: docTitle,
    sections: sections.length > 0 ? sections : [currentSection],
    metadata: {
      wordCount: normalized.split(/\s+/).filter(Boolean).length,
      pageCount: Math.max(1, Math.ceil(cleanLines.length / 35))
    }
  };
}
