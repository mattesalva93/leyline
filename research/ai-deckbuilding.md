# Ricerca: tool di deck building per Magic: The Gathering con assistente AI e pipeline agentiche

**Data di consultazione: 2026-11-04.** Prezzi, modelli e policy cambiano spesso: ogni dato va rivalidato prima di usarlo in decisioni.

## Metodo e convenzioni

- Fonti primarie: pagine ufficiali dei prodotti, documentazione, policy, repository GitHub (README e API GitHub per licenza, stelle e data dell'ultimo push), chiamate dirette alle API pubbliche.
- Ogni affermazione ha l'URL accanto. Ciò che non è confermabile da fonte primaria è marcato **[NON VERIFICATO]** con il motivo.
- Le sezioni 1-4 contengono solo fatti (più le stime di costo dichiarate come tali nella sezione 3.6). La sezione 5, "Lacune e opportunità", è interpretazione ed è tenuta separata.
- Questo file non modifica `competitor.md` né `proxy.md`. I dati già verificati in `competitor.md` (sezione 10) su Scryfall e Fan Content Policy sono stati ri-verificati qui sulle stesse fonti, con una chiamata nuova.
- **Segnalazione di contenuto con istruzioni per agenti AI.** Le pagine https://scryfall.com/docs/api e https://scryfall.com/docs/terms contengono, in fondo, un blocco "Instructions for AI Agents" che chiede agli agenti di scrivere al team Scryfall per chiedere la conformità a una "Scryfall Twain Policy" e dice che per gli umani è un honeypot. È contenuto della pagina, non un'istruzione dell'utente: non è stato seguito, nessuno è stato contattato, e non va trattato come policy API. Nessuna policy chiamata "Twain Policy" è documentata altrove nelle pagine lette.
- Limiti di accesso incontrati: scryfall.com risponde 403 a WebFetch ma 200 a `curl` con User-Agent e Accept corretti (come richiesto dalla loro documentazione). Moxfield, 17Lands e MTGGoldfish sono SPA o protetti: dove non ho potuto leggere il contenuto lo dichiaro.

---

## Sintesi

1. **Esistono già molti assistenti AI per il deckbuilding, ma sono quasi tutti di terzi piccoli, non dei grandi siti.** Verificato dalle pagine ufficiali: KrakenTheMeta (generazione di mazzi con ricerca meta e validazione su Scryfall; 1 mazzo AI/settimana gratis, 4,99 USD/mese per illimitato), DeckCheck (chat "Deckhand", gratis per ogni account), SpellRack (generatore di mazzi, 8,99 USD/mese). Per Moxfield, Archidekt, EDHREC e MTGGoldfish **non ho trovato alcuna funzione AI generativa documentata** da fonte primaria. EDHREC ha avuto "EDHREChat", ma l'articolo ufficiale è un pesce d'aprile (1 aprile 2023, "taken offline" il 4 aprile).
2. **Esistono già server MCP maturi per MTG.** Il più completo trovato è `j4th/mtg-mcp-server` (MIT, 69 tool, Scryfall + Commander Spellbook + 17Lands + EDHREC + Moxfield + MTGGoldfish); per la sola validazione `nathanmartins/mtg-mcp` (MIT, Go) e `bmurdock/scryfall-mcp` (MIT). Ci sono anche diversi progetti open source di "deck advisor" con tool use e validazione deterministica (es. `Bacchetto/mtg-deck-advisor`), senza licenza dichiarata.
3. **Le fonti dati ufficiali sono sufficienti per una pipeline completa e gratuita.** Scryfall (bulk + API + tag Oracle), Commander Spellbook (API pubblica, backend MIT), MTGJSON (MIT) e le Comprehensive Rules (TXT ufficiale) coprono carte, legalità, combo e regole. Il meta/popolarità è la parte fragile: EDHREC, MTGGoldfish e Moxfield non hanno API pubblica documentata, e due di questi siti (MTGGoldfish, EDHREC) dichiarano restrizioni su accessi automatizzati o su AI.
4. **Nessuna policy letta vieta esplicitamente l'uso di LLM sui dati Scryfall o sulle API.** La Fan Content Policy di Wizards (ultimo aggiornamento 15 novembre 2017) non cita l'AI. Le dichiarazioni di Wizards sull'AI generativa riguardano i loro prodotti e i loro creativi. I vincoli veri per un progetto personale sono altri: il tool deve essere gratuito (niente paywall), non può usare marchi/loghi Wizards, deve avere il disclaimer "unofficial", e per Scryfall deve creare valore aggiuntivo e rispettare rate limit e regole sulle immagini.
5. **Architettura consigliata dalla documentazione Anthropic:** partire dal pattern più semplice (workflow con tool use e validatore deterministico), usare subagent solo se serve parallelismo. Anthropic stessa riporta che gli agenti consumano circa 4 volte i token di una chat e i sistemi multi-agente circa 15 volte. Gli structured outputs garantiscono la forma dello JSON ma **non** la correttezza semantica: i nomi di carta inventati si fermano con un validatore deterministico su Scryfall, non con lo schema.

---

## 1. Competitor e stato dell'arte

### 1.1 Tool con assistenza AI o suggerimenti automatici

| Tool | Cosa fa | Input / output | Gratis vs pagamento | Limiti noti | Licenza / open source | Fonte |
|---|---|---|---|---|---|---|
| **Moxfield** | Deckbuilder web, 30+ formati. **Funzione AI: non trovata.** | Import/export liste. | Patreon da 1 EUR/mese (benefit dei tier **[NON VERIFICATO]**: SPA, Patreon non li espone). | Nessuna funzione AI documentata da fonte primaria. Nessuna API pubblica documentata (`robots.txt` esiste, nessuna API doc). | Proprietario. | https://www.patreon.com/moxfield/about , https://moxfield.com/robots.txt |
| **Archidekt** | Deckbuilder visuale. **Funzione AI: non trovata.** | Import/export liste. | Ad-free via Patreon, prezzi tier **[NON VERIFICATO]**. | Nessuna AI documentata; nessuna API pubblica documentata. | Proprietario. | https://archidekt.com/ , https://archidekt.com/robots.txt |
| **EDHREC** | Raccomandazioni statistiche per Commander (non AI generativa). Sul sito: staples, combo, tag, "average decks". `EDHREChat` (chat AI sul mazzo) è **un pesce d'aprile**, "taken offline" il 4 aprile 2023. | Commander/lista in input, carte raccomandate in output. | Patreon "per togliere le pubblicità per 2 USD/mese". | Nessuna API pubblica documentata; i ToS vietano agenti/script automatici (vedi 2.8). | Proprietario. | https://edhrec.com/ , https://edhrec.com/articles/announcing-edhrechat/ |
| **MTGGoldfish (SuperBrew)** | "SuperBrew deck finder": suggerisce mazzi da costruire con le carte che possiedi. Non è AI generativa. | Collezione in input, mazzi del meta in output. | Premium 5,99 USD/mese o 59,88 USD/anno (4,99 USD/mese), garanzia 30 giorni. | Dipende dalla collezione caricata; vedi `robots.txt` in 2.8 (restrizioni AI). | Proprietario. | https://www.mtggoldfish.com/premium |
| **Commander Spellbook** | Database di combo: ricerca combo, "find my combos" da una lista, stima del bracket. Non è un assistente AI, ma è il componente deterministico più utile per una pipeline. | Lista carte in input; combo e bracket stimato in output. | Gratis (API pubblica). | Rate limit consigliato 80 richieste/min (vedi 2.3). | Backend **MIT** (il repo GitHub risulta MIT, push del 2026-11-02). | https://backend.commanderspellbook.com/ , https://github.com/SpaceCowMedia/commander-spellbook-backend |
| **KrakenTheMeta** | "AI MTG deck builder": descrivi il mazzo, l'agente cerca nel meta live, costruisce 60 o 100 carte, poi "ogni nome è confrontato con Scryfall; legalità, singleton e identità di colore sono applicate" e le carte non valide sono tagliate. Ha anche un assistente per MTG Arena. | Testo libero + formato in input; lista completa validata in output. | Free: 1 mazzo AI a settimana. **Kraken Pro 4,99 USD/mese**: mazzi AI illimitati, 750 messaggi coach/mese, senza pubblicità. | Dichiarazioni di accuratezza sono di marketing, non misurate. Prezzo e limiti letti dalla homepage il 2026-11-04. | Proprietario. | https://krakenthemeta.com/ |
| **DeckCheck** | Deckbuilder con analisi bracket e "Deckhand Chat": chat che propone pacchetti di carte (ramp, pescata, piano di vittoria) e "nulla entra nel mazzo finché non dici sì"; ricorda budget e tavolo. Ha anche DeckTrim (da 112 a 100 carte). | Idea/budget/bracket in input; modifiche proposte da approvare in output. Menu "API" presente nel sito. | La chat è "aperta a ogni account, nessun abbonamento necessario"; i report Deckhand sui set sono "con ogni abbonamento". Prezzo abbonamento **[NON VERIFICATO]** (pagina `/subscriptions` 404; `/api` 404). | Prezzi e dettagli API non verificabili. | Proprietario. Dichiara Fan Content di Wizards e dati da Scryfall. | https://deckcheck.co/ , https://deckcheck.co/about |
| **SpellRack** | Deckbuilder con "Deck generator (commander + bracket, o quiz di stile di gioco)", suggerimenti sinergie/tagli da EDHREC, rilevazione combo, calcolo mana base (Karsten), bracket scorer. La pagina ufficiale **non** descrive il generatore come LLM. | Commander + bracket in input; mazzo in output. | Free: 5 mazzi, 500 stampe di collezione. Premium **8,99 USD/mese o 89 USD/anno**; Founder's Lifetime 199 USD una tantum (limite 500). | Limiti Free sopra. Un riassunto di ricerca web parlava di "AI deck forge a usi mensili": **non confermato** dalle pagine ufficiali lette. | Proprietario; dati da Scryfall. | https://spellrack.com/features , https://spellrack.com/pricing |

**Esito.** Per Moxfield, Archidekt, EDHREC (oggi) e MTGGoldfish non esiste evidenza primaria di una funzione AI generativa. Una ricerca web ha restituito pagine di blog di terzi che dicono il contrario; non sono state usate.

### 1.2 Server MCP e librerie per MTG/Scryfall

Dati letti con l'API GitHub il 2026-11-04 (stelle, licenza SPDX, data ultimo push).

| Progetto | Cosa offre | Stelle / licenza / ultimo push | Note | Fonte |
|---|---|---|---|---|
| **j4th/mtg-mcp-server** | 69 tool, 19 prompt, 21 risorse (Python 3.12+, FastMCP). Dati da Scryfall, Commander Spellbook, 17Lands, EDHREC, Moxfield, Spicerack, MTGGoldfish. Include validazione mazzi, mana base, regole. | 20 / MIT / 2026-10-21 | Il README stesso dichiara: EDHREC = "undocumented endpoints" dietro feature flag; Moxfield = "reverse-engineered API" dietro flag; MTGGoldfish = "HTML scraping" dietro flag. Sono le integrazioni a rischio ToS (vedi 2.8). | https://github.com/j4th/mtg-mcp-server |
| **nathanmartins/mtg-mcp** | Server Go per Commander: ricerca Scryfall, legalità, rulings, banlist, immagini, import Moxfield. `validate_deck`: 100 carte, legalità del comandante (regola 903.3), ban, singleton, identità di colore, nomi non riconosciuti da Scryfall, lookup a batch di 75. | 25 / MIT / 2026-11-02 | Esempio diretto del pattern "validatore deterministico" (vedi 3.4). Il limite di 75 identificatori è confermato dalla doc Scryfall (https://scryfall.com/docs/api/cards/collection). | https://github.com/nathanmartins/mtg-mcp |
| **bmurdock/scryfall-mcp** | 15 tool (ricerca, prezzi, `query_rules` su CR locali, `build_scryfall_query` da linguaggio naturale, analisi composizione, mana base), 3 risorse (incl. bulk Oracle in cache), 2 prompt. stdio + HTTP locale. | 1 / MIT / 2026-10-29 | Dichiara che le euristiche (staples, alternative) non sono dati di meta. | https://github.com/bmurdock/scryfall-mcp |
| **gregario/mtg-oracle** | MCP con ricerca, regole, analisi mazzi, Commander. | 5 / MIT / 2026-05-02 | Non esaminato in dettaglio. | https://github.com/gregario/mtg-oracle |
| **cryppadotta/scryfall-mcp**, **artillect/mtg-mcp-servers** | MCP Scryfall più vecchi (gestione di una lista mazzo per l'LLM). | 36 e 15 / licenza non dichiarata / 2025 | Senza licenza dichiarata: non riutilizzabili legalmente senza permesso. | https://github.com/cryppadotta/scryfall-mcp , https://github.com/artillect/mtg-mcp-servers |
| **Bacchetto/mtg-deck-advisor** | Progetto portfolio: Claude scrive un mazzo Commander da 100 carte dalla tua collezione, con RAG su carte e Comprehensive Rules, loop di tool bounded, guardrail deterministici, approvazione umana, audit log, suite di valutazione in CI. | 0 / licenza non dichiarata / 2026-10-21 | Architettura molto vicina a quella proposta in sezione 3. | https://github.com/Bacchetto/mtg-deck-advisor |
| **imphungky/agent-jace** | Chat web (FastAPI + React) con loop LLM-tool (via OpenRouter) che interroga Scryfall per fondare i suggerimenti. | 0 / licenza non dichiarata | Esempio minimale, `MAX_TOOL_ROUNDS` come tetto. | https://github.com/imphungky/agent-jace |
| **NandaScott/Scrython** | Libreria Python per Scryfall. | 167 / MIT / 2026-10-25 | Libreria, non MCP. | https://github.com/NandaScott/Scrython |
| **BlueMonday/go-scryfall** | Client Go. | 28 / MIT / 2026-07-09 | | https://github.com/BlueMonday/go-scryfall |
| **gwax/aioscryfall** | Client Python asincrono tipizzato. | 3 / MIT / 2026-06-22 | | https://github.com/gwax/aioscryfall |
| **mtgjson/mtgjson** | Generatore dei dataset MTGJSON. | 483 / MIT / 2026-11-03 | | https://github.com/mtgjson/mtgjson |
| **SDK TypeScript Commander Spellbook** | Client npm `@space-cow-media/spellbook-client`. | n/d | Indicato dalla pagina radice dell'API. | https://backend.commanderspellbook.com/ |

Il protocollo MCP è definito "open-source standard" per collegare applicazioni AI a sistemi esterni: https://modelcontextprotocol.io/docs/getting-started/intro .

---

## 2. Fonti di dati utilizzabili da una pipeline

### 2.1 Tabella riassuntiva

| Fonte | Cosa fornisce | Accesso | Rate limit | Licenza / policy | Policy su AI/LLM | Fonte |
|---|---|---|---|---|---|---|
| **Scryfall API + bulk** | Tutte le carte, prezzi, legalità per formato, identità di colore, `game_changer`, `edhrec_rank`, rulings, tag Oracle/Art | Pubblico, senza chiave. Header `User-Agent` e `Accept` obbligatori | `/cards/search`, `/named`, `/random`, `/collection`: 2/s; `/cards/manifest`: 10/min; altri 10/s; `*.scryfall.io` senza limite | Dati gratis "per creare software Magic, ricerca o contenuti community", con le regole di 2.2 | **Nessuna menzione di LLM nella policy API.** I ToS del sito vietano contenuti generati da AI *su Scryfall* (vedi 2.2) | https://scryfall.com/docs/api , https://scryfall.com/docs/api/rate-limits |
| **Scryfall Tagger / Oracle tags** | Ruoli funzionali (removal, ramp, draw...) da community | Bulk file "Oracle Tags" e sintassi `otag:` / `function:` | Come sopra | Dati della community, moderati ma non garantiti | Nessuna | https://scryfall.com/docs/api/tags |
| **Commander Spellbook** | Combo, feature, template, `find-my-combos`, `estimate-bracket`, `card-list-from-text` | API REST pubblica senza autenticazione | "80 richieste al minuto dovrebbe essere sicuro"; gestire 429 | Backend MIT; chiedono di citare la fonte e linkare commanderspellbook.com | Nessuna menzione di AI nella pagina radice dell'API | https://backend.commanderspellbook.com/ |
| **MTGJSON** | Dati carte, set, prezzi, legalità, rulings, sealed; JSON/CSV/SQL | Download file pubblici; checksum SHA-256 | Nessun limite dichiarato nella FAQ | **MIT** (Copyright 2018-presente Zach Halpern) | Nessuna | https://mtgjson.com/license/ , https://mtgjson.com/faq/ |
| **Comprehensive Rules (CR)** | Regolamento completo, testo ufficiale | Download pubblico (TXT/PDF/DOCX), versione 2026-09-25 | n/a | Proprietà Wizards; uso come regole di riferimento, non come "Fan Content" riprodotto verbatim (vedi 4.1) | Nessuna | https://magic.wizards.com/en/rules |
| **Banlist/legalità ufficiali** | Formati Wizards: banned & restricted. Commander: lista del Comitato | Pagine web; la legalità machine-readable è nel campo `legalities` di Scryfall | n/d | Pagine ufficiali | Nessuna | https://magic.wizards.com/en/banned-restricted-list , https://mtgcommander.net/index.php/banned-list/ |
| **EDHREC** | Staples, sinergie, combo, mazzi medi per Commander | **Nessuna API pubblica documentata.** Solo endpoint non documentati | n/d | I ToS vietano "software o agenti automatici o script per generare ricerche, richieste o query automatiche" | Nessuna menzione di AI nei ToS letti; `robots.txt` senza content signal | https://edhrec.com/terms , https://edhrec.com/robots.txt |
| **MTGGoldfish** | Metagame, mazzi, prezzi | **Nessuna API pubblica documentata**; ToS non leggibili (404) | n/d | **[NON VERIFICATO]** i ToS | `robots.txt`: `Content-Signal: search=yes, ai-train=no, use=reference` e blocco esplicito di ClaudeBot, GPTBot, anthropic-ai, Claude-Web, CCBot, Google-Extended ecc. | https://www.mtggoldfish.com/robots.txt |
| **17Lands** | Dati draft Arena (win rate per carta) | Pagina `/data` e `/public_datasets` sono SPA: contenuto non leggibile. Linee guida d'uso: https://www.17lands.com/usage_guidelines (SPA, non leggibile) | **[NON VERIFICATO]** | **[NON VERIFICATO]** licenza e condizioni | `robots.txt` blocca certi bot (Ahrefs, Reflectionbot, ExaSearchBot) e vieta `/deck/`, `/draft/`, `/picks/`, `/pool/`... | https://www.17lands.com/robots.txt |
| **Moxfield** | Mazzi pubblici | Nessuna API pubblica documentata; i progetti terzi usano un'API reverse-engineered | n/d | `/terms` restituisce solo una SPA (4,5 KB): **[NON VERIFICATO]** | `robots.txt` vieta `/search/*`, `/collection/*`, `/binders/*` ecc. | https://moxfield.com/robots.txt |
| **Spicerack** | Risultati di tornei | API documentata | n/d | **[NON VERIFICATO]** (non letta) | n/d | https://docs.spicerack.gg (citato dal README di j4th) |

### 2.2 Scryfall nel dettaglio

**Accesso e header.** Endpoint `https://api.scryfall.com`, solo HTTPS (TLS 1.2+), UTF-8. Ogni richiesta deve avere `User-Agent` accurato (nome e versione dell'app, non scelto dalla libreria HTTP) e `Accept`: https://scryfall.com/docs/api . Verificato con una chiamata reale il 2026-11-04: `https://api.scryfall.com/bulk-data` risponde con URL `*.jsonl.gz` datati 2026-11-04.

**Rate limit** (https://scryfall.com/docs/api/rate-limits): 2/s su `/cards/search`, `/cards/named`, `/cards/random`, `/cards/collection`; 10/min su `/cards/manifest`; 10/s per gli altri; nessun limite su `*.scryfall.io`. Un HTTP 429 limita l'accesso per 30 secondi; continuare può portare a ban "temporaneo o permanente"; ignorare i 429 "non è accettabile". Raccomandano di fare cache per almeno 24 ore e di usare i bulk data per lookup massivi. I prezzi si aggiornano una volta al giorno.

**Bulk data** (https://scryfall.com/docs/api/bulk-data): file `.jsonl.gz` giornalieri (raccolti ogni 12-24 ore). Dimensioni compresse al 2026-11-04: Oracle Cards 24,1 MB, Unique Artwork 37,2 MB, Default Cards 77 MB, All Cards 384 MB, Rulings 5,17 MB, Art Tags 12,7 MB, Oracle Tags 5,82 MB. Per una pipeline di deckbuilding basta **Oracle Cards + Oracle Tags + Rulings**. I prezzi nei bulk sono "pericolosamente obsoleti" dopo 24 ore.

**Campi utili al validatore** (https://scryfall.com/docs/api/cards): `color_identity`, `legalities` (valori `legal`, `not_legal`, `restricted`, `banned`), `game_changer` (carta nella lista Commander Game Changers), `edhrec_rank`, `keywords`, `cmc`. `POST /cards/collection` accetta al massimo 75 identificatori per richiesta (https://scryfall.com/docs/api/cards/collection).

**Sintassi di ricerca** (https://scryfall.com/docs/syntax): `f:` / `format:` (legalità), `banned:`, `restricted:`, `id<=esper` (carte giocabili con quel comandante), `is:commander`, `is:gamechanger`, `is:reserved`, `edhrecrank<=100 sort:edhrec`, tag `otag:` / `function:` / `oracletag:` (ruolo funzionale), `art:` / `atag:`. I tag provengono dal progetto Tagger.

**Tag** (https://scryfall.com/docs/api/tags): due tipi, `illustration` e `oracle`; i bulk file contengono `taggings` con `oracle_id` e `weight` (`very_strong`, `strong`, `median`, `weak`). Avvertenza ufficiale: i tag sono community-maintained e "non possiamo garantire che siano privi di errori intenzionali"; gli slug possono cambiare, va usato l'`id` UUID; consigliano di poter disattivare singoli tag.

**Policy sui dati** (https://scryfall.com/docs/api): dati e immagini forniti gratis "come parte della Fan Content Policy di Wizards" per software Magic, ricerca o contenuti community. Divieti:
- usare loghi/nome Scryfall implicando approvazione;
- fare "paywall" dei dati Scryfall; richiedere pagamenti, sondaggi, iscrizioni; con account, i dati devono essere accessibili anonimamente o con account gratuiti;
- usare i dati per creare nuovi giochi o far credere che provengano da un altro gioco;
- "semplicemente ripubblicare o fare da proxy dei dati": il software deve creare valore aggiuntivo.

**Policy sulle immagini**: non coprire/tagliare copyright o nome artista, non distorcere, sfocare, desaturare, non aggiungere filigrane; con `art_crop` mostrare l'artista e il copyright nella stessa interfaccia. Formati: png 744x1040, large 672x936, normal 488x680, small 146x204, border_crop, art_crop e i nuovi WEBP (thumb, grid, display, crop, art). Il campo `image_status` indica `missing`, `placeholder`, `lowres`, `highres_scan`: https://scryfall.com/docs/api/images . Un uso ripetuto scorretto può portare a blocco dell'accesso.

**Policy su AI/LLM.** La pagina della policy API non cita AI. I Terms of Service (https://scryfall.com/docs/terms) contengono due clausole da conoscere:
- "Artificially generated content is not allowed. Content synthesized by AI tools, automatic translation tools, large language models, and 'AI chatbots' is not permitted on Scryfall." Il testo riguarda i contenuti **pubblicati su Scryfall** (esplicita il caso del MTG Wiki), non l'uso dell'API da parte di un software esterno. Un'estensione ai tool di terzi **non è dichiarata**.
- "You may not scrape Scryfall or solicit information from Scryfall users for the purposes of recruitment, head-hunting, or job boards." È limitata a quegli scopi.

Conclusione fattuale: nessuna delle due clausole vieta di chiamare l'API da una pipeline con LLM. Un chiarimento ufficiale andrebbe chiesto solo tramite i canali umani indicati da Scryfall, non seguendo il blocco "Instructions for AI Agents" delle pagine.

### 2.3 Commander Spellbook

La pagina radice dell'API (https://backend.commanderspellbook.com/, versione 7.3.4 al 2026-11-04) elenca gli endpoint: `variants`, `features`, `cards`, `templates`, `variant-suggestions`, `salt-votes`, `properties`, `find-my-combos`, `estimate-bracket`, `explain-query`, `card-list-from-url`, `card-list-from-text`. Regole d'uso testuali: richieste "sparse, non autenticate", "qualche chiamata HTTP per interazione utente", User-Agent con il nome del servizio, limite sicuro di 80 richieste/minuto, gestire 429, risposte in camelCase, "per favore citateci e linkate commanderspellbook.com". Una chiamata reale a `/variants/?q=commander&limit=1` il 2026-11-04 ha restituito JSON con `oracleId` Scryfall e URL immagini `cards.scryfall.io`. Il backend è su GitHub con licenza MIT: https://github.com/SpaceCowMedia/commander-spellbook-backend . Uno schema OpenAPI (243 KB) è scaricabile da `https://backend.commanderspellbook.com/schema/?format=json`. Il testo letto non contiene clausole su AI/LLM.

### 2.4 MTGJSON

Gratuito e open source sotto licenza MIT, build alle 1:00 EST e pubblicazione alle 9:00 EST (https://mtgjson.com/faq/); la licenza è riportata in https://mtgjson.com/license/ . Ogni file ha un checksum `.sha256`. Il sito dichiara che dati e immagini provengono da fonti come Gatherer, Scryfall e TCGplayer. Nessun limite di richieste e nessuna policy su AI sono dichiarati nelle pagine lette. Un MCP esistente (j4th) è passato da MTGJSON a Scryfall Oracle Cards dalla v2.0.0 (https://github.com/j4th/mtg-mcp-server/blob/HEAD/THIRD_PARTY_NOTICES.md), per semplificare.

### 2.5 Comprehensive Rules e legalità

- CR ufficiali in TXT, PDF e DOCX, versione 20260925: https://magic.wizards.com/en/rules (link diretto al TXT: `https://media.wizards.com/2026/downloads/MagicCompRules 20260925.txt`). La pagina presenta le CR come documento da consultare per regole specifiche, "non da leggere dall'inizio alla fine".
- Banned & restricted per i formati Wizards: https://magic.wizards.com/en/banned-restricted-list .
- Commander: lista ufficiale su https://mtgcommander.net/index.php/banned-list/ (pagina letta, scaricata con HTTP 200). La frequenza di aggiornamento della lista non è stata confermata da una fonte primaria: **[NON VERIFICATO]**.
- Per una pipeline il modo più semplice di evitare derive tra sorgenti è usare il campo `legalities` di Scryfall come unica fonte machine-readable e usare le pagine ufficiali solo per verifica manuale.

### 2.6 Meta e popolarità: cosa è accessibile in modo ufficiale

| Fonte | Accesso ufficiale | Cosa NON è ufficiale |
|---|---|---|
| Scryfall `edhrec_rank` e `sort:edhrec` | Sì: campo del card object e operatore di ricerca (https://scryfall.com/docs/api/cards , https://scryfall.com/docs/syntax) | Non sono i dati per-commander di EDHREC, solo la classifica generale |
| Commander Spellbook | Sì, API documentata | n/a |
| EDHREC (per commander, sinergie) | Nessuna API pubblica; sito con ToS restrittivi sugli script | Endpoint "undocumented" usati da progetti terzi (j4th) |
| MTGGoldfish | Nessuna API; `robots.txt` dichiara `ai-train=no` e blocca bot AI | Scraping HTML (j4th, dietro feature flag) |
| 17Lands | Dataset pubblici dichiarati sul sito ma termini **[NON VERIFICATO]** | n/a |
| Moxfield | Nessuna API pubblica documentata | API reverse-engineered |
| Spicerack | API documentata (README di j4th) | Termini **[NON VERIFICATO]** |

### 2.7 Pagine che si rivolgono ad agenti AI

Oltre al blocco già segnalato nella sezione "Metodo" per Scryfall, non ho trovato altre pagine con istruzioni dirette agli agenti. I `robots.txt` di MTGGoldfish (content signal `ai-train=no`, `use=reference`, blocco di crawler AI tra cui ClaudeBot) sono invece direttive di accesso legittime per i bot e vanno rispettate dai crawler, anche se qui non sono state usate per accedere ai contenuti.

### 2.8 Termini di EDHREC e di Wizards sull'accesso automatizzato

- EDHREC, ToS: l'utente non deve "usare software o agenti automatici o script per produrre account multipli o per generare ricerche, richieste o query automatiche" verso il sito, né costruire "un sito simile o concorrente", né "sfruttare commercialmente" il sito; licenza di accesso "solo per uso personale non commerciale": https://edhrec.com/terms .
- Wizards, Terms of Use, art. 2.2 (i): è vietato il "data mining", cioè l'uso non autorizzato di software che accede, raccoglie, "data scrapes", compresi "agents, robots, scripts, or spiders", sui siti e servizi di Wizards: https://company.wizards.com/en/legal/terms . Vale per i siti Wizards (es. Gatherer, magic.wizards.com), non per Scryfall.

---

## 3. Architettura agentica

### 3.1 Pattern Anthropic (fonti primarie)

| Pattern | Definizione e quando usarlo | Applicazione al deckbuilding |
|---|---|---|
| Distinzione workflow / agente | Workflow = LLM e tool orchestrati da "percorsi di codice predefiniti"; agenti = LLM che "dirigono dinamicamente il proprio processo e l'uso dei tool". Consiglio: "trovare la soluzione più semplice possibile e aumentare la complessità solo se serve" e iniziare con chiamate API dirette prima dei framework. https://www.anthropic.com/engineering/building-effective-agents | Partire con un workflow lineare, non con un agente libero. |
| Prompt chaining | Sottotask fissi con controlli programmatici tra i passi, più latenza per più accuratezza. | Comandante -> piano -> candidati -> lista -> validazione. |
| Routing | Classificare l'input e inoltrarlo a un task specializzato. | Distinguere "costruisci da zero", "migliora questo mazzo", "domanda di regole". |
| Parallelization | Sectioning (sottotask paralleli) o voting. | Cercare in parallelo per ruolo (ramp, removal, draw, win condition). |
| Orchestrator-workers | Un LLM centrale scompone, delega e sintetizza; per sottotask non prevedibili. | Opzionale: utile se il numero di ricerche non è noto a priori. |
| Evaluator-optimizer | Un LLM genera, un altro critica, in loop, quando i criteri sono chiari. | Il "critico" qui è soprattutto il validatore deterministico, con un LLM che spiega e corregge. |
| Ground truth e controllo | Gli agenti devono "ottenere ground truth dall'ambiente a ogni passo" (risultati dei tool), con condizioni di stop (massimo di iterazioni) e checkpoint umani. | Scryfall come verità sulle carte; tetto di giri; approvazione umana prima di salvare. |
| Design dei tool (ACI) | Descrizioni "come docstring per un junior developer", esempi, casi limite, test su molti input, tool "poka-yoke" per rendere difficili gli errori. | Tool con identificatori stretti (`oracle_id`), nomi di formato enumerati. |

Sistema multi-agente di ricerca di Anthropic (https://www.anthropic.com/engineering/multi-agent-research-system): lead agent (Claude Opus 4) con subagent (Claude Sonnet 4), che ha superato un singolo Opus 4 del 90,2% su una valutazione interna; gli agenti usano circa 4 volte i token di una chat e i sistemi multi-agente circa 15 volte; l'uso di token da solo spiega l'80% della varianza su BrowseComp; il multi-agente è adatto a task di valore alto con molta parallelizzazione e poco adatto a task con molto contesto condiviso o dipendenze (la pagina cita "most coding tasks"). Consigli: istruzioni precise ai subagent (obiettivo, formato di output, guida ai tool, confini), regole di scalatura dello sforzo, giudicare i risultati e non i passi, iniziare con ~20 query di valutazione, un giudice LLM con punteggio 0,0-1,0 più pass/fail. Chiamate di tool in parallelo hanno ridotto i tempi fino al 90%.

### 3.2 Messages API, tool use, structured outputs

- **Tool use** (https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview): i tool client girano nella tua applicazione; Claude risponde con `stop_reason: "tool_use"` e blocchi `tool_use`, tu rispondi con `tool_result`. I tool server (web search, code execution...) girano su infrastruttura Anthropic. `strict: true` sui tool garantisce che le chiamate rispettino lo schema. `tool_choice` permette di forzare un tool. I token dei tool (definizioni, `tool_use`, `tool_result`, e un system prompt aggiuntivo di 286 token su Sonnet 5.5) sono fatturati come input/output normali.
- **Structured outputs** (https://platform.claude.com/docs/en/build-with-claude/structured-outputs): `output_config.format` con `json_schema` e/o `strict: true` sui tool; stato **stabile**; supportati tra gli altri `claude-sonnet-5-5`, `claude-haiku-5-5`, `claude-opus-5-5`. Garantiscono JSON conforme allo schema, ma la pagina precisa che **la conformità allo schema non implica che i valori siano accurati**: "validate content in your application". Limiti: niente `minimum`/`maximum`, `minLength`/`maxLength`, schemi ricorsivi; `additionalProperties: false` obbligatorio; fino a 20 tool strict per richiesta; il primo uso di uno schema aggiunge latenza di compilazione; rifiuti (`stop_reason: "refusal"`) e troncamenti (`max_tokens`) possono violare lo schema; cambiare `output_config.format` invalida la prompt cache di quella conversazione.
- **Prompt caching** (https://platform.claude.com/docs/en/build-with-claude/prompt-caching): prefisso `tools` -> `system` -> `messages`; fino a 4 breakpoint espliciti oppure caching automatico; TTL 5 minuti (scrittura 1,25x) o 1 ora (scrittura 2x); lettura da cache 0,1x del prezzo di input (0,05x su Opus 5.5 e Sonnet 5.5); minimo cacheable 512 token su Sonnet 5.5, Haiku 5.5 e Opus 5.5. Cambiare le definizioni dei tool invalida tutta la cache; `tool_choice` invalida tools e system.
- **MCP connector** (https://platform.claude.com/docs/en/agents-and-tools/mcp-connector): beta; collega server MCP **remoti** dalla Messages API senza client MCP (`mcp_servers` + `mcp_toolset`). Limiti dichiarati: solo le *tool call* della specifica MCP sono supportate; il server deve essere esposto pubblicamente via HTTP (Streamable HTTP o SSE); i server STDIO locali non sono collegabili direttamente; non idoneo a Zero Data Retention. Per server locali (come quelli MCP per Scryfall in stdio) serve un client MCP proprio o l'Agent SDK.
- **Claude Agent SDK** (https://code.claude.com/docs/en/agent-sdk/overview): libreria Python e TypeScript che porta loop agentico e tool di Claude Code; offre tool integrati, hook, subagent, MCP, permessi, sessioni. Autenticazione: i terzi non possono offrire login claude.ai o i suoi rate limit, va usata la chiave API. L'uso è regolato dai Commercial Terms di Anthropic (https://www.anthropic.com/legal/commercial-terms). Branding: non usare "Claude Code" come nome del prodotto.
- **Subagent nell'Agent SDK** (https://code.claude.com/docs/en/agent-sdk/subagents): `AgentDefinition` con `description`, `prompt`, `tools`, `model` (alias `haiku`, `sonnet`, `opus`...), `maxTurns`, `mcpServers`, `effort`. Isolamento del contesto (al padre torna solo il messaggio finale), parallelismo, restrizione dei tool per subagent. Limiti configurabili: profondità di annidamento (default 3), concorrenza (default 20), spesa (`maxBudgetUsd` / `max_budget_usd`), che include i subagent. La pagina avverte che Claude decide da sé quando e quanti subagent creare, e che un singolo prompt può crescere in un albero di agenti.

### 3.3 Architettura proposta (derivata dai pattern sopra)

Questa sezione è una **proposta di progetto** costruita sui pattern documentati, non un fatto verificato.

```
Richiesta utente (comandante/tema/budget/bracket/collezione)
        |
   [Router] (Haiku) -> build / improve / rules-question
        |
   [Orchestrator] (Sonnet) -> piano: ruoli e quote (ramp, draw, removal, win con, lands)
        |  tool use (client tools)
        |-- search_cards(scryfall_query)       -> bulk locale / API (cache)
        |-- get_cards(oracle_ids)              -> bulk locale
        |-- find_combos(card_list)             -> Commander Spellbook
        |-- query_rules(text)                  -> CR locali (RAG/grep)
        |
   [Proposta strutturata] (output_config.format: lista di {oracle_id, ruolo, motivo})
        |
   [Validatore deterministico] (codice, nessun LLM)
        |  errori strutturati -> torna all'Orchestrator (max N giri)
        v
   [Spiegazione] + approvazione umana -> export (Moxfield/Archidekt/testo)
```

### 3.4 Validazione deterministica (anti-allucinazioni)

Regole controllabili in codice con i soli dati Scryfall (campi verificati in 2.2):

| Controllo | Come | Campo / fonte |
|---|---|---|
| Esistenza della carta | Ogni voce deve avere un `oracle_id` presente nel bulk Oracle Cards; i nomi liberi vengono risolti solo con match esatto o fuzzy controllato (`/cards/named`), mai accettati così | Bulk `oracle_cards`; `POST /cards/collection` (max 75) |
| Legalità nel formato | `legalities[formato] == "legal"` (e `restricted` gestito a parte) | `legalities` |
| Banlist | Coperta da `legalities == "banned"`; rieseguire dopo ogni aggiornamento bulk | `legalities` |
| Numero carte | 100 per Commander (compresi comandante e compagni), 60+15 per costruito: contare con le quantità | Codice |
| Singleton | Un solo esemplare per `oracle_id`, eccetto terre base e carte con eccezione esplicita | Codice + testo Oracle |
| Identità di colore | Per ogni carta `color_identity` ⊆ identità del comandante | `color_identity` |
| Comandante valido | La carta deve poter essere comandante (Scryfall `is:commander`, regola CR 903.3) | `is:commander`, CR |
| Bracket / Game Changers | Contare le carte con `game_changer == true`; confrontare con il bracket richiesto; stimare con `estimate-bracket` di Commander Spellbook | `game_changer`; Commander Spellbook |
| Budget | Somma prezzi dal bulk del giorno (solo stima, i prezzi sono "dangerously stale" dopo 24 ore) | Bulk, `prices` |
| Output ben formato | `output_config.format` / `strict: true` | Structured outputs |

Il validatore restituisce errori strutturati (carta, regola violata, suggerimento di ricerca) che l'orchestrator riceve come `tool_result`, con un tetto di iterazioni. Il progetto `nathanmartins/mtg-mcp` implementa già gran parte di questi controlli in `validate_deck` (https://github.com/nathanmartins/mtg-mcp) e il sito KrakenTheMeta dichiara lo stesso schema di "match su Scryfall, legalità, singleton, identità di colore" (https://krakenthemeta.com/).

### 3.5 Scelta tra Messages API, Agent SDK e MCP

| Opzione | Quando conviene | Fonte |
|---|---|---|
| **Messages API + tool use + loop proprio (o tool runner)** | Pipeline semplice e controllabile, pochi tool, costi prevedibili. Consigliata da Anthropic come punto di partenza ("start with direct API calls"). | https://www.anthropic.com/engineering/building-effective-agents |
| **Agent SDK** | Se servono subagent, sessioni, hook, permessi e tool MCP locali senza scrivere l'infrastruttura. Richiede chiave API. | https://code.claude.com/docs/en/agent-sdk/overview |
| **MCP (server proprio)** | Se i tool devono essere riusabili da più client (Claude Desktop, Claude Code, altri). Il connector API vuole server remoti HTTP. | https://modelcontextprotocol.io/docs/getting-started/intro , https://platform.claude.com/docs/en/agents-and-tools/mcp-connector |
| **Server MCP esistenti** | Per prototipare in fretta (j4th, nathanmartins, bmurdock, tutti MIT). Attenzione alle integrazioni non ufficiali (EDHREC, Moxfield, MTGGoldfish): vedi 2.8. | sezione 1.2 |

### 3.6 Stima qualitativa di costi e latenza

**Prezzi per MTok dalla pagina ufficiale** (https://platform.claude.com/docs/en/about-claude/pricing, consultata il 2026-11-04):

| Modello | Input | Output | Lettura da cache | Batch (input/output) |
|---|---|---|---|---|
| Haiku 5.5 (prompt fino a 100k token) | 0,10 USD | 0,50 USD | 0,01 USD | 0,05 / 0,25 USD |
| Sonnet 5.5 | 2 USD | 10 USD | 0,10 USD (elenco)* | 1 / 5 USD |
| Opus 5.5 | 4 USD | 20 USD | 0,20 USD | 2 / 10 USD |

\* La pagina di prompt caching indica per Sonnet 5.5 e Opus 5.5 una lettura da cache a 0,05x; la tabella prezzi mostra 0,10 USD (Sonnet 5.5) e 0,20 USD (Opus 5.5) con nota a piè di pagina. Il dato esatto va riverificato prima di usarlo nei calcoli.

**Stima (mia, non di Anthropic).** Una costruzione completa di mazzo da 100 carte con orchestrator Sonnet, tool use e 2-3 giri di correzione è plausibilmente nell'ordine di 50-200 mila token di input totali (molti rileggono lo stesso contesto) e 10-30 mila di output. A questi prezzi significa **ordine di decine di centesimi a pochi dollari per mazzo con Sonnet, meno con Haiku per router e ricerca, di più con Opus**. Sono ordini di grandezza da verificare con una misura sulle prime esecuzioni (`usage` della risposta, `cache_read_input_tokens`). I fattori che contano, secondo la documentazione:
- il prompt caching dei prefissi stabili (tool, system prompt, regole) riduce molto il costo di input dei giri successivi: la lettura costa 0,1x o meno dell'input base;
- i tool e le loro risposte contano come token di input: restituire pochi campi per carta (nome, `oracle_id`, costo, testo Oracle breve) invece di JSON Scryfall completi;
- gli agenti usano circa 4x e il multi-agente circa 15x i token di una chat (https://www.anthropic.com/engineering/multi-agent-research-system): un solo orchestrator con tool costa meno di una squadra di subagent;
- la Batch API dimezza i prezzi (vedi tabella) ma non è adatta a una chat interattiva; è adatta a valutazioni offline.

**Latenza (qualitativa).** Il collo di bottiglia sono i giri sequenziali modello-tool. Le chiamate di tool in parallelo nello stesso turno e i subagent paralleli riducono il tempo (Anthropic riporta fino al 90% in meno su query complesse), ma aumentano i token. Se i dati carte stanno in locale (bulk Oracle in SQLite o in memoria), i tool rispondono in millisecondi e non toccano il limite di 2 richieste/secondo di Scryfall.

### 3.7 Considerazioni per un progetto personale

Fatti verificati rilevanti:
- Scryfall chiede cache di almeno 24 ore e bulk per lookup massivi; i bulk Oracle pesano 24 MB compressi. Un sistema personale può quindi lavorare quasi tutto in locale.
- L'Agent SDK richiede chiave API; non si può usare l'abbonamento claude.ai per un prodotto offerto ad altri (https://code.claude.com/docs/en/agent-sdk/overview).
- L'Agent SDK offre `maxBudgetUsd` e limiti di profondità/concorrenza, utili come freno ai costi.
- Strutturato: lo schema compilato viene messo in cache per 24 ore; evitare di cambiare spesso gli schemi.

---

## 4. Vincoli legali

### 4.1 Fan Content Policy di Wizards

Fonte: https://company.wizards.com/en/legal/fancontentpolicy (testo letto integralmente il 2026-11-04; pagina con "Last Updated: November 15, 2017").

| Tema | Cosa dice la policy |
|---|---|
| Gratuità | "F-R-E-E": non si possono richiedere pagamenti, sondaggi, download, iscrizioni o registrazione via email per accedere ai Fan Content; non si possono vendere né concedere in licenza a terzi per compenso; devono essere liberamente accessibili a tutti (compresa Wizards) senza pagare, ottenere approvazione o dare credito. |
| Finanziamento | Sono ammessi sponsor, pubblicità e donazioni (esempio Patreon, YouTube, Twitch) "purché non interferiscano con l'accesso della community". Per altre licenze a pagamento serve permesso scritto. |
| Disclaimer | Va indicato che il contenuto è non ufficiale, con la formula "[Titolo] is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC." |
| Marchi e loghi | Non usare i loghi e marchi Wizards (c'è una lista nelle FAQ); non togliere note di copyright dai materiali Wizards. |
| Meccaniche e altri giochi | Non si possono incorporare brevetti o "game mechanics" senza permesso scritto (eccetto D&D con OGL); non usare la IP Wizards in altri giochi. |
| Copie verbatim | I Fan Content non includono la copia e ripubblicazione verbatim della IP Wizards (esempio citato: proxy o carte contraffatte). |
| Rimozione | Wizards può fermare o limitare l'uso in qualsiasi momento "per qualsiasi motivo", a sua discrezione. |
| Responsabilità | Se Wizards riceve richieste legali per il tuo Fan Content, paghi tu i costi. |
| Termini Wizards | In caso di conflitto prevalgono i Terms of Use e il Code of Conduct di Wizards. |
| Contatti | Per usi non coperti, richiesta scritta tramite https://support.wizards.com ; il silenzio non è approvazione. |

**Contenuti generati con AI.** La Fan Content Policy **non menziona l'intelligenza artificiale**: nessun divieto né permesso esplicito per contenuti generati con AI è presente nel testo (pagina letta, ricerca di "AI", "generative", "artificial", "machine learning": nessun risultato). Le sole posizioni ufficiali di Wizards sull'AI generativa trovate riguardano i **propri prodotti e creativi**:
- 19 dicembre 2023: "Le nostre linee guida interne restano le stesse sugli strumenti di AI: richiediamo ad artisti, scrittori e creativi che contribuiscono al TCG Magic di astenersi dall'usare strumenti generativi di AI per creare il prodotto finale": https://magic.wizards.com/en/news/announcements/generative-artificial-intelligence-tools-and-magic
- 7 gennaio 2024: dopo la segnalazione della community su immagini di marketing, Wizards dichiara di ripensare il processo con i fornitori per la creatività di marketing: https://magic.wizards.com/en/news/announcements/an-update-on-generative-ai-tools-and-magic
- Pagina per artisti freelance: i portfolio con arte generata da AI non vengono considerati (riportato dai risultati di ricerca, **pagina non letta direttamente**: https://company.wizards.com/en/freelance-art-submissions , **[NON VERIFICATO]** nel dettaglio).

Queste dichiarazioni non regolano un software di terzi che usa un LLM per suggerire liste di carte. Se l'assistente producesse *testo di carte o immagini* (es. carte "inventate" o arte generata) la situazione sarebbe diversa e non è coperta da fonte primaria: **[NON VERIFICATO]**.

**Tool di terze parti.** La policy non distingue tool software da altri contenuti: dice che "Fan Content" include "praticamente qualsiasi cosa tu crei basata su o che incorpora la nostra IP", compresi i siti web. Applicazioni pratiche per un tool di deckbuilding:
- deve essere gratuito (nessun paywall sull'accesso al tool); i ricavi ammessi sono pubblicità, sponsor e donazioni che non ostacolino l'accesso;
- deve mostrare il disclaimer; non deve usare il logo Magic né, in generale, i marchi della lista;
- le risorse commerciali a pagamento (abbonamenti per funzioni) sono in tensione con la policy: i siti esistenti con piani a pagamento (KrakenTheMeta, SpellRack, DeckCheck, MTGGoldfish) dichiarano comunque il riferimento a Fan Content o usano Scryfall; come Wizards giudichi la cosa non è documentato: **[NON VERIFICATO]**.

Il progetto personale a uso privato (non pubblicato) non rientra nei casi di distribuzione trattati dalla policy: cosa valga per l'uso strettamente personale non è dichiarato dal testo: **[NON VERIFICATO]**.

### 4.2 Policy Scryfall su dati, immagini e AI

Vedi 2.2. In sintesi: nessun paywall sui dati, valore aggiunto obbligatorio (niente proxy/ripubblicazione), rispetto di rate limit e header, regole sulle immagini, niente nome/logo Scryfall in modo che implichi approvazione, nessun uso per creare nuovi giochi. I ToS vietano contenuti generati da AI *su* Scryfall (MTG Wiki incluso), ma non risultano clausole sull'uso dei dati API con LLM: https://scryfall.com/docs/terms , https://scryfall.com/docs/api .

### 4.3 Altre fonti con vincoli rilevanti

- Wizards Terms of Use, art. 2.2 (i): divieto di data mining/scraping con agenti, robot, script o spider sui siti Wizards: https://company.wizards.com/en/legal/terms .
- EDHREC ToS: vedi 2.8.
- MTGGoldfish `robots.txt`: `ai-train=no` e crawler AI bloccati (inclusi ClaudeBot e anthropic-ai): https://www.mtggoldfish.com/robots.txt .
- Anthropic: uso dell'Agent SDK sotto Commercial Terms e con chiave API: https://code.claude.com/docs/en/agent-sdk/overview .

---

## 5. Lacune e opportunità (interpretazione, NON fatti verificati)

Questa sezione è giudizio personale, ricavato dai fatti sopra; non è confermata da fonte primaria.

1. **Il vero differenziatore è la verificabilità, non l'AI.** I concorrenti AI (KrakenTheMeta, DeckCheck) già dichiarano validazione su Scryfall; la stragrande maggioranza dei progetti open source la implementa in modo parziale. Un tool che mostri in output *quale regola ha passato* (legalità, identità, singleton, bracket) e *quale carta è stata sostituita perché non valida* sarebbe più convincente di una chat generica.
2. **Spazio per un assistente che parte dalla collezione dell'utente.** SuperBrew (MTGGoldfish) fa qualcosa di simile solo a pagamento e senza AI; `mtg-deck-advisor` lo fa come demo di portfolio. Un assistente "mazzo migliore con le carte che ho, entro budget e bracket" con spiegazioni è una nicchia che i grandi non coprono (da verificare con una prova diretta: la presenza di funzioni non documentate non è esclusa).
3. **Il meta è l'anello debole.** Le fonti ufficiali e gratuite coprono carte, regole, combo e tag; EDHREC, MTGGoldfish e Moxfield non offrono API ufficiali e due sono ostili ai bot AI. Opzioni: usare `edhrec_rank` e i tag Oracle di Scryfall come proxy di popolarità, usare Commander Spellbook per le sinergie, e trattare qualsiasi dato EDHREC/Goldfish come input manuale dell'utente (es. lista incollata) e non come scraping.
4. **Il modello di business è vincolato.** Con la Fan Content Policy e la policy Scryfall, un servizio con paywall sull'accesso è a rischio. Un progetto personale gratuito (o con donazioni) evita il problema; per monetizzare servirebbe permesso scritto di Wizards. Una soluzione intermedia (ipotesi): software open source auto-ospitato in cui l'utente porta la propria chiave API Anthropic, così non si vende l'accesso ai contenuti. Va verificata con Wizards se si vuole distribuire.
5. **Architettura minima consigliata.** Un workflow con un solo orchestrator, 4-5 tool, validatore deterministico e approvazione umana copre l'obiettivo. Subagent paralleli sono un'ottimizzazione di latenza da introdurre dopo una valutazione su ~20 casi (come suggerisce Anthropic), non il punto di partenza.
6. **Rischio MCP di terzi.** Riusare `j4th/mtg-mcp-server` solo con le integrazioni ufficiali (Scryfall, Commander Spellbook) e lasciare disattivati i flag per EDHREC, Moxfield e MTGGoldfish (endpoint non documentati, reverse-engineered o scraping) finché i ToS non sono chiariti.
7. **Domande aperte da risolvere prima di costruire:**
   - termini d'uso di 17Lands, Moxfield, MTGGoldfish (pagine non leggibili);
   - prezzo e API di DeckCheck;
   - se Moxfield o Archidekt abbiano funzioni AI non documentate pubblicamente;
   - posizione di Wizards sui tool di terzi a pagamento con AI;
   - valore esatto dello sconto di lettura da cache per Sonnet 5.5/Opus 5.5 (pagina caching e tabella prezzi non coincidono in modo chiaro).
