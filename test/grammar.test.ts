import * as khudam from 'khudam';
import {
  analyze,
  caseSuffix,
  createConverter,
  inflect,
  romanToScript,
  stemFacts,
  transliterate,
} from '../src/index.js';
import type { WordConverter } from '../src/index.js';

const S = romanToScript;

describe('romanToScript', () => {
  it('maps the classical romanization, MVS and NNBSP', () => {
    expect(S('mongγol')).toBe('ᠮᠣᠩᠭᠣᠯ');
    expect(S('qar-a')).toBe('ᠬᠠᠷ᠎ᠠ');
    expect(S('ger_ün')).toBe('ᠭᠡᠷ ᠦᠨ');
  });
});

describe('stemFacts', () => {
  it('reads harmony and the class of the last letter', () => {
    expect(stemFacts(S('qota'))).toEqual({ back: true, end: 'vowel' });
    expect(stemFacts(S('kümün'))).toEqual({ back: false, end: 'n' });
    expect(stemFacts(S('nom'))).toEqual({ back: true, end: 'soft' });
    expect(stemFacts(S('nutuγ'))).toEqual({ back: true, end: 'hard' });
    expect(stemFacts(S('eǰi'))).toEqual({ back: false, end: 'vowel' }); // only i: front (H4)
    expect(stemFacts(S('qar-a')).end).toBe('vowel');
  });
});

describe('caseSuffix', () => {
  const back = (end: Parameters<typeof caseSuffix>[0]['end']) => ({ back: true, end });
  const front = (end: Parameters<typeof caseSuffix>[0]['end']) => ({ back: false, end });

  it('genitive: yin after a vowel, u/ü after n, un/ün otherwise (N1-N3)', () => {
    expect(caseSuffix(back('vowel'), 'genitive')).toBe('yin');
    expect(caseSuffix(front('n'), 'genitive')).toBe('ü');
    expect(caseSuffix(back('soft'), 'genitive')).toBe('un');
    expect(caseSuffix(front('hard'), 'genitive')).toBe('ün');
  });

  it('accusative: yi after a vowel or y, i otherwise (N4, N5)', () => {
    expect(caseSuffix(back('vowel'), 'accusative')).toBe('yi');
    expect(caseSuffix(back('y'), 'accusative')).toBe('yi');
    expect(caseSuffix(front('hard'), 'accusative')).toBe('i');
  });

  it('dative: d after a vowel or soft letter, t after a hard one (N6, N7)', () => {
    expect(caseSuffix(back('vowel'), 'dative')).toBe('du');
    expect(caseSuffix(back('soft'), 'dative')).toBe('du');
    expect(caseSuffix(front('n'), 'dative')).toBe('dü');
    expect(caseSuffix(back('hard'), 'dative')).toBe('tu');
  });

  it('ablative, instrumental, comitative, directional by harmony and ending (N9-N13, N17)', () => {
    expect(caseSuffix(back('hard'), 'ablative')).toBe('ača');
    expect(caseSuffix(front('vowel'), 'ablative')).toBe('eče');
    expect(caseSuffix(back('vowel'), 'instrumental')).toBe('bar');
    expect(caseSuffix(front('hard'), 'instrumental')).toBe('iyer');
    expect(caseSuffix(back('soft'), 'comitative')).toBe('tai');
    expect(caseSuffix(front('n'), 'comitative')).toBe('tei');
    expect(caseSuffix(back('hard'), 'directional')).toBe('uruγu');
  });
});

describe('inflect', () => {
  it('detaches the ending with NNBSP', () => {
    expect(inflect(S('qota'), 'dative')).toBe(S('qota_du'));
    expect(inflect(S('usu'), 'instrumental')).toBe(S('usu_bar'));
    expect(inflect(S('kümün'), 'comitative')).toBe(S('kümün_tei'));
    expect(inflect(S('nutuγ'), 'dative')).toBe(S('nutuγ_tu'));
  });

  it('adds the hidden n of an n-stem genitive, dropping a final MVS', () => {
    expect(inflect(S('alaγ-a'), 'genitive-n')).toBe(S('alaγan_u'));
    expect(inflect(S('kümün'), 'genitive-n')).toBe(S('kümün_ü'));
    expect(inflect(S('mori'), 'genitive-n')).toBe(S('morin_u'));
  });
});

describe('analyze', () => {
  const has = (word: string, stem: string, kase: string) =>
    analyze(word).some((a) => a.stem === stem && a.kase === kase);

  it('splits common case endings', () => {
    expect(has('хотод', 'хот', 'dative')).toBe(true);
    expect(has('гэрийн', 'гэр', 'genitive')).toBe(true);
    expect(has('хүний', 'хүн', 'genitive-n')).toBe(true);
    expect(has('усаар', 'ус', 'instrumental')).toBe(true);
    expect(has('ээжээс', 'ээж', 'ablative')).toBe(true);
    expect(has('хүнтэй', 'хүн', 'comitative')).toBe(true);
    expect(has('одоогийн', 'одоо', 'genitive')).toBe(true);
  });

  it('restores a vowel dropped before the ending', () => {
    expect(has('бичгээр', 'бичиг', 'instrumental')).toBe(true);
    expect(has('нутгийн', 'нутаг', 'genitive')).toBe(true);
  });
});

describe('transliterate (rules for unknown words)', () => {
  it.each([
    // C2. Later-syllable о is written u by convention (V5); o and u share that glyph,
    // and the dictionary spelling of монгол itself is mongγol.
    ['монгол', 'mongγul'],
    ['энх', 'engke'], // C4
    ['дэвтэр', 'debter'], // C12: native в is b
    ['аймаг', 'ayimaγ'], // D1
    ['түймэр', 'tüyimer'], // D1
    ['нохой', 'noqai'], // D3
    ['үгүй', 'ügei'], // D3
    ['цаг', 'čaγ'],
    ['эх', 'eke'], // S3: front q/k at the end takes e
    ['ах', 'aq-a'], // S3: back q at the end takes MVS a
    ['хамт', 'qamtu'], // S3
    ['уул', 'aγul'], // L3 (the hidden final a is lexical)
  ])('%s -> %s', (cyrillic, latin) => {
    expect(transliterate(cyrillic)).toBe(latin);
  });
});

describe('createConverter with grammar (real khudam)', () => {
  const convert = createConverter(khudam as WordConverter, [], { digits: false });

  it('writes case endings by rule on a known stem', () => {
    expect(convert('Улаанбаатарт')).toBe(S('ulaγanbaγatur_tu'));
    expect(convert('усаар')).toBe(S('usu_bar'));
    expect(convert('хүнтэй')).toBe(S('kümün_tei'));
  });

  it('never changes the letters of a whole word the lexicon knows', () => {
    // Each of these also looks like a stem + case ending.
    for (const word of ['нарийн', 'залуу', 'тэдгээр', 'агаар']) {
      const lexicon = khudam.lookupWord(word)[0]!.traditional.replace(/ +/g, ' ');
      expect(convert(word)).toBe(lexicon);
    }
  });

  it('uses a reviewed stem for every inflected form', () => {
    const withReviewed = createConverter(khudam as WordConverter, [{ хот: S('qota') }], { digits: false });
    expect(withReviewed('хотод')).toBe(S('qota_du'));
    expect(withReviewed('хотын')).toBe(S('qota_yin'));
    expect(withReviewed('хотоос')).toBe(S('qota_ača'));
  });
});
