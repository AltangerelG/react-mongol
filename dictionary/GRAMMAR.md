# Mongol bichig grammar rules

The rules `src/grammar.ts` implements, and the ones it cannot (marked **D**:
they need a dictionary). Restated in our own words from the lessons at
[mongol-bichig.dusal.net](https://mongol-bichig.dusal.net/) by Munkho, whose
teaching made this possible. Rule IDs (N1, S3, ...) are referenced in the code.

How the converter uses them: a word is looked up whole; if it is a stem plus
a case ending (хотод = хот + dative), the stem comes from the dictionaries
and the ending is written by the N-rules; words no dictionary knows get the
C-decidable rules below as a best guess.

## 0. Notation

| Symbol | Meaning | Code point |
|---|---|---|
| a e i o u ö ü ē | vowels | U+1820 U+1821 U+1822 U+1823 U+1824 U+1825 U+1826 U+1827 |
| n, ng | NA, ANG | U+1828, U+1829 |
| b p | BA PA | U+182A U+182B |
| q / k | QA, read q in back (masculine) words and k in front (feminine) words | U+182C (one code point) |
| γ / g | GA, read γ in back words and g in front words | U+182D (one code point) |
| m l s š t d č ǰ y r | MA LA SA SHA TA DA CHA JA YA RA | U+182E U+182F U+1830 U+1831 U+1832 U+1833 U+1834 U+1835 U+1836 U+1837 |
| w f kh c z | WA FA KHA TSA ZA (loan letters) | U+1838 U+1839 U+183B U+183C U+183D |
| h, lh, zh, ch | HAA, LHA, ZHI, CHI (loan letters; **not mapped** in @gege-mn romanize.js, which throws on them) | U+183E, U+1840, U+1841, U+1842 |
| `-` | MVS (vowel separator) before a detached final a/e | U+180E |
| `_` | **in this file only**: the suffix separator NNBSP | U+202F |

Note on the separator: the brief asks for NNBSP (U+202F) before case suffixes, which matches standard Unicode practice.
The local @gege-mn/mongol-bichig package (`dist/suffixes.js`) says the opposite: it joins suffixes with MVS and calls NNBSP
"legacy". This must be resolved before implementation. The fixtures below write `_` so either choice can be substituted.

Galig: the site writes classical spellings in a **Cyrillic transliteration** (галиг), for example `хар-а`, `монггол`, `ном-ду`.
That transliteration is the main machine-readable source on the site. It maps to the romanization as follows:
а→a, э→e, и→i, о→o, у→u, ө→ö, ү→ü, н→n, нг→ng, б→b, в→w, п→p, х→q/k, г→γ/g, м→m, л→l, с→s, ш→š (or s before i), т→t, д→d,
ц/ч→č, з/ж→ǰ, й→y, р→r. A galig hyphen means either MVS (`хар-а`) or a suffix boundary (`ном-ду`); the context tells which.

---

## 2. Rules

Columns: **Conf** is S (stated clearly on the site), E (shown by the site's examples, not stated), I (inferred or general
knowledge, not on the site) or U (unclear). **Decide** is C (decidable from the Cyrillic alone), D (needs lexical or dictionary
knowledge) or F (font/shaping only; nothing to encode).

### 2.1 Vowel harmony

| ID | Condition | Output | Conf | Decide |
|---|---|---|---|---|
| H1 | Classes: back (masculine) a o u; front (feminine) e ö ü; neutral i. A word does not mix back and front vowels. | — | S | — |
| H2 | Cyrillic word contains а, о, у, ы, я, ё, or a ю read as йу → **back** | q/γ readings; suffix variants with a/u | S (classes) / I (Cyrillic letters) | C mostly |
| H3 | Cyrillic word contains э, ө, ү, е, or a ю read as йү → **front** | k/g readings; suffix variants with e/ü | S/I | C mostly |
| H4 | Only и (and й) in the word → treat it as **front** (examples: `хи-жү`, `нис-чү`, `эжи-дү`, `эгэчи-дү`) | front suffixes | E | C |
| H5 | The script's gender sometimes differs from the Cyrillic: нүүр → niγur (back), нуруу → niruγu, нүгэл → nigül, өмнө → emün-e | — | E | **D** |
| H6 | In non-first syllables a tooth reads a (back word) or e (front word); a belly reads o/u (back) or ö/ü (front). The reader uses the first-syllable vowel to decide. | — | S | F (a/e and o/u/ö/ü share medial glyphs) |

Practical consequence: a and e share the same medial/final glyph, o and u share every glyph, and ö and ü share every glyph.
Choosing the wrong one of each pair in a non-first syllable changes the code point (search, romanization) but not what the reader sees.

### 2.2 Vowels

| ID | Cyrillic | Position | Output | Conf | Decide |
|---|---|---|---|---|---|
| V1 | а | any | a | S | C |
| V2 | э | any | e | S | C (but see V10) |
| V3 | и | any | i | S | C |
| V4 | о | first syllable | o | S | C |
| V5 | о | later syllable | u by classical convention (o is also acceptable; same glyph). Examples: номхон → nomuqan, хонхор → qongqur | E | C (choose u) |
| V6 | у | first syllable | u (sometimes the Cyrillic у comes from a classical a+γ+u or i, see L-rules) | S | C/D |
| V7 | ө | first syllable | ö; sometimes **e** (өвөг → ebüge, өвөл → ebül, өмнө → emün-e) | S/E | D for the exceptions |
| V8 | ү | first syllable | ü; sometimes **i** (нүүр → niγur, нүгэл → nigül) | S/E | D for the exceptions |
| V9 | ө, ү | later syllable | ü (classical convention). Examples: мөрөн → mören, хүмүн | E | C |
| V10 | first-syllable ө/ү after a consonant | — | Same code point. The **extra stroke** (belly plus stem) in the first syllable is a glyph-shaping fact, not a separate letter. Later syllables have no stroke. Word-initial ö/ü always has the stroke. | S | F |
| V11 | ы | after a consonant | no letter of its own. Inside suffixes it belongs to the suffix allomorph (N-rules); inside a stem it is usually i (or nothing) | I | D |
| V12 | ь | after a consonant | usually an i after the consonant: морь → mori, амь → ami, ань → ani, говь → γobi, хонь → qoni, шавь → šabi | E | C (heuristic) |
| V13 | я | word-initial | ya (явах → yabuqu); sometimes i+… (ямаа → imaγ-a, язгуур → iǰaγur) | E | D |
| V14 | я / ё / е / ю after a consonant | medial | i+vowel or iy+vowel (ням → nim-a, ноён → noyan, хязгаар → kiǰaγar) | E | D |
| V15 | е | any | y+e (ye) or y+ö; ё → y+o; ю → y+u / y+ü (table on the з/ж/й page) | S | C (pick from harmony) |
| V16 | final о/ө | word-final | Native words almost never end in o/ö. The belly-shaped final o occurs only in loans (кино → kino). | S | C |
| V17 | **hidden final vowel**: a Cyrillic stem ending in a consonant often ends in a vowel in the script (ус → usu, ам → ama, нум → numu, мод → modu, хамт → qamtu, алт → alta, ганц → γanča, ээж → eǰi, аав → abu) | add u/ü/a/e/i | E | **D** (some cases forced, see S3) |

### 2.3 Long vowels (page `urt_egshig`, table transcribed from an image)

General rule (S): Old Mongolian had no long vowels. A modern long vowel usually corresponds to **V + γ/g + V** in the script.
In the first syllable the possible sources are:

| ID | Cyrillic | Possible classical sources (first source is the most common) | Example |
|---|---|---|---|
| L1 | аа | aγa, iγa | манаа → manaγ-a, хаана → qamiγ-a* |
| L2 | оо | oγa, oγu | хоол → qoγula, ногоо → noγuγ-a |
| L3 | уу | aγu, uγu, iγu | уул → aγula, нуур → naγur, нуруу → niruγu |
| L4 | ээ | ege, ige | хээр → keger-e, дээр → deger-e |
| L5 | өө | öge, ögü | өөх → ögekü, нөгөө → nögüge |
| L6 | үү | egü, ügü, igü | үүл → egüle, нүүр → niγur (back!) |
| L7 | ий | egi, igi | — |

(*qamiγ-a contains an m. It shows that a long vowel can hide whole letters.)

| ID | Rule | Conf | Decide |
|---|---|---|---|
| L8 | Long vowels in **non-first** syllables also come from V+γ+V, but the vowel quality follows the first syllable (labial attraction): baraγan keeps aγa → аа, but tomilaγad (first syllable o) gives оо, not аа | S | D |
| L9 | After i, the linking consonant is **y**, not γ: i+y+a / i+y+e (тараан → tariyan, хоршоо → qorsiyan, хүрээ → küriyen) | S | D |
| L10 | Some long vowels come from **two adjacent vowels** (no γ): туулай → taulai, түүх → teüke | S | D |
| L11 | Some long vowels come from a **plain short vowel** that lengthened: ээж → eǰi, аав → abu, одоо → odo, цагаан → čaγan, агаар → aγar, нарийн → narin, бараа → bar-a | S | D |
| L12 | Dictionary-lookup heuristic suggested by the site: for a first-syllable long у, try aγu, then uγu, then iγu, then two-vowel or short-vowel forms | S | D (search order) |

Conclusion: **long vowels cannot be converted from Cyrillic alone.** A fallback that always writes V+γ/g+V with the same
vowel copied (аа → aγa, оо → oγu, уу → uγu, ээ → ege, өө → ögü, үү → ügü) is a guess.

### 2.4 Diphthongs (page `hos_egshig`, tables transcribed from images)

| ID | Cyrillic | Position | Output | Example | Conf | Decide |
|---|---|---|---|---|---|---|
| D1 | ай, ой, уй, үй | non-final (first syllable) | V+y+i: ayi, oyi, uyi, üyi | аймаг → ayimaγ, ойр → oyir-a, туйлах → tuyilqu, түймэр → tüyimer | S | C |
| D2 | үй | non-final | written with **two** long teeth instead of three (one tooth dropped). This is shaping. Encode ü y i. | үйл → üyile, хүйтэн → küyiten | S | F |
| D3 | ай, ой, эй, үй | word-final | V+i, no y. Cyrillic ой at the end is normally **ai**; үй → **ei** | нохой → noqai, балай → balai, үгүй → ügei | S/E | C (ой→ai is the usual rule; D for exceptions) |
| D4 | ий (from old eyi) | — | modern ий often comes from classical eyi/egi | — | S | D |
| D5 | ай, уй, үй | before x / -х (verbs) | ayu, uyu, üyü | айх → ayuqu, гуйх → γuyuqu, гүйх → güyükü | S | D |
| D6 | ай, ой before a palatalised consonant | — | **long vowel + γ**: daγi, toγi | дайран → daγiran, тойрон → toγiron | S | D |
| D7 | Medial y before i: the y loses its upward hook. Encoding unchanged. | — | — | — | S | F |
| D8 | Three teeth in a row: one is dropped in writing. Encoding keeps every letter. | — | — | үйл = üyile | S | F |

### 2.5 Consonants

| ID | Cyrillic | Condition | Output | Conf | Decide |
|---|---|---|---|---|---|
| C1 | н | any | n (U+1828). The dot before a vowel, and its absence before a consonant or at the end, is shaping | S | F |
| C2 | нг | before a vowel | ng + γ/g (монгол → mongγol, өнгө → öngge, мөнгө → mönggü) | E | C |
| C3 | нг | word-final / before a consonant | ng (санг, анг) | E | C |
| C4 | нх | any | ng + q/k (энх → engke, хонхор → qongqur, анхан → angqan) | E | C |
| C5 | х | back word | q (U+182C) | S | C |
| C6 | х | front word | k (U+182C, same code point; front shape comes from shaping) | S | C (from harmony) |
| C7 | х | syllable-final in Cyrillic | q/k cannot close a syllable (C21), so the script adds a vowel: ах → aq-a, талх → talq-a, мах → miq-a, эх → eke, энх → engke, хар бэх → beke | S/E | D for which vowel; C that one is needed |
| C8 | г | back word | γ (U+182D). Before a vowel it has two dots | S | C |
| C9 | г | front word | g (U+182D). The front g and front k have the same shape and the reader tells them apart | S | C |
| C10 | г | word-final (back word) | γ written **without** dots (шог, цаг → čaγ); shaping | S | F |
| C11 | г ↔ q | A Cyrillic г sometimes comes from q: дасгал ← dasqal | E | D |
| C12 | в | native word | **b** (аав → abu, хавар → qabur, говь → γobi, дэвтэр → debter, төв → töb) | E | C (native) |
| C13 | в | loanword | w (U+1838): вагон, ваар | S | D (needs loan detection) |
| C14 | б | any | b | S | C |
| C15 | п | rare native words (парчигнах, пөөх, пэмбэгэр) and loans | p (U+182B) | S | C |
| C16 | т | any position | t (U+1832). **t cannot close a syllable**, so a Cyrillic final or pre-consonant т gets a vowel (хамт → qamtu, алт → alta) | S/E | D for the vowel |
| C17 | д | syllable-final | d (U+1833) as a final letter: болд → bolud(!), аваад → abuγad, үйлдэх → üyiledkü | S/E | C (d), D (inserted vowels) |
| C18 | д / т | initial | The script has one t/d shape, and readers tell them apart by word. Word-initial d (DA initial "shilbe" form) appears only in a few words such as дугаар and дүн. Elsewhere an initial д is written with the shared t/d initial form. Encode U+1833 for д and U+1832 for т. The glyph choice is a font/FVS issue. | S | U (FVS?) |
| C19 | д at the end | d with a "small tail" occurs only in a few words (эд, дэд) | S | F/U |
| C20 | з, ж | native | ǰ (U+1835). Same letter for both | S | C |
| C21 | ц, ч | native | č (U+1834). Same letter, **never syllable-final**, so the script adds a vowel: ганц → γanča, гуч → γuči, багш → baγsi | S | C (letter), D (vowel) |
| C22 | с | any | s (U+1830); can close a syllable (нис, босох → bosqu) | S | C |
| C23 | ш | before и | **s** (the two dots are omitted; si is read ši). Some words keep š (жишээ → ǰišiy-e) | S | C (default s), D (exceptions) |
| C24 | ш | elsewhere | š (U+1831); never syllable-final (багш → baγsi) | S | C |
| C25 | й | consonant | y (U+1836) | S | C |
| C26 | л, м, р | any | l, m, r | S | C |
| C27 | лх | loans/Tibetan names | LHA U+1840 (Лхагва, Лхамжав, Лхас) | S | C (digraph лх at the start of a word) |

### 2.6 Syllable-final letters ("devsger")

| ID | Rule | Conf | Decide |
|---|---|---|---|
| S1 | Only these consonants may close a syllable (medially before a consonant, or word-finally): **soft** n m l ng (mnemonic МАНЛАНГ) and **hard** b γ/g r s d (mnemonic БАГАРСАД). Ten in total. | S | — |
| S2 | w and y were historical syllable-final letters but are no longer counted. Old ew/aw and ay became vowels (хүүхэд, туулай → taulai; найм → naima, нохой → noqai). | S | — |
| S3 | **Never syllable-final**: q/k, ǰ, t, č, š, p, lh. Each is always followed by a vowel. **Converter rule:** if Cyrillic х, ж, з, т, ц, ч, ш or п stands before a consonant or at the end of a word, insert a vowel. Which vowel (a/e with MVS, u/ü, i) is lexical. | S | C (the need), D (the vowel) |
| S4 | Soft/hard class of the **classical** stem-final letter selects d-initial vs t-initial suffixes (N-rules, VB-rules). A vowel-final stem behaves like a soft one. | S | C if the classical stem is known; D otherwise (see V17) |

### 2.7 Final a/e and MVS

| ID | Rule | Conf | Decide |
|---|---|---|---|
| M1 | A word-final a/e joined to the preceding consonant takes a tail form (хара "look!" → qara, хэлэ → kele) | S | — |
| M2 | A word-final a/e written **detached** (separate final hook) is encoded as consonant + **MVS U+180E** + a/e: хар "black" → qar-a, нэр → ner-e | S | **D** (qara vs qar-a are different words) |
| M3 | After b, q/k (front), g (front) and similar letters, the final a/e has a forward-bending form: эх → eke, нэг → nige. Shaping only; no MVS. | S | F |
| M4 | Observed MVS environments (galig): after n, r, l, m, y, γ (back), q (back): tal-a, baγ-a, aq-a, talq-a, ün-e, nim-a, mun-a, bey-e, šin-e, ǰišiy-e. Not observed after s, b, č, ǰ, t, or front k/g (saba, basa, beke, eke, nige). Use this as a candidate set: MVS is only possible after these letters. | E | C (candidate set), D (whether) |
| M5 | Verb endings with an inherent MVS: present -n-a/-n-e (болно → bolun-a, унана → unun-a, барина → barin-a), past/perfect -l-a/-l-e (ирлээ → irel-e, боллоо → bolul-a), cooperative -ǰaγ-a/-čaγ-a | E | C once the suffix is identified |
| M6 | FVS: the site uses no FVS in lesson text. Its inline Unicode shows FVS1–3 (U+180B–180D) only on medial i/y to force particular tooth forms. Front final g, initial d (C18), loan t/d/u/n forms (F-rules) may need FVS depending on the font. | U | F/U |

### 2.8 Loanwords (page `giiguulegch_vpfk`)

| ID | Cyrillic (loan) | Output | Conf | Decide |
|---|---|---|---|---|
| F1 | в | w U+1838 (вагон, завод) | S | D (is it a loan?) |
| F2 | п | p U+182B (паспорт, программ) | S | C |
| F3 | ф | f U+1839 (фото, фабрик) | S | C |
| F4 | к | KHA U+183B, romanized `kh` in @gege-mn (клуб, кино, кирилл → khirill) | S/I | C |
| F5 | ц | TSA U+183C (цемент, лекц) | S | D (native ц → č) |
| F6 | з | ZA U+183D (завод) | S | D |
| F7 | ж | ZHI U+1841 (журнал, Жуков). Unmapped in @gege-mn | S | D |
| F8 | х | HAA U+183E (хлор, Холливуд). Unmapped in @gege-mn | S | D |
| F9 | лх | LHA U+1840. Unmapped in @gege-mn | S | C |
| F10 | э (medial/final) | ē U+1827, to keep it distinct from a. That letter reads e next to a consonant and w next to a vowel | S | D |
| F11 | у/ү sound | the stroked ü-form (likely U+1826 or an FVS form) | S (fact) / U (encoding) | D |
| F12 | о (medial/final) | belly form; o U+1823 | S | D |
| F13 | н | always dotted (dotted n before a consonant probably needs an FVS) | S / U (encoding) | D |
| F14 | ш | always š U+1831, even before и (otherwise it is read s) | S | D |
| F15 | т/д | t uses its initial-type shape in every position, d its d-shape (FVS likely) | S / U | D |

Loan detection is outside the site's scope. A practical trigger: ф, к, щ, ъ, а Cyrillic word-initial р (native words never
begin with р), or a dictionary loan list.

