// Browser extension content script: injected into a tab when the toolbar
// button is clicked (activeTab), never before. Runs in the extension's
// isolated world; the background script calls __reactMongolToggle().
import * as khudam from 'khudam';
import { createConverter } from '../convert.js';
import type { WordConverter } from '../convert.js';
import { applyMongolScript } from '../dom.js';
import { REVIEWED } from '../generated/reviewed.js';

/** The bundled font first, so Mongolian renders on devices without one. */
const FONT = "'Mongol Bichig Extension', 'Noto Sans Mongolian', 'Mongolian Baiti', sans-serif";

/**
 * Where the reading text is. Sites may mark it (data-mongol-vertical); most
 * do not, and many news sites use no <main> or <article>, so look for the
 * block holding the most paragraph text, and prefer the <article> around it.
 */
export function findArticle(doc: Document): Element[] {
  const marked = [...doc.querySelectorAll('[data-mongol-vertical]')];
  if (marked.length) return marked;

  const scores = new Map<Element, number>();
  for (const p of doc.querySelectorAll('p')) {
    const length = (p.textContent ?? '').trim().length;
    if (length < 40 || !p.parentElement) continue;
    scores.set(p.parentElement, (scores.get(p.parentElement) ?? 0) + length);
  }
  let best: Element | null = null;
  let score = 0;
  for (const [element, value] of scores) {
    if (value > score) [best, score] = [element, value];
  }
  if (best && score >= 120) return [best.closest('article') ?? best];

  const semantic = doc.querySelector('article, main, [role="main"]');
  return semantic ? [semantic] : [];
}

const convert = createConverter(khudam as WordConverter, [REVIEWED]);
let restore: (() => void) | null = null;

declare global {
  // eslint-disable-next-line no-var
  var __reactMongolToggle: (() => boolean) | undefined;
}

/** Switch this tab; returns whether traditional script is now showing. */
globalThis.__reactMongolToggle = () => {
  if (restore) {
    restore();
    restore = null;
    return false;
  }
  restore = applyMongolScript(convert, { regions: findArticle(document), fontFamily: FONT });
  return true;
};
