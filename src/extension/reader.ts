// Reader view: the page rebuilt as a clean vertical Mongol bichig layout, for
// sites whose own CSS cannot rotate. An overlay on top of the page (the site
// underneath is not touched): site name and menu as the leftmost column, the
// article (or the page's headlines) in the middle, the footer on the right.
import type { CyrillicConverter } from '../convert.js';

const FONT = "'Mongol Bichig Extension', 'Noto Sans Mongolian', 'Mongolian Baiti', sans-serif";
const KEEP = new Set(['P', 'H2', 'H3', 'H4', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'FIGURE', 'FIGCAPTION', 'IMG', 'A', 'STRONG', 'B', 'EM', 'I', 'BR']);

interface Extracted {
  site: string;
  nav: { text: string; href: string }[];
  title: string;
  article: Element | null;
  headlines: { text: string; href: string }[];
  footer: string;
}

const clean = (text: string | null | undefined): string => (text ?? '').replace(/\s+/g, ' ').trim();

/** The block holding the most paragraph text, preferring the <article> around it. */
function findStory(doc: Document): Element | null {
  const scores = new Map<Element, number>();
  for (const p of doc.querySelectorAll('p')) {
    const length = clean(p.textContent).length;
    if (length < 40 || !p.parentElement) continue;
    scores.set(p.parentElement, (scores.get(p.parentElement) ?? 0) + length);
  }
  let best: Element | null = null;
  let score = 0;
  for (const [element, value] of scores) if (value > score) [best, score] = [element, value];
  if (!best || score < 300) return null;
  // One long paragraph is a teaser on a homepage, not a story.
  if (best.querySelectorAll(':scope > p').length < 2) return null;
  return best.closest('article') ?? best;
}

function links(scope: ParentNode | null, min: number, max: number, limit: number): { text: string; href: string }[] {
  if (!scope) return [];
  const seen = new Set<string>();
  const out: { text: string; href: string }[] = [];
  for (const a of scope.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    const text = clean(a.textContent);
    if (text.length < min || text.length > max || seen.has(text) || !a.href.startsWith('http')) continue;
    seen.add(text);
    out.push({ text, href: a.href });
    if (out.length >= limit) break;
  }
  return out;
}

export function extract(doc: Document): Extracted {
  const meta = (name: string) => doc.querySelector<HTMLMetaElement>(`meta[property="${name}"], meta[name="${name}"]`)?.content;
  const site = clean(meta('og:site_name')) || clean(doc.title.split(/\s[|–—-]\s/).pop()) || location.hostname;
  const article = findStory(doc);
  const title =
    clean(article?.querySelector('h1')?.textContent) ||
    clean(doc.querySelector('h1')?.textContent) ||
    clean(meta('og:title')) ||
    clean(doc.title);
  const navScope = doc.querySelector('header nav, nav, header, [role="navigation"]');
  return {
    site,
    nav: links(navScope, 2, 30, 12),
    title,
    article,
    // A homepage has no single story: show its headlines instead.
    headlines: article ? [] : links(doc.querySelector('main, [role="main"]') ?? doc.body, 25, 160, 40),
    footer: clean(doc.querySelector('footer')?.textContent).slice(0, 400),
  };
}

/** A sanitized copy of the article: text structure and images only. */
function copyArticle(source: Element, convert: CyrillicConverter, doc: Document): DocumentFragment {
  const out = doc.createDocumentFragment();
  const visit = (node: Node, into: Node): void => {
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        into.appendChild(doc.createTextNode(convert((child as Text).data)));
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        if (el.matches('script, style, noscript, iframe, form, nav, aside, button, svg, [hidden], [aria-hidden="true"]')) continue;
        if (!KEEP.has(el.tagName)) {
          visit(el, into); // unwrap layout wrappers, keep their content
          continue;
        }
        const copy = doc.createElement(el.tagName.toLowerCase());
        if (el.tagName === 'IMG') {
          const src = (el as HTMLImageElement).currentSrc || (el as HTMLImageElement).src;
          if (!src) continue;
          copy.setAttribute('src', src);
          copy.setAttribute('alt', convert((el as HTMLImageElement).alt ?? ''));
          copy.setAttribute('loading', 'lazy');
        }
        if (el.tagName === 'A') copy.setAttribute('href', (el as HTMLAnchorElement).href);
        visit(el, copy);
        into.appendChild(copy);
      }
    }
  };
  visit(source, out);
  return out;
}

