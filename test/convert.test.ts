import { applyMongolScript, createConverter, NNBSP } from '../src/index.js';
import type { WordConverter } from '../src/index.js';

/** A fake engine: every Cyrillic word becomes "<" + word + ">", with a suffix space for "-ын". */
const engine: WordConverter = {
  convertText: (text) => [
    {
      input: text,
      candidates: [{ traditional: text.endsWith('ын') ? `${text.slice(0, -2)} ын` : `<${text}>` }],
    },
  ],
};

describe('createConverter', () => {
  it('converts Cyrillic words and leaves everything else alone', () => {
    const convert = createConverter(engine);
    expect(convert('Монгол 2026, React!')).toBe('<Монгол> 2026, React!');
  });

  it('prefers dictionaries in order, matching case-insensitively', () => {
    const site = { монгол: 'SITE' };
    const reviewed = { монгол: 'REVIEWED', улс: 'ULS' };
    const convert = createConverter(engine, [site, reviewed]);
    expect(convert('Монгол улс бол')).toBe('SITE ULS <бол>');
  });

  it('writes a suffix boundary inside a word as NNBSP, not a space', () => {
    const convert = createConverter(engine);
    expect(convert('хотын')).toBe(`хот${NNBSP}ын`);
  });

  it('turns punctuation after a converted word into Mongolian punctuation, not decimals', () => {
    const convert = createConverter(engine, [{ сайн: 'ᠰᠠᠢᠨ' }]);
    expect(convert('сайн, сайн.')).toBe('ᠰᠠᠢᠨ᠂ ᠰᠠᠢᠨ᠃');
    expect(convert('1.5, 2.')).toBe('1.5, 2.');
  });
});

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('applyMongolScript', () => {
  const convert = (text: string) => text.replace(/[А-ЯЁӨҮа-яёөү]+/g, 'ᠮ');

  beforeEach(() => {
    document.documentElement.setAttribute('lang', 'mn');
    document.body.innerHTML = `
      <nav title="Цэс">Нүүр <a href="#">Мэдээ</a></nav>
      <main><p>Сайн байна уу</p><code>байна</code><textarea>бичих</textarea></main>
      <div data-mongol-skip>Кирилл</div>
      <input placeholder="Хайх">`;
  });

  it('converts text and attributes, but not code, form values or opted-out parts', () => {
    const restore = applyMongolScript(convert);
    expect(document.querySelector('nav')!.textContent).toBe('ᠮ ᠮ');
    expect(document.querySelector('nav')!.getAttribute('title')).toBe('ᠮ');
    expect(document.querySelector('p')!.textContent).toBe('ᠮ ᠮ ᠮ');
    expect(document.querySelector('code')!.textContent).toBe('байна');
    expect(document.querySelector('textarea')!.value).toBe('бичих');
    expect(document.querySelector('[data-mongol-skip]')!.textContent).toBe('Кирилл');
    expect(document.querySelector('input')!.getAttribute('placeholder')).toBe('ᠮ');
    restore();
  });

  it('restores the page exactly, including lang', () => {
    const before = document.body.innerHTML;
    const restore = applyMongolScript(convert);
    expect(document.documentElement.getAttribute('lang')).toBe('mn-Mong');
    restore();
    expect(document.body.innerHTML).toBe(before);
    expect(document.documentElement.getAttribute('lang')).toBe('mn');
    expect(document.getElementById('react-mongol-script-style')).toBeNull();
  });

  it('makes main vertical by default, and keeps navigation horizontal', () => {
    const restore = applyMongolScript(convert);
    expect(document.querySelector('main')!.hasAttribute('data-mongol-vertical-on')).toBe(true);
    expect(document.querySelector('nav')!.hasAttribute('data-mongol-vertical-on')).toBe(false);
    restore();
    expect(document.querySelector('main')!.hasAttribute('data-mongol-vertical-on')).toBe(false);
  });

  it('prefers regions the site marks with data-mongol-vertical', () => {
    document.querySelector('nav')!.setAttribute('data-mongol-vertical', '');
    const restore = applyMongolScript(convert);
    expect(document.querySelector('nav')!.hasAttribute('data-mongol-vertical-on')).toBe(true);
    expect(document.querySelector('main')!.hasAttribute('data-mongol-vertical-on')).toBe(false);
    restore();
  });

  it('converts text that appears or changes later, and restores the latest original', async () => {
    const restore = applyMongolScript(convert, { vertical: 'none' });
    const p = document.createElement('p');
    p.textContent = 'Шинэ';
    document.querySelector('main')!.append(p);
    await flush();
    expect(p.textContent).toBe('ᠮ');

    // A framework re-render writes new Cyrillic into a converted node.
    const text = document.querySelector('main p')!.firstChild as Text;
    text.data = 'Өөр үг';
    await flush();
    expect(text.data).toBe('ᠮ ᠮ');

    restore();
    expect(text.data).toBe('Өөр үг');
    expect(p.textContent).toBe('Шинэ');
  });
});
