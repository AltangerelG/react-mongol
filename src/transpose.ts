// Transposition: a horizontal page turned into a vertical one, the way a
// matrix is transposed. The page is laid out as if the screen were turned on
// its side, then mirrored across its diagonal: what ran left to right runs top
// to bottom, the header becomes the left column, a slide that moved right to
// left moves bottom to top.
//
// Text and flex/grid flow already follow the writing mode. Everything a site
// writes in physical terms is swapped here: width and height, top and left,
// translateX and translateY, vw and vh, and media queries (a 900px-tall screen
// gets the site's layout for a 900px-wide one, which fits).

const PAIRS: [string, string][] = [
  ['width', 'height'],
  ['min-width', 'min-height'],
  ['max-width', 'max-height'],
  ['top', 'left'],
  ['bottom', 'right'],
  ['margin-top', 'margin-left'],
  ['margin-bottom', 'margin-right'],
  ['padding-top', 'padding-left'],
  ['padding-bottom', 'padding-right'],
  ['border-top', 'border-left'],
  ['border-bottom', 'border-right'],
  ['border-top-width', 'border-left-width'],
  ['border-bottom-width', 'border-right-width'],
  ['border-top-style', 'border-left-style'],
  ['border-bottom-style', 'border-right-style'],
  ['border-top-color', 'border-left-color'],
  ['border-bottom-color', 'border-right-color'],
  ['border-top-right-radius', 'border-bottom-left-radius'],
  ['overflow-x', 'overflow-y'],
  ['overscroll-behavior-x', 'overscroll-behavior-y'],
  ['background-position-x', 'background-position-y'],
  ['scroll-margin-top', 'scroll-margin-left'],
  ['scroll-margin-bottom', 'scroll-margin-right'],
  ['scroll-padding-top', 'scroll-padding-left'],
  ['scroll-padding-bottom', 'scroll-padding-right'],
  ['contain-intrinsic-width', 'contain-intrinsic-height'],
];
const NAMES = new Map(PAIRS.flatMap(([a, b]) => [[a, b], [b, a]] as [string, string][]));
const SIDES = new Set(['margin', 'padding', 'inset', 'border-width', 'border-style', 'border-color', 'scroll-margin', 'scroll-padding']);
const KEYWORDS: Record<string, string> = { left: 'top', top: 'left', right: 'bottom', bottom: 'right' };
const swapName = (name: string): string => NAMES.get(name) ?? name;
const swapKeyword = (token: string): string => KEYWORDS[token] ?? token;

/** Split at top level (outside parentheses and quotes). */
export function splitTop(value: string, separator: ',' | ' ' | ';' | '/'): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote = '';
  let current = '';
  for (const ch of value) {
    if (quote) {
      current += ch;
      if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '(') depth++;
    else if (ch === ')') depth--;
    const splits = depth === 0 && (separator === ' ' ? /\s/.test(ch) : ch === separator);
    if (splits) {
      out.push(current.trim());
      current = '';
    } else current += ch;
  }
  out.push(current.trim());
  return separator === ' ' ? out.filter(Boolean) : out;
}

const swapUnits = (value: string): string =>
  value.replace(/url\([^)]*\)|"[^"]*"|'[^']*'|(\d*\.?\d+)([dsl]?)v([wh])\b/g, (match, number, prefix, axis) =>
    number === undefined ? match : `${number}${prefix}v${axis === 'w' ? 'h' : 'w'}`,
  );

/** top right bottom left → left bottom right top. */
function sides(value: string): string {
  const v = splitTop(value, ' ');
  if (v.length < 2 || v.length > 4) return value;
  const [t, r = t, b = t, l = r] = v as [string, string?, string?, string?];
  return [l, b, r, t].join(' ');
}

function radius(value: string): string {
  const corners = (part: string) => {
    const v = splitTop(part, ' ');
    const [tl, tr = tl, br = tl, bl = tr] = v as [string, string?, string?, string?];
    // The top-left and bottom-right corners lie on the diagonal.
    return [tl, bl, br, tr].join(' ');
  };
  const parts = splitTop(value, '/');
  return parts.length === 2 ? `${corners(parts[1]!)} / ${corners(parts[0]!)}` : corners(value);
}