const STYLE = `
:host { all: initial; }
.reader {
  position: fixed; inset: 0; z-index: 2147483647;
  writing-mode: vertical-lr; text-orientation: mixed;
  font: 20px/1.9 ${FONT};
  color: #1b1b1a; background: #fbfaf6;
  overflow-x: auto; overflow-y: hidden;
  padding: 24px 0;
  box-sizing: border-box;
}
/* In vertical-lr, ordinary block flow already places these columns left to right. */
@media (prefers-color-scheme: dark) { .reader { color: #ecebe6; background: #161615; } a { color: #8ab8f0 !important; } }
.col { padding-inline: 0; padding-block: 0 24px; margin-block-end: 24px; box-sizing: border-box; }
.side { border-block-end: 1px solid rgba(127,127,127,.3); }
.side .site { font-size: 28px; font-weight: 700; margin: 0; }
.side ul { list-style: none; margin: 0; padding: 16px 0 0; display: flex; flex-direction: column; flex-wrap: wrap; gap: 4px 16px; }
.side a, .headlines a { color: #1f5fae; text-decoration: none; }
.side a:hover, .headlines a:hover { text-decoration: underline; }
.tools { margin-block-start: 16px; display: flex; gap: 8px; }
.tools button {
  writing-mode: horizontal-tb; font: 600 14px system-ui, sans-serif; cursor: pointer;
  border: 1px solid rgba(127,127,127,.4); border-radius: 8px; background: transparent; color: inherit;
  padding: 6px 10px; min-width: 44px; min-height: 36px;
}
.main h1 { font-size: 34px; line-height: 1.5; margin: 0 0 0 0; padding-inline-end: 0; margin-inline-end: 0; margin-block-end: 20px; }
.main p { margin: 0 0 0 0; margin-block-end: 18px; max-inline-size: 100%; }
.main img { display: block; max-height: 55vh; max-width: 45vw; margin-block: 12px; }
.main figcaption { font-size: 15px; opacity: .75; }
.headlines { list-style: none; margin: 0; padding: 0; }
.headlines li { margin-block-end: 18px; }
.foot { border-block-start: 1px solid rgba(127,127,127,.3); padding-block-start: 24px; font-size: 15px; opacity: .8; }
`;

/** Open the reader over the page. Returns a function that closes it. */
export function openReader(convert: CyrillicConverter, doc: Document, onClose: () => void): () => void {
  const data = extract(doc);
  const host = doc.createElement('mongol-bichig-reader');
  host.setAttribute('data-mongol-skip', '');
  const shadow = host.attachShadow({ mode: 'open' });
  const style = doc.createElement('style');
  style.textContent = STYLE;
  shadow.appendChild(style);

  const reader = doc.createElement('div');
  reader.className = 'reader';
  reader.setAttribute('lang', 'mn-Mong');
  reader.setAttribute('role', 'dialog');
  reader.setAttribute('aria-label', convert('Уншигчийн горим'));

  const text = (tag: string, value: string, className?: string) => {
    const el = doc.createElement(tag);
    el.textContent = convert(value);
    if (className) el.className = className;
    return el;
  };
  const linkList = (items: { text: string; href: string }[], className?: string) => {
    const ul = doc.createElement('ul');
    if (className) ul.className = className;
    for (const item of items) {
      const li = doc.createElement('li');
      const a = doc.createElement('a');
      a.href = item.href;
      a.textContent = convert(item.text);
      li.appendChild(a);
      ul.appendChild(li);
    }
    return ul;
  };

  // Left: site name, menu, tools.
  const side = doc.createElement('header');
  side.className = 'col side';
  side.appendChild(text('p', data.site, 'site'));
  if (data.nav.length) side.appendChild(linkList(data.nav));
  const tools = doc.createElement('div');
  tools.className = 'tools';
  const close = doc.createElement('button');
  close.type = 'button';
  close.textContent = '✕ Кирилл';
  close.title = 'Close (Esc)';
  tools.appendChild(close);
  side.appendChild(tools);
  reader.appendChild(side);

  // Middle: the story, or the page's headlines.
  const main = doc.createElement('main');
  main.className = 'col main';
  if (data.article) {
    main.appendChild(text('h1', data.title));
    const body = copyArticle(data.article, convert, doc);
    // The headline is already shown once.
    body.querySelectorAll('h1').forEach((h) => h.remove());
    main.appendChild(body);
  } else {
    main.appendChild(linkList(data.headlines, 'headlines'));
  }
  reader.appendChild(main);

  // Right: the footer.
  if (data.footer) {
    const foot = doc.createElement('footer');
    foot.className = 'col foot';
    foot.textContent = convert(data.footer);
    reader.appendChild(foot);
  }

  shadow.appendChild(reader);
  doc.documentElement.appendChild(host);
  const previousOverflow = doc.documentElement.style.overflow;
  doc.documentElement.style.overflow = 'hidden';

  const wheel = (event: WheelEvent) => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX) || event.ctrlKey) return;
    reader.scrollLeft += event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
    event.preventDefault();
  };
  const key = (event: KeyboardEvent) => {
    if (event.key === 'Escape') done();
  };
  reader.addEventListener('wheel', wheel, { passive: false });
  doc.addEventListener('keydown', key);
  close.addEventListener('click', () => done());

  let closed = false;
  function done(): void {
    if (closed) return;
    closed = true;
    doc.removeEventListener('keydown', key);
    host.remove();
    doc.documentElement.style.overflow = previousOverflow;
    onClose();
  }
  reader.focus();
  return done;
}
