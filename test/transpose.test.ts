import { transposeBlock, transposeCondition, transposeDeclaration } from '../src/transpose.js';

describe('transposeDeclaration', () => {
  const t = (name: string, value: string) => transposeDeclaration(name, value).join(': ');

  it('swaps the two axes of sizes, positions and overflow', () => {
    expect(t('height', '190px')).toBe('width: 190px');
    expect(t('min-width', '0')).toBe('min-height: 0');
    expect(t('top', '0')).toBe('left: 0');
    expect(t('right', '12px')).toBe('bottom: 12px');
    expect(t('overflow-x', 'hidden')).toBe('overflow-y: hidden');
    expect(t('overflow', 'hidden auto')).toBe('overflow: auto hidden');
  });

  it('turns four sides top-right-bottom-left into left-bottom-right-top', () => {
    expect(t('margin', '1px 2px 3px 4px')).toBe('margin: 4px 3px 2px 1px');
    expect(t('padding', '8px 16px')).toBe('padding: 16px 8px 16px 8px');
    expect(t('inset', '0')).toBe('inset: 0');
    expect(t('border-radius', '1px 2px 3px 4px')).toBe('border-radius: 1px 4px 3px 2px');
  });

  it('swaps viewport units', () => {
    expect(t('min-height', '100dvh')).toBe('min-width: 100dvw');
    expect(t('width', 'calc(100vw - 2rem)')).toBe('height: calc(100vh - 2rem)');
  });

  it('moves along the other axis', () => {
    expect(t('transform', 'translateX(-100%)')).toBe('transform: translateY(-100%)');
    expect(t('transform', 'translate3d(-50px, 0px, 0px)')).toBe('transform: translate3d(0px, -50px, 0px)');
    expect(t('transform', 'translate(var(--x), var(--y)) scaleX(2)')).toBe('transform: translate(var(--y), var(--x)) scaleY(2)');
    expect(t('translate', 'var(--tw-translate-x) var(--tw-translate-y)')).toBe('translate: var(--tw-translate-y) var(--tw-translate-x)');
    expect(t('transform', 'matrix(1, 0, 0, 1, 30, 0)')).toBe('transform: matrix(1, 0, 0, 1, 0, 30)');
  });

  it('turns gradients and positions', () => {
    expect(t('background-image', 'linear-gradient(to right, red, blue)')).toBe('background-image: linear-gradient(to bottom, red, blue)');
    expect(t('background-image', 'linear-gradient(90deg, red, blue)')).toBe('background-image: linear-gradient(180deg, red, blue)');
    expect(t('background-image', 'linear-gradient(red, blue)')).toBe('background-image: linear-gradient(to right, red, blue)');
    expect(t('--tw-gradient-position', 'to right in oklab')).toBe('--tw-gradient-position: to bottom in oklab');
    expect(t('background-position', 'right top')).toBe('background-position: left bottom');
  });
});

describe('transposeCondition', () => {
  it('asks about the other side of the screen', () => {
    expect(transposeCondition('(min-width: 64rem)')).toBe('(min-height: 64rem)');
    expect(transposeCondition('only screen and (max-width:767px)')).toBe('only screen and (max-height:767px)');
    expect(transposeCondition('(orientation: landscape)')).toBe('(orientation: portrait)');
  });
});

describe('transposeBlock', () => {
  it('keeps !important and makes relative urls absolute', () => {
    expect(transposeBlock('width: 10px !important; background: url(img/a.png)', 'https://example.mn/css/x.css')).toBe(
      'height: 10px !important; background: url(https://example.mn/css/img/a.png);',
    );
  });
});
