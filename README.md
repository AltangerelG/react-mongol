# react-mongol

React primitives for traditional Mongolian script (ᠮᠣᠩᠭᠣᠯ ᠪᠢᠴᠢᠭ, *Mongol bichig*):
vertical layout, mixed-script orientation, and Unicode-correct text utilities.

[![CI](https://github.com/AltangerelG/react-mongol/actions/workflows/ci.yml/badge.svg)](https://github.com/AltangerelG/react-mongol/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/react-mongol.svg)](https://www.npmjs.com/package/react-mongol)

```bash
npm install react-mongol
```

Zero runtime dependencies. Ships ESM **and** CJS, so it works in Vite, Next.js
and older Create React App builds alike. React 18 and 19.

## What this is for

Browsers already lay out vertical Mongolian natively — `writing-mode: vertical-lr`
is one CSS line, and you do not need a library for it. This package exists for the
parts CSS does *not* solve:

- **Mixed-script runs.** `text-orientation` is all-or-nothing per element, but a
  Mongolian sentence containing a Latin brand name and a year wants three
  different treatments. `MongolText` segments the string and orients each run.
- **Format controls.** MVS (U+180E), FVS1–4, NIRUGU, and the NNBSP suffix
  separator are invisible and bind to adjacent characters. Split a string in the
  wrong place and the shaping engine renders a different word.
- **Font reality.** Most Android and Linux devices have no Mongolian font, so
  correct text still shows as tofu. `useMongolFont` tells you before you render.

## Quick start

```tsx
import { Mongol, MongolText } from 'react-mongol';

export function Greeting() {
  return (
    <Mongol style={{ height: '20rem' }}>
      <MongolText>ᠮᠣᠩᠭᠣᠯ ᠪᠢᠴᠢᠭ 2026</MongolText>
    </Mongol>
  );
}
```

`Mongol` sets `writing-mode: vertical-lr` and a Mongolian font stack. Because the
block direction is now horizontal, **`height` controls line length** and `width`
controls how many columns fit.

## Why `vertical-lr`

`vertical-rl` is the CJK mode: columns advance right to left. Mongolian advances
**left to right**, so `vertical-lr` is the correct value and `vertical-rl` will
lay your columns out backwards. See the W3C's
[Styling vertical text](https://w3c.github.io/i18n-drafts/articles/vertical-text/index.en).

## API

### `<Mongol>`

Vertical container. Accepts any `div` props, plus:

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `as` | `'div' \| 'section' \| 'aside' \| 'nav' \| …` | `'div'` | Constrained so `ref` stays typed. |
| `fontFamily` | `string \| null` | bundled stack | `null` inherits from your stylesheet. |

Your `style` wins over the defaults, so you can opt out of any of them.

Style this subtree with **logical properties** — `marginInlineStart`,
`paddingBlockEnd`, `inlineSize` — which follow the writing mode. Physical
`marginLeft` does not.

### `<MongolText>`

Text with per-run orientation. `children` must be a string (or number): run
segmentation needs the whole string to keep a stem and its suffix together, and
cannot see inside a nested element to do that.

```tsx
import { MongolText, tateChuYoko } from 'react-mongol';

// Stand Latin acronyms upright instead of rotating them.
<MongolText orientation={{ latin: 'upright' }}>ᠮᠣᠩᠭᠣᠯ HTML</MongolText>

// Short numbers upright, long ones rotated (the CJK tate-chu-yoko rule).
<MongolText orientation={tateChuYoko()}>2026 ᠣᠨ 12 ᠰᠠᠷ᠎ᠠ</MongolText>
```

Defaults: everything is `mixed` except digits, which are `upright`. `mixed`
already rotates Latin and Cyrillic 90° clockwise — the conventional treatment —
so declaring `sideways` for them would render identically while costing an extra
wrapper span. Only runs whose orientation differs from the container get wrapped.

### `useMongolFont()`

```tsx
const { available, family, pending } = useMongolFont();

// Do not warn while `pending`: it is still true on the server and in browsers
// without the CSS Font Loading API.
if (!pending && !available) return <InstallFontNotice />;
```

### `splitRuns(text)`

The segmentation core, usable on its own.

```ts
splitRuns('ᠮᠣᠩᠭᠣᠯ abc 12');
// [ { kind: 'mongolian', text: 'ᠮᠣᠩᠭᠣᠯ', start: 0, end: 6 },
//   { kind: 'space', … }, { kind: 'latin', … }, { kind: 'space', … },
//   { kind: 'digit', … } ]
```

Kinds: `mongolian`, `cyrillic`, `latin`, `digit`, `space`, `punctuation`, `other`.

Two things it gets right that a naive script split does not:

- Mongolian digits (U+1810–1819) are also `\p{Nd}`, so a digit-first classifier
  tears them out of the surrounding word.
- NNBSP (U+202F) matches `\s`, so a naive split yields
  `mongolian` / `space` / `mongolian` and renders a stem and its suffix as two
  independent spans — breaking the join the separator exists to express.

### Unicode helpers

`MVS`, `FVS1`–`FVS4`, `NIRUGU`, `NNBSP`, `ZWJ`, `ZWNJ`,
`isMongolianCodePoint`, `isMongolianCombining`, `isMongolianDigit`,
`isMongolianPunctuation`, `hasMongolian`, and the block ranges.

## Fonts

No font is bundled. The recommended pairing:

```bash
npm install @fontsource/noto-sans-mongolian
```

```ts
import '@fontsource/noto-sans-mongolian';
```

The default stack is `Noto Sans Mongolian`, `Mongolian Baiti` (ships with Windows
Vista and later), then common Inner Mongolian installs. Menksoft faces are
deliberately **excluded**: they encode glyphs in the Private Use Area rather than
at their Unicode code points, so naming them would produce tofu for correct text.
Convert explicitly with [`mongol-code`](https://www.npmjs.com/package/mongol-code)
if you need to target them.

## Cyrillic → traditional script

Out of scope here, and deliberately not bundled — transliteration is a
dictionary-and-grammar problem that deserves its own release cycle. Pair with:

- [`@gege-mn/gege-converter`](https://github.com/gege-mn/gege-converter) — rules
  engine, returns a plain string, actively maintained.
- [`khudam`](https://www.npmjs.com/package/khudam) — 28k-entry lexicon, returns
  ranked candidates.

Note that the two disagree on some spellings (`Монгол` → `ᠮᠣᠩᠭᠤᠯ` vs `ᠮᠣᠩᠭᠣᠯ`);
test against your own vocabulary.

## Browser support

Chrome, Edge and Safari render and edit vertical Unicode Mongolian. Firefox was
the long-standing gap — see
[bug 1361631](https://bugzilla.mozilla.org/show_bug.cgi?id=1361631) on
`text-orientation: upright` for Mongolian — and only recently caught up, so
verify there if you support it. The
[W3C Mongolian Gap Analysis](https://www.w3.org/TR/mong-gap/) catalogues what is
still missing across the platform.

One platform quirk worth knowing: a `<td>` with a vertical writing mode will not
go vertical in some browsers unless its height is set explicitly.

## Roadmap

Not yet implemented, roughly in order of how much they are missed:

- `MongolInput` / `MongolTextArea` — vertical form fields with a usable caret.
- UAX-14 line breaking for Mongolian.
- A provider for font and orientation defaults across a subtree.
- Guidance and escape hatches for component libraries that style with physical
  properties (MUI's `direction` theme option handles RTL only, not writing mode).

Issues and PRs welcome.

## Credits

The design owes a great deal to [suragch/mongol](https://github.com/suragch/mongol),
the Flutter package that worked out what vertical Mongolian text actually needs.

## License

MIT
