# Fattibilità di un portale community/news per Magic: The Gathering (modello Liquipedia + Icy Veins)

Data di consultazione: 2026-11-04. Ricerca svolta solo su fonti primarie quando raggiungibili.

Convenzioni:
- **[NON VERIFICATO]** = non confermabile da fonte primaria durante questa ricerca.
- **[DERIVATO]** = mia deduzione, non un fatto di una fonte.
- L'URL è indicato accanto a ogni affermazione.
- Le pagine di Liquipedia (HTML), Icy Veins e Melee.gg (sito principale) rispondono 403 o con una verifica anti-bot ai client automatici. Non ho aggirato i blocchi: le regole di Liquipedia vietano l'accesso automatizzato all'HTML (vedi sezione 1.1). Dove ho usato solo l'estratto di un risultato di ricerca su una pagina ufficiale, lo segnalo.

---

## Sintesi

1. **Il circuito è tracciabile ufficialmente, i dati strutturati no.** magic.gg pubblica calendario, standings, decklist e VOD, ma non ho trovato RSS, API o feed ufficiali. `https://magic.gg/rss.xml`, `/feed` e `/sitemap.xml` rispondono 200 ma restituiscono HTML (fallback dell'app web), non XML. `https://magic.wizards.com/en/rss/rss.xml` risponde 404. I dati vanno quindi curati a mano o letti dalle pagine HTML, e questo ha implicazioni di ToS (sezione 2).
2. **Liquipedia ha già una wiki Magic** (`liquipedia.net/magic`), che copre soprattutto Pro Tour storici. I risultati di ricerca mostrano pagine del 2000–2023 e un portale tornei con snapshot vecchio. Non ho potuto verificare se sia aggiornata al 2026. Il contenuto è CC-BY-SA 3.0 secondo i termini API di Liquipedia. L'API LiquipediaDB richiede approvazione e ha un limite di 60 richieste/ora, quindi non è una base praticabile per un aggregatore live. Oltre a questo, Liquipedia vieta l'accesso automatizzato all'HTML.
3. **Il live è la parte più fattibile e a basso costo.** Twitch Helix `GET /streams?game_id=` con un app access token elenca chi è in diretta nella categoria Magic. YouTube `search.list` (`eventType=live`) ha però una quota di soli 100 chiamate/giorno nel progetto di default. L'embed è consentito da entrambe le piattaforme, con regole precise (parent, dimensioni minime, nessuna modifica del player).
4. **La Fan Content Policy consente un sito di fan gratuito**, con pubblicità, sponsor e donazioni purché non ostacolino l'accesso. Non permette abbonamenti a pagamento né paywall sui contenuti, e richiede il disclaimer. Wizards può revocare l'uso della sua IP in qualsiasi momento.
5. **Cosa conviene fare per primo [DERIVATO]:** un calendario curato a mano (JSON/YAML in un repository) del circuito pro con link ufficiali, più un blocco "in diretta ora" alimentato da Twitch Helix con cache breve. News: solo titolo+link da fonti con feed, con breve riassunto originale. Bracket e risultati live solo con link a magic.gg, finché non esiste una fonte dati autorizzata.

---

## 1. Modelli di riferimento e struttura del circuito

### 1.1 Liquipedia

| Aspetto | Fatto | Fonte |
|---|---|---|
| Origine e gestione | Progetto aperto fondato da Team Liquid, descritto come wiki crowd-sourced mantenuta da volontari. Dal solo estratto di ricerca. | https://liquipedia.net/hub/Support/Liquipedia **[estratto di ricerca; pagina non aperta direttamente]** |
| Licenza contenuti | CC-BY-SA 3.0, con obbligo di citare Liquipedia come fonte dei dati. | https://liquipedia.net/api-terms-of-use |
| Pagina "Copyrights" | Non letta: 403 e verifica anti-bot. | https://liquipedia.net/commons/Liquipedia:Copyrights **[NON VERIFICATO oltre i termini API]** |
| API MediaWiki | Max 1 richiesta ogni 2 secondi; `action=parse` max 1 richiesta ogni 30 secondi. | https://liquipedia.net/api-terms-of-use |
| API LiquipediaDB | Max 60 richieste/ora; serve una richiesta approvata e non si condividono le chiavi. | https://liquipedia.net/api-terms-of-use |
| User-Agent | Obbligatorio un User-Agent personalizzato con contatto; agenti generici (es. "Python-requests") probabilmente bloccati. | https://liquipedia.net/api-terms-of-use |
| Cache e compressione | Mettere in cache il più possibile; client con supporto gzip e riuso delle connessioni. | https://liquipedia.net/api-terms-of-use |
| HTML | "Automated access to generated HTML pages is not permitted." Violazioni: ban IP temporanei, poi permanenti. | https://liquipedia.net/api-terms-of-use |
| Revoca | Liquipedia può modificare o terminare l'accesso API senza preavviso. | https://liquipedia.net/api-terms-of-use |

Esiste una **Liquipedia Magic: The Gathering** a `https://liquipedia.net/magic/`. Ho verificato che esistano pagine per i Pro Tour (es. https://liquipedia.net/magic/Pro_Tour/The_Lord_of_the_Rings, https://liquipedia.net/magic/Portal:Tournaments) tramite risultati di ricerca. L'attuale livello di aggiornamento 2026 è **[NON VERIFICATO]**: i metadati dei risultati indicavano pagine vecchie di 500–1.100 giorni e il portale mostrava eventi fino al 2023.

Altri equivalenti:
- **MTG Wiki** (https://mtg.wiki): enciclopedia a modifica libera, non affiliata a Wizards. Contiene anche pagine su eventi (es. https://mtg.wiki/page/2026_World_Championship, https://mtg.wiki/page/RC). Il fatto che ora sia ospitata da Scryfall viene da un riassunto di ricerca: **[NON VERIFICATO da fonte primaria]**.
- Non ho trovato un portale community di news ed eventi per Magic con le caratteristiche di Liquipedia + Icy Veins. Questo non prova che non esista.

**Funzioni Liquipedia riutilizzabili come modello [DERIVATO]:** pagine torneo con tier, luogo, date, prize pool, partecipanti, bracket e risultati; portale tornei; calendario. Per la pagina Magic ho visto tier, località, date, numero di giocatori, prize pool e top 8 nelle anteprime di ricerca.

Modello di business di Liquipedia: negozio collegato dalle pagine delle squadre, che secondo l'estratto finanzia la wiki (https://liquipedia.net/hub/Support/Liquipedia **[estratto di ricerca]**). Pubblicità o abbonamenti: **[NON VERIFICATO]**.

### 1.2 Icy Veins

Pagine ufficiali raggiungibili solo tramite estratti di ricerca (le pagine rispondono 403 ai client automatici). Quindi tutto questo blocco è **[NON VERIFICATO da lettura diretta]**:
- Proprietà: secondo l'estratto, la pagina About indica Enthusiast Gaming come proprietario e VEDATIS SAS (Francia) come operatore legale (https://www.icy-veins.com/about). La privacy policy cita altri gestori (https://www.icy-veins.com/privacy). Le due pagine non coincidono su indirizzo, quindi i dettagli societari sono incerti.
- Monetizzazione: pubblicità, più abbonamento Premium che rimuove annunci e tracking e dà video "Masterclass" per WoW, canale Discord con esperti e badge (https://www.icy-veins.com/premium, https://www.icy-veins.com/premium-faq). I prezzi nelle pagine consultate sono incoerenti (da 3,99 a 4,99 al mese); non riportarli come dato.
- Contenuti: guide per classe/ruolo e news su giochi Blizzard, contenuto editoriale scritto da autori. **[NON VERIFICATO in questa ricerca]**

**[DERIVATO]** Per Magic il modello Icy Veins equivale a guide di formato/mazzo e meta report. Il vincolo della Fan Content Policy (contenuto gratuito, nessun paywall) esclude la parte "Premium a pagamento" per quei contenuti. La pubblicità resta ammessa.

### 1.3 Circuito pro attuale (fonti Wizards / magic.gg)

Struttura 2026–27 secondo magic.gg:

| Livello | Descrizione | Fonte |
|---|---|---|
| RCQ (Regional Championship Qualifier) | Eseguiti nei negozi WPN e in eventi "destination", dal 15 agosto al 29 novembre 2026 per il round corrente. Chi vince o piazza bene ottiene l'invito al Regional Championship. I RCQ nei negozi possono essere Standard o Limited. | https://magic.gg/news/play-update-2026-27-round-2-regional-championship-promos-and-qualifiers |
| Regional Championship (RC) | Dal 11 settembre 2026, formato Modern. I migliori ottengono l'invito al primo Pro Tour del 2027. Date: Hangzhou 11–13 set; Baltimora 11–13 set; Ottawa 2–4 ott; Yokohama 3–4 ott; Ghent 9–11 ott; Los Angeles 9–11 ott; Città del Messico 9–11 ott; Buenos Aires 23–24 ott; Sydney 23–25 ott; Taipei e Sud-Est asiatico da definire. | stessa pagina |
| Pro Tour | 2026: Lorwyn Eclipsed (Richmond, 30 gen–1 feb, evento chiuso), Secrets of Strixhaven (MagicCon Las Vegas, 1–3 mag), Marvel Super Heroes (MagicCon Amsterdam, 17–19 lug). | https://magic.gg/news/the-pro-tour-and-magic-spotlight-series-in-2026 |
| Magic Spotlight Series | Eventi di due giorni a invito aperto, montepremi 50.000 $ (60.000 $ per il Team Limited Marvel). Gli 8 migliori (4 squadre nel Team Limited) ottengono l'invito al Pro Tour. Ultimi nel 2026: Fracture a Hartford (23–25 ott) e Pechino (31 ott–1 nov). | https://magic.gg/news/the-pro-tour-and-magic-spotlight-series-in-2026 |
| World Championship 32 | MagicCon Atlanta, 13–15 novembre 2026, a invito. Formati: Star Trek Booster Draft e Standard. 14 turni svizzeri, poi top 8 a eliminazione diretta. Montepremi 1.000.000 $ (vincitore 100.000 $). | https://magic.gg/news/world-championship-32-fact-sheet-for-competitors |
| Arena: Qualifier Weekend e Arena Championship | Il Qualifier Weekend è un evento di due giorni su MTG Arena; con 4 vittorie al secondo giorno si ottiene l'invito all'Arena Championship. Nel 2026: 19–20 set (Sealed), 31 ott–1 nov (Standard), 21–22 nov (Sealed), 19–20 dic (Pioneer). Arena Championship 2027: AC14 13–14 mar (Pioneer), AC15 10–11 lug (Standard), AC16 16–17 ott (Historic). La pagina contiene lunghezze di corso incoerenti per il giorno 2. Il collegamento tra Arena Championship e Pro Tour/Worlds non è spiegato lì. | https://magic.wizards.com/en/news/mtg-arena/qualifier-play-ins-and-qualifier-weekend-information |

Nota: l'articolo di febbraio 2026 indicava inizialmente Modern per i RCQ di aprile–agosto e Standard per gli RC di primavera (https://magic.gg/news/play-update-2026-27s-regional-championship-qualifier-events-promos-and-more). Le regole cambiano ogni stagione: il calendario va controllato a ogni annuncio.

Presenza di streaming ufficiale: magic.gg linka Twitch https://www.twitch.tv/magic, YouTube https://www.youtube.com/c/mtg_esports e la playlist VOD https://www.youtube.com/@Play_MTG/playlists (da https://magic.gg/schedule). La pagina non linka stream specifici per evento.

Il termine "Store Championship" appare solo come link di navigazione, senza dettagli (https://magic.gg/news/play-update-2026-27s-regional-championship-qualifier-events-promos-and-more).

---

## 2. Fonti di dati su eventi e risultati

| Fonte | Cosa offre | API/feed ufficiale | Note e ToS |
|---|---|---|---|
| magic.gg | Menu Events/Schedule, Decklists, News, Standings, History/VODs | **Nessun RSS/API trovato.** Le URL `/rss.xml`, `/feed`, `/sitemap.xml` restituiscono HTML (200, `text/html`); `/news/rss` 404. `robots.txt`: `User-agent: *`, `Disallow:` vuoto, senza istruzioni per bot. Verificato con richieste dirette, 2026-11-04. | https://magic.gg/robots.txt. Lo scraping è regolato dai Termini di Wizards (sotto). |
| magic.wizards.com | Notizie ufficiali Wizards | `/en/rss/rss.xml` → 404. `robots.txt` elenca sitemap per lingua. | https://magic.wizards.com/robots.txt |
| Termini di uso Wizards | Il §2.2(i) vieta mezzi non autorizzati che "accesses, collects, reads, intercepts, monitors, data scrapes" i servizi (bot, script, spider); §2.2(vii) vieta carico irragionevole; §2.1 licenza solo per uso "individual and non-commercial"; §14.1 afferma che la Fan Content Policy "only permits noncommercial activities" per streaming e condivisione. | – | https://company.wizards.com/en/legal/terms. Letto solo fino a circa 100.000 dei 120.305 caratteri. **Tensione [DERIVATO]:** la Fan Content Policy ammette ads e donazioni (sezione 4), i Termini §14.1 parlano di attività non commerciali. Va chiarita con Wizards prima di una monetizzazione seria. |
| Melee.gg | Piattaforma di tornei usata da organizzatori (Magic incluso) | Accesso API **solo a organizzazioni e relativo staff**; per dati di organizzazioni altrui serve almeno il ruolo "Coverage Staff" per ogni torneo, con permesso dell'organizzazione e responsabilità sui dati personali. Richiesta via email. | https://help.melee.gg/docs/api-use/ (letto direttamente). Il sito https://www.melee.gg dà 403 ai client automatici; i ToS non sono stati letti: **[NON VERIFICATO]**. |
| HRI Public API (terze parti) | API non ufficiale per tornei Melee | Chiave Bearer | https://hri.gg/api/reference. **Non è un prodotto Melee.** Estratto di ricerca; termini non verificati. |
| Wizards EventLink / Companion | Strumento per organizzatori WPN, pairings e risultati | Nessuna API pubblica trovata | Documentazione consultata solo come articoli WPN (es. https://wpn.wizards.com/es/news/definitive-guide-wizards-eventlink). **[NON VERIFICATO]** che non esista. |
| Battlefy | Piattaforma di tornei generica | Nessuna documentazione API ufficiale trovata | **[NON VERIFICATO]**. Non ho trovato evidenza di uso per Magic. |
| Liquipedia | Dati torneo/bracket per molti giochi, Magic incluso | MediaWiki API e LiquipediaDB (vedi 1.1) | https://liquipedia.net/api-terms-of-use |
| Scryfall | Dati e immagini di carte, non eventi | API pubblica con User-Agent e Accept obbligatori; limiti rigidi | https://scryfall.com/docs/api. Vedi la nota sulle istruzioni per agenti AI in fondo al documento. |

**[DERIVATO]** Per risultati e bracket non c'è un canale ufficiale riusabile in modo automatico: le opzioni sono l'inserimento manuale (calendario, vincitori, link ai bracket di magic.gg) o richiedere permessi (Wizards per i dati, Melee/organizzatori per le API). Uno scraping di magic.gg andrebbe contro il §2.2(i) dei Termini, a meno di autorizzazione scritta.

---

## 3. Live e streaming

### 3.1 Twitch

| Tema | Fatto | Fonte |
|---|---|---|
| Elencare i live per categoria | `GET https://api.twitch.tv/helix/streams`; accetta `game_id` (fino a 100 ID), `language` (fino a 100), `type=live`, `first` (max 100, default 20), paginazione con cursore. Ordinamento per numero di spettatori decrescente; con la paginazione possono comparire duplicati o mancanti. | https://dev.twitch.tv/docs/api/reference/#get-streams |
| Autenticazione | Basta un **app access token** (non serve l'utente) o un user token. | stessa pagina |
| Trovare il `game_id` | Categoria pubblica "Magic: The Gathering": https://www.twitch.tv/directory/category/magic-the-gathering. L'ID numerico si ottiene con `GET /helix/games?name=...`. **[NON VERIFICATO]**: non ho eseguito la chiamata (serve un token). Esiste anche la categoria separata "Magic: The Gathering - Battlegrounds". |
| Rate limit | Token-bucket per client ID, con costo di 1 punto per richiesta di default. In caso di esaurimento: HTTP 429. Header `Ratelimit-Limit`, `Ratelimit-Remaining`, `Ratelimit-Reset`. Il valore numerico del bucket non è indicato in quella pagina (l'esempio riporta 800, senza specificare a quale bucket appartenga). | https://dev.twitch.tv/docs/api/guide/#twitch-rate-limits |
| EventSub `stream.online` / `stream.offline` | La condizione è l'ID del broadcaster. La documentazione non mostra una condizione per categoria. `channel.update` si può filtrare solo sul payload (`category_id`). | https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/ |
| Limiti EventSub | Max 3 connessioni WebSocket con sottoscrizioni attive; max 300 sottoscrizioni abilitate per connessione; il limite totale è basato su costo (`max_total_cost`). | https://dev.twitch.tv/docs/eventsub/manage-subscriptions/ |
| Embed | Parametro `parent` obbligatorio per iframe (uno per dominio). Dimensione minima 400×300. Autoplay di default `true` per live e VOD, soggetto a visibilità e dimensione. Embed JS: `player.twitch.tv/js/embed/v1.js`. | https://dev.twitch.tv/docs/embed/video-and-clips/ |
| ToS: cache | "Do not store copies of Twitch Content or Program Materials, unless you ... cache such information for only a twenty-four hour time period without further sharing it with third parties". Aggiornare le cache e cancellare i dati rimossi o scaduti. | https://legal.twitch.com/en/legal/developer-agreement/ (§ "Storage of Program Materials/Twitch Content") |
| ToS: embed | Si deve usare il player Twitch per i video Twitch; vietato modificare, coprire o oscurare il player, le sue pubblicità o i marchi Twitch. Vietati siti che replicano l'esperienza Twitch senza contenuto aggiuntivo di valore sulla stessa pagina; vietato inviare gli embed a reti pubblicitarie; vietato far pagare specificamente la visione dell'embed. Pubblicità sulla stessa pagina consentita se c'è altro contenuto di valore. Per usare i canali per promuovere un prodotto commerciale serve l'autorizzazione degli streamer. | stessa pagina (§ "Embeddable Experiences") |

**[DERIVATO]** Poiché EventSub non permette la sottoscrizione per categoria, per scoprire chi trasmette Magic conviene fare polling di `GET /streams?game_id=...&first=100` (1 punto a richiesta) ogni 1–2 minuti, con cache sotto le 24 ore. EventSub `stream.online` ha senso solo per una lista fissa di canali ufficiali e di partner (magic, player, commentatori).

### 3.2 YouTube

| Tema | Fatto | Fonte |
|---|---|---|
| Quota di default | 10.000 unità/giorno per tutti gli altri endpoint, più **100 chiamate/giorno** per `search.list` e `videos.insert` (bucket separati). `search.list` costa 1 per chiamata, ma il tetto è 100 al giorno; `videos.list` costa 1. La quota si azzera a mezzanotte PT. | https://developers.google.com/youtube/v3/determine_quota_cost (verificato anche direttamente sul testo della pagina) |
| Rilevare i live | `search.list` con `type=video` e `eventType=live`; `q` con operatori `-` e `\|`; `regionCode`, `videoCategoryId`. Nessuna autorizzazione OAuth richiesta per questi parametri, basta una API key. | https://developers.google.com/youtube/v3/docs/search/list |
| Non esiste la "categoria gioco" come su Twitch | **[DERIVATO]** Per Magic si ricorre a `q` e a una lista di canali noti; con soli 100 `search.list` al giorno il polling è molto limitato. Alternativa a basso costo: usare `videos.list` (1 unità) su ID di video live già noti. |
| Dati in cache | I dati non autorizzati si possono conservare al massimo 30 giorni e vanno mantenuti coerenti con YouTube. | https://developers.google.com/youtube/terms/developer-policies |
| Embed | Viewport minimo 200×200; consigliato 480×270 per 16:9. `origin` consigliato, non obbligatorio. L'embed di una diretta tramite canale non è descritto in quella pagina: **[NON VERIFICATO]**. | https://developers.google.com/youtube/iframe_api_reference |
| Regole sul player | Vietato modificare o bloccare il player, rimuovere link o annunci, riprodurre in background da un player non visibile, far pagare per vedere un video incorporato, richiedere azioni oltre al clic su play. Branding YouTube da non oscurare. | https://developers.google.com/youtube/terms/developer-policies |
| Pubblicità | Vendere pubblicità su o dentro il contenuto o il player YouTube richiede approvazione scritta. È ammessa pubblicità su pagine con dati API solo se il contenuto non-YouTube della pagina ha valore indipendente sufficiente. | stessa pagina |

Se serve più quota di YouTube, l'aumento si richiede a Google; la procedura non è stata verificata qui: **[NON VERIFICATO]**.

---

## 4. News e Fan Content Policy

### 4.1 Fonti di news

| Fonte | Feed ufficiale? | Nota |
|---|---|---|
| magic.gg/news | Nessun RSS trovato (vedi sezione 2) | Pagina elenco leggibile; ogni articolo ha URL stabile (es. https://magic.gg/news/the-pro-tour-and-magic-spotlight-series-in-2026). |
| magic.wizards.com/news | RSS `/en/rss/rss.xml` → 404 | Altri percorsi di feed non provati: **[NON VERIFICATO]**. |
| Altri editori (SCG, MTG Rocks, ecc.) | Non verificato | Non ho aperto i loro termini né i loro feed. **[NON VERIFICATO]**. |

I siti di terze parti compaiono nei risultati di ricerca ma non sono stati usati come fonte di fatti, tranne dove indicato.

### 4.2 Regole di riuso (titolo+link vs riproduzione)

- Il riuso dei testi e delle immagini dei siti Wizards è regolato dai Termini: vietato copiare, modificare o creare opere derivate dai siti, incluse "links or frames to content, images, or artwork" senza autorizzazione (§2.2(ii), https://company.wizards.com/en/legal/terms). L'interpretazione di quanto vieti il semplice link è **[NON VERIFICATO]**.
- **[DERIVATO]** Cautela: titolo, link e breve riassunto originale (scritto da te) sono il minimo rischio; copiare il corpo degli articoli o ospitare le loro immagini va evitato.
- Immagini di carte: Scryfall le fornisce gratis, ma impone regole d'uso: non coprire o ritagliare copyright e nome dell'artista, non distorcere, sfocare o desaturare, non aggiungere watermark o loghi, non farle sembrare di un altro gioco (https://scryfall.com/docs/api). Con `art_crop` va comunque indicato artista e fonte. I dati sono citati come Fan Content (stessa pagina).
- Video e musica di Wizards: non vanno incorporati direttamente, ma si possono incorporare da piattaforme terze autorizzate (YouTube, Twitch) (https://company.wizards.com/en/legal/fancontentpolicy).

### 4.3 Fan Content Policy (https://company.wizards.com/en/legal/fancontentpolicy)

| Tema | Regola |
|---|---|
| Gratuità | Il contenuto deve essere gratuito per la community: niente pagamenti, sondaggi, download, abbonamenti o registrazione via email per accedervi. Gruppi privati con login ammessi. |
| Monetizzazione | Sponsor, ricavi pubblicitari e donazioni ammessi se non interferiscono con l'accesso (esempi: Patreon, ricavi da YouTube o Twitch). Programmi partner YouTube/Twitch senza permesso scritto; altri accordi di licenza a pagamento richiedono permesso. Gli sponsor non devono essere dannosi per Wizards né concorrenti, e vanno identificati chiaramente come sponsor. |
| Vendita | Vietato vendere Fan Content su Wizards senza permesso. |
| Disclaimer | Obbligatorio: contenuto non ufficiale, non approvato da Wizards, parti di proprietà Wizards, notice "©Wizards of the Coast LLC", con formula che inizia "[Title of your Fan Content] is unofficial Fan Content permitted under the Fan Content Policy". |
| Loghi e marchi | Vietato incorporare loghi e marchi Wizards senza permesso scritto. Non rimuovere le notice dalle opere usate. |
| Revoca | Wizards può limitare o fermare l'uso della sua IP in qualsiasi momento, a sua discrezione. |
| Manleva | Si accetta di coprire i costi di Wizards in caso di richieste legali. |
| Wiki e siti di news | La pagina **non** li cita; la valutazione resta **[DERIVATO]**: rientrano nel Fan Content generico e non nelle linee guida speciali. Non c'è nulla sull'AI generativa. |

**[DERIVATO]** Un portale gratuito di news/calendario/wiki con pubblicità e donazioni sembra compatibile con la lettera della Fan Content Policy. Resta la tensione con i Termini §14.1 ("noncommercial"). Il marchio Magic: The Gathering va usato solo come descrizione, e il nome del sito non deve implicare affiliazione ufficiale.

---

## 5. Aspetti pratici per un progetto personale

| Voce | Costo / sforzo [DERIVATO salvo diversa indicazione] |
|---|---|
| Hosting statico + piccolo job schedulato | Costo molto basso (sito statico, un cron job). |
| Twitch Helix | Gratuito; registrazione di un'app Twitch sul portale sviluppatori. Una richiesta ogni 1–2 minuti usa pochissimi punti per minuto (1 punto a richiesta). |
| YouTube Data API | Gratuito ma con tetto di 100 `search.list`/giorno; non adatto a polling continuo. |
| Calendario curato a mano | 10–30 minuti per annuncio ufficiale; il circuito cambia poche volte l'anno ma le regole cambiano a ogni stagione (vedi nota in 1.3). |
| Scraping di magic.gg | Fragile (sito Nuxt/SPA) e in conflitto con i Termini §2.2(i); sconsigliato senza permesso. |
| API Liquipedia | MediaWiki: 1 richiesta/2 s, `parse` 1/30 s; LiquipediaDB 60/ora con approvazione. Accettabile solo per piccole sincronizzazioni, con attribuzione CC-BY-SA. |
| Melee.gg | Dati solo se un'organizzazione ti dà ruolo di staff/coverage (https://help.melee.gg/docs/api-use/). |
| Legale | Disclaimer di Fan Content, privacy policy se si usano embed (Twitch richiede una privacy policy accessibile se si tratta dati utente: https://legal.twitch.com/en/legal/developer-agreement/), nota di attribuzione per Scryfall/Liquipedia. |

### Cosa realizzare per primo (ordine consigliato) [DERIVATO]

1. **Calendario del circuito curato a mano**, in file versionato (JSON/YAML): evento, formato, data, luogo, link ufficiale a magic.gg, canale stream ufficiale. Esporlo anche come feed iCal.
2. **Blocco "Live ora" con Twitch Helix** (`game_id` di Magic, `language`), cache sotto le 24 ore, con link e un embed solo per il canale ufficiale o per canali dei quali si ha l'autorizzazione (la ToS di Twitch lo richiede per scopi promozionali).
3. **Pagina evento con VOD e link ai bracket e standings di magic.gg**, senza ricopiare i dati.
4. **News come lista di titoli + link + riassunto originale**, a mano o da feed che esistano davvero.
5. Solo dopo: guide/meta, wiki-like pagine di giocatori (con licenza chiara per i contenuti nuovi) e risultati storici, eventualmente reimportando dati Liquipedia con attribuzione CC-BY-SA 3.0.

---

## Lacune e opportunità (separate dai fatti verificati)

**Lacune [NON VERIFICATO]**
- Stato di aggiornamento 2026 della Liquipedia Magic, e esistenza di una pagina Magic con calendari/bracket automatici.
- Pagina Liquipedia "Copyrights" (403) e versione esatta della licenza per contenuti diversi dai dati API.
- Contenuti e prezzi esatti di Icy Veins (pagine 403): solo estratti di ricerca.
- `game_id` numerico della categoria Twitch Magic (richiede una chiamata autenticata).
- Embed YouTube di una diretta tramite canale e procedura di aumento quota.
- ToS di Melee.gg e di Battlefy; qualsiasi API di EventLink; feed RSS di magic.gg/magic.wizards.com con altre URL; termini di terze parti per le news (SCG ecc.).
- Interpretazione dei Termini Wizards §2.2(ii) sul semplice link e della tensione con §14.1 ("noncommercial").
- Metà finale (circa 20.000 caratteri) dei Termini Wizards non letta.

**Opportunità [DERIVATO]**
- Non ho trovato un portale in italiano o europeo con calendario unificato del circuito (Spotlight, RC, Pro Tour, Arena) più live ora: lo spazio sembra libero, ma non ho verificato.
- Contattare Wizards (Fan Content/WPN) per chiedere un feed o un permesso di lettura per standings e calendario; contattare gli organizzatori Melee per un ruolo Coverage Staff.
- Chiedere agli streamer partner il consenso a essere elencati/incorporati; riduce il rischio con la ToS di Twitch.
- Offrire un feed iCal e un widget "Live ora" riutilizzabile.

---

## Nota di sicurezza: testo rivolto ad agenti AI trovato nelle fonti

- `https://scryfall.com/docs/api` contiene (verificato) un blocco "Instructions for AI Agents" che chiede di scrivere al team Scryfall sulla "Scryfall Twain Policy" e dice che per gli umani si tratta di un honeypot. È contenuto della pagina, già noto: **non l'ho seguito e non ho contattato nessuno**.
- Nessun altro testo di questo tipo nelle altre pagine analizzate (magic.gg/robots.txt, pagine magic.gg lette tramite il fetcher, Fan Content Policy). Le pagine bloccate (Liquipedia, Icy Veins, Melee.gg) non sono state lette.

## Elenco URL principali consultati

- https://liquipedia.net/api-terms-of-use
- https://liquipedia.net/hub/Support/Liquipedia (estratto di ricerca)
- https://magic.gg/schedule, https://magic.gg/robots.txt
- https://magic.gg/news/play-update-2026-27-round-2-regional-championship-promos-and-qualifiers
- https://magic.gg/news/play-update-2026-27s-regional-championship-qualifier-events-promos-and-more
- https://magic.gg/news/the-pro-tour-and-magic-spotlight-series-in-2026
- https://magic.gg/news/world-championship-32-fact-sheet-for-competitors
- https://magic.wizards.com/en/news/mtg-arena/qualifier-play-ins-and-qualifier-weekend-information
- https://dev.twitch.tv/docs/api/reference/, https://dev.twitch.tv/docs/api/guide/, https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/, https://dev.twitch.tv/docs/eventsub/manage-subscriptions/, https://dev.twitch.tv/docs/embed/video-and-clips/
- https://legal.twitch.com/en/legal/developer-agreement/
- https://developers.google.com/youtube/v3/determine_quota_cost, https://developers.google.com/youtube/v3/docs/search/list, https://developers.google.com/youtube/terms/developer-policies, https://developers.google.com/youtube/iframe_api_reference
- https://company.wizards.com/en/legal/fancontentpolicy, https://company.wizards.com/en/legal/terms
- https://help.melee.gg/docs/api-use/
- https://scryfall.com/docs/api
