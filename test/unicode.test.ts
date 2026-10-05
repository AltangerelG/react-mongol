import { describe, expect, it } from 'vitest';
import {
  FVS1,
  FVS4,
  MVS,
  NNBSP,
  ZWJ,
  hasMongolian,
  isMongolianCodePoint,
  isMongolianCombining,
  isMongolianDigit,
  isMongolianPunctuation,
} from '../src/unicode.js';

const cp = (s: string): number => s.codePointAt(0)!;

describe('isMongolianCodePoint', () => {
  it('covers the whole Mongolian block inclusively', () => {
    expect(isMongolianCodePoint(0x1800)).toBe(true);
    expect(isMongolianCodePoint(0x18af)).toBe(true);
    expect(isMongolianCodePoint(0x17ff)).toBe(false);
    expect(isMongolianCodePoint(0x18b0)).toBe(false);
  });

  it('covers Mongolian Supplement', () => {
    expect(isMongolianCodePoint(0x11660)).toBe(true);
    expect(isMongolianCodePoint(0x1167f)).toBe(true);
    expect(isMongolianCodePoint(0x11680)).toBe(false);
  });
});

describe('isMongolianCombining', () => {
  it('includes every variation selector including FVS4', () => {
    for (const ch of [FVS1, '᠌', '᠍', FVS4]) {
      expect(isMongolianCombining(cp(ch))).toBe(true);
    }
  });

  it('includes MVS, which is a format control and not a space', () => {
    expect(isMongolianCombining(cp(MVS))).toBe(true);
  });

  it('includes NNBSP, the stem/suffix separator', () => {
    expect(isMongolianCombining(cp(NNBSP))).toBe(true);
  });

  it('includes the joiners and the reclassified Ali Gali baluda marks', () => {
    expect(isMongolianCombining(cp(ZWJ))).toBe(true);
    expect(isMongolianCombining(0x1885)).toBe(true);
    expect(isMongolianCombining(0x1886)).toBe(true);
  });

  it('excludes ordinary letters', () => {
    expect(isMongolianCombining(0x1820)).toBe(false);
  });
});

describe('digit and punctuation ranges', () => {
  it('bounds the digits at U+1810..U+1819', () => {
    expect(isMongolianDigit(0x1810)).toBe(true);
    expect(isMongolianDigit(0x1819)).toBe(true);
    expect(isMongolianDigit(0x181a)).toBe(false);
  });

  it('bounds punctuation below the variation selectors', () => {
    expect(isMongolianPunctuation(0x1803)).toBe(true);
    expect(isMongolianPunctuation(0x1809)).toBe(true);
    expect(isMongolianPunctuation(0x180a)).toBe(false);
  });
});

describe('hasMongolian', () => {
  it('is true for text containing a Mongolian letter', () => {
    expect(hasMongolian('abc ᠠ')).toBe(true);
  });

  it('is false for text with no Mongolian at all', () => {
    expect(hasMongolian('abc 123 Мон')).toBe(false);
  });

  it('is false for combining marks alone, which carry no script', () => {
    expect(hasMongolian(MVS + FVS1 + NNBSP)).toBe(false);
  });
});
