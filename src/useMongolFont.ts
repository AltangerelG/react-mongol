import { useEffect, useState } from 'react';
import { DEFAULT_MONGOLIAN_FONT_STACK } from './fonts.js';

/** MONGOL (U+182E U+1823 U+1829 U+182D U+1823 U+182F): varied glyph shapes and widths. */
const PROBE = 'ᠮᠣᠩᠭᠣᠯ';

/** Letters whose widths differ in any real Mongolian face, measured one at a time. */
const PROBE_LETTERS = ['ᠠ', 'ᠮ', 'ᠢ'];

/** An unassigned code point: always drawn as the missing-glyph box. */
const TOFU = '͸';

const GENERIC = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui']);
const BASELINES = ['monospace', 'serif'];

/** Width of `text` drawn in the CSS `font` shorthand `font`. */
export type TextMeasurer = (font: string, text: string) => number;

export interface MongolFontStatus {
  /** `true` if the device draws Mongolian letters as glyphs rather than tofu. */
  readonly available: boolean;
  /**
   * The first family from the candidate list that is installed or loaded, or
   * `null`. Can be `null` while `available` is `true`: the browser is then
   * rendering Mongolian through a fallback font it chose itself. That includes
   * a candidate which is also the system fallback (Mongolian Baiti on Windows),
   * since measurement cannot tell the two apart.
   */
  readonly family: string | null;
  /**
   * `true` until the check has run. On the server, and in a browser without
   * the CSS Font Loading API or canvas, this stays `true` and `available`
   * stays `false`: do not render an "install a font" warning while `pending`.
   */
  readonly pending: boolean;
}

const UNRESOLVED: MongolFontStatus = {
  available: false,
  family: null,
  pending: true,
};

const quote = (name: string): string => (GENERIC.has(name) ? name : `'${name}'`);

/**
 * Decide, from text measurements alone, which candidate family is present and
 * whether Mongolian renders at all.
 *
 * A family is present when the probe word measures differently in
 * `'<family>', <baseline>` than in the bare baseline: a missing family falls
 * through to the baseline and measures the same. `document.fonts.check` cannot
 * answer this -- it reports `true` for any family it has never heard of.
 *
 * Mongolian renders when the probe letters do not all measure as the
 * missing-glyph box.
 */
export function detectMongolFont(
  families: readonly string[],
  measure: TextMeasurer,
): Omit<MongolFontStatus, 'pending'> {
  const family =
    families.find(
      (name) =>
        !GENERIC.has(name) &&
        BASELINES.some(
          (base) => measure(`32px '${name}', ${base}`, PROBE) !== measure(`32px ${base}`, PROBE),
        ),
    ) ?? null;

  const stack = `32px ${families.map(quote).join(', ')}`;
  const tofu = measure(stack, TOFU);
  const available = PROBE_LETTERS.some((letter) => measure(stack, letter) !== tofu);

  return { available: available || family !== null, family };
}

function canvasMeasurer(): TextMeasurer | null {
  const context = document.createElement('canvas').getContext?.('2d');
  if (!context) return null;
  return (font, text) => {
    context.font = font;
    return context.measureText(text).width;
  };
}

/**
 * Reports whether the browser can actually render Mongolian text.
 *
 * Most Android and Linux installs have no Mongolian font at all, so text that
 * is perfectly correct still shows as tofu. Use this to decide whether to load
 * a webfont or show a fallback, rather than assuming the script renders.
 *
 * Webfonts load lazily, so the hook first asks the browser to load each
 * candidate for Mongolian text and waits for `document.fonts.ready`, then
 * measures (see `detectMongolFont`).
 */
export function useMongolFont(
  families: readonly string[] = DEFAULT_MONGOLIAN_FONT_STACK,
): MongolFontStatus {
  const [status, setStatus] = useState<MongolFontStatus>(UNRESOLVED);

  // The families array is usually a fresh literal, so key the effect on its
  // contents rather than its identity to avoid re-checking on every render.
  const key = families.join(',');

  useEffect(() => {
    if (typeof document === 'undefined' || !document.fonts) return;
    const measure = canvasMeasurer();
    if (!measure) return;

    let cancelled = false;
    const names = key.split(',');
    const loads = names
      .filter((name) => !GENERIC.has(name))
      .map((name) => document.fonts.load(`16px '${name}'`, PROBE).catch(() => []));

    void Promise.all(loads)
      .then(() => document.fonts.ready)
      .then(() => {
        if (!cancelled) setStatus({ ...detectMongolFont(names, measure), pending: false });
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return status;
}
