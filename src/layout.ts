// Page mode turns a horizontal site sideways, but the site's CSS still speaks
// in physical axes. This carries the patterns that break across to the other
// axis, all through attributes and custom properties so restore() undoes it:
//
// - overflow: `overflow-x: hidden` (no sideways scroll) becomes `overflow-y`.
// - full-screen sections: `min-height: 100vh` also fills the width.
// - fixed bars: a header across the top becomes the page's first column, down
//   the left side (a bar along the bottom, a column fixed on the right).
// - collapsed boxes: a box sized by its height whose content is positioned
//   (an image card) has no width once turned; it gets its old height as width.
// - overflowing boxes: a width meant for a line (`w-full`, a card width) now
//   caps how far content flows sideways; boxes grow to fit their content.

const OVERFLOWS = ['visible', 'hidden', 'clip', 'scroll', 'auto'] as const;
const NOT_BOXES = 'img, picture, video, audio, canvas, iframe, embed, object, svg, input, textarea, select, button, br, hr';
const ATTRIBUTES = ['data-mongol-ox', 'data-mongol-oy', 'data-mongol-fill', 'data-mongol-bar', 'data-mongol-size', 'data-mongol-grow'];
const PROPERTIES = ['--mongol-size', '--mongol-grow', '--mongol-offset'];

export const PAGE_LAYOUT_CSS = `
${OVERFLOWS.map(
  (value) =>
    `[data-mongol-ox="${value}"] { overflow-y: ${value} !important; }\n` +
    `[data-mongol-oy="${value}"] { overflow-x: ${value} !important; }`,
).join('\n')}
[data-mongol-fill] { min-width: 100vw !important; }
[data-mongol-bar] {
  top: 0 !important; bottom: 0 !important;
  width: auto !important; height: auto !important; max-height: none !important;
}
/* The header is the page's first column and scrolls away with it. */
[data-mongol-bar="start"] { position: absolute !important; left: 0 !important; right: auto !important; }
[data-mongol-bar="end"] { left: auto !important; right: 0 !important; }
[data-mongol-size] { min-width: var(--mongol-size) !important; }
[data-mongol-grow] { min-width: var(--mongol-grow) !important; max-width: none !important; }
html[data-mongol-page] body { padding-left: var(--mongol-offset, 0) !important; }`;

/** Whether a box paints its own background. */
function opaque(style: CSSStyleDeclaration): boolean {
  if (style.backgroundImage !== 'none') return true;
  const alpha = /rgba?\([^)]*,\s*([\d.]+)\)/.exec(style.backgroundColor.replace(/\s*\/\s*/, ', '));
  return style.backgroundColor !== 'transparent' && (alpha === null || parseFloat(alpha[1]!) > 0.5);
}

export interface PageLayout {
  /** Adapt the page; call once it is vertical. */
  apply(): void;
  /** Adapt content added later. */
  added(node: Node): void;
  restore(): void;
}

