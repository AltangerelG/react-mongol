# Open Mongolian script dictionary

Cyrillic Mongolian word forms with their traditional script (ᠮᠣᠩᠭᠣᠯ ᠪᠢᠴᠢᠭ)
spelling, **checked by a person**. A machine drafts each spelling; a reviewer
who reads Mongol bichig accepts it, picks another draft, or types the correct
form. Only human-reviewed entries count.

Licensed **CC BY-SA 4.0** (see [LICENSE](LICENSE) and [NOTICE](NOTICE)), so
any converter, app or website may use it with attribution, and improvements
stay open.

## Why word forms, and why this order

Words are reviewed in order of how often they appear in Mongolian Wikipedia
(7.2 million words of running text). A few thousand forms cover most of what
people read:

| Most frequent forms reviewed | Share of real text |
| ---: | ---: |
| 500 | 42% |
| 2,000 | 62% |
| 5,000 | 75% |
| 10,000 | 82% |

## Reviewing

```bash
npm install
npm run review        # then open http://localhost:4747
```

The page shows one word at a time with an example sentence and the machine
drafts in vertical script.

| Key | Action |
| --- | --- |
| `Enter` | Accept the highlighted draft |
| `1`–`9` | Accept that draft |
| `E` | Type a correction in romanization (live vertical preview) |
| `U` | Unsure: save for a second look |
| `X` | Not a word (typo, fragment, foreign word) |
| `S` | Skip for now |
| `←` | Back to the previous word |

Romanization is the classical scheme of `@gege-mn/mongol-bichig`: plain ASCII
works for most letters (`g j ch sh ng kh`), `o:` and `u:` type ö and ü, a space
before a suffix becomes NNBSP (U+202F), and `-` is MVS (U+180E), as in `qar-a`.

Every decision is appended to [`data/reviewed.jsonl`](data/reviewed.jsonl), one
line per decision; the last line for a word wins. Commit it and open a pull
request to contribute.

## Files

| File | What |
| --- | --- |
| `data/queue.json` | The 20,000 most frequent forms with counts, an example sentence and machine drafts. Generated. |
| `data/reviewed.jsonl` | Human decisions. The dictionary itself. |
| `tools/frequency.py` | Builds the frequency list from a Wikipedia dump. |
| `tools/drafts.mjs` | Adds machine drafts from khudam. |
| `tools/review/` | The review page and its local server. |

Regenerate the queue:

```bash
curl -LO https://dumps.wikimedia.org/mnwiki/latest/mnwiki-latest-pages-articles.xml.bz2
python dictionary/tools/frequency.py mnwiki-latest-pages-articles.xml.bz2 freq.json 20000
node dictionary/tools/drafts.mjs freq.json dictionary/data/queue.json
```
