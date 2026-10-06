// Local review server: the open dictionary, or a site's own dictionary file.
//
//   npm run review                         -> the open dictionary (this repo)
//   npx react-mongol review [file.json]    -> a site's mongol-dictionary.json
//
// Open dictionary: every decision is appended to dictionary/data/reviewed.jsonl,
// one JSON object per line; the last line for a word wins (a skip never
// erases a decision), so a crash never loses earlier work.
// Site dictionary: decisions are written into the JSON file itself.
import { createServer } from 'node:http';
import { appendFile, readFile, rename, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fromScript, toScript } from '@gege-mn/mongol-bichig';
import { draftsFor } from '../drafts-lib.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const FONT_CDN = 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-mongolian/files/noto-sans-mongolian-mongolian-400-normal.woff2';

function localFont() {
  try {
    return join(
      dirname(require.resolve('@fontsource/noto-sans-mongolian/package.json')),
      'files',
      'noto-sans-mongolian-mongolian-400-normal.woff2',
    );
  } catch {
    return null;
  }
}

const STATUSES = new Set(['accepted', 'corrected', 'unsure', 'rejected', 'skipped']);

/**
 * Romanization to script. A space separates a suffix and becomes NNBSP
 * (U+202F); `-` is the MVS connector (handled by toScript). `o:` and `u:` are
 * typing shortcuts for ö and ü.
 */
export function romanToScript(latin) {
  const normalized = latin.trim().toLowerCase().replace(/o:/g, 'ö').replace(/u:/g, 'ü');
  if (!normalized) throw new Error('empty');
  return normalized.split(/\s+/).map((part) => toScript(part)).join('\u202F');
}

const MONGOLIAN = /[\u1800-\u18AF]/;
// Mongolian block, plus NNBSP, ZWJ/ZWNJ and spaces (a space becomes NNBSP).
const SCRIPT_ONLY = /^[\u1800-\u18AF\u202F\u200C\u200D ]+$/;

/** Accept either romanization or pasted traditional script. */
export function inputToScript(input) {
  const text = input.trim();
  if (!MONGOLIAN.test(text)) return romanToScript(text);
  if (!SCRIPT_ONLY.test(text)) throw new Error('mixes traditional script with other characters');
  return text.replace(/ +/g, '\u202F');
}

/** Romanization for display; empty when the script cannot be romanized. */
export function scriptToRoman(script) {
  try {
    return fromScript(script);
  } catch {
    return '';
  }
}

/** The open dictionary in this repository: queue.json + reviewed.jsonl. */
export function openDictionaryStore() {
  const data = join(here, '..', '..', 'data');
  const queue = join(data, 'queue.json');
  // REVIEWED_FILE points a test run at a scratch copy instead of the real data.
  const reviewedFile = process.env.REVIEWED_FILE ?? join(data, 'reviewed.jsonl');

  return {
    labels: { title: 'Толь шалгах', subtitle: 'Dictionary review', uses: 'uses in Wikipedia', reject: 'Not a word' },
    async state() {
      const text = await readFile(reviewedFile, 'utf8').catch(() => '');
      const reviewed = {};
      for (const line of text.split('\n')) {
        if (!line.trim()) continue;
        const entry = JSON.parse(line);
        // A skip is "not now", never a verdict: it must not erase a decision.
        if (entry.status === 'skipped' && reviewed[entry.word] && reviewed[entry.word].status !== 'skipped') continue;
        // Entries saved before `latin` was recorded get it on read.
        reviewed[entry.word] = { ...entry, latin: entry.latin ?? (entry.script ? scriptToRoman(entry.script) : '') };
      }
      return { ...JSON.parse(await readFile(queue, 'utf8')), reviewed };
    },
    async save(entry) {
      await appendFile(reviewedFile, `${JSON.stringify(entry)}\n`, 'utf8');
    },
  };
}

/**
 * A site's dictionary file, as written by `react-mongol extract`:
 * { "words": { "<cyrillic>": { "script", "reviewed", "count", "example", ... } } }
 * Reviewing writes decisions into the file. "Keep Cyrillic" stores the word
 * itself as its script, so the converter leaves it as it is.
 */
