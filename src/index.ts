export { Mongol } from './Mongol.js';
export type { MongolProps, MongolTag } from './Mongol.js';

export { MongolText } from './MongolText.js';
export type { MongolTextProps } from './MongolText.js';

export { detectMongolFont, useMongolFont } from './useMongolFont.js';
export type { MongolFontStatus, TextMeasurer } from './useMongolFont.js';

export { splitRuns, classifyCodePoint } from './runs.js';
export type { RunKind, TextRun } from './runs.js';

export {
  DEFAULT_ORIENTATION,
  resolveOrientation,
  tateChuYoko,
} from './orientation.js';
export type {
  OrientationOption,
  OrientationResolver,
  RunOrientation,
} from './orientation.js';

export {
  DEFAULT_MONGOLIAN_FONT_FAMILY,
  DEFAULT_MONGOLIAN_FONT_STACK,
} from './fonts.js';

export {
  FVS1,
  FVS2,
  FVS3,
  FVS4,
  MONGOLIAN_BASIC_LETTERS,
  MONGOLIAN_BLOCK,
  MONGOLIAN_DIGITS,
  MONGOLIAN_PUNCTUATION,
  MONGOLIAN_SUPPLEMENT_BLOCK,
  MVS,
  NIRUGU,
  NNBSP,
  TODO_SOFT_HYPHEN,
  ZWJ,
  ZWNJ,
  hasMongolian,
  isMongolianCodePoint,
  isMongolianCombining,
  isMongolianDigit,
  isMongolianPunctuation,
} from './unicode.js';
export type { CodeRange } from './unicode.js';

export { convertCyrillic, createConverter, loadConverter, normalizeDictionary } from './convert.js';
export type {
  ConverterOptions,
  CyrillicConverter,
  MongolDictionary,
  MongolDictionaryFile,
  WordConverter,
} from './convert.js';

export { applyMongolScript } from './dom.js';
export type { MongolScriptOptions, VerticalMode } from './dom.js';

export { MongolToggle, useMongolScript } from './MongolToggle.js';
export type {
  MongolScriptHookOptions,
  MongolScriptState,
  MongolToggleProps,
} from './MongolToggle.js';

export { analyze, caseSuffix, inflect, romanToScript, stemFacts, transliterate } from './grammar.js';
export type { Analysis, Case, StemEnd, StemFacts } from './grammar.js';
