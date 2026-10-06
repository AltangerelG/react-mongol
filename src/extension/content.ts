// Browser extension content script: injected into a tab when the user clicks
// the toolbar button, its menu, or a shortcut (activeTab), never before. Runs
// in the extension's isolated world; the background script calls
// __reactMongolToggle(mode).
import * as khudam from 'khudam';
import { createConverter } from '../convert.js';
import type { WordConverter } from '../convert.js';
import { applyMongolScript } from '../dom.js';
import { REVIEWED } from '../generated/reviewed.js';
import { openReader } from './reader.js';

/** The bundled font first, so Mongolian renders on devices without one. */
const FONT = "'Mongol Bichig Extension', 'Noto Sans Mongolian', 'Mongolian Baiti', sans-serif";

export type Mode = 'page' | 'reader';

const convert = createConverter(khudam as WordConverter, [REVIEWED]);
let active: { mode: Mode; close: () => void } | null = null;

declare const chrome: { runtime: { sendMessage: (message: unknown) => Promise<unknown> } };

declare global {
  // eslint-disable-next-line no-var
  var __reactMongolToggle: ((mode?: Mode) => Mode | null) | undefined;
}

/**
 * Switch this tab. The same mode again turns it off; the other mode switches
 * over. Returns the mode now showing, or null for the original page.
 */
globalThis.__reactMongolToggle = (mode: Mode = 'page') => {
  const previous = active;
  if (previous) {
    active = null;
    previous.close();
    if (previous.mode === mode) return null;
  }
  if (mode === 'reader') {
    const close = openReader(convert, document, () => {
      // Closed from inside the reader (✕ or Esc): tell the toolbar badge.
      if (active?.mode !== 'reader') return;
      active = null;
      chrome.runtime.sendMessage({ type: 'mongol-closed' }).catch(() => {});
    });
    active = { mode, close };
  } else {
    // The whole page turns vertical: header on the left, footer on the right.
    active = { mode, close: applyMongolScript(convert, { vertical: 'page', fontFamily: FONT }) };
  }
  return mode;
};
