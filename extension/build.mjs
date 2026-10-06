// Build the browser extension: bundle the content script, copy the static
// files into extension/build/, and zip it for the Chrome, Edge and Firefox stores.
//
//   npm run extension
import { build } from 'tsup';
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateRawSync } from 'node:zlib';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, 'build');
const version = JSON.parse(readFileSync(join(here, 'manifest.json'), 'utf8')).version;

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

await build({
  entry: { content: join(here, '..', 'src', 'extension', 'content.ts') },
  format: ['iife'],
  outDir: out,
  outExtension: () => ({ js: '.js' }),
  minify: true,
  target: 'es2020',
  noExternal: [/.*/],
  clean: false,
  silent: true,
  config: false,
});

for (const file of ['manifest.json', 'background.js', 'icons', 'fonts']) {
  cpSync(join(here, file), join(out, file), { recursive: true });
}
rmSync(join(out, 'icons', '512.png'), { force: true }); // store artwork, not part of the package

// A minimal zip writer (deflate), so packaging needs no extra dependency.
function zip(directory) {
  const files = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else files.push(path);
    }
  };
  walk(directory);

  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const path of files) {
    const name = Buffer.from(relative(directory, path).split('\\').join('/'));
    const data = readFileSync(path);
    const packed = deflateRawSync(data, { level: 9 });
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt32LE(0, 10); // time/date
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    locals.push(local, name, packed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(packed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);
    offset += 30 + name.length + packed.length;
  }
  const centralSize = centrals.reduce((sum, b) => sum + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}

// Chrome and Edge: manifest.json as written (a service worker).
const archive = join(here, `mongol-bichig-extension-${version}.zip`);
writeFileSync(archive, zip(out));

// Firefox runs MV3 background code as an event page (background.scripts),
// which Chrome rejects, and needs an add-on id: a separate package.
const firefox = join(here, 'build-firefox');
rmSync(firefox, { recursive: true, force: true });
cpSync(out, firefox, { recursive: true });
const manifest = JSON.parse(readFileSync(join(out, 'manifest.json'), 'utf8'));
manifest.background = { scripts: ['background.js'] };
manifest.browser_specific_settings = {
  gecko: {
    id: 'mongol-bichig@react-mongol',
    // Required for new add-ons: this extension collects no data at all.
    // Supported from Firefox 140.
    data_collection_permissions: { required: ['none'] },
    strict_min_version: '140.0',
  },
};
writeFileSync(join(firefox, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
const firefoxArchive = join(here, `mongol-bichig-extension-${version}-firefox.zip`);
writeFileSync(firefoxArchive, zip(firefox));

for (const file of [archive, firefoxArchive]) {
  console.log(`${relative(join(here, '..'), file)} (${(statSync(file).size / 1024).toFixed(0)} KB)`);
}
