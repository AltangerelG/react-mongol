# react-mongol

Show any Cyrillic Mongolian website in traditional script (ᠮᠣᠩᠭᠣᠯ ᠪᠢᠴᠢᠭ,
*Mongol bichig*) with one toggle, plus React primitives for vertical layout,
mixed-script orientation and Unicode-correct text.

[![CI](https://github.com/AltangerelG/react-mongol/actions/workflows/ci.yml/badge.svg)](https://github.com/AltangerelG/react-mongol/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/react-mongol.svg)](https://www.npmjs.com/package/react-mongol)

```bash
npm install react-mongol
```

Ships ESM **and** CJS, so it works in Vite, Next.js and older Create React App
builds alike. React 18 and 19. Not using React? See [Any website](#any-website-one-script-tag).

## Cyrillic ↔ traditional script toggle

```tsx
import { MongolToggle } from 'react-mongol';

<MongolToggle />   // a ᠮᠣᠩᠭᠣᠯ / Кирилл button for the whole page
```

Pressing it converts every Cyrillic word on the page to traditional script and
turns the reading area vertical; pressing again restores the page exactly. The
converter (about 340 KB gzipped) loads on the first press, so pages that never
switch never download it. The reader's choice is remembered.

- **What turns vertical:** elements marked `data-mongol-vertical`, or else the
  page's `main` / `article`. Menus stay horizontal so the site keeps working.
  `vertical="page"` makes the whole body vertical; `vertical="none"` only
  converts the script.
- **What is never touched:** code, `pre`, form field values, `translate="no"`,
  and anything marked `data-mongol-skip`. Placeholders, titles and
  `aria-label`s are converted.
- **Text that changes later** (re-renders, loaded content) is converted as it
  appears.
- `useMongolScript()` gives you `{ enabled, loading, toggle }` for your own
  button; `applyMongolScript(convert, options)` does the same without React.

**Conversion is automatic and some words will be wrong.** Each site corrects
its own words with a dictionary file, below, and human-reviewed words from the
[open dictionary](dictionary/README.md) ship with the package.

### Any website: one script tag

WordPress, PHP, plain HTML:

```html
<script src="https://cdn.jsdelivr.net/npm/react-mongol/dist/mongol.global.js" defer></script>
```

A floating ᠮᠣᠩᠭᠣᠯ button appears (2.9 KB until it is pressed). Options, as
attributes on the tag: `data-dictionary="/mongol-dictionary.json"`,
`data-vertical="auto|page|none"`, `data-button="bottom-right|bottom-left|top-right|top-left|none"`,
`data-root="#content"`. Script control: `window.ReactMongol.toggle()`.

### Browser extension

For readers rather than site owners: [`extension/`](extension/README.md) puts the
same toggle on any Mongolian site, with a Mongolian font bundled. Chrome, Edge
and Firefox.

### Your site's dictionary

```bash
npx react-mongol extract ./src     # collect and convert every Cyrillic word → mongol-dictionary.json
npx react-mongol review            # correct them in the browser, one word at a time
```

`extract` scans your source (HTML, JSX/TSX, Vue, Svelte, PHP, Markdown, JSON)
and writes each word with its automatic conversion, most used first. Re-run it
as your site grows: it adds new words and never overwrites a reviewed one.
`review` opens a page with the word in context, machine drafts in vertical
script, an on-screen script keyboard and a progress bar; your decisions are
saved into the file. "Keep Cyrillic" leaves a word as it is (brand names,
foreign words). Only reviewed entries are used:

```tsx
import dictionary from './mongol-dictionary.json';
<MongolToggle dictionary={dictionary} />
```

or `data-dictionary="/mongol-dictionary.json"` on the script tag. A plain
`{ "word": "ᠮᠣᠩᠭᠣᠯ" }` map works too. To convert strings yourself:
`await convertCyrillic('Сайн байна уу')`, or `loadConverter()` once for many.

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

A runnable demo of every feature lives in [`examples/demo`](examples/demo)
(`npm run build` at the root, then `npm install && npm run dev` there).

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

`available` means Mongolian letters draw as glyphs, not tofu. `family` is the
first font from the list that is present, or `null` when the browser renders
through a fallback of its own choosing (including Mongolian Baiti on Windows,
which is both installed and the system fallback, so measurement cannot tell
them apart).

Detection measures text on a canvas. `document.fonts.check` is not used: it
answers `true` for any family name it has never seen, so it would report a
font on every device. The measuring logic is exported as
`detectMongolFont(families, measure)` for use outside React.

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

Noto Sans Mongolian's Latin and digit glyphs have no vertical advance: set
upright, they all land on one spot. `MongolText` therefore draws upright Latin,
Cyrillic and digit runs from a separate family, `sans-serif` by default. Set the
`--mongol-upright-font` custom property to choose it:

```css
.my-vertical-text { --mongol-upright-font: 'Inter', sans-serif; }
```

If you set `text-orientation: upright` yourself, outside `MongolText`, give that
text a font other than Noto Sans Mongolian for the same reason.

The default stack is `Noto Sans Mongolian`, `Mongolian Baiti` (ships with Windows
Vista and later), then common Inner Mongolian installs. Menksoft faces are
deliberately **excluded**: they encode glyphs in the Private Use Area rather than
at their Unicode code points, so naming them would produce tofu for correct text.
Convert explicitly with [`mongol-code`](https://www.npmjs.com/package/mongol-code)
if you need to target them.

## How conversion works

1. Your site's dictionary (reviewed entries only).
2. The bundled open dictionary: human-reviewed words, CC BY-SA 4.0.
3. [`khudam`](https://github.com/bigune/khudam): a 28k-word lexicon (CC BY-SA 4.0)
   with suffix rules, falling back to letter-by-letter rules.

Suffix boundaries are written with NNBSP (U+202F) as Unicode specifies, and
`,` `.` `:` after a word become ᠂ ᠃ ᠄. Automatic conversion is a draft; that is
what the dictionaries are for.

## Browser support

Chrome, Edge and Safari render and edit vertical Unicode Mongolian. Firefox was
the long-standing gap — see
[bug 1361631](https://bugzilla.mozilla.org/show_bug.cgi?id=1361631) on
`text-orientation: upright` for Mongolian — and only recently caught up, so
verify there if you support it. The
[W3C Mongolian Gap Analysis](https://www.w3.org/TR/mong-gap/) catalogues what is
still missing across the platform.

Vertical form fields need no component: `<input>` and `<textarea>` accept
`writing-mode: vertical-lr` natively, caret included, since Chrome 124,
Firefox 120 and Safari 17.4.

One platform quirk worth knowing: a `<td>` with a vertical writing mode will not
go vertical in some browsers unless its height is set explicitly.

## Roadmap

Not yet implemented, roughly in order of how much they are missed:

- A browser-level layout test. Unit tests run in jsdom, which does no text
  layout, so a font that collapses upright runs (see Fonts) would pass them.
- UAX-14 line breaking for Mongolian.
- A provider for font and orientation defaults across a subtree.
- Guidance and escape hatches for component libraries that style with physical
  properties (MUI's `direction` theme option handles RTL only, not writing mode).

Issues and PRs welcome.

## Credits

The design owes a great deal to [suragch/mongol](https://github.com/suragch/mongol),
the Flutter package that worked out what vertical Mongolian text actually needs.

## License

Code: MIT. The bundled dictionary data (the open dictionary and khudam's
lexicon) is CC BY-SA 4.0; see [dictionary/NOTICE](dictionary/NOTICE). Using
the package on your site is fine under both; if you redistribute modified
dictionary data, it stays CC BY-SA.
