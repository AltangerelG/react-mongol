import { NNBSP } from './unicode.js';

/**
 * Corrections, as lower-cased Cyrillic word form -> traditional script.
 * A site's own dictionary wins over the bundled one, which wins over the
 * automatic conversion.
 */
export type MongolDictionary = Readonly<Record<string, string>>;

/**
 * A dictionary file as written by `react-mongol extract`. Only entries marked
 * `reviewed` are used; the rest are drafts waiting for review.
 */
export interface MongolDictionaryFile {
  readonly words: Readonly<Record<string, { readonly script: string; readonly reviewed?: boolean }>>;
}

/** Synchronous Cyrillic -> traditional script conversion, ready to call. */
export type CyrillicConverter = (text: string) => string;

export interface ConverterOptions {
  /**
   * The site's corrections: a plain map, or a `mongol-dictionary.json` from
   * `react-mongol extract`. Keys are matched case-insensitively.
   */
  dictionary?: MongolDictionary | MongolDictionaryFile;
  /**
   * Use the bundled, human-reviewed dictionary (CC BY-SA 4.0). Default `true`.
   */
  reviewed?: boolean;
}

/** The part of khudam this module uses. */
export interface WordConverter {
  convertText(text: string): ReadonlyArray<{
    readonly input: string;
    readonly candidates: ReadonlyArray<{ readonly traditional: string }>;
  }>;
}

// A Cyrillic word, optionally hyphenated ("Улаан-Үүд").
const CYRILLIC_WORD = /[А-ЯЁӨҮа-яёөү]+(?:-[А-ЯЁӨҮа-яёөү]+)*/g;

// Western punctuation directly after a converted word, before a space or the
// end: the Mongolian forms read correctly in vertical text. Decimal points
// ("1.5") are never touched, because a digit is not a Cyrillic word.
const PUNCTUATION: Readonly<Record<string, string>> = {
  ',': '᠂', // MONGOLIAN COMMA
  '.': '᠃', // MONGOLIAN FULL STOP
  ':': '᠄', // MONGOLIAN COLON
};

/** One word through the dictionaries, then the automatic converter. */
function convertWord(word: string, dictionaries: MongolDictionary[], engine: WordConverter): string {
  const key = word.toLowerCase();
  for (const dictionary of dictionaries) {
    const hit = dictionary[key];
    if (hit) return hit;
  }
  const tokens = engine.convertText(word).filter((t) => t.candidates.length);
  if (tokens.length === 0) return word;
  // A word form is one unit: a space inside it is a suffix boundary (NNBSP).
  return tokens
    .map((t) => t.candidates[0]!.traditional)
    .join('')
    .trim()
    .replace(/ +/g, NNBSP);
}

/**
 * Build a converter from an engine you already loaded. Most callers want
 * `loadConverter()`, which loads the engine for you.
 */
export function createConverter(
  engine: WordConverter,
  dictionaries: MongolDictionary[] = [],
): CyrillicConverter {
  const cache = new Map<string, string>();
  return (text) =>
    text.replace(CYRILLIC_WORD, (word) => {
      let converted = cache.get(word);
      if (converted === undefined) {
        converted = convertWord(word, dictionaries, engine);
        cache.set(word, converted);
      }
      return converted;
    }).replace(/([ᠠ-ᢪ᠋-᠏])([,.:])(?=\s|$)/g, (_, letter: string, mark: string) => letter + PUNCTUATION[mark]);
}

let engine: Promise<WordConverter> | null = null;
let bundled: Promise<MongolDictionary> | null = null;

/**
 * Load the automatic converter (khudam, about 340 KB gzipped) and the bundled
 * reviewed dictionary. Both are fetched on first call only, so a page pays for
 * them when a reader asks for traditional script, not before.
 *
 * Automatic conversion is a draft: expect some words to be wrong, and correct
 * them with `dictionary`.
 */
export async function loadConverter(options: ConverterOptions = {}): Promise<CyrillicConverter> {
  engine ??= import('khudam') as Promise<WordConverter>;
  const dictionaries: MongolDictionary[] = [];
  if (options.dictionary) dictionaries.push(normalizeDictionary(options.dictionary));
  if (options.reviewed !== false) {
    bundled ??= import('./generated/reviewed.js').then((m) => m.REVIEWED);
    dictionaries.push(await bundled);
  }
  return createConverter(await engine, dictionaries);
}

/**
 * Convert one string. Convenient for a few calls; for many, keep the function
 * `loadConverter()` returns, which caches per word.
 */
export async function convertCyrillic(text: string, options?: ConverterOptions): Promise<string> {
  return (await loadConverter(options))(text);
}

/** A plain map or a dictionary file, as a lower-cased map of reviewed entries. */
export function normalizeDictionary(dictionary: MongolDictionary | MongolDictionaryFile): MongolDictionary {
  const out: Record<string, string> = {};
  if (isDictionaryFile(dictionary)) {
    for (const [word, entry] of Object.entries(dictionary.words)) {
      if (entry.reviewed && entry.script) out[word.toLowerCase()] = entry.script;
    }
  } else {
    for (const [word, script] of Object.entries(dictionary)) out[word.toLowerCase()] = script;
  }
  return out;
}

function isDictionaryFile(value: unknown): value is MongolDictionaryFile {
  const words = (value as { words?: unknown }).words;
  return typeof words === 'object' && words !== null;
}
