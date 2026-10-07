/**
 * Mongol bichig grammar: case suffixes chosen by rule, and a rule-based
 * transliteration for words no dictionary knows.
 *
 * Classical spelling is not recoverable from Cyrillic alone: stems hide
 * vowels (ус -> usu), n (хүн -> kümün), long-vowel sources (уул -> aγula)
 * and MVS (хар -> qar-a). Suffixes, though, follow strict rules once the
 * classical stem is known. So the engine splits a Cyrillic word into stem +
 * case ending, looks the stem up, and writes the ending by rule:
 * хотод -> хот (qota) + dative -> qota du.
 *
 * Rule IDs (N1, S3, ...) refer to the spec in dictionary/GRAMMAR.md.
 */

// ---------------------------------------------------------------------------
// Romanization <-> script. The classical scheme used throughout:
// a e i o u ö ü ē n ng b p q k γ g m l s š t d č ǰ y r w f kh c z h lh zh ch,
// '-' = MVS (U+180E), '_' = NNBSP (U+202F, before a detached case suffix).

const LETTERS: ReadonlyArray<readonly [string, number]> = [
  ['ng', 0x1829], ['kh', 0x183b], ['lh', 0x1840], ['zh', 0x1841], ['ch', 0x1842],
  ['a', 0x1820], ['e', 0x1821], ['i', 0x1822], ['o', 0x1823], ['u', 0x1824],
  ['ö', 0x1825], ['ü', 0x1826], ['ē', 0x1827], ['n', 0x1828], ['b', 0x182a],
  ['p', 0x182b], ['q', 0x182c], ['k', 0x182c], ['γ', 0x182d], ['g', 0x182d],
  ['m', 0x182e], ['l', 0x182f], ['s', 0x1830], ['š', 0x1831], ['t', 0x1832],
  ['d', 0x1833], ['č', 0x1834], ['ǰ', 0x1835], ['y', 0x1836], ['r', 0x1837],
  ['w', 0x1838], ['f', 0x1839], ['c', 0x183c], ['z', 0x183d], ['h', 0x183e],
  ['-', 0x180e], ['_', 0x202f],
];

