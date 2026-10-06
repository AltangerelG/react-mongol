// The <script> tag build: any site, no React, no bundler.
//
//   <script src="https://cdn.jsdelivr.net/npm/react-mongol/dist/mongol.global.js" defer></script>
//
// Adds a floating ᠮᠣᠩᠭᠣᠯ / Кирилл button. Configure with data- attributes on
// the script tag:
//   data-vertical="auto|page|none"   where text turns vertical (default auto)
//   data-dictionary="/mongol-dictionary.json"   the site's corrections
//   data-button="bottom-right|bottom-left|top-right|top-left|none"
//   data-root="#content"             convert only this element
// Or drive it yourself: window.ReactMongol.enable() / disable() / toggle().
import { createConverter, normalizeDictionary } from './convert.js';
import type { CyrillicConverter, MongolDictionary, MongolDictionaryFile } from './convert.js';
import { applyMongolScript } from './dom.js';
import type { VerticalMode } from './dom.js';

const STORAGE_KEY = 'react-mongol:script';
const SCRIPT_LABEL = 'ᠮᠣᠩᠭᠣᠯ';

const script = document.currentScript as HTMLScriptElement | null;
const config = script?.dataset ?? {};
// The converter lives next to this file and loads on the first switch.
const ENGINE_URL = new URL('mongol-converter.global.js', script?.src ?? location.href).href;

let engine: Promise<void> | null = null;
function loadEngine(): Promise<void> {
  engine ??= new Promise<void>((resolve, reject) => {
    if (window.__reactMongolEngine) return resolve();
    const tag = document.createElement('script');
    tag.src = ENGINE_URL;
    tag.onload = () => resolve();
    tag.onerror = () => {
      engine = null;
      reject(new Error(`Could not load ${ENGINE_URL}`));
    };
    document.head.appendChild(tag);
  });
  return engine;
}

async function converter(): Promise<CyrillicConverter> {
  const [dictionary] = await Promise.all([siteDictionary(), loadEngine()]);
  const { engine: words, reviewed } = window.__reactMongolEngine!;
  return createConverter(words, dictionary ? [normalizeDictionary(dictionary), reviewed] : [reviewed]);
}

let restore: (() => void) | null = null;
let busy = false;
let button: HTMLButtonElement | null = null;

async function siteDictionary(): Promise<MongolDictionary | MongolDictionaryFile | undefined> {
  if (!config['dictionary']) return undefined;
  try {
    const response = await fetch(config['dictionary']);
    return response.ok ? ((await response.json()) as MongolDictionary | MongolDictionaryFile) : undefined;
  } catch {
    return undefined;
  }
}

function remember(on: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
  } catch {
    // Private mode: the switch still works for this visit.
  }
}

async function enable(): Promise<void> {
  if (restore || busy) return;
  busy = true;
  render();
  try {
    const convert = await converter();
    const root = config['root'] ? document.querySelector(config['root']) : null;
    restore = applyMongolScript(convert, {
      ...(root ? { root } : {}),
      vertical: (config['vertical'] as VerticalMode | undefined) ?? 'auto',
    });
    remember(true);
  } catch (error) {
    console.error('[react-mongol]', error);
  } finally {
    busy = false;
    render();
  }
}

function disable(): void {
  restore?.();
  restore = null;
  remember(false);
  render();
}

const toggle = (): Promise<void> | void => (restore ? disable() : enable());

function render(): void {
  if (!button) return;
  button.textContent = restore ? 'Кирилл' : SCRIPT_LABEL;
  button.setAttribute('aria-pressed', String(Boolean(restore)));
  button.setAttribute('aria-busy', String(busy));
  button.title = restore ? 'Кирилл үсгээр харах' : 'Монгол бичгээр харах';
}

function mountButton(): void {
  const position = config['button'] ?? 'bottom-right';
  if (position === 'none') return;
  const [y, x] = position.split('-');
  button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('data-mongol-skip', '');
  button.style.cssText = [
    'position:fixed',
    `${y === 'top' ? 'top' : 'bottom'}:16px`,
    `${x === 'left' ? 'left' : 'right'}:16px`,
    'z-index:2147483647',
    'min-height:44px',
    'min-width:44px',
    'padding:8px 14px',
    'border-radius:999px',
    'border:1px solid rgba(0,0,0,.15)',
    'background:#1f5fae',
    'color:#fff',
    "font:600 16px/1.2 'Noto Sans Mongolian','Mongolian Baiti',system-ui,sans-serif",
    'box-shadow:0 2px 10px rgba(0,0,0,.2)',
    'cursor:pointer',
  ].join(';');
  button.addEventListener('click', () => void toggle());
  document.body.appendChild(button);
  render();
}

function start(): void {
  mountButton();
  let remembered = false;
  try {
    remembered = localStorage.getItem(STORAGE_KEY) === 'on';
  } catch {
    // Storage blocked: start in Cyrillic.
  }
  if (remembered) void enable();
}

declare global {
  interface Window {
    ReactMongol?: { enable: () => Promise<void>; disable: () => void; toggle: () => Promise<void> | void };
  }
}
window.ReactMongol = { enable, disable, toggle };

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
