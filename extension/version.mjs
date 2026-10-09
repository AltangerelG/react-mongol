// Give the extension the package's version. Runs from `npm version` (the
// "version" script), so one command bumps both and they share one git tag.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const { version } = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8'));
const path = join(here, 'manifest.json');
const manifest = readFileSync(path, 'utf8');
// Replace only the value, so the file keeps its formatting.
writeFileSync(path, manifest.replace(/("version":\s*)"[^"]*"/, `$1"${version}"`));
console.log(`extension/manifest.json -> ${version}`);