### 2.9 Noun cases (page `tiin_yalgal`). Written detached (`_` = NNBSP)

The site states that case endings are normally written separately from the stem. A few pronoun forms are written fused
(надад, чамд, миний). **Every allomorph is chosen by the classical stem's last letter**, not by the Cyrillic one (see V17).

| ID | Case | Cyrillic | Classical | Condition (on the classical stem) | Conf |
|---|---|---|---|---|---|
| N1 | Genitive | -ийн/-ын/-н | **yin** | stem ends in a vowel | S |
| N2 | Genitive | -ын/-ийн | **un / ün** | stem ends in a consonant other than n | S |
| N3 | Genitive | -ы/-ий | **u / ü** | stem ends in n (including the hidden n: морь → morin_u, хүн → kümün_ü, олон → olan_u) | S |
| N4 | Accusative | -ыг/-ийг/-г | **i** | stem ends in a consonant other than y | S |
| N5 | Accusative | -ыг/-ийг/-г | **yi** | stem ends in a vowel, or in y/diphthong (далайг → dalai_yi) | S |
| N6 | Dative-locative | -д/-т | **du/dü, dur/dür** | stem ends in a vowel or a soft letter n m l ng | S |
| N7 | Dative-locative | -д/-т | **tu/tü, tur/tür** | stem ends in a hard letter b γ/g r s d | S |
| N8 | Dative-locative note | The site gives both forms (-du and -dur) without saying which to choose. Its own exercise text writes `нутуг-дур`, which breaks N7. Words ending in r vary in real texts. | U |
| N9 | Ablative | -аас/-ээс/-оос/-өөс | **ača / eče** | any stem; only harmony matters | S |
| N10 | Instrumental | -аар/-ээр/-оор/-өөр | **bar / ber** | stem ends in a vowel or y | S |
| N11 | Instrumental | same | **iyar / iyer** | stem ends in a consonant other than y | S |
| N12 | Instrumental note | A separate particle `ber` (meaning roughly "as for") has the same shape. It is always ber, read бээр. | S |
| N13 | Comitative | -тай/-тэй/-той | **tai / tei** | any stem; harmony only (-той → tai) | S |
| N14 | Comitative (alt.) | лугаа/лүгээ | **luγ-a / lüge** | harmony only | S |
| N15 | Reflexive possessive | -аа/-ээ/-оо/-өө | **ban/ben** after a vowel, **iyan/iyen** after a consonant (морио → mori_ban, номоо → nom_iyan, буянаа → buyan_iyan) | E |
| N16 | Dative + reflexive | -даа/-таа | **daγan/degen** after a vowel or soft letter; **taγan/tegen** after a hard letter | S |
| N17 | Directional -руу/-рүү, plural (-ууд, -нар, ...) | not covered by the site. @gege-mn has rows: uruγu (separated by a space), ud/üd, nuγud/nügüd, nar/ner | I (not on the site) |

