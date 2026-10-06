# Mongol Bichig browser extension

Read any Cyrillic Mongolian web page in traditional Mongolian script
(ᠮᠣᠩᠭᠣᠯ ᠪᠢᠴᠢᠭ), top to bottom, the way Mongol bichig is laid out.

| Do | Get |
| --- | --- |
| Click the toolbar button, or `Alt+Shift+M` | **Whole page**: every word and number converts, the whole page turns vertical (header on the left, footer on the right), the mouse wheel scrolls sideways. Click again: the page is back exactly as it was. |
| Right-click the button → *Reader view*, or `Alt+Shift+R` | **Reader view**: the page rebuilt as a clean vertical layout (site name and menu, then the article with its images, or the page's headlines, then the footer). For sites whose own design cannot rotate. `Esc` closes it. |

It is the same engine as the `react-mongol` package (`applyMongolScript`),
with the reviewed open dictionary and the khudam converter bundled, plus Noto
Sans Mongolian so the script renders on computers without a Mongolian font.

## Try it from source

```bash
npm install
npm run extension        # builds extension/build/ and the store zip
```

- **Chrome / Edge:** open `chrome://extensions` (or `edge://extensions`), turn on
  Developer mode, choose **Load unpacked**, and pick `extension/build`.
- **Firefox:** open `about:debugging#/runtime/this-firefox`, choose **Load
  Temporary Add-on**, and pick `extension/build-firefox/manifest.json`.

Then open a Mongolian news site and click the ᠮᠣ button. The badge shows `ON`
(whole page) or `R` (reader view).

## How it behaves

- Does nothing until you click it (or use its menu or shortcut), and then only on that tab (`activeTab`).
  No access to your browsing otherwise; no network requests; no data leaves
  the page.
- Whole-page mode keeps each site's design; sites built with fixed pixel sizes
  can look broken (gaps, overlaps). Use reader view on those.
- Content that loads later is converted as it appears.
- Conversion is automatic and some words will be wrong. Every word reviewed in
  the [open dictionary](../dictionary/README.md) improves it in the next release.
- Pages the browser does not let extensions touch (`chrome://`, the web stores,
  PDFs) show `×`.

## Store submission

Upload `extension/mongol-bichig-extension-<version>.zip` to Chrome and Edge, and
`extension/mongol-bichig-extension-<version>-firefox.zip` to Firefox (Firefox
needs a different background setting and an add-on id).

| Store | Cost | Review |
| --- | --- | --- |
| [Chrome Web Store](https://chrome.google.com/webstore/devconsole) | USD 5 once | usually 1–3 days |
| [Microsoft Edge Add-ons](https://partner.microsoft.com/dashboard/microsoftedge) | free | a few days |
| [Firefox Add-ons](https://addons.mozilla.org/developers/) | free | often within a day |

Images in [`store/`](store): `icon-512.png` (resize as asked), two 1280×800
screenshots, and the 440×280 small promo tile.

### Listing text

**Name:** Mongol Bichig: ᠮᠣᠩᠭᠣᠯ ᠪᠢᠴᠢᠭ

**Summary (English):** Read any Cyrillic Mongolian page in traditional Mongolian script, vertically. One click on, one click back.

**Summary (Монгол):** Кирилл үсгээр бичсэн дурын вэб хуудсыг монгол бичгээр, босоогоор уншина. Нэг товшоод асаана, дахин товшоод буцаана.

**Description (English):**

> Mongol Bichig shows Cyrillic Mongolian web pages in traditional Mongolian
> script (ᠮᠣᠩᠭᠣᠯ ᠪᠢᠴᠢᠭ). Click the button on any news site, blog or government
> page: every Mongolian word converts, and the article turns vertical the way
> Mongol bichig is meant to be read. Menus stay usable. Click again to return
> to the original page, unchanged.
>
> - Works on any site, no setup
> - Includes a Mongolian font, so it works on computers without one
> - Runs only when you click it, only on that tab; collects nothing
> - Open source: https://github.com/AltangerelG/react-mongol
>
> Conversion is automatic and some words may be spelled wrong. The dictionary
> is open and improves with every reviewed word; you can help on GitHub.

**Description (Монгол):**

> Mongol Bichig нь кирилл үсгээр бичсэн вэб хуудсыг монгол бичгээр харуулна.
> Мэдээний сайт, блог, төрийн байгууллагын хуудас дээр товчийг дарахад бүх
> монгол үг монгол бичигт шилжиж, нийтлэл босоо байрлалд орно. Цэс хэвээрээ
> ажиллана. Дахин дарахад анхны хуудас өөрчлөлтгүй буцаж гарна.
>
> - Ямар ч сайт дээр тохиргоогүй ажиллана
> - Монгол бичгийн фонттой тул фонтгүй компьютер дээр ч харагдана
> - Зөвхөн таныг дарахад, зөвхөн тухайн цонхонд ажиллана; ямар ч мэдээлэл цуглуулахгүй
> - Нээлттэй эх код: https://github.com/AltangerelG/react-mongol
>
> Хөрвүүлэлт автомат тул зарим үгийн бичлэг буруу байж болно. Толь бичиг нээлттэй
> бөгөөд хянасан үг бүрээр сайжирна.

**Category:** Accessibility (or Productivity). **Language:** Mongolian, English.

### Privacy and permissions (the stores ask for these)

- **Single purpose:** convert the text of the current page between Cyrillic
  and traditional Mongolian script.
- **activeTab:** to read and change the page the user clicked the button on,
  only after that click.
- **scripting:** to run the converter and add its styles on that page.
- **contextMenus:** the button's right-click menu (whole page / reader view).
- **Remote code:** none. All code and data ship in the package.
- **Data collection:** none. The extension sends nothing anywhere and stores
  nothing.

Privacy policy, if a URL is required: link to this section of the README.

## Licences

Extension code MIT. Dictionary data (open dictionary and khudam lexicon)
CC BY-SA 4.0, see [`../dictionary/NOTICE`](../dictionary/NOTICE). Noto Sans
Mongolian, SIL Open Font License 1.1 ([`fonts/OFL.txt`](fonts/OFL.txt)).
