# Ricerca: export testuale dei mazzi da Moxfield e Archidekt, e forme degli URL dei mazzi

**Data di consultazione: 2026-11-24.** Le interfacce di Moxfield e Archidekt cambiano spesso (i nomi dei file JS citati sotto hanno un hash che cambia a ogni deploy): ogni etichetta va ricontrollata prima di scriverla nell'app.

Contesto: issue #189 (riconoscere l'URL di un mazzo incollato nella decklist e spiegare come incollare l'export testuale, senza import).

## Metodo e convenzioni

- Fonti primarie: le pagine dei siti, la FAQ di Archidekt, i bundle JS pubblici dei due siti (letti con `curl` e cercati con `rg`), le loro API pubbliche chiamate senza login, `robots.txt` e sitemap.
- Ogni affermazione ha la fonte accanto. Ciò che non è confermabile da fonte primaria è marcato **[NON VERIFICATO]** con il motivo.
- Le etichette UI sono citate come compaiono nel codice dei siti, in inglese. Il codice JS è minificato: dove un'etichetta viene dal bundle cito il file e la stringa cercata. Un'etichetta presente nel bundle non prova da sola dove si trova sullo schermo: lo dico dove conta.
- Accesso: `curl -m 20` con un User-Agent generico e onesto (`leyline-research/1.0 (curl)`), nessuno spoofing, nessun login. Né Moxfield né Archidekt hanno bloccato le richieste (nessuna challenge Cloudflare incontrata). Moxfield è una SPA (l'HTML contiene solo "Loading Moxfield. This may take a minute..."), quindi i fatti sull'interfaccia vengono dal bundle e dall'API. Archidekt è Next.js con rendering lato server: la pagina del mazzo arriva già con i dati.
- Limite incontrato: i testi di aiuto di Moxfield (`https://moxfield.com/help`) vengono da un CMS (Storyblok) tramite `https://api2.moxfield.com/v1/content/...`, che risponde `401 {"error":"Unauthorized"}` senza i token che la SPA genera. Non ho letto alcun articolo di aiuto di Moxfield.
- Nessuna pagina letta conteneva istruzioni rivolte ad agenti AI (cercato `ai agent`, `instructions for`, `language model` nelle pagine scaricate).
- I risultati di una ricerca web generica (blog e guide di terzi su "More → Export → Plain Text") non sono stati usati come fonte.
- Il comportamento di Leyline è letto da `packages/core/src/decklist/decklist.ts`, `decklist-section.ts` e `name-match.ts`, e provato chiamando `parseLine` e `sectionOpenedBy` con Node (`--experimental-strip-types`) su righe copiate dagli export reali. Non ho fatto girare la risoluzione contro il catalogo (database): dove la conclusione dipende dal catalogo è marcata come deduzione.

---

## Sintesi

1. **Moxfield: l'export testuale è nella finestra "Export Options", con quattro pulsanti che copiano negli appunti: "Copy for Moxfield", "Copy for Arena", "Copy for MTGO", "Copy Plain Text"; un quinto, "Download for MTGO", scarica un file `.txt`.** Nel bundle la finestra si apre da tre voci: un pulsante "Download" vicino a "Share" (mostrato solo a chi non è proprietario del mazzo), "More" → "Export", e, in un secondo layout dell'header, "More" → "Download / Export". Quale layout vede oggi un utente non è verificato.
2. **Moxfield funziona da non loggati sui mazzi pubblici di altri.** Le chiamate che la finestra usa (`/v2/decks/all/<id>/export?format=...` e `/download`) rispondono 200 senza login su un mazzo pubblico. Le voci di menu per l'export non hanno condizioni sul proprietario nel bundle (solo "Import" e "Duplicate" ne hanno).
3. **Archidekt: "Export deck" nella barra degli strumenti del mazzo apre una finestra con "Export type" (Text, CSV, Arena, MTGO.dek, Deck Registration PDF, EDHREC Article).** Per "Text" ci sono i pulsanti "Copy" (appunti) e "Download" (file `.txt`). La voce non è nascosta a chi non è proprietario, a differenza di "Import cards".
4. **Il formato giusto da consigliare: su Moxfield "Copy for Moxfield", su Archidekt "Text" togliendo "Include categories" e "Include color tag data".** Il "Copy for Moxfield" produce `1 Nome (SET) numero` con `*F*` per i foil: Leyline lo legge con stampa esatta. L'"Text" di Archidekt con le opzioni predefinite aggiunge `[Categoria]` e `^etichetta,#colore^` in coda alla riga: Leyline non riconosce più set e numero e il nome diventa irriconoscibile. "Copy Plain Text" (Moxfield) è il ripiego sicuro ma perde le stampe scelte. L'export "Arena" va evitato su tutti e due i siti (vedi 3.3).
5. **URL dei mazzi.** Moxfield: `https://moxfield.com/decks/<publicId>`, con `publicId` di caratteri `A-Za-z0-9_-` (22 negli esempi), più sottopagine (`/primer`, `/edit`, `/history`, `/goldfish`, `/playtest`, ...) e `/embed/<publicId>`; `www.` e `http://` fanno redirect 301. Archidekt: `https://archidekt.com/decks/<id numerico>` oppure `/decks/<id>/<slug>`, più `/snapshots/<id>[/<slug>]` e strumenti come `/playtester-v2/<id>` e `/sandbox/<id>`; `www.` e `http://` fanno redirect 301.

---

## 1. Moxfield

### 1.1 Dove si esporta

Bundle letto: `https://assets.moxfield.net/assets/assets/7165.d6c92a609cc949b52403.js` (pagina del mazzo).

- **Finestra "Export Options"** (stringhe `"Export Options"`, `"Deck List"`): un'area di testo "Deck List" con la lista e, accanto, quattro pulsanti. Ognuno copia il contenuto di un'area di testo nascosta (componente con prop `copyText`, cioè copia negli appunti):
  - `"Copy for Moxfield"` → formato `full`
  - `"Copy for Arena"` → formato `mtga`
  - `"Copy for MTGO"` → formato `mtgo`
  - `"Copy Plain Text"` → formato `plaintext`
  - Nel footer, `"Download for MTGO"`: un link a `https://api.moxfield.com/v2/decks/all/<publicId>/download?exportId=...&arenaOnly=...&ignoreFlavorNames=...`, che risponde `content-type: text/plain` con `content-disposition: attachment; filename=<nome-mazzo>-<data>.txt`, cioè scarica un file (verificato con `curl -D -` sul mazzo `KtNrenwexES3cLg2NDMEnw`).
  - Durante il caricamento mostra `"Formatting Deck List..."`; per Arena può mostrare `"Found N illegal cards for Arena"`.
- **Come si apre la finestra** (stesso file):
  - Pulsante `"Download"` (icona, con testo visibile solo da schermi `sm` in su: classe `d-none d-sm-inline`) accanto a `"Share"`, mostrato solo se l'utente **non** è proprietario (`!(y.isOwner)`).
  - Pulsante `"More"` (id `subheader-more`, `aria-label` `"More Options"`) → voce `"Export"`. Nello stesso menu `"Import"` è condizionata a `isOwner`, `"Export"` no.
  - Un secondo menu `"More"` (icona `fa-ellipsis-v`, `testId` `deckMenuMore.toggle`) → voce `"Download / Export"`, che apre lo stesso componente (modulo `89320`).
  - **[NON VERIFICATO]** quale dei due header (con "More" → "Export" o con "More" → "Download / Export") vede oggi un visitatore: entrambi sono nel bundle e la SPA non si può guardare senza browser. Un'istruzione robusta deve nominare "Export" in modo che valga per tutti e due.
- **Formati e opzioni prese dal bundle** `https://assets.moxfield.net/assets/assets/4848.343ac09ca54add74e32e.js`: la finestra chiede i quattro testi a `GET https://api2.moxfield.com/v2/decks/all/<publicId>/export?format=<full|mtgo|plaintext>&exportId=...` e, per Arena, a `/v2/decks/all/<publicId>/export/arena?arenaOnly=true&format=mtga...`. Per `full` passa `includeFinish=true` (quarto argomento `!0` nella chiamata di `7165...js`).

### 1.2 Accesso da non loggati

Mazzo pubblico di un altro utente, nessun login, nessun cookie:

- `GET https://api2.moxfield.com/v2/decks/all/KtNrenwexES3cLg2NDMEnw` → 200, JSON con `"visibility":"public"` ed `exportId`.
- `GET .../export?format=full|mtgo|plaintext&exportId=...` → 200, testo; `GET .../export/arena?...` → 200; `GET https://api.moxfield.com/v2/decks/all/<id>/download?...` → 200 con file allegato.

Quindi l'export funziona per chi non è loggato, almeno a livello di API. Mazzi `Unlisted` e `Private` (etichette in `7165...js` e `1330...js`): **[NON VERIFICATO]**, non ho un mazzo del genere né un account.

### 1.3 Cosa produce ogni formato (export reali)

Mazzi d'esempio presi dalla sitemap `https://moxfield.com/sitemap-deck-1.xml`: `KtNrenwexES3cLg2NDMEnw` (Commander, 100 carte) e `HE8C7wrQLkCkQ5ebW5RCtg` (Commander con 3 carte in sideboard e 2 foil).

| Pulsante | Esempio di righe | Struttura |
|---|---|---|
| Copy for Moxfield (`full`) | `1 Nicol Bolas, the Deceiver (HOU) 205 *F*` / `1 Clearwater Pathway / Murkwater Pathway (ZNR) 260` | Comandante in testa, senza intestazione. Codice set maiuscolo tra parentesi, numero di collezione, `*F*` sui foil. Facce doppie separate da **una** barra (` / `). Sideboard dopo una riga vuota e `SIDEBOARD:`. |
| Copy for MTGO (`mtgo`) e Copy Plain Text (`plaintext`) | `1 Nicol Bolas, the Ravager` | Solo quantità e nome (fronte per le facce doppie). Sideboard dopo `SIDEBOARD:`; il comandante va in fondo, dopo una riga vuota, senza intestazione. Nei due mazzi provati i due formati erano identici byte per byte (`diff`). |
| Copy for Arena (`mtga`) | `About` / `Name Atraxa Control` / `Commander` / `Deck` | Righe d'intestazione `About` e `Name <nome mazzo>`, poi `Commander` e `Deck`. Con `arenaOnly=true` **toglie le carte non disponibili su Arena**: il mazzo da 100 carte è uscito di 73 righe. |
| Download for MTGO | come `mtgo` | File `.txt` scaricato. |

### 1.4 URL dei mazzi

- Forma canonica: `https://moxfield.com/decks/<publicId>`. Il bundle principale costruisce i link come `"https://moxfield.com/decks/".concat(publicId)` (`https://assets.moxfield.net/assets/assets/moxfield.6e8584af71f6e560cf97.js`); la sitemap e il campo `publicUrl` dell'API usano la stessa forma. Gli id visti sono 22 caratteri `A-Za-z0-9_-` (es. `H8NS-xjMw0Gh4gAWVf1S7Q`, `Bov__NSh_0G9rGJAU0Jysg`); il bundle riconosce gli id dei mazzi incorporati con `[A-Za-z0-9_-]{1,32}`.
- Redirect verificati con `curl`: `https://www.moxfield.com/decks/<id>` → 301 a `https://moxfield.com/decks/<id>`; `http://moxfield.com/decks/<id>` → 301 a `https://...`.
- Sottopagine del mazzo (route sotto `/decks/:id/*` in `https://assets.moxfield.net/assets/assets/3608.a7afcec8d2fce03c221c.js`): `edit`, `search`, `packages`, `settings`, `compare`, `compare/:comparisonId`, `image`, `comments`, `comments/feed`, `history`, `recommendations`, `primer`, `goldfish`, `playtest`, `preview`, `original`. La sitemap elenca anche `https://moxfield.com/decks/<id>/primer`. Le stesse route ospitano le liste `/decks/public`, `/decks/following`, `/decks/liked`, `/decks/bookmarked`, `/decks/private`, `/decks/personal`, che **non** sono mazzi.
- Altre forme: `https://moxfield.com/embed/<publicId>` (route `/embed/:id` nel bundle principale, risponde 200). Tre sottodomini fissi puntano a mazzi specifici: `https://glissa.moxfield.com/` risponde 301 a `https://moxfield.com/decks/mDZhQDPda0WY9O5KNoP1Pg` (mappa con `jhoira` e `urza` nel bundle principale); sono casi isolati.
- Link di condivisione: il pulsante "Share" usa lo stesso URL del mazzo (`"https://moxfield.com/decks/".concat(publicId)` in `7165...js`). Uno short link distinto non l'ho trovato. **[NON VERIFICATO]** che non esista: ho cercato solo nel bundle.
- `https://moxfield.com/robots.txt` non esclude `/decks/` (esclude `/search/*`, `/account/*`, `/collection/*`, `/binders/*`).

---

## 2. Archidekt

### 2.1 Dove si esporta

- **Voce "Export deck"** (icona `download`) nella barra dei comandi del mazzo: lista `G` del modulo `stickiedDeckControls` in `https://cdn.archidekt.com/_next/static/chunks/7559-9c15fb16cf40a767.js`, e nell'elenco delle azioni del mazzo in `https://cdn.archidekt.com/_next/static/chunks/6981-ca0894fb97d465af.js` (`export:{label:"Export deck",icon:"download",...}`). Apre la finestra `export`.
- **Posizione sullo schermo.** La FAQ (https://archidekt.com/faq) dice che "Import" è "on the bottom of the left-hand toolbar (the second bottom toolbar on mobile)" e cita di passaggio "'Export' your deck" senza dire dove. "Export deck" è nello stesso gruppo di "Import cards" nel bundle, quindi la posizione è quasi certamente la stessa barra. **[NON VERIFICATO]** per "Export deck": deduzione dal bundle, non vista sullo schermo; e non so se la barra mostra il testo o solo l'icona.
- **Finestra di export** (`https://cdn.archidekt.com/_next/static/chunks/3435-fc5b8f6918e5f200.js`): titolo `Export <nome mazzo>`, un selettore delle carte da includere, poi il menu `"Export type"` con: `"Text"` (predefinito, `useState("txt")`), `"CSV"`, `"Arena"`, `"MTGO.dek"`, `"Deck Registration PDF"`, `"EDHREC Article"`.
- **Text**: menu `"Export options"` con caselle `"Include x in quantity"`, `"Include set code"`, `"Include collector number"`, `"Include foil indicator"`, `"Include categories"`, `"Include color tag data"`; `"Sort by"`; `"Section header"` (`"No section header"` predefinito, `"Primary category"`, `"Card type"`, `"Generic (eg: Commander, Mainboard, Sideboard)"`); casella `"Use front name only for MDFC cards"`; un `"Export example"`; pulsanti `"Copy"` (`navigator.clipboard.writeText`, notifica `"Copied to clipboard"`) e `"Download"` (file `<nome_mazzo>.txt`).
  - **Predefinito: tutte e sei le caselle attive** (`stringDisplayFlags` predefinito: `includeQuantityX`, `includeSetCode`, `includeCollectorNumber`, `includeFoil`, `includeCategories`, `includeColorTags`). Le scelte restano salvate nel browser con la chiave `archidekt_text_export_options` (hook che legge `localStorage`, dal bundle `_app`: `https://cdn.archidekt.com/_next/static/chunks/pages/_app-1a50d61c044e82af.js`).
  - La riga è costruita così (stesso file): quantità, `x` se attivo, nome, ` (setCode)`, ` numero`, ` *F*` (foil) o ` *E*` (etched), ` [Categoria1,Categoria2...]` (con `{top}` per la categoria del comandante, `{noDeck}`, `{noPrice}`), ` ^nome etichetta,#colore^`, ` #CustomCard` per le carte personalizzate. Esempio con le opzioni predefinite: `1x Sol Ring (c21) 263 *F* [Ramp] ^Buy,#0066ff^`.
- **Arena**: riga `qty NomeFronte (MTGOCODE) numero`, sideboard dopo una riga vuota; avviso `"Note that Arena will only accept editions of cards that are available on Arena..."`; solo `"Copy"`. Usa il campo `mtgoCode` della carta, **non** il codice set: nei dati della pagina del mazzo `1585124` `mtgoCode` è vuoto per le stampe che non esistono su MTGO (es. `Deadly Tempest`, `setCode` `c15`, `mtgoCode` `""`), e la riga diventa `1 Deadly Tempest () 19`.
- Gli altri tipi (CSV, MTGO.dek, PDF di registrazione, articolo EDHREC con marcatori `[deck]...[/deck]`) non sono testo da incollare per Leyline.

### 2.2 Accesso da non loggati

- `https://archidekt.com/decks/1585124` (mazzo pubblico dalla sitemap `https://archidekt.com/sitemaps/decks.xml`) risponde 200 senza login con il mazzo completo nell'HTML (`__NEXT_DATA__`, `props.pageProps.redux.deck.cardMap`); anche `https://archidekt.com/api/decks/1585124/` risponde 200.
- Nel bundle (`6981...js`) "Export deck" non ha condizione `hidden`, mentre "Import cards" ha `hidden:!o` (solo chi può modificare). La finestra lavora sui dati del mazzo già caricati nella pagina (nessuna chiamata server per "Text"). Quindi l'export testuale è disponibile anche a chi guarda il mazzo pubblico di un altro senza essere loggato: deduzione dal codice, non provata cliccando. **[NON VERIFICATO]** per mazzi privati o non in elenco.

### 2.3 URL dei mazzi

- Route Next.js (`https://cdn.archidekt.com/_next/static/FYhL86qB5Tj-SiAPM_FKv/_buildManifest.js`): `/decks/[id]`, `/decks/[...deckInfo]`, `/decks/image/[id]`, `/snapshots/[id]`, `/snapshots/[...deckInfo]`, `/playtester-v2/[id]`, `/playtester-v2/[id]/share/[roomId]`, `/sandbox/[id]`.
- Il sito costruisce i link come `/decks/${id}/${slug}` o `/decks/${id}`, con slug = nome del mazzo in minuscolo, spazi → `_`, altri caratteri tolti, e query opzionale (`?selectedUids=...`); stessa regola per `/snapshots/` (`_app-1a50d61c044e82af.js`). I link della homepage hanno la forma `/decks/28675696/prismari_altered`.
- Canonico: `<link rel="canonical" href="https://archidekt.com/decks/1585124">`. La sitemap usa `https://archidekt.com/decks/<id>`.
- Verificati con `curl`: `https://archidekt.com/decks/1585124/whatever` → 200 (lo slug non viene controllato); `https://www.archidekt.com/decks/1585124` → 301 a `https://archidekt.com/decks/1585124`; `http://archidekt.com/decks/1585124` → 301 a `https://archidekt.com:443/decks/1585124`.
- Condivisione: la finestra "Share deck" (`https://cdn.archidekt.com/_next/static/chunks/2436-4f30c4c0bd8fada8.js`) copia `${window.origin}` + il percorso del mazzo, con parametri opzionali `sort=` e `stack=`; offre anche QR code e `/decks/image/<id>`. Nessuno short link.
- Gli id visti sono solo numerici (da `3887` a `28676925`).

---

## 3. Cosa legge Leyline

### 3.1 Il parser

`parseLine` (`packages/core/src/decklist/decklist.ts`):

- `QUANTITY_NAME = /^(\d+)x?\s+(.+)$/i`: quantità con `x` opzionale (`1x` di Archidekt va bene).
- `NAME_SET_NUMBER = /^(.+?)\s+\(([A-Za-z0-9]+)\)\s+(\S+)(?:\s+\*[A-Za-z]+\*)?$/`: set tra parentesi non vuoto, numero, poi **al massimo** un marcatore `*X*` e la fine della riga. Va bene per `*F*` ed `*E*`. Qualsiasi altra cosa in coda annulla il riconoscimento di set e numero, e tutto il resto della riga diventa il nome.
- Commenti `//` e `#`, righe vuote e intestazioni di sezione saltate; `SB:` riconosciuto. Le intestazioni note (`decklist-section.ts`) comprendono `About`, `Commander`, `Deck`, `Mainboard`, `Maybeboard`, `Sideboard`, anche con `:` finale (quindi `SIDEBOARD:` va bene).
- I nomi a più facce si confrontano sul separatore ` // ` (`name-match.ts`).

### 3.2 Prova sulle righe reali

Risultati di `parseLine` e `sectionOpenedBy` (Node, sul codice del repository):

| Riga | Esito |
|---|---|
| `1 Nicol Bolas, the Deceiver (HOU) 205 *F*` (Moxfield full) | nome `Nicol Bolas, the Deceiver`, stampa `hou`/`205` |
| `1 Nicol Bolas, the Ravager / Nicol Bolas, the Arisen (M19) 218` (Moxfield full) | stampa `m19`/`218`; nome con ` / `, che non è la chiave esatta (che usa ` // `). La similarità a trigrammi con il nome giusto è 1,00 (barre ignorate), quindi dovrebbe risolversi per somiglianza: **deduzione**, non provata contro il catalogo. |
| `SIDEBOARD:` | intestazione, sezione `sideboard` |
| `About` | intestazione, ignorata |
| `Name Atraxa Control` (Moxfield Arena) | **letta come carta** di nome "Name Atraxa Control" (similarità 0,20 col comandante: diventa una riga da sistemare) |
| `1x Sol Ring (c21) 263 *F*` (Archidekt Text senza categorie né colori) | nome `Sol Ring`, stampa `c21`/`263` |
| `1x Starscream, Power Hungry // Starscream, Seeker Leader (bot) 5` (Archidekt Text) | nome a due facce corretto, stampa `bot`/`5` |
| `1x Sol Ring (c21) 263 *F* [Ramp] ^Buy,#0066ff^` (Archidekt Text predefinito) | nessuna stampa; nome `Sol Ring (c21) 263 *F* [Ramp] ^Buy,#0066ff^`, similarità 0,26 con "Sol Ring", sotto `MIN_SIMILARITY` 0,3 |
| `1x Sol Ring (c21) 263 [Commander{top}]` | nessuna stampa; similarità 0,30, al limite |
| `1 Deadly Tempest () 19` (Archidekt Arena con `mtgoCode` vuoto) | nessuna stampa; nome `Deadly Tempest () 19` (similarità 0,83: probabilmente risolta per somiglianza, stampa persa) |
| `Ramp` (Archidekt con "Section header: Primary category") | letta come carta |

### 3.3 Formato da consigliare

- **Moxfield → "Copy for Moxfield"**: tiene set, numero e foil, quindi le stampe scelte nel mazzo; niente righe estranee. Unico punto debole sono le facce doppie con ` / ` (vedi 3.2). **"Copy Plain Text"** (o "Copy for MTGO", identico) è il ripiego senza rischi sui nomi, ma perde le stampe e mette il comandante in fondo, dopo la sideboard, senza intestazione: Leyline lo stampa comunque, ma lo mette nella sezione sideboard.
- **Moxfield, da evitare: "Copy for Arena"**: toglie le carte che non esistono su Arena e aggiunge la riga `Name <nome mazzo>`, che Leyline legge come una carta.
- **Archidekt → Export type "Text", togliendo "Include categories" e "Include color tag data"**: righe `1x Nome (set) numero *F*`, lette con stampa esatta. Con le opzioni predefinite quasi ogni riga ha in coda `[Categoria]`, che Leyline non legge. "Section header" va lasciato su "No section header" (predefinito) o "Generic": con "Primary category" o "Card type" le intestazioni come `Ramp` o `Creature` diventano carte.
- **Archidekt, da evitare: "Arena"**: usa il codice MTGO, che è vuoto per le stampe non su MTGO (`()` nella riga) e per le altre può non coincidere con il codice set di Scryfall usato da Leyline. **[NON VERIFICATO]** che esistano stampe con `mtgoCode` diverso da `setCode`: nel mazzo d'esempio erano o uguali o vuoti.

---

## 4. Frasi proposte per l'app (interpretazione)

> Questa sezione non è un fatto verificato: è una proposta di testo basata sulle sezioni 1-3. Le etichette restano in inglese come nei siti.

- **Moxfield:** "Leyline non importa i mazzi da un link. Apri il mazzo su Moxfield, apri Export (in More, o il pulsante Download), premi Copy for Moxfield e incolla qui la lista."
- **Archidekt:** "Leyline non importa i mazzi da un link. Su Archidekt apri il mazzo, scegli Export deck, lascia Export type su Text, togli Include categories e Include color tag data, poi premi Copy e incolla qui la lista."
- **Altri siti (generica):** "Leyline non importa i mazzi da un link: esporta il mazzo dal sito come testo (una carta per riga, ad esempio «4 Sol Ring») e incolla qui la lista."

Note per chi scrive il testo finale: la frase per Moxfield nomina "Export" e "Download" perché nel bundle ci sono tre punti d'accesso diversi (1.1); conviene ricontrollarli nel browser prima del rilascio. La frase per Archidekt è al limite delle due frasi: se serve accorciarla, la parte che conta è togliere "Include categories".