const swapPair = (value: string): string => {
  const v = splitTop(value, ' ');
  return v.length === 2 ? `${v[1]} ${v[0]}` : value;
};

function position(layer: string): string {
  const v = splitTop(layer, ' ');
  if (v.length === 1) return v[0]! in KEYWORDS || v[0] === 'center' ? swapKeyword(v[0]!) : `center ${v[0]}`;
  const mapped = v.map(swapKeyword);
  return mapped.length === 2 ? `${mapped[1]} ${mapped[0]}` : mapped.join(' ');
}

function size(layer: string): string {
  const v = splitTop(layer, ' ');
  if (v.length === 2) return `${v[1]} ${v[0]}`;
  return v.length === 1 && !['cover', 'contain', 'auto'].includes(v[0]!) ? `auto ${v[0]}` : layer;
}

const layers = (value: string, fn: (layer: string) => string): string => splitTop(value, ',').map(fn).join(', ');

function transformFunctions(value: string): string {
  return splitTop(value, ' ')
    .map((token) => {
      const match = /^([a-zA-Z0-9]+)\(([\s\S]*)\)$/.exec(token);
      if (!match) return token;
      const [, fn, inner] = match as unknown as [string, string, string];
      const a = splitTop(inner, ',');
      switch (fn) {
        case 'translateX':
          return `translateY(${inner})`;
        case 'translateY':
          return `translateX(${inner})`;
        case 'translate':
          return a.length === 1 ? `translate(0, ${a[0]})` : `translate(${a[1]}, ${a[0]})`;
        case 'translate3d':
          return `translate3d(${a[1]}, ${a[0]}, ${a[2]})`;
        case 'scaleX':
          return `scaleY(${inner})`;
        case 'scaleY':
          return `scaleX(${inner})`;
        case 'scale':
        case 'skew':
          if (a.length === 2) return `${fn}(${a[1]}, ${a[0]})`;
          return fn === 'skew' ? `skewY(${inner})` : token;
        case 'scale3d':
          return `scale3d(${a[1]}, ${a[0]}, ${a[2]})`;
        case 'skewX':
          return `skewY(${inner})`;
        case 'skewY':
          return `skewX(${inner})`;
        // A mirror turns rotations the other way.
        case 'rotate':
        case 'rotateZ':
          return `rotate(calc(${inner} * -1))`;
        case 'rotateX':
          return `rotateY(${inner})`;
        case 'rotateY':
          return `rotateX(${inner})`;
        case 'matrix':
          return a.length === 6 ? `matrix(${a[3]}, ${a[2]}, ${a[1]}, ${a[0]}, ${a[5]}, ${a[4]})` : token;
        default:
          return token;
      }
    })
    .join(' ');
}

const ANGLE = /^(-?\d*\.?\d+)(deg|turn|rad|grad)$/;
const toDegrees = (n: number, unit: string): number =>
  unit === 'turn' ? n * 360 : unit === 'rad' ? (n * 180) / Math.PI : unit === 'grad' ? n * 0.9 : n;