Algorithm sketch: (1) strip the Cyrillic case ending; (2) look up the classical stem (dictionary; it gives the hidden final
vowel and hidden n); (3) choose the allomorph by the stem's last classical letter and its harmony; (4) emit stem + NNBSP + suffix.

Fallback without a dictionary (I): treat a Cyrillic stem that ends in х, ж, з, т, ц, ч, ш or п as vowel-final (S3).
Otherwise use the Cyrillic final letter. The Cyrillic ending can help: -ы/-ий for the genitive points to an n-stem (N3).

### 2.10 Verb morphology (attached, no NNBSP; from galig paradigms)

| ID | Cyrillic | Classical | Condition | Conf |
|---|---|---|---|---|
| VB1 | converb -ж/-ч | **ǰu/ǰü** | stem ends in a vowel or soft letter (явж → yabuǰu, хийж → kiǰü, олж → olǰu) | S |
| VB2 | converb -ж/-ч | **ču/čü** | stem ends in a hard letter (авч → abču, өгч → ögčü, одож → odču, нисч → nisčü) | S |
| VB3 | -жээ/-чээ-type forms: ǰuqui/čuqui; cooperative -цгаа: ǰaγ-a/ǰege vs čaγ-a/čege | same soft/hard split | S |
| VB4 | verbal noun -х (-ах/-эх/-ох/-өх) | **qu/kü** attached; the Cyrillic epenthetic vowel is usually dropped (босох → bosqu, одох → odqu, үйлдэх → üyiledkü, өгсөх → ögsükü); stem vowels stay (явах → yabuqu) | E | D (which vowel survives) |
| VB5 | past -в | **ba/be** (гарав → γarba, барив → bariba) | E | C |
| VB6 | conditional -вал/-вэл/-бал | **bal/bel** (явбал → yabubal, хийвэл → kibel) | E | C |
| VB7 | present -на/-нэ/-но/-нө | **n-a / n-e** (MVS) | E | C |
| VB8 | perfect -лаа/-лээ | **l-a / l-e** (MVS) | E | C |
| VB9 | -аад/-ээд (converb) | **γad/ged** (аваад → abuγad, ирээд → ireged) | E | C |
| VB10 | past participle -сан/-сэн/-сон/-сөн | γsan/gsen (implied by the exercise; the site does not spell it out) | I | C |
| VB11 | present -мой/-муй | mui/müi (дагамуй) | E | C |