/** Measure the page while it is still horizontal. */
export function measurePageLayout(doc: Document): PageLayout {
  const view = doc.defaultView!;
  const html = doc.documentElement;
  const touched = new Set<Element>();
  const styled = new Set<Element>();
  const skipped = (element: Element) => element.closest('[data-mongol-skip]') !== null;

  // Horizontal sizes, to give collapsed boxes their height back as width.
  const heights = new Map<Element, number>();
  // Boxes that really scrolled vertically: scrollers, not boxes to grow.
  const scrollers = new Set<Element>();
  const bars = new Map<Element, 'start' | 'end'>();
  for (const element of doc.body.querySelectorAll('*')) {
    if (skipped(element) || element.matches(NOT_BOXES)) continue;
    const style = view.getComputedStyle(element);
    if (style.display === 'none' || style.display === 'contents' || style.display.startsWith('inline')) continue;
    const rect = element.getBoundingClientRect();
    if (style.position === 'fixed') {
      if (rect.width >= view.innerWidth * 0.9 && rect.height > 0 && rect.height < view.innerHeight / 2) {
        bars.set(element, rect.top + rect.height / 2 < view.innerHeight / 2 ? 'start' : 'end');
      }
      continue;
    }
    if (style.position !== 'absolute' && rect.height > 0 && rect.width > 0) heights.set(element, rect.height);
    if (/auto|scroll/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 1) scrollers.add(element);
  }

  const mark = (element: Element, name: string, value = '') => {
    element.setAttribute(name, value);
    touched.add(element);
  };
  // Elements without a style attribute of their own get it removed again on restore.
  const unstyled = new Set<Element>();
  const setProperty = (element: Element, name: string, px: number) => {
    if (!element.hasAttribute('style')) unstyled.add(element);
    (element as HTMLElement).style.setProperty(name, `${Math.ceil(px)}px`);
    styled.add(element);
  };

  /** Overflow axes and full-screen sections: computed styles only. */
  const adaptStyles = (start: Node): void => {
    if (start.nodeType !== Node.ELEMENT_NODE && start.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
    const elements = [...(start as ParentNode).querySelectorAll('*')];
    if (start.nodeType === Node.ELEMENT_NODE) elements.unshift(start as Element);
    // Read every style first, then write, so the page is restyled once.
    const changes: [Element, string, string, boolean][] = [];
    for (const element of elements) {
      if (element.hasAttribute('data-mongol-ox') || element.hasAttribute('data-mongol-fill') || skipped(element)) continue;
      const style = view.getComputedStyle(element);
      const full =
        style.position !== 'fixed' &&
        style.position !== 'absolute' &&
        parseFloat(style.minHeight) >= view.innerHeight * 0.9;
      if (style.overflowX !== style.overflowY || full) changes.push([element, style.overflowX, style.overflowY, full]);
    }
    for (const [element, x, y, full] of changes) {
      if (x !== y) {
        mark(element, 'data-mongol-ox', x);
        mark(element, 'data-mongol-oy', y);
      }
      if (full) mark(element, 'data-mongol-fill');
    }
  };

  /**
   * How wide a box must be for its in-flow content: text and children that
   * take up space. Positioned children (hidden dropdown menus, decorations)
   * do not count, though scrollWidth would count them.
   */
  const range = doc.createRange();
  const neededWidth = (element: Element, style: CSSStyleDeclaration): number => {
    const left = element.getBoundingClientRect().left;
    let right = left;
    for (const child of element.childNodes) {
      let rect: DOMRect;
      if (child.nodeType === Node.TEXT_NODE) {
        if (!(child as Text).data.trim()) continue;
        range.selectNodeContents(child);
        rect = range.getBoundingClientRect();
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const childStyle = view.getComputedStyle(child as Element);
        if (childStyle.position === 'absolute' || childStyle.position === 'fixed' || childStyle.display === 'none') continue;
        rect = (child as Element).getBoundingClientRect();
        rect = new DOMRect(rect.x, rect.y, rect.width + Math.max(0, parseFloat(childStyle.marginRight) || 0), rect.height);
      } else continue;
      if (rect.width > 0 || rect.height > 0) right = Math.max(right, rect.right);
    }
    return right - left + (parseFloat(style.paddingRight) || 0) + (parseFloat(style.borderRightWidth) || 0);
  };

  /** Boxes whose content runs past their width grow to fit, parents after children. */
  const grow = (): void => {
    for (let round = 0; round < 8; round++) {
      const changes: [Element, number][] = [];
      for (const element of doc.body.querySelectorAll('*')) {
        if (element.matches(NOT_BOXES) || scrollers.has(element) || bars.has(element)) continue;
        const width = element.clientWidth;
        // scrollWidth is a cheap first filter; the real measure follows.
        if (width === 0 || element.scrollWidth <= width + 1) continue;
        const style = view.getComputedStyle(element);
        if (style.display.startsWith('inline') || style.position === 'fixed' || style.position === 'absolute') continue;
        if (skipped(element)) continue;
        const needed = neededWidth(element, style);
        const current = (element as HTMLElement).offsetWidth;
        if (needed > current + 1) changes.push([element, needed]);
      }
      if (!changes.length) return;
      for (const [element, needed] of changes) {
        setProperty(element, '--mongol-grow', needed);
        mark(element, 'data-mongol-grow');
      }
    }
  };

  let scheduled = false;
  const regrow = () => {
    if (scheduled) return;
    scheduled = true;
    view.setTimeout(() => {
      scheduled = false;
      grow();
    }, 200);
  };

  return {
    apply() {
      adaptStyles(html);
      for (const [element, side] of bars) mark(element, 'data-mongol-bar', side);
      // Boxes that lost their width when turned get their old height as width.
      const collapsed: [Element, number][] = [];
      for (const [element, height] of heights) {
        if (element.isConnected && element.getBoundingClientRect().width < 2) collapsed.push([element, height]);
      }
      for (const [element, height] of collapsed) {
        setProperty(element, '--mongol-size', height);
        mark(element, 'data-mongol-size');
      }
      grow();
      // Room for a header turned into a left column, as the site leaves room at
      // the top. A transparent header is meant to lie over the content (white
      // text on a hero image), so it gets none.
      let offset = 0;
      for (const [element, side] of bars) {
        if (side !== 'start' || !opaque(view.getComputedStyle(element))) continue;
        offset = Math.max(offset, element.getBoundingClientRect().width);
      }
      if (offset && offset < view.innerWidth / 3) setProperty(html, '--mongol-offset', offset);
    },
    added(node) {
      adaptStyles(node);
      regrow();
    },
    restore() {
      for (const element of touched) for (const name of ATTRIBUTES) element.removeAttribute(name);
      for (const element of styled) {
        for (const name of PROPERTIES) (element as HTMLElement).style.removeProperty(name);
        if (unstyled.has(element) && element.getAttribute('style') === '') element.removeAttribute('style');
      }
      touched.clear();
      styled.clear();
      unstyled.clear();
    },
  };
}
