// Machine drafts for one Cyrillic word form: suggestions for a reviewer, never
// dictionary entries on their own. Shared by the open dictionary's queue
// (drafts.mjs) and a project's review (`react-mongol review`).
import { convertText, decomposeWord, transliterateFallback } from 'khudam';
import { fromScript } from '@gege-mn/mongol-bichig';

// A word form is one unit: a space inside a draft is a suffix boundary, which
// Unicode writes as NNBSP (U+202F), not a space. khudam emits a plain space.
const asWord = (script) => script.trim().replace(/ +/g, ' ');

export function romanize(script) {
  try {
    return fromScript(script);
  } catch {
    return '';
  }
}

function safe(fn) {
  try {
    return fn() ?? [];
  } catch {
    return [];
  }
}

/** Distinct drafts, best first: lexicon hits, stem + suffix analyses, letter rules. */
export function draftsFor(word) {
  const seen = new Set();
  const drafts = [];
  const add = (traditional, source, guessed) => {
    const script = asWord(traditional ?? '');
    if (!script || seen.has(script)) return;
    seen.add(script);
    drafts.push({ script, latin: romanize(script), source, guessed });
  };

  const tokens = convertText(word).filter((t) => t.candidates.length);
  const token = tokens.length === 1 ? tokens[0] : null;
  if (token && !token.fallback) for (const c of token.candidates) add(c.traditional, c.source, false);
  for (const c of safe(() => decomposeWord(word))) add(c.traditional, c.source ?? 'suffix-rule', false);
  add(safe(() => transliterateFallback(word)), 'letter-rules', true);
  return drafts;
}
