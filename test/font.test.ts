import { detectMongolFont } from '../src/index.js';
import type { TextMeasurer } from '../src/index.js';

const TOFU_WIDTH = 20;

/**
 * A fake browser. `installed` faces draw Mongolian with per-letter widths that
 * depend on the face; `fallback` is the face the browser picks by itself for
 * Mongolian when the requested families lack it (null: none, so tofu).
 */
function browser(installed: string[], fallback: string | null): TextMeasurer {
  const width = (face: string, text: string): number =>
    [...text].reduce((sum, ch) => {
      const isMongolian = ch >= '᠀' && ch <= '᢯';
      if (!isMongolian) return sum + TOFU_WIDTH;
      return sum + (face.length + ch.charCodeAt(0)) % 17 + 5;
    }, 0);

  return (font, text) => {
    const families = font
      .replace(/^\d+px /, '')
      .split(',')
      .map((f) => f.trim().replace(/^'|'$/g, ''));
    const face = families.find((f) => installed.includes(f)) ?? fallback;
    return face ? width(face, text) : text.length * TOFU_WIDTH;
  };
}

const STACK = ['Noto Sans Mongolian', 'Mongolian Baiti', 'sans-serif'];

describe('detectMongolFont', () => {
  it('finds an installed candidate', () => {
    const result = detectMongolFont(STACK, browser(['Mongolian Baiti'], 'Some System Face'));
    expect(result).toEqual({ available: true, family: 'Mongolian Baiti' });
  });

  it('cannot name a candidate that is also the system fallback, but still reports rendering', () => {
    // Windows: Mongolian Baiti is installed and is what the browser falls back to.
    const result = detectMongolFont(STACK, browser(['Mongolian Baiti'], 'Mongolian Baiti'));
    expect(result).toEqual({ available: true, family: null });
  });

  it('prefers candidates in list order', () => {
    const result = detectMongolFont(
      STACK,
      browser(['Mongolian Baiti', 'Noto Sans Mongolian'], 'Mongolian Baiti'),
    );
    expect(result.family).toBe('Noto Sans Mongolian');
  });

  it('reports no font when every Mongolian letter is tofu', () => {
    expect(detectMongolFont(STACK, browser([], null))).toEqual({
      available: false,
      family: null,
    });
  });

  it('does not report a family the device lacks, unlike document.fonts.check', () => {
    const result = detectMongolFont(['NoSuchFont'], browser([], null));
    expect(result.family).toBeNull();
  });

  it('reports rendering through a system fallback the stack does not name', () => {
    const result = detectMongolFont(['NoSuchFont'], browser(['Some System Face'], 'Some System Face'));
    expect(result).toEqual({ available: true, family: null });
  });

  it('never reports a generic family as the match', () => {
    const result = detectMongolFont(['sans-serif'], browser(['sans-serif'], 'sans-serif'));
    expect(result.family).toBeNull();
  });
});