export function siteDictionaryStore(file) {
  let drafts = null;
  const load = async () => JSON.parse(await readFile(file, 'utf8'));

  return {
    labels: { title: 'Толь шалгах', subtitle: basename(file), uses: 'uses on your site', reject: 'Keep Cyrillic' },
    async state() {
      const dictionary = await load();
      const entries = Object.entries(dictionary.words ?? {}).sort((a, b) => (b[1].count ?? 0) - (a[1].count ?? 0));
      drafts ??= new Map();
      const words = entries.map(([word, entry], index) => {
        if (!drafts.has(word)) drafts.set(word, draftsFor(word));
        const machine = drafts.get(word);
        // The file's current form is what the site shows today: offer it first.
        const current = entry.script && !machine.some((d) => d.script === entry.script)
          ? [{ script: entry.script, latin: scriptToRoman(entry.script), source: 'in your file', guessed: false }]
          : [];
        return { rank: index + 1, word, count: entry.count ?? 1, example: entry.example ?? '', drafts: [...current, ...machine] };
      });
      const reviewed = {};
      for (const [word, entry] of entries) {
        if (!entry.status) continue;
        reviewed[word] = {
          word,
          script: entry.status === 'rejected' ? '' : entry.script,
          latin: entry.status === 'rejected' ? '' : scriptToRoman(entry.script ?? ''),
          status: entry.status,
          reviewer: entry.reviewer ?? '',
          at: entry.at ?? '',
        };
      }
      const tokens = words.reduce((sum, w) => sum + w.count, 0) || 1;
      return { tokens, words, reviewed };
    },
    async save(decision) {
      if (decision.status === 'skipped') return;
      const dictionary = await load();
      const entry = dictionary.words?.[decision.word];
      if (!entry) throw new Error(`"${decision.word}" is not in ${file}`);
      entry.script = decision.status === 'rejected' ? decision.word : decision.script || entry.script;
      entry.reviewed = decision.status !== 'unsure';
      entry.status = decision.status;
      entry.reviewer = decision.reviewer;
      entry.at = decision.at;
      const temp = `${file}.tmp`;
      await writeFile(temp, `${JSON.stringify(dictionary, null, 2)}\n`, 'utf8');
      await rename(temp, file);
    },
  };
}

const send = (res, status, body, type = 'application/json; charset=utf-8') =>
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' }).end(body);

const json = (res, status, value) => send(res, status, JSON.stringify(value));

async function body(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return JSON.parse(raw || '{}');
}

export function startReviewServer({ store, port = 4747 } = {}) {
  const font = localFont();
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    try {
      if (req.method === 'GET' && url.pathname === '/') {
        return send(res, 200, await readFile(join(here, 'index.html')), 'text/html; charset=utf-8');
      }
      if (req.method === 'GET' && url.pathname === '/font.woff2') {
        if (font) return send(res, 200, await readFile(font), 'font/woff2');
        return res.writeHead(302, { location: FONT_CDN }).end();
      }
      if (req.method === 'GET' && url.pathname === '/api/state') {
        return json(res, 200, { ...(await store.state()), labels: store.labels });
      }
      if (req.method === 'GET' && url.pathname === '/api/script') {
        try {
          const script = inputToScript(url.searchParams.get('latin') ?? '');
          return json(res, 200, { script, latin: scriptToRoman(script) });
        } catch (error) {
          return json(res, 200, { error: error.message });
        }
      }
      if (req.method === 'POST' && url.pathname === '/api/review') {
        const { word, script = '', status, reviewer = '' } = await body(req);
        if (typeof word !== 'string' || !word || !STATUSES.has(status)) {
          return json(res, 400, { error: 'word and a valid status are required' });
        }
        if ((status === 'accepted' || status === 'corrected') && !script) {
          return json(res, 400, { error: 'accepted and corrected entries need a script form' });
        }
        const entry = {
          word,
          script,
          latin: script ? scriptToRoman(script) : '',
          status,
          reviewer: String(reviewer).slice(0, 60),
          at: new Date().toISOString(),
        };
        await store.save(entry);
        return json(res, 200, entry);
      }
      send(res, 404, 'not found', 'text/plain');
    } catch (error) {
      json(res, 500, { error: error.message });
    }
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 4747);
  await startReviewServer({ store: openDictionaryStore(), port });
  console.log(`Dictionary review: http://localhost:${port}`);
}