### 2.11 Rendering-only facts (the font does these; the converter emits nothing extra)

R1 dotted vs undotted n (C1). R2 first-syllable ö/ü stroke (V10). R3 masculine q has two teeth before a vowel and a short
form before MVS-a; masculine γ has two dots and two teeth before a vowel, no dots at the end, and a contracted form before
MVS-a. R4 front k/g share one shape. R5 dropped tooth in üyi (D2/D8). R6 y without its hook before i (D7). R7 the
forward-bending final a/e after b/k/g (M3). All are S on the site. For each, the converter must pick the right
**code points** and, for the uncertain cases (C18, F11, F13, F15, front final g), possibly an **FVS**.

---

## 3. Needs dictionary (Cyrillic loses information)

1. **Hidden letters behind long vowels**: which of aγa/iγa, oγa/oγu, aγu/uγu/iγu, … (L1–L12), and words where a long vowel hides more than γ (хаана → qamiγ-a).
2. **Hidden final vowels** after syllable-final consonants: ус → usu, мод → modu, хамт → qamtu, ам → ama (V17, S3). This affects every suffix choice.
3. **Hidden n** stems: морь/morin, хүн/kümün, олон/olan. They change the genitive and accusative.
4. **MVS vs joined final a/e** (qar-a vs qara) (M2).
5. **First-syllable vowel changes**: ө → e (өвөг, өвөл, өмнө), ү/у → i (нүүр, нуруу, нүгэл), я → i (ямаа, язгуур), and the switch of harmony class (H5).
6. **Diphthong sources**: ayi vs ayu vs aγi (D1, D5, D6), and final ой → ai.
7. **г ↔ q** and dropped consonants (дасгал ← dasqal; болд ← bolud with an inserted u).
8. **Loanword detection** (F-rules), and в → b (native) vs w (loan).
9. **ши → si vs ši** exceptions (C23).
10. **Initial д glyph** and the other FVS choices (C18, M6).
11. **Verbal-noun vowel**, i.e. which Cyrillic vowel before -х is a real stem vowel (VB4).
12. Visually harmless but needed for correct code points: a/e and o/u/ö/ü in non-first syllables (H6). Default to the convention (u/ü in non-first syllables).

