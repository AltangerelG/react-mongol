import { createElement, forwardRef } from 'react';
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { DEFAULT_MONGOLIAN_FONT_FAMILY } from './fonts.js';

/** Tags a Mongol container may render as. Constrained so `ref` stays typed. */
export type MongolTag =
  | 'div'
  | 'section'
  | 'article'
  | 'aside'
  | 'nav'
  | 'header'
  | 'footer'
  | 'main'
  | 'p'
  | 'span'
  | 'li';

export interface MongolProps extends HTMLAttributes<HTMLElement> {
  /** Element to render. Defaults to `div`. */
  as?: MongolTag;
  /**
   * CSS `font-family` for the subtree. Defaults to the bundled Mongolian
   * stack; pass `null` to inherit from your own stylesheet instead.
   */
  fontFamily?: string | null;
  children?: ReactNode;
}

/**
 * A vertical traditional-Mongolian text container.
 *
 * Sets `writing-mode: vertical-lr`, the correct mode for Mongolian: columns run
 * top to bottom and advance left to right. (`vertical-rl` is the CJK mode and
 * will lay your columns out backwards.)
 *
 * Because the block direction is now horizontal, CSS `height` constrains line
 * length and `width` constrains how many columns fit. Style this element with
 * logical properties -- `marginInlineStart`, `paddingBlockEnd` -- and they will
 * follow the writing mode; physical `marginLeft` and friends will not.
 */
export const Mongol = forwardRef<HTMLElement, MongolProps>(function Mongol(
  { as = 'div', fontFamily, style, children, ...rest },
  ref,
) {
  const resolved =
    fontFamily === null ? undefined : fontFamily ?? DEFAULT_MONGOLIAN_FONT_FAMILY;

  const merged: CSSProperties = {
    writingMode: 'vertical-lr',
    // Reset rather than inherit: a CJK ancestor may have set `upright`, which
    // would stand every Mongolian glyph on end.
    textOrientation: 'mixed',
    ...(resolved === undefined ? null : { fontFamily: resolved }),
    ...style,
  };

  return createElement(as, { ...rest, ref, style: merged }, children);
});
