import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Mongol } from '../src/Mongol.js';
import { MongolText } from '../src/MongolText.js';
import { NNBSP } from '../src/unicode.js';

const MONGOL = 'ᠮᠣᠩᠭᠣᠯ';
const SUFFIX_UN = 'ᠤᠨ';

describe('Mongol', () => {
  it('sets vertical-lr, the Mongolian mode', () => {
    const { container } = render(<Mongol>x</Mongol>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.writingMode).toBe('vertical-lr');
  });

  it('resets text-orientation so a CJK ancestor cannot leak upright in', () => {
    const { container } = render(<Mongol>x</Mongol>);
    expect((container.firstElementChild as HTMLElement).style.textOrientation).toBe(
      'mixed',
    );
  });

  it('applies the default font stack, and omits it when given null', () => {
    const { container: withFont } = render(<Mongol>x</Mongol>);
    expect((withFont.firstElementChild as HTMLElement).style.fontFamily).toContain(
      'Noto Sans Mongolian',
    );

    const { container: without } = render(<Mongol fontFamily={null}>x</Mongol>);
    expect((without.firstElementChild as HTMLElement).style.fontFamily).toBe('');
  });

  it('renders the requested tag and forwards unknown props', () => {
    const { container } = render(
      <Mongol as="aside" id="side" aria-label="nav">
        x
      </Mongol>,
    );
    const el = container.firstElementChild!;
    expect(el.tagName).toBe('ASIDE');
    expect(el.id).toBe('side');
    expect(el.getAttribute('aria-label')).toBe('nav');
  });

  it('lets caller style win over the defaults', () => {
    const { container } = render(
      <Mongol style={{ writingMode: 'horizontal-tb' }}>x</Mongol>,
    );
    expect((container.firstElementChild as HTMLElement).style.writingMode).toBe(
      'horizontal-tb',
    );
  });
});

describe('MongolText', () => {
  it('renders the text unchanged, preserving the separator', () => {
    const word = MONGOL + NNBSP + SUFFIX_UN;
    const { container } = render(<MongolText>{word}</MongolText>);
    expect(container.textContent).toBe(word);
  });

  it('emits no wrapper span when every run is mixed', () => {
    const { container } = render(<MongolText>{MONGOL + ' abc'}</MongolText>);
    const outer = container.firstElementChild!;
    expect(outer.querySelectorAll('span')).toHaveLength(0);
  });

  it('wraps only the runs that need a different orientation', () => {
    const { container } = render(
      <MongolText>{MONGOL + ' abc 12'}</MongolText>,
    );
    const inner = container.firstElementChild!.querySelectorAll('span');
    expect(inner).toHaveLength(1);
    expect(inner[0]!.textContent).toBe('12');
    expect((inner[0] as HTMLElement).style.textOrientation).toBe('upright');
  });

  it('round-trips arbitrary mixed text through segmentation', () => {
    const source = `${MONGOL} abc 2026 Мон!`;
    const { container } = render(<MongolText>{source}</MongolText>);
    expect(container.textContent).toBe(source);
  });

  it('renders nothing for null or undefined children', () => {
    const { container } = render(<MongolText>{null}</MongolText>);
    expect(container.textContent).toBe('');
  });

  it('coerces a number child', () => {
    const { container } = render(<MongolText>{2026}</MongolText>);
    expect(container.textContent).toBe('2026');
  });
});
