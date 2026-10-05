/**
 * Font families, in preference order, that can render Unicode Mongolian.
 *
 * `Noto Sans Mongolian` is the open reference face and is installable from npm
 * as `@fontsource/noto-sans-mongolian`. `Mongolian Baiti` ships with Windows
 * Vista and later, which makes it the only Mongolian font most Windows users
 * already have. The remaining names cover common Inner Mongolian installs.
 *
 * Deliberately excluded: the Menksoft faces. They encode glyphs in the Private
 * Use Area rather than at their Unicode code points, so naming them here would
 * produce tofu for correct Unicode text. Convert to Menksoft explicitly (see
 * the `mongol-code` package) if you need to target them.
 */
export const DEFAULT_MONGOLIAN_FONT_STACK: readonly string[] = [
  'Noto Sans Mongolian',
  'Mongolian Baiti',
  'MongolianWhite',
  'Mongolian Universal White',
  'sans-serif',
];

/** The default stack as a CSS `font-family` value, with names quoted. */
export const DEFAULT_MONGOLIAN_FONT_FAMILY: string =
  DEFAULT_MONGOLIAN_FONT_STACK.map((name) =>
    name === 'sans-serif' ? name : `'${name}'`,
  ).join(', ');
