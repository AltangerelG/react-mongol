import { describe, expect, it } from 'vitest';
import { classifyCodePoint, splitRuns } from '../src/runs.js';
import { MVS, NNBSP } from '../src/unicode.js';

/** "mongol" in traditional script: MA O ANG GA O LA. */
const MONGOL = 'ᠮᠣᠩᠭᠣᠯ';
/** The genitive suffix -un: U NA. */
const SUFFIX_UN = 'ᠤᠨ';
/** "baina": BA A I NA + MVS + A, the shape a correct converter emits. */
const BAINA = 'ᠪᠠᠢᠨ' + MVS + 'ᠠ';

const kinds = (text: string): string[] => splitRuns(text).map((r) => r.kind);
const texts = (text: string): string[] => splitRuns(text).map((r) => r.text);

describe('splitRuns', () => {
  it('returns no runs for empty input', () => {
    expect(splitRuns('')).toEqual([]);
  });

  it('keeps a plain Mongolian word as one run', () => {
    expect(splitRuns(MONGOL)).toEqual([
      { kind: 'mongolian', text: MONGOL, start: 0, end: 6 },
    ]);
  });

  it('keeps MVS inside the word it separates', () => {
    // Weak on its own: MVS is in the Mongolian block, so it would join this run
    // by script alone. The combining rule is what the next case pins down.
    expect(kinds(BAINA)).toEqual(['mongolian']);
    expect(texts(BAINA)).toEqual([BAINA]);
  });

  it('attaches a combining mark to a non-Mongolian run it follows', () => {
    // Without the combining rule, MVS after Latin would classify as Mongolian
    // by block and open a spurious second run.
    expect(kinds('abc' + MVS)).toEqual(['latin']);
    expect(texts('abc' + MVS)).toEqual(['abc' + MVS]);
  });

  it('keeps an NNBSP-separated suffix joined to its stem', () => {
    // This is the regression this module exists for: NNBSP is \s, so a naive
    // script split yields mongolian / space / mongolian and renders the stem
    // and suffix as two independent spans.
    const word = MONGOL + NNBSP + SUFFIX_UN;
    expect(kinds(word)).toEqual(['mongolian']);
    expect(texts(word)).toEqual([word]);
  });

  it('still splits on an ordinary space', () => {
    expect(kinds(MONGOL + ' ' + MONGOL)).toEqual([
      'mongolian',
      'space',
      'mongolian',
    ]);
  });

  it('classifies Mongolian digits as Mongolian, not digit', () => {
    // U+1811 and U+1812 are both \p{Nd}; a digit-first classifier tears them
    // out of the surrounding word.
    expect(kinds('᠑᠒')).toEqual(['mongolian']);
    expect(kinds(MONGOL + '᠑')).toEqual(['mongolian']);
  });

  it('separates Latin, ASCII digits and Cyrillic from Mongolian', () => {
    expect(kinds(MONGOL + ' abc 123')).toEqual([
      'mongolian',
      'space',
      'latin',
      'space',
      'digit',
    ]);
    expect(kinds('Монгол')).toEqual(['cyrillic']);
  });

  it('reports UTF-16 offsets that slice the source correctly', () => {
    const source = MONGOL + ' abc';
    for (const run of splitRuns(source)) {
      expect(source.slice(run.start, run.end)).toBe(run.text);
    }
  });

  it('handles astral code points in Mongolian Supplement', () => {
    // U+11660 MONGOLIAN BIRGA WITH ORNAMENT is a surrogate pair; the run must
    // span both units, not split between them.
    const source = '\u{11660}' + MONGOL;
    const runs = splitRuns(source);
    expect(runs).toHaveLength(1);
    expect(runs[0]!.end).toBe(source.length);
  });

  it('treats a leading combining mark as Mongolian rather than crashing', () => {
    expect(kinds(MVS + MONGOL)).toEqual(['mongolian']);
  });

  it('never emits a zero-length run', () => {
    const source = MONGOL + ' 12 abc ' + MVS + '!';
    for (const run of splitRuns(source)) {
      expect(run.text.length).toBeGreaterThan(0);
    }
  });
});

describe('classifyCodePoint', () => {
  it.each([
    ['ᠠ', 'mongolian'],
    ['᠑', 'mongolian'],
    ['᠃', 'mongolian'],
    ['А', 'cyrillic'],
    ['a', 'latin'],
    ['7', 'digit'],
    [' ', 'space'],
    ['!', 'punctuation'],
    ['一', 'other'],
  ])('classifies %j as %s', (ch, expected) => {
    expect(classifyCodePoint(ch.codePointAt(0)!)).toBe(expected);
  });
});
