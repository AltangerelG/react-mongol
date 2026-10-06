// The heavy half of the <script> tag build: khudam and the reviewed dictionary.
// mongol.global.js loads this file on the first switch to traditional script,
// so pages that never switch never download it.
import * as khudam from 'khudam';
import { REVIEWED } from './generated/reviewed.js';
import type { MongolDictionary, WordConverter } from './convert.js';

declare global {
  interface Window {
    __reactMongolEngine?: { engine: WordConverter; reviewed: MongolDictionary };
  }
}

window.__reactMongolEngine = { engine: khudam as WordConverter, reviewed: REVIEWED };
