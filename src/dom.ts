import type { CyrillicConverter } from './convert.js';
import { DEFAULT_MONGOLIAN_FONT_FAMILY } from './fonts.js';
import { measurePageLayout, PAGE_LAYOUT_CSS } from './layout.js';

/**
 * Where the page turns vertical.
 *
 * - `'page'` (default when converting the whole body): the whole page, the way Mongol bichig is laid out.
 *   The root element turns vertical, so every line runs top to bottom and
 *   blocks flow left to right: the header becomes the leftmost column, the
 *   footer the rightmost, and the page scrolls sideways (the mouse wheel
 *   scrolls it too).
 * - `'auto'` (default when `root` is a subtree): only the reading area: elements marked `data-mongol-vertical`,
 *   or else the page's `main` / `article` / `[role=main]`. Menus stay
 *   horizontal.
 * - `'none'`: convert the script, keep the layout horizontal.
 */
export type VerticalMode = 'auto' | 'page' | 'none';

export interface MongolScriptOptions {
  /** Subtree to convert. Default `document.body`. */
  root?: Element;
  vertical?: VerticalMode;
  /** Height of vertical regions, i.e. the length of a column. Default `70vh`. */
  columnHeight?: string;
  /**
   * Font for converted text and vertical regions, so Mongolian renders on
   * devices without a Mongolian system font. `null` leaves fonts alone.
   */
  fontFamily?: string | null;
  /**
   * The elements to turn vertical, overriding the `vertical: 'auto'` search.
   * Used only with `vertical: 'auto'`.
   */
  regions?: Element[];
}

/** Never converted: code, form fields, and anything opted out. */
const SKIP_SELECTOR =
  'script, style, noscript, template, textarea, input, select, code, pre, kbd, samp, [contenteditable=""], [contenteditable="true"], [translate="no"], [data-mongol-skip]';
/** Opted out entirely, attributes included. Form fields are not: their placeholder and label convert, their value never does. */
const ATTRIBUTE_SKIP_SELECTOR =
  'script, style, noscript, template, code, pre, kbd, samp, [contenteditable=""], [contenteditable="true"], [translate="no"], [data-mongol-skip]';
const ATTRIBUTES = ['title', 'placeholder', 'aria-label', 'alt'] as const;
// Text worth converting: Cyrillic words, or digits (written as Mongolian digits).
const CYRILLIC = /[А-ЯЁӨҮа-яёөү0-9]/;
const STYLE_ID = 'react-mongol-script-style';

interface Tracked {
  original: string;
  converted: string;
}

/**
 * Show a Cyrillic Mongolian page in traditional script. Returns a function
 * that puts every converted text and attribute back exactly as it was.
 *
 * Text added or changed later (a React re-render, a fetched list) is
 * converted as it appears, until the returned function is called.
 */
