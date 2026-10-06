"""Count Cyrillic Mongolian word forms in a Wikipedia pages-articles dump.

    python frequency.py mnwiki-latest-pages-articles.xml.bz2 out.json [limit]

Writes {"source", "tokens", "words": [{"word", "count", "example"}]}: the
`limit` most frequent lower-cased word forms, each with one short sentence it
occurs in, so a reviewer sees the word in context. Wikipedia text is
CC BY-SA 4.0; the examples carry that licence.
"""
import bz2
import collections
import json
import re
import sys
import xml.etree.ElementTree as ET

# Not preceded by a digit or hyphen: "1990-нд", "2-р" are suffixes on
# numbers, not words a reviewer can spell on their own.
WORD = re.compile(r"(?<![\d\-а-яёөүА-ЯЁӨҮ])[а-яёөү]+(?:-[а-яёөү]+)?", re.IGNORECASE)
SENTENCE = re.compile(r"[^.!?\n]{20,160}[.!?]")

# Crude wikitext stripping: enough for counting words, not for display.
STRIP = [
    (re.compile(r"<ref[^>]*/>|<ref.*?</ref>", re.S), " "),
    (re.compile(r"<!--.*?-->", re.S), " "),
    (re.compile(r"<[^>]+>"), " "),
    (re.compile(r"\[\[(?:Файл|Зураг|File|Image|Ангилал|Category):[^\]]*\]\]", re.I), " "),
    (re.compile(r"\[\[(?:[^|\]]*\|)?([^\]]*)\]\]"), r"\1"),
    (re.compile(r"\[https?://\S+\s*([^\]]*)\]"), r"\1"),
    (re.compile(r"'{2,}"), ""),
    (re.compile(r"^[=*#:;|!].*$", re.M), " "),
]
TEMPLATE = re.compile(r"\{\{[^{}]*\}\}|\{\|[^{}]*?\|\}", re.S)


def clean(text: str) -> str:
    previous = None
    while previous != text:  # nested templates, innermost first
        previous, text = text, TEMPLATE.sub(" ", text)
    for pattern, replacement in STRIP:
        text = pattern.sub(replacement, text)
    return text


def main(dump: str, out: str, limit: int) -> None:
    counts: collections.Counter[str] = collections.Counter()
    examples: dict[str, str] = {}
    tokens = 0
    pages = 0

    with bz2.open(dump, "rb") as stream:
        for _, element in ET.iterparse(stream):
            tag = element.tag.rsplit("}", 1)[-1]
            if tag == "page":
                ns = element.find("{*}ns")
                text = element.find("{*}revision/{*}text")
                if ns is not None and ns.text == "0" and text is not None and text.text:
                    body = text.text
                    if not body.lstrip().lower().startswith("#redirect") and not body.lstrip().startswith("#ЧИГЛҮҮЛЭГ"):
                        pages += 1
                        plain = clean(body)
                        words = [w.lower() for w in WORD.findall(plain)]
                        tokens += len(words)
                        counts.update(words)
                        for sentence in SENTENCE.findall(plain):
                            sentence = " ".join(sentence.split())
                            if len(sentence) < 40:
                                continue
                            # Prefer sentences near 80 characters: enough context, one glance.
                            for w in {w.lower() for w in WORD.findall(sentence)}:
                                if w not in examples or abs(len(sentence) - 80) < abs(len(examples[w]) - 80):
                                    examples[w] = sentence
                element.clear()

    top = counts.most_common(limit)
    json.dump(
        {
            "source": "Mongolian Wikipedia (mnwiki pages-articles dump), CC BY-SA 4.0",
            "pages": pages,
            "tokens": tokens,
            "words": [{"word": w, "count": c, "example": examples.get(w, "")} for w, c in top],
        },
        open(out, "w", encoding="utf-8"),
        ensure_ascii=False,
        indent=0,
    )
    covered = sum(c for _, c in top)
    print(f"{pages} pages, {tokens} tokens, {len(counts)} distinct forms; top {len(top)} cover {covered / tokens:.1%}")
    for n in (500, 1000, 2000, 5000, 10000, 20000):
        if n <= len(top):
            print(f"  top {n:>5}: {sum(c for _, c in top[:n]) / tokens:.1%} of running text")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 20000)
