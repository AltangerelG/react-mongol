import { analyze, inflect, romanToScript, transliterate } from './grammar.js';
import type { Analysis } from './grammar.js';
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
  /** Write 0-9 as Mongolian digits (U+1810..U+1819). Default `true`. */
  digits?: boolean;
}

/** The part of khudam this module uses. */
export interface WordConverter {
  convertText(text: string): ReadonlyArray<{
    readonly input: string;
    readonly candidates: ReadonlyArray<{ readonly traditional: string }>;
    /** True when the engine only guessed letter by letter. */
    readonly fallback?: boolean;
  }>;
  /** Exact lexicon lookup, never a guess. Used to find classical stems. */
  lookupWord?(word: string): ReadonlyArray<{ readonly traditional: string }>;
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

// A word form is one unit: a space inside it is a suffix boundary (NNBSP).
const asWord = (script: string): string => script.trim().replace(/ +/g, NNBSP);

/** The engine's lexicon entry for a whole word, never a letter-by-letter guess. */
function lexicon(word: string, engine: WordConverter): string | null {
  const hit = engine.lookupWord?.(word)[0]?.traditional;
  if (hit) return asWord(hit);
  const tokens = engine.convertText(word).filter((t) => t.candidates.length);
  if (tokens.length === 0 || tokens.some((t) => t.fallback)) return null;
  return asWord(tokens.map((t) => t.candidates[0]!.traditional).join(''));
}

/** Stem + case ending, with the stem from `find` and the ending by rule. */
function byGrammar(
  word: string,
  find: (stem: string) => string | null,
  accept: (analysis: Analysis, stemScript: string) => boolean = () => true,
): string | null {
  for (const analysis of analyze(word)) {
    const script = find(analysis.stem);
    if (script && accept(analysis, script)) return inflect(script, analysis.kase);
  }
  return null;
}

/** Script letters only, for comparing spellings that differ in MVS/NNBSP/spaces. */
const letters = (script: string): string => script.replace(/[᠎  ]/g, '');

/**
 * One word, most trusted source first:
 * 1. the dictionaries (site, then reviewed);
 * 2. a reviewed stem with its case ending by rule;
 * 3. an engine stem with a clear case ending (-ын, -аас, -тай, ...) by rule,
 *    when the engine has no entry for the whole word, or its entry has the
 *    same letters and only writes the ending differently (glued on);
 * 4. the engine's lexicon;
 * 5. an engine stem with a short ending (-д, -т, -н, -г) by rule;
 * 6. a clear case ending on a stem no dictionary knows: the stem by
 *    transliteration rules, the ending by rule (армийн -> armi yin);
 * 7. rule-based transliteration of the whole word.
 */
function convertWord(word: string, dictionaries: MongolDictionary[], engine: WordConverter): string {
  const key = word.toLowerCase();
  const reviewed = (w: string): string | null => {
    for (const dictionary of dictionaries) {
      const hit = dictionary[w];
      if (hit) return hit;
    }
    return null;
  };
  const engineStem = (stem: string): string | null => (engine.lookupWord ? lexicon(stem, engine) : null);
  const whole = lexicon(word, engine);
  return (
    reviewed(key) ??
    byGrammar(key, reviewed) ??
    byGrammar(key, engineStem, ({ strong, kase }, stem) => {
      if (!strong) return false;
      // With a whole-word entry, the rule may only fix how the ending is
      // written (detached with NNBSP), never the letters.
      return whole === null || letters(whole) === letters(inflect(stem, kase));
    }) ??
    whole ??
    byGrammar(key, engineStem) ??
    byGrammar(key, (stem) => romanToScript(transliterate(stem)) || null, ({ strong }) => strong) ??
    (romanToScript(transliterate(key)) || word)
  );
}

/**
 * Build a converter from an engine you already loaded. Most callers want
 * `loadConverter()`, which loads the engine for you.
 */
export function createConverter(
  engine: WordConverter,
  dictionaries: MongolDictionary[] = [],
  options: { digits?: boolean } = {},
): CyrillicConverter {
  const cache = new Map<string, string>();
  const digits = options.digits !== false;
  return (text) => {
    let out = text.replace(CYRILLIC_WORD, (word) => {
      let converted = cache.get(word);
      if (converted === undefined) {
        converted = convertWord(word, dictionaries, engine);
        cache.set(word, converted);
      }
      return converted;
    });
    // 0-9 -> Mongolian digits U+1810..U+1819.
    if (digits) out = out.replace(/[0-9]/g, (d) => String.fromCharCode(0x1810 + d.charCodeAt(0) - 48));
    return out.replace(/([\u1820-\u18AA\u180B-\u180F])([,.:])(?=\s|$)/g, (_, letter: string, mark: string) => letter + PUNCTUATION[mark]);
  };
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
  return createConverter(await engine, dictionaries, options.digits === false ? { digits: false } : {});
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