/** Classical romanization -> Unicode traditional script. */
export function romanToScript(latin: string): string {
  let out = '';
  for (let i = 0; i < latin.length; ) {
    const hit = LETTERS.find(([l]) => latin.startsWith(l, i));
    if (!hit) {
      out += latin[i];
      i++;
      continue;
    }
    out += String.fromCodePoint(hit[1]);
    i += hit[0].length;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Facts about a classical stem, read from its script.

const BACK_VOWELS = new Set([0x1820, 0x1823, 0x1824]); // a o u
const FRONT_VOWELS = new Set([0x1821, 0x1825, 0x1826, 0x1827]); // e ö ü ē
const VOWELS = new Set([0x1820, 0x1821, 0x1822, 0x1823, 0x1824, 0x1825, 0x1826, 0x1827]);
/** Soft syllable-final letters: n m l ng (S1). */
const SOFT = new Set([0x1828, 0x182e, 0x182f, 0x1829]);
/** Hard syllable-final letters: b γ/g r s d (S1). */
const HARD = new Set([0x182a, 0x182d, 0x1837, 0x1830, 0x1833]);
const Y = 0x1836;
const N = 0x1828;

export type StemEnd = 'vowel' | 'n' | 'soft' | 'hard' | 'y' | 'other';

export interface StemFacts {
  back: boolean;
  end: StemEnd;
}

/** Harmony (H1, H4: only i counts as front) and the class of the last letter. */
export function stemFacts(script: string): StemFacts {
  const letters = [...script].map((c) => c.codePointAt(0)!).filter((c) => c >= 0x1820 && c <= 0x18aa);
  const back = letters.some((c) => BACK_VOWELS.has(c)) && !letters.some((c) => FRONT_VOWELS.has(c));
  const last = letters[letters.length - 1];
  const end: StemEnd =
    last === undefined ? 'other'
    : VOWELS.has(last) ? 'vowel'
    : last === N ? 'n'
    : last === Y ? 'y'
    : SOFT.has(last) ? 'soft'
    : HARD.has(last) ? 'hard'
    : 'other';
  return { back, end };
}

// ---------------------------------------------------------------------------
// Case endings.

export type Case =
  | 'genitive'
  | 'genitive-n' // the Cyrillic -ны/-ний/-ы: an n-stem, hidden n included (N3)
  | 'accusative'
  | 'dative'
  | 'ablative'
  | 'instrumental'
  | 'comitative'
  | 'directional';

/** The written case ending for a classical stem, in romanization (N1-N17). */
export function caseSuffix(stem: StemFacts, kase: Case): string {
  const { back, end } = stem;
  const ae = back ? 'a' : 'e';
  const uü = back ? 'u' : 'ü';
  const vowelLike = end === 'vowel' || end === 'y';
  switch (kase) {
    case 'genitive':
      return end === 'vowel' ? 'yin' : end === 'n' ? uü : `${uü}n`;
    case 'genitive-n':
      return uü;
    case 'accusative':
      return vowelLike ? 'yi' : 'i';
    case 'dative':
      // N6/N7: d after a vowel or a soft letter, t after a hard one.
      return end === 'hard' ? `t${uü}` : `d${uü}`;
    case 'ablative':
      return back ? 'ača' : 'eče';
    case 'instrumental':
      return vowelLike ? `b${ae}r` : `iy${ae}r`;
    case 'comitative':
      return back ? 'tai' : 'tei';
    case 'directional':
      return back ? 'uruγu' : 'ürügü';
  }
}

/** Stem script + NNBSP + the case ending, as script. */
export function inflect(stemScript: string, kase: Case): string {
  let stem = stemScript;
  if (kase === 'genitive-n' && stemFacts(stem).end !== 'n') {
    // The hidden n joins the stem, so a detached final a/e is no longer final: alaγ-a -> alaγan.
    stem = stem.replace(/᠎(?=[ᠠᠡ]$)/, '') + String.fromCodePoint(N);
  }
  return `${stem} ${romanToScript(caseSuffix(stemFacts(stem), kase))}`;
}

// ---------------------------------------------------------------------------
// Splitting a Cyrillic word into stem + case ending.

interface Ending {
  re: RegExp;
  kase: Case;
  /** Long and unambiguous: rarely the end of a plain stem. */
  strong?: boolean;
}

// Longest endings first. The capture group is the Cyrillic stem.
const ENDINGS: Ending[] = [
  // After a long vowel or diphthong the Cyrillic ending takes a г: одоо-гийн, далай-гаас.
  { re: /^(.+(?:аа|ээ|оо|өө|уу|үү|ий|ай|ой|уй|үй|эй))гийн$/, kase: 'genitive', strong: true },
  { re: /^(.+(?:аа|ээ|оо|өө|уу|үү|ий|ай|ой|уй|үй|эй))гийг$/, kase: 'accusative', strong: true },
  { re: /^(.+?)(?:гаас|гээс|гоос|гөөс)$/, kase: 'ablative', strong: true },
  { re: /^(.+?)(?:гаар|гээр|гоор|гөөр)$/, kase: 'instrumental', strong: true },
  { re: /^(.+?)(?:аас|ээс|оос|өөс|иас|иос|иэс|иөс)$/, kase: 'ablative', strong: true },
  { re: /^(.+?)(?:аар|ээр|оор|өөр|иар|иор|иэр|иөр)$/, kase: 'instrumental', strong: true },
  { re: /^(.+?)(?:тай|тэй|той)$/, kase: 'comitative', strong: true },
  { re: /^(.+?)(?:руу|рүү|луу|лүү)$/, kase: 'directional', strong: true },
  { re: /^(.+?)(?:ийн|ын)$/, kase: 'genitive', strong: true },
  { re: /^(.+?)(?:ний|ны)$/, kase: 'genitive-n', strong: true },
  { re: /^(.+?)(?:ийг|ыг)$/, kase: 'accusative', strong: true },
  { re: /^(.+?)(?:ад|эд|од|өд)$/, kase: 'dative' },
  { re: /^(.+[аэиоөуүяеёю])н$/, kase: 'genitive' },
  { re: /^(.+[аэиоөуүяеёю])г$/, kase: 'accusative' },
  { re: /^(.+?)[дт]$/, kase: 'dative' },
  { re: /^(.+?)(?:ий|ы)$/, kase: 'genitive-n' },
];

export interface Analysis {
  stem: string;
  kase: Case;
  /** The ending is long and unambiguous (see ENDINGS). */
  strong: boolean;
}

const HARMONY_VOWELS = { back: ['а', 'о', 'у'], front: ['э', 'ө', 'ү', 'и'] };

/**
 * Possible stem + case readings of a Cyrillic word, most likely first.
 * Candidates include the stem with a dropped vowel restored
 * (бичгээр -> бичг -> бичиг) and with a soft sign (морины -> морь).
 */
export function analyze(word: string): Analysis[] {
  const lower = word.toLowerCase();
  const out: Analysis[] = [];
  const seen = new Set<string>();
  for (const { re, kase, strong = false } of ENDINGS) {
    const push = (stem: string, k: Case) => {
      const key = `${stem}|${k}`;
      if (stem.length < 2 || seen.has(key)) return;
      seen.add(key);
      out.push({ stem, kase: k, strong });
    };
    const match = re.exec(lower);
    if (!match) continue;
    const stem = match[1]!;
    push(stem, kase);
    push(`${stem}ь`, kase);
    // A vowel dropped before the ending: бичг -> бичиг, нутгийн -> нутаг.
    const tail = /^(.*[бвгджзклмнпрстфхцчшщ])([бвгджзклмнпрстфхцчшщ])$/.exec(stem);
    if (tail) {
      const vowels = /[эөүе]/.test(stem) ? HARMONY_VOWELS.front : /[аоуяё]/.test(stem) ? HARMONY_VOWELS.back : ['и'];
      for (const v of vowels) push(`${tail[1]}${v}${tail[2]}`, kase);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Rule-based transliteration, for words no dictionary knows.
//
// Decidable rules (spec section 2) are applied exactly; where the spec says
// the answer is lexical, the most common choice is taken. The result is a
// draft: prefer any dictionary entry over it.

const CYR_VOWEL = /[аэиоөуүыяеёю]/;
const FINAL_DIPHTHONG: Record<string, string> = { а: 'ai', о: 'ai', у: 'ui', ү: 'ei', э: 'ei' };
const MEDIAL_DIPHTHONG: Record<string, string> = { а: 'a', о: 'o', у: 'u', ү: 'ü', э: 'e' };

/** A Cyrillic word -> classical romanization (a best guess). */
export function transliterate(word: string): string {
  const w = word.toLowerCase().replace(/ъ/g, '');
  if (!/[а-яёөү]/.test(w)) return '';
  const front = /[эөүе]/.test(w) || !/[аоуыяё]/.test(w);
  const back = !front;
  const loan = /[фкщ]/.test(w) || w.startsWith('р');
  const ae = back ? 'a' : 'e';
  const uü = back ? 'u' : 'ü';

  const yStart = (i: number): boolean => i === 0 || CYR_VOWEL.test(w[i - 1]!);
  let out = '';
  let syllable = 0; // vowels written so far: first syllable when 0
  for (let i = 0; i < w.length; i++) {
    const c = w[i]!;
    const next = w[i + 1] ?? '';
    const after = w[i + 2] ?? '';
    const first = syllable === 0;

    // Long vowels (L1-L6): V + γ/g + V; i + y + V after i (L9 is lexical).
    const pair = c + next;
    const long: Record<string, [string, string]> = {
      аа: ['aγa', 'aγa'], оо: ['oγu', 'uγu'], уу: ['aγu', 'uγu'],
      ээ: ['ege', 'ege'], өө: ['ögü', 'üge'], үү: ['ügü', 'ügü'],
    };
    if (long[pair]) {
      let form = first ? long[pair]![0] : long[pair]![1];
      if (pair === 'үү' && first && i === 0) form = 'egü'; // үүл -> egüle
      out += form;
      syllable++;
      i++;
      continue;
    }
    // Diphthongs (D1, D3): V+y+i inside a word, V+i at the end; final ой -> ai, үй -> ei.
    if (next === 'й' && /[аоуүэ]/.test(c)) {
      const finalD = i + 2 >= w.length;
      out += finalD ? FINAL_DIPHTHONG[c]! : `${MEDIAL_DIPHTHONG[c]!}yi`;
      syllable++;
      i++;
      continue;
    }
    if (pair === 'ий') {
      out += 'i';
      syllable++;
      i++;
      continue;
    }

    switch (c) {
      case 'а': out += 'a'; syllable++; break;
      case 'э': out += 'e'; syllable++; break;
      case 'и': out += 'i'; syllable++; break;
      case 'о': out += first ? 'o' : 'u'; syllable++; break; // V4/V5
      case 'у': out += 'u'; syllable++; break;
      case 'ө': out += first ? 'ö' : 'ü'; syllable++; break; // V9
      case 'ү': out += 'ü'; syllable++; break;
      case 'ы': out += 'i'; syllable++; break; // V11 (best guess)
      // V15: е ё ю я start with y at the start of a word or after a vowel.
      case 'е': out += yStart(i) ? 'ye' : 'e'; syllable++; break;
      case 'ё': out += yStart(i) ? 'yo' : 'o'; syllable++; break;
      case 'ю': out += yStart(i) ? `y${uü}` : uü; syllable++; break;
      case 'я': out += yStart(i) ? 'ya' : 'iya'; syllable++; break;
      case 'ь': if (!CYR_VOWEL.test(next)) out += 'i'; break; // V12
      case 'й': out += 'y'; break;
      case 'н':
        if (next === 'г') { out += CYR_VOWEL.test(after) ? `ng${back ? 'γ' : 'g'}` : 'ng'; i++; } // C2/C3
        else if (next === 'х') { out += `ng${back ? 'q' : 'k'}`; i++; } // C4
        else out += 'n';
        break;
      case 'х': out += back ? 'q' : 'k'; break; // C5/C6
      case 'г': out += back ? 'γ' : 'g'; break; // C8/C9
      case 'в': out += loan ? 'w' : 'b'; break; // C12/C13
      case 'б': out += 'b'; break;
      case 'п': out += 'p'; break;
      case 'ф': out += 'f'; break;
      case 'к': out += 'kh'; break; // F4
      case 'т': out += 't'; break;
      case 'д': out += 'd'; break;
      case 'з': case 'ж': out += 'ǰ'; break; // C20
      case 'ц': case 'ч': out += 'č'; break; // C21
      case 'с': out += 's'; break;
      case 'ш': out += next === 'и' ? 's' : 'š'; break; // C23/C24
      case 'щ': out += 'šč'; break;
      case 'л': out += 'l'; break;
      case 'м': out += 'm'; break;
      case 'р': out += 'r'; break;
      default: out += '';
    }
  }

  // S3: q/k, ǰ, t, č, š, p never end a word: add a vowel. Which vowel is
  // lexical (ах -> aq-a, хамт -> qamtu, ганц -> γanča); take the usual one.
  const final = /(kh|[qkǰtčšp])$/.exec(out);
  if (final && final[1] !== 'kh') {
    const letter = final[1]!;
    const vowel = letter === 'q' || letter === 'k' ? (back ? '-a' : 'e') : letter === 't' ? uü : letter === 'p' ? ae : 'i';
    out += vowel;
  }
  return out;
}
