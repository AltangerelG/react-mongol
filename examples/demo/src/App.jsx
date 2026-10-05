import { useState } from 'react';
import {
  MVS,
  Mongol,
  MongolText,
  NNBSP,
  splitRuns,
  tateChuYoko,
  useMongolFont,
} from 'react-mongol';

// "Sain baina uu" — hello.
const GREETING = 'ᠰᠠᠶᠢᠨ ᠪᠠᠶᠢᠨ᠎ᠠ ᠤᠤ';

// Mongol bichig, a Latin name, a year, and a genitive suffix joined by NNBSP.
const MIXED = `ᠮᠣᠩᠭᠣᠯ ᠪᠢᠴᠢᠭ React 2026 ᠮᠣᠩᠭᠣᠯ${NNBSP}ᠤᠨ`;

const VARIANTS = [
  { label: 'CSS only', note: 'writing-mode alone: digits lie on their side', render: (t) => t },
  { label: '<MongolText>', note: 'default: digits stand upright', render: (t) => <MongolText>{t}</MongolText> },
  {
    label: 'latin: upright',
    note: 'Latin letters stacked upright too',
    render: (t) => <MongolText orientation={{ latin: 'upright' }}>{t}</MongolText>,
  },
  {
    label: 'tateChuYoko()',
    note: 'short numbers upright, long ones rotated',
    render: (t) => <MongolText orientation={tateChuYoko()}>{t}</MongolText>,
  },
];

const show = (s) =>
  [...s]
    .map((c) => (c === NNBSP ? '⟨NNBSP⟩' : c === MVS ? '⟨MVS⟩' : c === ' ' ? '␠' : c))
    .join('');

function FontStatus() {
  const { available, family, pending } = useMongolFont();
  if (pending) return <p className="status">Checking for a Mongolian font…</p>;
  return available ? (
    <p className="status ok">Mongolian font available: {family}</p>
  ) : (
    <p className="status bad">No Mongolian font found. Text would render as tofu.</p>
  );
}

function Playground() {
  const [text, setText] = useState(MIXED);
  const insert = (ch) => setText((t) => t + ch);
  const runs = splitRuns(text);

  return (
    <div className="playground">
      <div className="editor">
        <label htmlFor="src">Type or paste text</label>
        <textarea id="src" value={text} onChange={(e) => setText(e.target.value)} rows={3} />
        <div className="buttons">
          <button onClick={() => insert(NNBSP)}>+ NNBSP (suffix separator)</button>
          <button onClick={() => insert(MVS)}>+ MVS</button>
          <button onClick={() => setText(MIXED)}>Reset</button>
        </div>
        <h3>splitRuns(text)</h3>
        <table>
          <thead>
            <tr>
              <th>kind</th>
              <th>text</th>
              <th>range</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.start}>
                <td>
                  <span className={`kind ${r.kind}`}>{r.kind}</span>
                </td>
                <td className="mono">{show(r.text)}</td>
                <td className="mono">
                  {r.start}–{r.end}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Mongol className="preview">
        <MongolText>{text}</MongolText>
      </Mongol>
    </div>
  );
}

export function App() {
  return (
    <main>
      <header>
        <Mongol className="hero">{GREETING}</Mongol>
        <div>
          <h1>react-mongol</h1>
          <p>React primitives for traditional Mongolian script.</p>
          <FontStatus />
        </div>
      </header>

      <section>
        <h2>Mixed-script orientation</h2>
        <p>
          The same string four ways. <code>text-orientation</code> applies to a whole element, so
          only per-run wrapping can treat Mongolian, Latin and digits differently.
        </p>
        <div className="variants">
          {VARIANTS.map((v) => (
            <figure key={v.label}>
              <Mongol className="column">{v.render(MIXED)}</Mongol>
              <figcaption>
                <code>{v.label}</code>
                <span>{v.note}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section>
        <h2>Playground</h2>
        <p>
          Watch how <code>splitRuns</code> keeps <code>ᠮᠣᠩᠭᠣᠯ⟨NNBSP⟩ᠤᠨ</code> as one run. A naive{' '}
          <code>\s</code> split would tear the suffix from its stem.
        </p>
        <Playground />
      </section>

      <section>
        <h2>Vertical form fields need no library</h2>
        <p>
          Since Chrome 124, Firefox 120 and Safari 17.4, a native <code>&lt;textarea&gt;</code>{' '}
          with <code>writing-mode: vertical-lr</code> edits vertically with a working caret.
        </p>
        <textarea className="vertical-field" defaultValue={GREETING} />
      </section>
    </main>
  );
}
