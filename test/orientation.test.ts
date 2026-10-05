import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ORIENTATION,
  resolveOrientation,
  tateChuYoko,
} from '../src/orientation.js';
import { splitRuns } from '../src/runs.js';
import type { TextRun } from '../src/runs.js';

const run = (text: string): TextRun => splitRuns(text)[0]!;

describe('DEFAULT_ORIENTATION', () => {
  it('leaves Latin and Cyrillic as mixed, which already renders sideways', () => {
    expect(DEFAULT_ORIENTATION.latin).toBe('mixed');
    expect(DEFAULT_ORIENTATION.cyrillic).toBe('mixed');
  });

  it('stands digits upright', () => {
    expect(DEFAULT_ORIENTATION.digit).toBe('upright');
  });
});

describe('resolveOrientation', () => {
  it('falls back to the per-kind default with no option', () => {
    expect(resolveOrientation(run('abc'))).toBe('mixed');
    expect(resolveOrientation(run('12'))).toBe('upright');
  });

  it('applies a partial record override', () => {
    expect(resolveOrientation(run('abc'), { latin: 'upright' })).toBe('upright');
    // Kinds absent from the record keep their default.
    expect(resolveOrientation(run('12'), { latin: 'upright' })).toBe('upright');
    expect(resolveOrientation(run('ᠠ'), { latin: 'upright' })).toBe('mixed');
  });

  it('lets a resolver returning undefined defer to the default', () => {
    expect(resolveOrientation(run('abc'), () => undefined)).toBe('mixed');
    expect(resolveOrientation(run('abc'), () => 'sideways')).toBe('sideways');
  });
});

describe('tateChuYoko', () => {
  it('stands a short digit group upright and rotates a long one', () => {
    const rule = tateChuYoko();
    expect(resolveOrientation(run('12'), rule)).toBe('upright');
    expect(resolveOrientation(run('2026'), rule)).toBe('sideways');
  });

  it('honours a custom threshold', () => {
    expect(resolveOrientation(run('2026'), tateChuYoko(4))).toBe('upright');
  });

  it('defers on non-digit runs', () => {
    expect(resolveOrientation(run('abc'), tateChuYoko())).toBe('mixed');
  });
});
