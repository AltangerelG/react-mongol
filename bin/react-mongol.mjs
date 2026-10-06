#!/usr/bin/env node
// react-mongol command line.
//
//   npx react-mongol extract [paths...] [-o mongol-dictionary.json]
//     Collect the Cyrillic words in your site's source, convert each one, and
//     write a dictionary file you can correct. Re-running adds new words and
//     never overwrites a reviewed entry.
//
//   npx react-mongol review [mongol-dictionary.json] [--port 4747]
//     Review and correct those words in the browser, one at a time.
//
// Load the file in your site so corrections apply:
//   <MongolToggle dictionary={dictionary} />  or  data-dictionary="/mongol-dictionary.json"
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const EXTENSIONS = new Set(['.html', '.htm', '.js', '.jsx', '.ts', '.tsx', '.mjs', '.vue', '.svelte', '.astro', '.php', '.md', '.mdx', '.json', '.txt', '.yml', '.yaml']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.nuxt', 'out', 'coverage', 'vendor', '.cache']);
const WORD = /[А-ЯЁӨҮа-яёөү]+(?:-[А-ЯЁӨҮа-яёөү]+)*/g;
const DEFAULT_FILE = 'mongol-dictionary.json';

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '-o' || arg === '--out') flags.out = argv[++i];
    else if (arg === '--port') flags.port = Number(argv[++i]);
    else if (arg === '-h' || arg === '--help') flags.help = true;
    else positional.push(arg);
  }
  return { positional, flags };
}

async function* files(path) {
  const info = await stat(path);
  if (info.isFile()) {
    if (EXTENSIONS.has(extname(path).toLowerCase())) yield path;
    return;
  }
  for (const entry of await readdir(path, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) yield* files(join(path, entry.name));
    } else if (EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      yield join(path, entry.name);
    }
  }
}

/** A short, readable line around a word: tags and code noise stripped. */
function exampleLine(line) {
  const text = line.replace(/<[^>]+>/g, ' ').replace(/[{}`"'=;]+/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > 140 ? `${text.slice(0, 137)}…` : text;
}

async function extract(paths, out) {
  const { loadConverter } = await import('../dist/index.js');
  const convert = await loadConverter();
  const counts = new Map();
  const examples = new Map();
  let scanned = 0;

  for (const root of paths.length ? paths : ['.']) {
    for await (const file of files(resolve(root))) {
      if (resolve(file) === resolve(out)) continue;
      scanned++;
      const text = await readFile(file, 'utf8');
      for (const line of text.split('\n')) {
        const words = line.match(WORD);
        if (!words) continue;
        for (const raw of words) {
          const word = raw.toLowerCase();
          counts.set(word, (counts.get(word) ?? 0) + 1);
          if (!examples.has(word)) examples.set(word, exampleLine(line));
        }
      }
    }
  }

  const dictionary = existsSync(out)
    ? JSON.parse(await readFile(out, 'utf8'))
    : {
        about:
          'react-mongol site dictionary. Review with `npx react-mongol review`. Only reviewed entries override the automatic conversion.',
        words: {},
      };
  dictionary.words ??= {};
  let added = 0;
  for (const [word, count] of [...counts].sort((a, b) => b[1] - a[1])) {
    const entry = dictionary.words[word];
    if (entry) {
      entry.count = count;
      entry.example ||= examples.get(word);
      continue;
    }
    dictionary.words[word] = { script: convert(word), reviewed: false, count, example: examples.get(word) };
    added++;
  }
  // Most used first, so the file reads in review order.
  dictionary.words = Object.fromEntries(
    Object.entries(dictionary.words).sort((a, b) => (b[1].count ?? 0) - (a[1].count ?? 0)),
  );
  await writeFile(out, `${JSON.stringify(dictionary, null, 2)}\n`, 'utf8');

  const total = Object.keys(dictionary.words).length;
  const reviewed = Object.values(dictionary.words).filter((e) => e.reviewed).length;
  console.log(`Scanned ${scanned} files: ${counts.size} distinct Cyrillic words, ${added} new.`);
  console.log(`${out}: ${total} words, ${reviewed} reviewed.`);
  console.log('Next: npx react-mongol review' + (out === DEFAULT_FILE ? '' : ` ${out}`));
}

async function review(file, port) {
  if (!existsSync(file)) {
    console.error(`${file} not found. Create it first: npx react-mongol extract ./src`);
    process.exit(1);
  }
  const { startReviewServer, siteDictionaryStore } = await import('../dictionary/tools/review/server.mjs');
  await startReviewServer({ store: siteDictionaryStore(resolve(file)), port });
  console.log(`Reviewing ${file}: http://localhost:${port}  (Ctrl+C to stop)`);
}

const HELP = `react-mongol

  extract [paths...] [-o ${DEFAULT_FILE}]   collect and convert your site's Cyrillic words
  review  [${DEFAULT_FILE}] [--port 4747]   correct them in the browser
`;

const [command, ...rest] = process.argv.slice(2);
const { positional, flags } = parseArgs(rest);
if (command === 'extract') await extract(positional, flags.out ?? DEFAULT_FILE);
else if (command === 'review') await review(positional[0] ?? DEFAULT_FILE, flags.port ?? 4747);
else {
  console.log(HELP);
  process.exit(command && command !== 'help' && !flags.help ? 1 : 0);
}
