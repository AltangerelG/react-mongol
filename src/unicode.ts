/**
 * Unicode facts for traditional Mongolian script (Mongol bichig).
 *
 * Everything here is expressed as escapes rather than literal glyphs so the
 * source stays pure ASCII: the format controls in this block are invisible and
 * a copy-paste through a tool that normalises whitespace would silently destroy
 * them.
 */

/** Mongolian Free Variation Selector 1 (U+180B). Selects a positional variant. */
export const FVS1 = '᠋';
/** Mongolian Free Variation Selector 2 (U+180C). */
export const FVS2 = '᠌';
/** Mongolian Free Variation Selector 3 (U+180D). */
export const FVS3 = '᠍';
/**
 * Mongolian Free Variation Selector 4 (U+180F), added in Unicode 14.0.
 * Font and shaping-engine support is still uneven; treat output containing it
 * as something to verify visually rather than assume.
 */
export const FVS4 = '᠏';

/**
 * Mongolian Vowel Separator (U+180E). Separates a word-final a/e from the stem.
 *
 * Its General_Category changed from Zs (space) to Cf (format) in Unicode 6.3,
 * which is why older code that treated it as whitespace mis-splits words.
 */
export const MVS = '᠎';

/** Mongolian Nirugu (U+180A), the connecting/lengthening bar. */
export const NIRUGU = '᠊';

/** Mongolian Todo Soft Hyphen (U+1806), a *prefixed* format control. */
export const TODO_SOFT_HYPHEN = '᠆';

/**
 * Narrow No-Break Space (U+202F). Not in the Mongolian block, but the
 * conventional separator between a stem and a grammatical suffix, and it must
 * never be treated as a word boundary or rotated independently.
 */
export const NNBSP = ' ';

/** Zero Width Joiner (U+200D), used to force a medial/initial positional form. */
export const ZWJ = '‍';
/** Zero Width Non-Joiner (U+200C), used to force an isolated form. */
export const ZWNJ = '‌';

/** Inclusive code point ranges, as `[first, last]` pairs. */
export type CodeRange = readonly [number, number];

/** The Mongolian block, U+1800..U+18AF. */
export const MONGOLIAN_BLOCK: CodeRange = [0x1800, 0x18af];

/** Mongolian Supplement, U+11660..U+1167F (birga variants, Unicode 9.0). */
export const MONGOLIAN_SUPPLEMENT_BLOCK: CodeRange = [0x11660, 0x1167f];

/** Mongolian digits, U+1810..U+1819. */
export const MONGOLIAN_DIGITS: CodeRange = [0x1810, 0x1819];

/**
 * Mongolian punctuation and the birga, U+1800..U+1809.
 * Note this range is *before* the variation selectors, not interleaved with
 * them, which is what makes a simple range check safe here.
 */
export const MONGOLIAN_PUNCTUATION: CodeRange = [0x1800, 0x1809];

/** The basic Hudum letters, U+1820..U+1842 (A through CHI). */
export const MONGOLIAN_BASIC_LETTERS: CodeRange = [0x1820, 0x1842];

/**
 * Format controls and combining marks that bind to the preceding character.
 *
 * Splitting a string between a letter and one of these changes what the
 * shaping engine renders, so run segmentation must keep them attached.
 */
const COMBINING_CODES: ReadonlySet<number> = new Set([
  0x180a, // NIRUGU
  0x180b, // FVS1
  0x180c, // FVS2
  0x180d, // FVS3
  0x180e, // MVS
  0x180f, // FVS4
  0x1885, // ALI GALI BALUDA      - reclassified letter -> Mn in Unicode 9.0
  0x1886, // ALI GALI THREE BALUDA - likewise
  0x18a9, // ALI GALI DAGALGA
  0x200c, // ZWNJ
  0x200d, // ZWJ
  0x202f, // NNBSP (suffix separator: binds the suffix to the stem)
]);

const inRange = (code: number, [first, last]: CodeRange): boolean =>
  code >= first && code <= last;

/** True for any code point in the Mongolian block or Mongolian Supplement. */
export function isMongolianCodePoint(code: number): boolean {
  return (
    inRange(code, MONGOLIAN_BLOCK) || inRange(code, MONGOLIAN_SUPPLEMENT_BLOCK)
  );
}

/** True for U+1810..U+1819, the Mongolian digits. */
export function isMongolianDigit(code: number): boolean {
  return inRange(code, MONGOLIAN_DIGITS);
}

/** True for U+1800..U+1809, Mongolian punctuation and the birga. */
export function isMongolianPunctuation(code: number): boolean {
  return inRange(code, MONGOLIAN_PUNCTUATION);
}

/**
 * True for a format control or combining mark that must stay attached to the
 * character before it, including NNBSP and the variation selectors.
 */
export function isMongolianCombining(code: number): boolean {
  return COMBINING_CODES.has(code);
}

/**
 * True if the string contains at least one Mongolian letter, digit or
 * punctuation mark. Combining marks alone do not count, since a lone FVS
 * carries no script of its own.
 */
export function hasMongolian(text: string): boolean {
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (isMongolianCodePoint(code) && !isMongolianCombining(code)) return true;
  }
  return false;
}
