import type { RunKind, TextRun } from './runs.js';

/** The three `text-orientation` values that matter in a vertical writing mode. */
export type RunOrientation = 'mixed' | 'upright' | 'sideways';

/**
 * Decides how one run is oriented. Returning `undefined` falls back to the
 * default for that run's kind.
 */
export type OrientationResolver = (
  run: TextRun,
) => RunOrientation | undefined;

/** A partial override of the per-kind defaults, or a function for full control. */
export type OrientationOption =
  | Partial<Record<RunKind, RunOrientation>>
  | OrientationResolver;

/**
 * Defaults chosen to match conventional Mongolian typesetting.
 *
 * Almost everything is left as `mixed`, because `mixed` is already right: in a
 * vertical writing mode it rotates Latin and Cyrillic 90deg clockwise, which is
 * the conventional treatment for a foreign word inside vertical text. Declaring
 * `sideways` for those kinds would render identically while forcing an extra
 * wrapper span per run, so the default stays `mixed` and `sideways` is reserved
 * for callers who want it.
 *
 * Digits are the one real override: a short digit group reads upright. See
 * `tateChuYoko` for the length-sensitive version of that rule.
 */
export const DEFAULT_ORIENTATION: Readonly<Record<RunKind, RunOrientation>> = {
  mongolian: 'mixed',
  cyrillic: 'mixed',
  latin: 'mixed',
  digit: 'upright',
  space: 'mixed',
  punctuation: 'mixed',
  other: 'mixed',
};

/**
 * The CJK "tate-chu-yoko" rule applied to digits: a short group reads upright,
 * a long one is rotated so it does not stretch the column.
 *
 * Pass as the `orientation` prop to opt in:
 * `<MongolText orientation={tateChuYoko()}>`
 */
export function tateChuYoko(maxUprightDigits = 2): OrientationResolver {
  return (run) => {
    if (run.kind !== 'digit') return undefined;
    return run.text.length <= maxUprightDigits ? 'upright' : 'sideways';
  };
}

/** Resolve the orientation for a single run, applying the caller's override. */
export function resolveOrientation(
  run: TextRun,
  option?: OrientationOption,
): RunOrientation {
  if (typeof option === 'function') {
    return option(run) ?? DEFAULT_ORIENTATION[run.kind];
  }
  return option?.[run.kind] ?? DEFAULT_ORIENTATION[run.kind];
}