export function applyMongolScript(
  convert: CyrillicConverter,
  options: MongolScriptOptions = {},
): () => void {
  const root = options.root ?? document.body;
  const doc = root.ownerDocument;
  const texts = new Map<Text, Tracked>();
  const attributes = new Map<Element, Map<string, Tracked>>();
  const fonted = new Set<Element>();
  const useFont = options.fontFamily !== null;

  const skipped = (node: Node): boolean => {
    const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
    return element === null || element.closest(SKIP_SELECTOR) !== null;
  };

  const convertText = (node: Text): void => {
    const known = texts.get(node);
    if (known && node.data === known.converted) return; // our own write
    if (!CYRILLIC.test(node.data) || skipped(node)) return;
    const original = node.data;
    const converted = convert(original);
    texts.set(node, { original, converted });
    if (converted !== original) node.data = converted;
    const parent = node.parentElement;
    if (useFont && parent && !fonted.has(parent)) {
      fonted.add(parent);
      parent.setAttribute('data-mongol-text', '');
    }
  };

  const convertAttributes = (element: Element): void => {
    if (element.closest(ATTRIBUTE_SKIP_SELECTOR)) return;
    for (const name of ATTRIBUTES) {
      const value = element.getAttribute(name);
      if (value === null || !CYRILLIC.test(value)) continue;
      let tracked = attributes.get(element);
      if (tracked?.get(name)?.converted === value) continue;
      const converted = convert(value);
      if (!tracked) attributes.set(element, (tracked = new Map()));
      tracked.set(name, { original: value, converted });
      element.setAttribute(name, converted);
    }
  };

  const walk = (start: Node): void => {
    if (start.nodeType === Node.TEXT_NODE) return convertText(start as Text);
    if (start.nodeType !== Node.ELEMENT_NODE && start.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
    if (start.nodeType === Node.ELEMENT_NODE) {
      convertAttributes(start as Element);
      if (skipped(start)) return;
    }
    const walker = doc.createTreeWalker(start, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode: (node) =>
        node.nodeType === Node.ELEMENT_NODE && (node as Element).matches(SKIP_SELECTOR)
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT,
    });
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.nodeType === Node.TEXT_NODE) convertText(node as Text);
      else convertAttributes(node as Element);
    }
    // Rejected subtrees (form fields among them) still get their attributes converted.
    (start as Element | DocumentFragment).querySelectorAll('input, textarea, select').forEach(convertAttributes);
  };

  // Layout: lang, font and vertical regions.
  const html = doc.documentElement;
  const previousLang = html.getAttribute('lang');
  html.setAttribute('lang', 'mn-Mong');
  html.setAttribute('data-mongol-script', '');

  // Converting only part of a page should not turn the whole page sideways.
  const vertical = options.vertical ?? (root === doc.body ? 'page' : 'auto');
  const regions: Element[] = vertical === 'auto' ? options.regions ?? findRegions(root) : [];
  for (const region of regions) region.setAttribute('data-mongol-vertical-on', '');
  const view = doc.defaultView;
  // Measured while the page is still horizontal.
  const layout = vertical === 'page' && view ? measurePageLayout(doc) : null;
  if (vertical === 'page') html.setAttribute('data-mongol-page', '');

  // A sideways page needs the wheel to scroll sideways.
  const wheel = (event: WheelEvent): void => {
    const page = doc.scrollingElement ?? html;
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX) || event.ctrlKey) return;
    if (page.scrollHeight > page.clientHeight + 1) return; // the page still scrolls vertically
    for (let el = event.target as Element | null; el && el !== html && el !== doc.body; el = el.parentElement) {
      const style = getComputedStyle(el);
      if (el.scrollHeight > el.clientHeight + 1 && /(auto|scroll)/.test(style.overflowY)) return;
      // A box that scrolls sideways (a transposed list) takes the wheel first.
      if (el.scrollWidth > el.clientWidth + 1 && /(auto|scroll)/.test(style.overflowX)) {
        const before = el.scrollLeft;
        el.scrollLeft += event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
        if (el.scrollLeft !== before) return event.preventDefault();
      }
    }
    page.scrollLeft += event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
    event.preventDefault();
  };
  if (vertical === 'page') view?.addEventListener('wheel', wheel, { passive: false });

  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.setAttribute('data-mongol-own', ''); // never transposed itself
  const font = useFont ? `font-family: ${options.fontFamily ?? DEFAULT_MONGOLIAN_FONT_FAMILY};` : '';
  style.textContent = `
${useFont ? `[data-mongol-text] { ${font} }` : ''}
html[data-mongol-page] {
  writing-mode: vertical-lr;
  text-orientation: mixed;
}
/* Site CSS that pins a block horizontal would leave its script lying on its
   side with Latin upright; in page mode everything follows the page. */
html[data-mongol-page] body *:not([data-mongol-skip], [data-mongol-skip] *) {
  writing-mode: inherit !important;
}
${layout ? PAGE_LAYOUT_CSS : ''}
[data-mongol-vertical-on] {
  writing-mode: vertical-lr;
  text-orientation: mixed;
  ${font}
  block-size: auto;
  inline-size: ${options.columnHeight ?? '70vh'};
  max-inline-size: none;
  max-block-size: 100%;
  overflow-x: auto;
  overflow-y: hidden;
}`;
  doc.head.appendChild(style);

  walk(root);
  layout?.apply();

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'characterData') convertText(record.target as Text);
      else if (record.type === 'attributes') convertAttributes(record.target as Element);
      else
        record.addedNodes.forEach((node) => {
          walk(node);
          layout?.added(node);
        });
    }
  });
  observer.observe(root, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: [...ATTRIBUTES],
  });

  return () => {
    observer.disconnect();
    for (const [node, { original, converted }] of texts) {
      if (node.data === converted) node.data = original;
    }
    for (const [element, tracked] of attributes) {
      for (const [name, { original, converted }] of tracked) {
        if (element.getAttribute(name) === converted) element.setAttribute(name, original);
      }
    }
    for (const region of regions) region.removeAttribute('data-mongol-vertical-on');
    html.removeAttribute('data-mongol-page');
    layout?.restore();
    view?.removeEventListener('wheel', wheel);
    for (const element of fonted) element.removeAttribute('data-mongol-text');
    style.remove();
    html.removeAttribute('data-mongol-script');
    if (previousLang === null) html.removeAttribute('lang');
    else html.setAttribute('lang', previousLang);
  };
}

function findRegions(root: Element): Element[] {
  const marked = [...root.querySelectorAll('[data-mongol-vertical]')];
  if (root.matches('[data-mongol-vertical]')) marked.unshift(root);
  if (marked.length) return marked;
  const main = root.querySelector('main, [role="main"], article');
  return main ? [main] : [];
}
