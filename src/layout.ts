// Page mode: the site's own CSS, transposed (see transpose.ts), so a page
// designed for horizontal text keeps its design when turned vertical.
//
// - Style sheets: each readable sheet is replaced by a transposed copy, kept in
//   sync as the site adds or changes styles. Cross-origin sheets stay as they are.
// - Inline styles: transposed too, and again whenever the site changes them
//   (a carousel moving its slides), so they move along the transposed axis.
// - A fixed header bar becomes the page's first column and scrolls away with
//   it, rather than staying over the content.
// - Small floating widgets (call / chat buttons) keep their original layout.
//
// restore() puts every sheet and style attribute back.
import { parseDeclarations, serializeDeclarations, transposeBlock, transposeCondition, transposeSheet } from './transpose.js';

const CLONE = 'data-mongol-transposed';
const SKIP = '[data-mongol-skip], [data-mongol-keep]';
// Kept widgets keep these, as measured before the page turned.
const PINNED = [
  'width', 'height', 'top', 'right', 'bottom', 'left',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'transform',
] as const;

export const PAGE_LAYOUT_CSS = `
/* The header is the page's first column and scrolls away with it. */
[data-mongol-bar] { position: absolute !important; }`;

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

  // Fixed elements: a bar across the top is the header; small ones are widgets.
  const bars: Element[] = [];
  const kept = new Map<Element, Map<Element, string[]>>();
  for (const element of doc.body.querySelectorAll('*')) {
    if (element.closest('[data-mongol-skip]')) continue;
    const style = view.getComputedStyle(element);
    if (style.position !== 'fixed' || style.display === 'none') continue;
    if (element.parentElement?.closest('[data-mongol-keep-measured]')) continue;
    const rect = element.getBoundingClientRect();
    if (rect.width >= view.innerWidth * 0.9 && rect.height > 0 && rect.height < view.innerHeight / 2) {
      if (rect.top < view.innerHeight / 2) bars.push(element);
    } else if (rect.width * rect.height < view.innerWidth * view.innerHeight * 0.2) {
      const pins = new Map<Element, string[]>();
      for (const node of [element, ...element.querySelectorAll('*')]) {
        const computed = view.getComputedStyle(node);
        pins.set(node, PINNED.map((name) => computed.getPropertyValue(name)));
      }
      element.setAttribute('data-mongol-keep-measured', '');
      kept.set(element, pins);
    }
  }
  for (const element of kept.keys()) element.removeAttribute('data-mongol-keep-measured');

  // Style attributes as the site wrote them, and what was written in their place.
  const originals = new Map<Element, string | null>();
  const site = new Map<Element, string>();
  const written = new Map<Element, string>();
  const skipped = (element: Element) => element.closest(SKIP) !== null;

  const write = (element: Element, text: string) => {
    element.setAttribute('style', text);
    // Read back the browser's own serialization, so the site's later edits
    // (which reserialize the whole attribute) differ only where it edited.
    const canonical = (element as HTMLElement).style?.cssText ?? text;
    if (canonical !== text) element.setAttribute('style', canonical);
    written.set(element, element.getAttribute('style') ?? '');
  };

  const transposeInline = (element: Element) => {
    if (skipped(element)) return;
    const current = element.getAttribute('style');
    if (current === null) {
      if (site.has(element)) site.set(element, ''); // the site removed it
      return;
    }
    if (!site.has(element)) {
      originals.set(element, current);
      site.set(element, current);
    } else if (current === written.get(element)) {
      return; // our own write
    } else {
      // The site changed its style: apply what it changed to its own version.
      const ours = new Map(parseDeclarations(written.get(element)!).map((d) => [d.name, d]));
      const now = parseDeclarations(current);
      const model = new Map(parseDeclarations(site.get(element)!).map((d) => [d.name, d]));
      const kept = now.filter((d) => ours.get(d.name)?.value === d.value);
      if (!kept.length && ours.size) {
        model.clear(); // replaced wholesale
        for (const d of now) model.set(d.name, d);
      } else {
        const names = new Set(now.map((d) => d.name));
        for (const name of ours.keys()) if (!names.has(name)) model.delete(name);
        for (const d of now) {
          if (ours.get(d.name)?.value === d.value && ours.get(d.name)?.important === d.important) continue;
          model.delete(d.name);
          model.set(d.name, d);
        }
      }
      site.set(element, serializeDeclarations([...model.values()]));
    }
    write(element, transposeBlock(site.get(element)!, doc.baseURI));
  };

  const transposeSubtree = (start: Node) => {
    if (start.nodeType !== Node.ELEMENT_NODE) return;
    const element = start as Element;
    if (element.hasAttribute('style')) transposeInline(element);
    for (const child of element.querySelectorAll('[style]')) transposeInline(child);
  };

  // Style sheets: a transposed copy after each, the original switched off.
  const sheets = new Map<CSSStyleSheet, { clone: HTMLStyleElement; rules: number }>();
  const ruleCount = (sheet: CSSStyleSheet) => {
    try {
      return sheet.cssRules.length;
    } catch {
      return -1;
    }
  };
  const syncSheets = () => {
    const present = new Set<CSSStyleSheet>();
    for (const sheet of doc.styleSheets) {
      // (ownerNode is missing in some DOM implementations; jsdom among them.)
      const owner = (sheet.ownerNode ??
        [...doc.querySelectorAll('style, link')].find((el) => (el as HTMLStyleElement).sheet === sheet) ??
        null) as Element | null;
      if (!owner || owner.hasAttribute(CLONE) || owner.hasAttribute('data-mongol-own') || owner.closest?.('[data-mongol-skip]')) continue;
      present.add(sheet);
      const known = sheets.get(sheet);
      const rules = ruleCount(sheet);
      if (known ? known.rules === rules : sheet.disabled) continue; // unchanged, or switched off by the site
      const text = transposeSheet(sheet, doc.baseURI);
      if (text === null) continue;
      const clone = known?.clone ?? doc.createElement('style');
      clone.setAttribute(CLONE, '');
      const media = sheet.media?.mediaText;
      clone.textContent = media ? `@media ${transposeCondition(media)} { ${text} }` : text;
      if (!known) owner.after(clone);
      sheet.disabled = true;
      sheets.set(sheet, { clone, rules });
    }
    // Sheets the site removed (or replaced, as a <style> does when its text changes).
    for (const [sheet, { clone }] of sheets) {
      if (present.has(sheet)) continue;
      clone.remove();
      sheets.delete(sheet);
    }
  };

  let observer: MutationObserver | null = null;
  let timer = 0;
  let pending = false;
  const scheduleSync = () => {
    if (pending) return;
    pending = true;
    queueMicrotask(() => {
      pending = false;
      syncSheets();
    });
  };

  return {
    apply() {
      for (const widget of kept.keys()) widget.setAttribute('data-mongol-keep', '');
      syncSheets();
      transposeSubtree(html);
      for (const element of bars) element.setAttribute('data-mongol-bar', '');
      for (const [widget, pins] of kept) {
        for (const [node, values] of pins) {
          originals.set(node, node.getAttribute('style'));
          const style = (node as HTMLElement).style;
          if (!style) continue;
          PINNED.forEach((name, i) => style.setProperty(name, values[i]!, 'important'));
          if (node === widget) style.setProperty('writing-mode', 'horizontal-tb', 'important');
        }
      }
      observer = new MutationObserver((records) => {
        for (const record of records) {
          const target = record.target as Element;
          if (record.type === 'attributes') transposeInline(target);
          else if (target === doc.head || target.closest?.('head') || target.nodeName === 'STYLE') scheduleSync();
          else
            record.addedNodes.forEach((node) => {
              if (node.nodeName === 'STYLE' || node.nodeName === 'LINK') scheduleSync();
            });
        }
      });
      observer.observe(html, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['style'] });
      // Libraries that add rules with insertRule() change no DOM; look now and then.
      timer = view.setInterval(syncSheets, 1000);
      // <link> sheets that are still loading.
      doc.querySelectorAll('link[rel~="stylesheet"]').forEach((link) => link.addEventListener('load', scheduleSync));
    },
    added(node) {
      transposeSubtree(node);
    },
    restore() {
      observer?.disconnect();
      view.clearInterval(timer);
      for (const [sheet, { clone }] of sheets) {
        clone.remove();
        sheet.disabled = false;
      }
      sheets.clear();
      for (const [element, original] of originals) {
        // The site's latest version where it changed it since, else the original.
        const latest = site.get(element) ?? original;
        if (latest === null) element.removeAttribute('style');
        else element.setAttribute('style', latest);
      }
      for (const element of bars) element.removeAttribute('data-mongol-bar');
      for (const widget of kept.keys()) widget.removeAttribute('data-mongol-keep');
      originals.clear();
      site.clear();
      written.clear();
    },
  };
}
