import { isMongolianCodePoint, isMongolianCombining } from './unicode.js';

/**
 * What kind of script a run of text belongs to.
 *
 * `cyrillic` is called out separately from `other` because Mongolian pages
 * routinely mix Cyrillic Mongolian with traditional script, and the two want
 * different vertical orientation.
 *
 * `digit` is separate from `latin` because the conventional treatment differs:
 * Latin words are usually left rotated sideways, while short digit groups are
 * often set upright.
 */
export type RunKind =
  | 'mongolian'
  | 'cyrillic'
  | 'latin'
  | 'digit'
  | 'space'
  | 'punctuation'
  | 'other';

/** A maximal span of same-kind text. `text === source.slice(start, end)`. */
export interface TextRun {
  readonly kind: RunKind;
  readonly text: string;
  /** UTF-16 index into the source string, inclusive. */
  readonly start: number;
  /** UTF-16 index into the source string, exclusive. */
  readonly end: number;
}

const LATIN = /\p{Script=Latin}/u;
const CYRILLIC = /\p{Script=Cyrillic}/u;
const DIGIT = /\p{Nd}/u;
const SPACE = /\s/u;
const PUNCT = /[\p{P}\p{S}]/u;

/**
 * Classify a single code point.
 *
 * Mongolian is tested first and unconditionally: the Mongolian digits
 * (U+1810..U+1819) are also `\p{Nd}`, so a digit-first order would tear them
 * out of the surrounding word.
 */
export function classifyCodePoint(code: number): RunKind {
  if (isMongolianCodePoint(code)) return 'mongolian';
  const ch = String.fromCodePoint(code);
  if (CYRILLIC.test(ch)) return 'cyrillic';
  if (LATIN.test(ch)) return 'latin';
  if (DIGIT.test(ch)) return 'digit';
  if (SPACE.test(ch)) return 'space';
  if (PUNCT.test(ch)) return 'punctuation';
  return 'other';
}

/**
 * Split text into maximal runs of a single script kind.
 *
 * Combining marks and format controls (FVS1-4, MVS, NIRUGU, ZWJ/ZWNJ and the
 * NNBSP suffix separator) are appended to the run in progress rather than
 * starting one of their own. That is the whole reason this function exists: a
 * naive split on script boundaries puts NNBSP in a `space` run and the suffix
 * after it in a second `mongolian` run, and rendering those as two independent
 * spans breaks the stem/suffix join that the separator was there to express.
 *
 * Returns an empty array for empty input. Never returns a zero-length run.
 */
export function splitRuns(text: string): TextRun[] {
  const runs: TextRun[] = [];
  let kind: RunKind | null = null;
  let start = 0;
  let index = 0;

  const flush = (end: number): void => {
    if (kind !== null && end > start) {
      runs.push({ kind, text: text.slice(start, end), start, end });
    }
  };

  for (const ch of text) {
    const code = ch.codePointAt(0)!;

    // A combining mark with a run already open belongs to that run, whatever
    // its kind. With no run open it has nothing to attach to, so it is treated
    // as Mongolian on its own -- these are all Mongolian-block controls.
    if (isMongolianCombining(code) && kind !== null) {
      index += ch.length;
      continue;
    }

    const next = isMongolianCombining(code) ? 'mongolian' : classifyCodePoint(code);
    if (next !== kind) {
      flush(index);
      kind = next;
      start = index;
    }
    index += ch.length;
  }

  flush(index);
  return runs;
}
