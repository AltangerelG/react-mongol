// Turn a frequency list into the review queue: every word with machine drafts.
//
//   node dictionary/tools/drafts.mjs <freq.json> dictionary/data/queue.json
//
// Drafts come from khudam (lexicon CC BY-SA 4.0). They are suggestions for a
// human reviewer, never dictionary entries on their own.
import { readFileSync, writeFileSync } from 'node:fs';
import { draftsFor } from './drafts-lib.mjs';

const [input, output] = process.argv.slice(2);
const freq = JSON.parse(readFileSync(input, 'utf8'));

const words = freq.words.map(({ word, count, example }, index) => ({
  rank: index + 1,
  word,
  count,
  example,
  drafts: draftsFor(word),
}));

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
