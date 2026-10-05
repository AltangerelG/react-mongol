import { Fragment, createElement, forwardRef } from 'react';
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { splitRuns } from './runs.js';
import { resolveOrientation } from './orientation.js';
import type { OrientationOption } from './orientation.js';

export interface MongolTextProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /**
   * The text to render. A string, not arbitrary children: run segmentation
   * needs to see the whole string to keep stem and suffix together, and it
   * cannot look inside a nested element to do that.
   */
  children?: string | number | null | undefined;
  /**
   * Per-script-kind orientation overrides, or a resolver function.
   * See `DEFAULT_ORIENTATION` and `tateChuYoko`.
   */
  orientation?: OrientationOption;
}

/**
 * Mongolian text with per-run orientation.
 *
 * Splits the string into script runs and wraps only the runs whose orientation
 * differs from the container's, so markup stays close to what you would write
 * by hand. Must be rendered inside a vertical writing mode -- use `Mongol`.
 */
export const MongolText = forwardRef<HTMLSpanElement, MongolTextProps>(
  function MongolText({ children, orientation, ...rest }, ref) {
    const text = children == null ? '' : String(children);
    const runs = splitRuns(text);

    const content: ReactNode[] = runs.map((run) => {
      const resolved = resolveOrientation(run, orientation);
      if (resolved === 'mixed') {
        return createElement(Fragment, { key: run.start }, run.text);
      }
      const style: CSSProperties = { textOrientation: resolved };
      return createElement('span', { key: run.start, style }, run.text);
    });

    return createElement('span', { ...rest, ref }, ...content);
  },
);