/** linear-gradient(to right, …) → linear-gradient(to bottom, …), and angles to match. */
function gradients(value: string): string {
  if (!value.includes('gradient(')) return value;
  let out = '';
  let index = 0;
  const pattern = /(repeating-)?(linear|radial)-gradient\(/g;
  for (let match = pattern.exec(value); match; match = pattern.exec(value)) {
    const start = match.index + match[0].length;
    let depth = 1;
    let end = start;
    while (end < value.length && depth > 0) {
      if (value[end] === '(') depth++;
      else if (value[end] === ')') depth--;
      end++;
    }
    const args = splitTop(value.slice(start, end - 1), ',');
    const first = args[0] ?? '';
    if (match[2] === 'linear') {
      const angle = ANGLE.exec(first);
      if (first.startsWith('to ')) args[0] = 'to ' + splitTop(first.slice(3), ' ').map(swapKeyword).join(' ');
      else if (angle) args[0] = `${(((270 - toDegrees(parseFloat(angle[1]!), angle[2]!)) % 360) + 360) % 360}deg`;
      else if (!first.startsWith('var(')) args.unshift('to right'); // the default, to bottom
    } else if (/\bat\b/.test(first)) {
      const [shape, at] = first.split(/\bat\b/) as [string, string];
      args[0] = `${shape}at ${position(at.trim())}`;
    }
    out += value.slice(index, match.index) + match[0] + args.map((arg) => gradients(arg)).join(', ') + ')';
    index = end;
    pattern.lastIndex = end;
  }
  return out + value.slice(index);
}

function shadow(layer: string): string {
  const v = splitTop(layer, ' ');
  const lengths = v.map((t, i) => (/^(-?\d|-?\.\d|calc\()/.test(t) ? i : -1)).filter((i) => i >= 0);
  if (lengths.length < 2) return layer;
  const [x, y] = lengths as [number, number];
  [v[x], v[y]] = [v[y]!, v[x]!];
  return v.join(' ');
}

const TOKENS: Record<string, string> = {
  x: 'y', y: 'x',
  'pan-x': 'pan-y', 'pan-y': 'pan-x', 'pan-left': 'pan-up', 'pan-up': 'pan-left', 'pan-right': 'pan-down', 'pan-down': 'pan-right',
  'repeat-x': 'repeat-y', 'repeat-y': 'repeat-x',
  horizontal: 'vertical', vertical: 'horizontal',
};
const swapTokens = (value: string): string => splitTop(value, ' ').map((t) => TOKENS[t] ?? t).join(' ');

/** One declaration of the site's CSS, transposed. */
export function transposeDeclaration(name: string, value: string): [string, string] {
  if (name.startsWith('--')) {
    // Custom properties carry values for any property; units and gradient
    // directions are safe to swap (Tailwind keeps `to right` in one).
    let v = swapUnits(value);
    if (/^\s*to\s/.test(v)) v = v.replace(/^\s*to\s+(\w+)(\s+(left|right|top|bottom)\b)?/, (m) => m.replace(/\b(left|right|top|bottom)\b/g, swapKeyword));
    return [name, gradients(v)];
  }
  let v = swapUnits(value);
  switch (name) {
    case 'border-radius':
      v = radius(v);
      break;
    case 'overflow':
    case 'overscroll-behavior':
      v = swapPair(v);
      break;
    case 'background-position':
    case 'object-position':
    case 'mask-position':
      v = layers(v, position);
      break;
    case 'background-size':
    case 'mask-size':
      v = layers(v, size);
      break;
    case 'transform':
      v = transformFunctions(v);
      break;
    case 'translate':
    case 'scale': {
      const t = splitTop(v, ' ');
      if (t.length >= 2) [t[0], t[1]] = [t[1]!, t[0]!];
      else if (name === 'translate' && t[0] !== 'none') t.unshift('0');
      v = t.join(' ');
      break;
    }
    case 'rotate':
      if (v !== 'none' && splitTop(v, ' ').length === 1) v = `calc(${v} * -1)`;
      break;
    case 'transform-origin':
    case 'perspective-origin': {
      const t = splitTop(v, ' ');
      v = t.length === 1 ? position(t[0]!) : [position(`${t[0]} ${t[1]}`), ...t.slice(2)].join(' ');
      break;
    }
    case 'box-shadow':
      v = layers(v, shadow);
      break;
    case 'background-repeat':
      v = layers(v, (layer) => {
        const t = splitTop(layer, ' ');
        return t.length === 2 ? `${t[1]} ${t[0]}` : swapTokens(layer);
      });
      break;
    case 'scroll-snap-type':
    case 'touch-action':
    case 'resize':
      v = swapTokens(v);
      break;
    case 'transition-property':
    case 'will-change':
      v = layers(v, swapName);
      break;
    case 'transition':
      v = layers(v, (layer) => {
        const t = splitTop(layer, ' ');
        if (t[0]) t[0] = swapName(t[0]);
        return t.join(' ');
      });
      break;
    default:
      if (SIDES.has(name)) v = sides(v);
  }
  return [swapName(name), gradients(v)];
}

interface Declaration {
  name: string;
  value: string;
  important: boolean;
}

export function parseDeclarations(text: string): Declaration[] {
  const out: Declaration[] = [];
  for (const part of splitTop(text, ';')) {
    const colon = part.indexOf(':');
    if (colon < 1) continue;
    const name = part.slice(0, colon).trim();
    let value = part.slice(colon + 1).trim();
    const important = /!\s*important$/i.test(value);
    if (important) value = value.replace(/\s*!\s*important$/i, '');
    out.push({ name: name.startsWith('--') ? name : name.toLowerCase(), value, important });
  }
  return out;
}

export const serializeDeclarations = (declarations: Declaration[]): string =>
  declarations.map((d) => `${d.name}: ${d.value}${d.important ? ' !important' : ''};`).join(' ');

/** Relative url()s, made absolute, so a copied rule still finds its files. */
const absoluteUrls = (text: string, base: string | null): string =>
  base && text.includes('url(')
    ? text.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (match, quote, url: string) => {
        if (/^(data:|#|[a-z][a-z0-9+.-]*:)/i.test(url)) return match;
        try {
          return `url(${quote}${new URL(url, base).href}${quote})`;
        } catch {
          return match;
        }
      })
    : text;

/** A declaration block (a rule's body, or a style attribute), transposed. */
export function transposeBlock(text: string, base: string | null = null): string {
  const declarations = parseDeclarations(text).map((d) => {
    const [name, value] = transposeDeclaration(d.name, d.value);
    return { name, value: absoluteUrls(value, base), important: d.important };
  });
  return serializeDeclarations(declarations);
}

/** Media and container conditions: the transposed screen's width is its height. */
export function transposeCondition(text: string): string {
  return text
    .replace(/\b(min-|max-)?(device-)?(width|height)\b/g, (_, range = '', device = '', axis) =>
      `${range}${device}${axis === 'width' ? 'height' : 'width'}`,
    )
    .replace(/\b(landscape|portrait)\b/g, (o) => (o === 'landscape' ? 'portrait' : 'landscape'))
    .replace(/\b(min-|max-)?(device-)?aspect-ratio\s*:\s*(\d+)\s*\/\s*(\d+)/g, (_, range = '', device = '', a, b) =>
      `${range === 'min-' ? 'max-' : range === 'max-' ? 'min-' : ''}${device}aspect-ratio: ${b}/${a}`,
    );
}

const prelude = (rule: CSSRule): string => rule.cssText.slice(0, rule.cssText.indexOf('{')).trim();

function transposeRule(rule: CSSRule, base: string | null): string {
  const any = rule as CSSRule & {
    selectorText?: string;
    style?: CSSStyleDeclaration;
    cssRules?: CSSRuleList;
    keyText?: string;
    styleSheet?: CSSStyleSheet | null;
    media?: MediaList;
  };
  const nested = () => (any.cssRules ? transposeRules(any.cssRules, base) : '');
  if (any.style && (any.selectorText !== undefined || any.keyText !== undefined)) {
    const head = any.selectorText ?? any.keyText;
    return `${head} { ${transposeBlock(any.style.cssText, base)} ${nested()} }`;
  }
  const text = rule.cssText;
  if (text.startsWith('@import') && any.styleSheet) {
    try {
      const inner = transposeRules(any.styleSheet.cssRules, any.styleSheet.href ?? base);
      const media = any.media?.mediaText;
      return media ? `@media ${transposeCondition(media)} { ${inner} }` : inner;
    } catch {
      return text; // cross-origin: left as it is
    }
  }
  if (any.cssRules && text.includes('{')) {
    const head = prelude(rule);
    const condition = /^@(media|container)\b/.test(head) ? transposeCondition(head) : head;
    return `${condition} { ${nested()} }`;
  }
  // @font-face, @property, @layer a, b; and the rest: as they are.
  return absoluteUrls(text, base);
}

function transposeRules(rules: CSSRuleList, base: string | null): string {
  let out = '';
  for (const rule of rules) out += transposeRule(rule, base) + '\n';
  return out;
}

/** A whole style sheet, transposed; null when it cannot be read (cross-origin). */
export function transposeSheet(sheet: CSSStyleSheet, base: string | null): string | null {
  try {
    return transposeRules(sheet.cssRules, sheet.href ?? base);
  } catch {
    return null;
  }
}
