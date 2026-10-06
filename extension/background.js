// Switch the current tab between Cyrillic and traditional Mongolian script.
// Toolbar button or Alt+Shift+M: the whole page turns vertical.
// The button's right-click menu or Alt+Shift+R: reader view, a clean vertical
// layout for sites whose own design cannot rotate.
// Uses activeTab: the extension touches a page only after one of these.

const FONT_FAMILY = "'Mongol Bichig Extension', 'Noto Sans Mongolian', 'Mongolian Baiti', sans-serif";

// Inserted with scripting.insertCSS, which a page's Content-Security-Policy
// cannot block (the content script's own <style> can be). The @font-face here
// also serves the reader view's shadow root.
function css() {
  const font = chrome.runtime.getURL('fonts/noto-sans-mongolian.woff2');
  return `
@font-face {
  font-family: 'Mongol Bichig Extension';
  src: url("${font}") format("woff2");
  unicode-range: U+1800-18AF, U+202F;
}
[data-mongol-text] { font-family: ${FONT_FAMILY} !important; }
html[data-mongol-page] { writing-mode: vertical-lr !important; text-orientation: mixed !important; }
html[data-mongol-page] body *:not([data-mongol-skip], [data-mongol-skip] *) { writing-mode: inherit !important; }
[data-mongol-vertical-on] {
  writing-mode: vertical-lr !important;
  text-orientation: mixed !important;
  font-family: ${FONT_FAMILY} !important;
  inline-size: 70vh !important;
  block-size: auto !important;
  max-inline-size: none !important;
  max-block-size: 100% !important;
  overflow-x: auto !important;
  overflow-y: hidden !important;
}`;
}

const TITLES = {
  off: 'Монгол бичгээр харах (show in Mongol bichig)',
  page: 'Кирилл үсгээр харах (back to Cyrillic)',
  reader: 'Уншигчийн горимыг хаах (close reader view)',
};

async function show(tabId, mode) {
  await chrome.action.setBadgeBackgroundColor({ tabId, color: '#1f5fae' });
  await chrome.action.setBadgeText({ tabId, text: mode === 'page' ? 'ON' : mode === 'reader' ? 'R' : '' });
  await chrome.action.setTitle({ tabId, title: TITLES[mode ?? 'off'] });
}

async function toggle(tab, mode = 'page') {
  const target = { tabId: tab.id };
  const [{ result: loaded }] = await chrome.scripting.executeScript({
    target,
    func: () => typeof globalThis.__reactMongolToggle === 'function',
  });
  if (!loaded) await chrome.scripting.executeScript({ target, files: ['content.js'] });
  const style = { target, css: css() };
  await chrome.scripting.insertCSS(style); // before the switch, so the font is ready
  const [{ result: now }] = await chrome.scripting.executeScript({
    target,
    func: (m) => globalThis.__reactMongolToggle(m),
    args: [mode],
  });
  if (!now) await chrome.scripting.removeCSS(style);
  await show(tab.id, now);
}

function run(tab, mode) {
  toggle(tab, mode).catch((error) => {
    // chrome://, the web stores and PDF viewers cannot be scripted.
    console.warn('[Mongol Bichig]', error?.message ?? error);
    chrome.action.setBadgeText({ tabId: tab.id, text: '×' });
    chrome.action.setTitle({ tabId: tab.id, title: 'This page cannot be converted' });
  });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: 'page', title: 'Whole page — Бүх хуудас (Alt+Shift+M)', contexts: ['action'] });
  chrome.contextMenus.create({ id: 'reader', title: 'Reader view — Уншигчийн горим (Alt+Shift+R)', contexts: ['action'] });
});

chrome.action.onClicked.addListener((tab) => run(tab, 'page'));
chrome.contextMenus.onClicked.addListener((info, tab) => run(tab, info.menuItemId));
chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'reader-view' && tab) run(tab, 'reader');
});
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type === 'mongol-closed' && sender.tab) {
    chrome.scripting.removeCSS({ target: { tabId: sender.tab.id }, css: css() }).catch(() => {});
    show(sender.tab.id, null);
  }
});