---

## 4. Test fixtures

Format: `cyrillic | romanization`. `-` = MVS, `_` = NNBSP (case suffix), suffixes inside verbs are attached.
Source key: **A** = galig↔Cyrillic pair on the answers page / lesson text (galig converted mechanically by §0);
**I** = transcribed by hand from a PNG table on `urt_egshig` / `hos_egshig`; **R** = derived from the rules here (not given on the site).

```
# vowels, final a/e, MVS                         src
хар (black)        | qar-a                          A
хар (look!)        | qara                           A
нэр                | ner-e                          A
эх                 | eke                            A
нэг                | nige                           A
хөдөө              | ködege                         A
бүгд               | bügüde                         A
үнэ                | ün-e                           A
ням                | nim-a                          A
өмнө               | emün-e                         A
ам                 | ama                            A
нум                | numu                           A
миний              | minu                           A
кино               | khino                          A (F4 letter = R)
# long vowels
уул                | aγula                          A
нуруу              | niruγu                         A
хээр               | keger-e                        A
ногоо              | noγuγ-a                        A
хоол               | qoγula                         A
нуур               | naγur                          A
үүл                | egüle                          A
нөгөө              | nögüge                         A
улаан              | ulaγan                         A
цагаан             | čaγan                          A
тараан             | tariyan                        I
хүрээ              | küriyen                        I
туулай             | taulai                         I
түүх               | teüke                          I
ээж                | eǰi                            I
аав                | abu                            I
агаар              | aγar                           I
# diphthongs
аймаг              | ayimaγ                         I
түймэр             | tüyimer                        I
нохой              | noqai                          I
үгүй               | ügei                           I
айх                | ayuqu                          I
гүйх               | güyükü                         I
дайран             | daγiran                        I
оюун               | oyun                           A
ноён               | noyan                          A
# consonants / syllable-final letters
монгол             | mongγol                        A
энх                | engke                          A
дэвтэр             | debter                         A
хамт               | qamtu                          A
алт                | alta                           A
болд               | bolud                          A
ганц               | γanča                          A
ах                 | aq-a                           A
мах                | miq-a                          A
цаг                | čaγ                            A
тал                | tal-a                          A
дал                | dalu                           A
багш шавь          | baγsi šabi                     A
шинэ               | sin-e                          A
жишээ              | ǰišiy-e                        A
# case suffixes (NNBSP)
гэрийн             | ger_ün                         A
хүний              | kümün_ü                        A
монголын           | mongγol_un                     A
алганы             | alaγan_u                       A
малын              | mal_un                         A
номд               | nom_du                         A
нутагт             | nutuγ_tur                      A (rule N7; site text also has nutuγ_dur)
номоо              | nom_iyan                       A
буянаа             | buyan_iyan                     A
усаар              | usu_bar                        R
ээжээс             | eǰi_eče                        R
хүнтэй             | kümün_tei                      R
# verbs
явах               | yabuqu                         A
босох              | bosqu                          A
үйлдэх             | üyiledkü                       A
аваад              | abuγad                         A
явж                | yabuǰu                         A
авч                | abču                           A
болно              | bolun-a                        A
```

(About 70 lines, slightly over the ~60 target. "кино" is the one loanword fixture. Its `kh` comes from rule F4 / the @gege-mn ruling, because the site shows the
glyph only as an image.)
