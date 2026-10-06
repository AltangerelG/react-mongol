// Browser extension content script: injected into a tab when the toolbar
// button is clicked (activeTab), never before. Runs in the extension's
// isolated world; the background script calls __reactMongolToggle().
import * as khudam from 'khudam';
import { createConverter } from '../convert.js';
import type { WordConverter } from '../convert.js';
import { applyMongolScript } from '../dom.js';
import { REVIEWED } from '../generated/reviewed.js';

/** The bundled font first, so Mongolian renders on devices without one. */
const FONT = "'Mongol Bichig Extension', 'Noto Sans Mongolian', 'Mongolian Baiti', sans-serif";

const convert = createConverter(khudam as WordConverter, [REVIEWED]);
let restore: (() => void) | null = null;

declare global {
  // eslint-disable-next-line no-var
  var __reactMongolToggle: (() => boolean) | undefined;
}

/** Switch this tab; returns whether traditional script is now showing. */
globalThis.__reactMongolToggle = () => {
  if (restore) {
    restore();
    restore = null;
    return false;
  }
  // The whole page turns vertical: header on the left, footer on the right.
  restore = applyMongolScript(convert, { vertical: 'page', fontFamily: FONT });
  return true;
};
