// Turn a frequency list into the review queue: every word with machine drafts.
//
//   node dictionary/tools/drafts.mjs <freq.json> dictionary/data/queue.json
//
// Drafts come from khudam (lexicon CC BY-SA 4.0). They are suggestions for a
// human reviewer, never dictionary entries on their own.
import { readFileSync, writeFileSync } from 'node:fs';
import { convertText, decomposeWord, transliterateFallback } from 'khudam';
import { fromScript } from '@gege-mn/mongol-bichig';

const [input, output] = process.argv.slice(2);
const freq = JSON.parse(readFileSync(input, 'utf8'));

// A word form is one unit: a space inside a draft is a suffix boundary, which
// Unicode writes as NNBSP (U+202F), not a space. khudam emits a plain space.
const asWord = (script) => script.trim().replace(/ +/g, ' ');

const romanize = (script) => {
  try {
    return fromScript(script);
  } catch {
    return '';
  }
};

const words = freq.words.map(({ word, count, example }, index) => {
  const seen = new Set();
  const drafts = [];
  const add = (traditional, source, guessed) => {
    const script = asWord(traditional ?? '');
    if (!script || seen.has(script)) return;
    seen.add(script);
    drafts.push({ script, latin: romanize(script), source, guessed });
  };

  // 1. Whole-word lexicon hits (khudam dictionary, Wiktionary).
  const tokens = convertText(word).filter((t) => t.candidates.length);
  const token = tokens.length === 1 ? tokens[0] : null;
  if (token && !token.fallback) for (const c of token.candidates) add(c.traditional, c.source, false);
  // 2. Stem + suffix analyses: every way the word splits into a known stem and suffix.
  for (const c of safe(() => decomposeWord(word))) add(c.traditional, c.source ?? 'suffix-rule', false);
  // 3. Letter-by-letter rules, last: right for regular words, a starting point for the rest.
  add(safe(() => transliterateFallback(word)), 'letter-rules', true);

  return { rank: index + 1, word, count, example, drafts };
});

function safe(fn) {
  try {
    return fn() ?? [];
  } catch {
    return [];
  }
}

writeFileSync(
  output,
  JSON.stringify(
    {
      source: freq.source,
      drafts: 'khudam (github.com/bigune/khudam), lexicon CC BY-SA 4.0',
      tokens: freq.tokens,
      words,
    },
    null,
    0,
  ).replace(/\},\{"rank"/g, '},\n{"rank"'),
);

const guessed = words.filter((w) => w.drafts[0]?.guessed).length;
const none = words.filter((w) => !w.drafts.length).length;
const several = words.filter((w) => w.drafts.length > 1).length;
console.log(
  `${words.length} words: ${several} with several drafts, ${guessed} with only a letter-by-letter guess, ${none} with no draft`,
);
