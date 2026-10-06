// Toolbar button: switch the current tab between Cyrillic and traditional
// Mongolian script. Uses activeTab, so the extension can touch a page only
// after the user clicks the button on it.

const FONT_FAMILY = "'Mongol Bichig Extension', 'Noto Sans Mongolian', 'Mongolian Baiti', sans-serif";

// Inserted with scripting.insertCSS, which a page's Content-Security-Policy
// cannot block (the content script's own <style> can be).
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

async function toggle(tab) {
  const target = { tabId: tab.id };
  const [{ result: loaded }] = await chrome.scripting.executeScript({
    target,
    func: () => typeof globalThis.__reactMongolToggle === 'function',
  });
  if (!loaded) await chrome.scripting.executeScript({ target, files: ['content.js'] });
  const [{ result: on }] = await chrome.scripting.executeScript({
    target,
    func: () => globalThis.__reactMongolToggle(),
  });

  const style = { target, css: css() };
  if (on) await chrome.scripting.insertCSS(style);
  else await chrome.scripting.removeCSS(style);

  await chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: '#1f5fae' });
  await chrome.action.setBadgeText({ tabId: tab.id, text: on ? 'ON' : '' });
  await chrome.action.setTitle({
    tabId: tab.id,
    title: on ? 'Кирилл үсгээр харах (back to Cyrillic)' : 'Монгол бичгээр харах (show in Mongol bichig)',
  });
}

chrome.action.onClicked.addListener((tab) => {
  toggle(tab).catch((error) => {
    // chrome://, the Web Store and PDF viewers cannot be scripted.
    console.warn('[Mongol Bichig]', error?.message ?? error);
    chrome.action.setBadgeText({ tabId: tab.id, text: '×' });
    chrome.action.setTitle({ tabId: tab.id, title: 'This page cannot be converted' });
  });
});
