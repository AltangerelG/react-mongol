// Local review server for the open dictionary.
//
//   npm run review            -> http://localhost:4747
//
// Serves the review page and appends every decision to
// dictionary/data/reviewed.jsonl, one JSON object per line. The file is
// append-only: the last line for a word wins, so a crash never loses earlier
// work and git diffs stay readable.
import { createServer } from 'node:http';
import { appendFile, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toScript } from '@gege-mn/mongol-bichig';

const here = dirname(fileURLToPath(import.meta.url));
const data = join(here, '..', '..', 'data');
const QUEUE = join(data, 'queue.json');
const REVIEWED = join(data, 'reviewed.jsonl');
const require = createRequire(import.meta.url);
const FONT = join(
  dirname(require.resolve('@fontsource/noto-sans-mongolian/package.json')),
  'files',
  'noto-sans-mongolian-mongolian-400-normal.woff2',
);
const PORT = Number(process.env.PORT ?? 4747);

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

async function readReviewed() {
  const text = await readFile(REVIEWED, 'utf8').catch(() => '');
  const latest = {};
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const entry = JSON.parse(line);
    latest[entry.word] = entry;
  }
  return latest;
}

const send = (res, status, body, type = 'application/json; charset=utf-8') =>
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' }).end(body);

const json = (res, status, value) => send(res, status, JSON.stringify(value));

async function body(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return JSON.parse(raw || '{}');
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (req.method === 'GET' && url.pathname === '/') {
      return send(res, 200, await readFile(join(here, 'index.html')), 'text/html; charset=utf-8');
    }
    if (req.method === 'GET' && url.pathname === '/font.woff2') {
      return send(res, 200, await readFile(FONT), 'font/woff2');
    }
    if (req.method === 'GET' && url.pathname === '/api/state') {
      const queue = JSON.parse(await readFile(QUEUE, 'utf8'));
      return json(res, 200, { ...queue, reviewed: await readReviewed() });
    }
    if (req.method === 'GET' && url.pathname === '/api/script') {
      try {
        return json(res, 200, { script: romanToScript(url.searchParams.get('latin') ?? '') });
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
      const entry = { word, script, status, reviewer: String(reviewer).slice(0, 60), at: new Date().toISOString() };
      await appendFile(REVIEWED, `${JSON.stringify(entry)}\n`, 'utf8');
      return json(res, 200, entry);
    }
    send(res, 404, 'not found', 'text/plain');
  } catch (error) {
    json(res, 500, { error: error.message });
  }
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(PORT, '127.0.0.1', () => console.log(`Dictionary review: http://localhost:${PORT}`));
}
