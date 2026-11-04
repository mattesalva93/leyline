# Ricerca competitor: suite all-in-one per giocatori di Magic: The Gathering

**Data di consultazione: 2026-11-04.** Prezzi e piani cambiano spesso: ogni dato va rivalidato prima di usarlo in decisioni.

## Metodo e convenzioni

- Fonti primarie: pagine ufficiali dei prodotti, pagine prezzi, documentazione API, policy ufficiali, schede ufficiali degli store (App Store), repository ufficiali (GitHub API per le licenze).
- Ogni affermazione ha l'URL accanto. Ogni dato non verificato da fonte primaria è marcato **[NON VERIFICATO]** con il motivo.
- Molti siti (Moxfield, 17Lands, Melee, Cardmarket) sono SPA o bloccano i client automatici (HTTP 403, Cloudflare, JavaScript obbligatorio). Per questi i prezzi/limiti mancano e non sono stati ricostruiti da articoli di terzi.
- Le valute sono quelle mostrate dalla fonte (USD salvo diversa indicazione). La pagina Patreon mostrava importi in EUR perché localizzata.
- Le sezioni 1-9 e 10 contengono solo fatti. L'unica sezione di interpretazione è la 11, "Lacune e opportunità".

## Sintesi iniziale (fatti)

1. **Il mercato gratuito è molto coperto.** Quasi ogni area ha almeno un tool gratuito consolidato. Il modello a pagamento prevalente è **"rimozione pubblicità + extra"**, con prezzi bassi:
   - MTGGoldfish Premium: 5,99 USD/mese oppure 59,88 USD/anno.
   - EDHREC: 2 USD/mese su Patreon per togliere la pubblicità.
   - ManaBox PRO: 2,49 e 22,99 USD (due voci in-app; periodicità non indicata dalla scheda).
2. **Scryfall è la base dati de facto, con vincoli netti.** I dati sono gratis, ma:
   - non si possono mettere dietro paywall;
   - il software deve creare valore aggiuntivo;
   - l'API ha rate limit rigidi;
   - le immagini hanno regole di visualizzazione precise.
3. **La Fan Content Policy di Wizards vieta di richiedere pagamenti o iscrizioni per accedere ai contenuti fan.** Sono ammessi sponsor, pubblicità e donazioni purché non ostacolino l'accesso. Questo vincola il modello di business di una suite (vedi sezione 10 e sezione 11).
4. **Le API dei marketplace sono chiuse o difficili.** TCGplayer dichiara di non concedere più nuovo accesso API. L'API Cardmarket non è stata verificabile. Per i prezzi, le fonti pratiche sono i campi `prices` di Scryfall e MTGJSON.
5. **Melee e Best Coast Pairings (BCP) fanno parte della stessa azienda.** La nota a piè di pagina di help.melee.gg indica "Galactic Events Studio Incorporated" come titolare. Melee guadagna con commissioni sulle iscrizioni, non con abbonamenti.

---

## 1. Deckbuilding

| Tool | Gratis | A pagamento e prezzo | Limiti noti | Fonte |
|---|---|---|---|---|
| **Moxfield** | Deckbuilder web con oltre 30 formati, varie viste del mazzo, tag personalizzati, tracking collezione, dark mode (descrizione ufficiale su Patreon). | Supporto via Patreon: "a partire da 1 EUR/mese" (3.566 membri paganti al 2026-11-04). **Cosa sblocchi con quali tier: [NON VERIFICATO]**. La pagina moxfield.com è una SPA che richiede JavaScript e non ha restituito contenuto. | Benefit dei tier non verificabili. | https://www.patreon.com/moxfield/about , https://www.patreon.com/moxfield |
| **Archidekt** | Deckbuilder visuale con statistiche in tempo reale. Sito con pubblicità. | Patreon (4.967 membri paganti). Il sito dice "Go ad-free with Patreon". **Prezzo dei tier: [NON VERIFICATO]** (la pagina Patreon non lo esponeva nel testo). | Pubblicità per gli utenti gratuiti. | https://www.patreon.com/archidekt/about , https://archidekt.com/ |
| **MTGGoldfish (deck tools)** | Creazione e prezzatura di mazzi, mazzi popolari. Pubblicità. | Premium: 5,99 USD/mese, oppure 59,88 USD/anno (4,99 USD/mese, "Save 17%"). Include SuperBrew (suggerisce mazzi dalla tua collezione) e My Price (prezzo del mazzo meno le carte possedute). Garanzia 30 giorni. | Il testo non elenca esplicitamente il piano gratuito. | https://www.mtggoldfish.com/premium |
| **EDHREC (assistenza Commander)** | Raccomandazioni, statistiche e contenuti per Commander. | Patreon: "togliere le pubblicità per 2 USD/mese" (homepage). La pagina Patreon indica "a partire da 2 EUR/mese". | Specifico per Commander. Tier Patreon oltre la rimozione ads: [NON VERIFICATO]. | https://edhrec.com/ , https://www.patreon.com/edhrec |
| **ManaBox (deck builder)** | Deck builder, grafici statistici, simulatore di mazzo, scambio, ricerca offline. | Vedi sezione 2. | Vedi sezione 2. | https://manabox.app |

## 2. Gestione collezione

| Tool | Gratis | A pagamento e prezzo | Limiti noti | Fonte |
|---|---|---|---|---|
| **ManaBox** | App iOS/Android con scansione tramite fotocamera, gestione collezione, deck builder, confronto prezzi (Cardmarket, TCGplayer, Card Kingdom, Cardhoarder), ricerca in 7 lingue, conversione valuta, trade tool, regolamento. | **ManaBox PRO**: 2,49 USD e 22,99 USD (due voci in-app, periodicità non indicata dalla scheda). "Remove ads": 1,99 USD. Cloud Sync è solo per i Pro. Acquisto solo via App Store o Google Play. | Scaduto il Pro, i dati restano, ma non si possono creare nuovi binder né usare le funzioni Pro. Nessun acquisto a vita. Per i non Pro c'è solo un backup giornaliero (Google Drive / iCloud, iCloud solo su iOS). | https://manabox.app , https://apps.apple.com/us/app/manabox-mtg/id1460407674 , https://manabox.app/guides/general/faq/ , https://manabox.app/guides/general/subscriptions/ |
| **Moxfield (collezione)** | Tracking della collezione incluso (descrizione ufficiale). | Vedi sezione 1. | Limiti non verificabili. | https://www.patreon.com/moxfield/about |
| **MTGGoldfish (collezione)** | Account gratuito. Il Premium rimuove i limiti. | Premium (5,99 USD/mese o 59,88 USD/anno): tracking illimitato (prezzi di acquisto e vendita, profitto nel tempo), avvisi prezzo illimitati, import/export CSV, backup giornalieri automatici. | La pagina implica limiti per i gratuiti ma **non li quantifica** [NON VERIFICATO nel dettaglio]. | https://www.mtggoldfish.com/premium |
| **Archidekt (collezione)** | Il menu del sito ha una sezione "Collection". | Vedi sezione 1. | Dettagli non verificati. | https://archidekt.com/ |

## 3. Prezzi e marketplace

| Tool | Gratis | A pagamento e prezzo | Limiti noti | Fonte |
|---|---|---|---|---|
| **TCGplayer** (marketplace USA) | Navigazione e acquisto. Programma affiliati tramite Impact (commissione sugli acquisti riferiti, attribuzione first-click entro 48 ore, pagamenti 45 giorni dopo fine mese). | Non applicabile (marketplace con commissioni). | **"We are no longer granting new API access at this time"**: nessuna nuova chiave API. Esistono solo utenti precedenti, vincolati ai termini d'uso. Versione API v1.39.0. | https://docs.tcgplayer.com/docs/getting-started.md , https://docs.tcgplayer.com/docs/tcgplayer-affiliate-program |
| **Cardmarket** (marketplace EU) | Navigazione e acquisto. | Commissioni di marketplace: **[NON VERIFICATO]**. | Le pagine di documentazione API rispondono "Please switch to https://apiv2.cardmarket.com" e la nuova URL è protetta da Cloudflare, quindi **condizioni e rate limit dell'API non verificati**. | https://api.cardmarket.com/ws/documentation |
| **Scryfall (prezzi)** | Campo `prices` negli oggetti carta, aggiornato una volta al giorno. | Gratis. | I prezzi sono "stime giornaliere" e da considerare "dangerously stale" dopo 24 ore. Non sono adatti per negozio o sistema di vendita. | https://scryfall.com/docs/api/bulk-data , https://scryfall.com/docs/api/rate-limits |
| **MTGGoldfish (prezzi)** | Prezzi, movers and shakers, "Price a Deck". | Premium: avvisi prezzo illimitati, download CSV della storia prezzi per carta. | Pubblicità nel piano gratuito. | https://www.mtggoldfish.com/premium |
| **MTGJSON** | Prezzi con storico limitato forniti dai partner. File JSON/CSV/database gratuiti, aggiornati ogni giorno. Licenza MIT. | GraphQL API (MTGGraphQL) in beta, "solo per i sostenitori Patreon". | Build avviate alle 1:00 EST e pubblicate alle 9:00 EST. | https://mtgjson.com/ , https://mtgjson.com/faq/ |

## 4. Life counter

| Tool | Gratis | A pagamento e prezzo | Limiti noti | Fonte |
|---|---|---|---|---|
| **Magic: The Gathering Companion** (Wizards of the Coast) | App gratuita (0 USD, nessun acquisto in-app). Contatore vita integrato, partecipazione agli eventi in negozio, abbinamenti e classifiche, eventi personali. | Nessuno. | App ufficiale iOS. Scheda App Store consultata. Stato su Android non verificato. | https://apps.apple.com/us/app/magic-the-gathering-companion/id1455161962 |
| **Lifetap** | App gratuita (0 USD, nessun acquisto in-app nella scheda). Da 2 a 6 giocatori, modalità a 1 giocatore con danno da comandante e segnalini. | Nessuno indicato. | Solo ciò che dichiara la scheda App Store. | https://apps.apple.com/us/app/lifetap-life-counter-for-mtg/id1508241754 |
| **Lotus** | App gratuita. Vita e danno da comandante fino a 10 giocatori, ricerca carte con prezzi e legalità, dadi/monete, segnalini. | Acquisti in-app "Supporter" (Common, Rare, Mythic) da 0,99 a 24,99 USD. **Cosa sblocca ogni tier: [NON VERIFICATO]**. | Come sopra. | https://apps.apple.com/us/app/mtg-life-counter-app-lotus/id1498057193 |
| **Mythic Tools MTG** | App gratuita con acquisti in-app. | Mythic+ 9,99 USD e 89,99 USD (periodicità non indicata), Mythic Burn 2,99 USD, temi 2,99 USD, Mythic Toolbox Full Version 4,99 USD. **Funzioni incluse: [NON VERIFICATO]**. | Come sopra. | https://apps.apple.com/us/app/mythic-tools-mtg/id1669698500 |

## 5. Draft, limited e statistiche

| Tool | Gratis | A pagamento e prezzo | Limiti noti | Fonte |
|---|---|---|---|---|
| **17Lands** | **[NON VERIFICATO]**. La homepage www.17lands.com è una SPA che non espone testo al client automatico. Anche le pagine /terms e /public_datasets non hanno restituito contenuto. | **[NON VERIFICATO]** (non emergono piani a pagamento da fonte primaria consultabile). | Licenza e linee guida d'uso dei dataset: **[NON VERIFICATO]**. Nessuna fonte primaria accessibile: da controllare a mano prima di usare i dataset. | https://www.17lands.com/ |
| **Untap.in** (draft/cube/sealed con bot) | Gratuito per il play-test: deck building, goldfish, draft, multiplayer. Non applica le regole. | "Optional supporter perks" per sostenere i server (prezzi non verificati). Esempio di funzione per sostenitori: modalità "Deck vs Deck". | Non applica le regole del gioco. Progetto indipendente non affiliato ai publisher. | https://untap.in/ |
| **MTGGoldfish** | Metagame e mazzi (vedi sezione 7). | Vedi sezione 7. | Nessuna funzione di statistiche di draft verificata. | https://www.mtggoldfish.com/premium |

## 6. Playtest

| Tool | Gratis | A pagamento e prezzo | Limiti noti | Fonte |
|---|---|---|---|---|
| **Cockatrice** | Gratuito, open source, multipiattaforma, server pubblici o proprio (Servatrice). Licenza GPL-2.0 (da GitHub API). | Nessuno. | Il server impedisce di manipolare il gioco. Il database carte si aggiorna con lo strumento "Oracle". | https://cockatrice.github.io/ , https://api.github.com/repos/Cockatrice/Cockatrice |
| **XMage** | Gratuito, open source (licenza MIT, da GitHub API). Motore di regole. | Nessuno. | Non esaminato in dettaglio. | https://github.com/magefree/mage , https://api.github.com/repos/magefree/mage |
| **Forge** | Gratuito, open source (GPL-3.0, da GitHub API). Motore di regole non ufficiale. | Nessuno. | Non esaminato in dettaglio. | https://github.com/Card-Forge/forge , https://api.github.com/repos/Card-Forge/forge |
| **Untap.in** | Gratis, nel browser, nessun download. Supporta Magic e oltre 40 giochi. Goldfish, mulligan, spettatore con rewind. | Funzioni "supporter" (prezzi non verificati). | Non applica le regole. | https://untap.in/ |
| **ManaBox (simulatore)** | "Deck simulator" nell'app. | Vedi sezione 2. | Dettagli non verificati. | https://manabox.app |

## 7. Metagame

| Tool | Gratis | A pagamento e prezzo | Limiti noti | Fonte |
|---|---|---|---|---|
| **MTGGoldfish** | Metagame, mazzi popolari, risultati dei tornei, prezzi, con pubblicità. | Premium 5,99 USD/mese o 59,88 USD/anno (vedi sezione 1). | Funzioni di metagame riservate ai Premium: la pagina non le dichiara (le funzioni Premium elencate riguardano collezione, prezzi, SuperBrew). | https://www.mtggoldfish.com/ , https://www.mtggoldfish.com/premium |
| **EDHREC** | Statistiche e raccomandazioni per Commander (base di dati di mazzi inviati dagli utenti). Articoli. | Patreon da 2 USD/mese per togliere le pubblicità. | Solo Commander. | https://edhrec.com/ |
| **17Lands** | Vedi sezione 5. | **[NON VERIFICATO]** | **[NON VERIFICATO]** | https://www.17lands.com/ |

## 8. Gestione tornei e pairing

| Tool | Gratis | A pagamento e prezzo | Limiti noti | Fonte |
|---|---|---|---|---|
| **Melee.gg** | La documentazione ufficiale indica una modalità di sola registrazione e guide su Swiss, top cut, decklist, staff. Nessun abbonamento mensile trovato. | Commissioni: "Melee Fees" / "Platform Fees" più costi di elaborazione pagamenti, aggiunti alle quote d'iscrizione. Se l'organizzatore incassa fuori piattaforma, la commissione viene detratta dal rimborso. **Importi: [NON VERIFICATO]** (le pagine prezzi/policy danno 403). | È contro i Termini di Servizio non includere Melee tra i metodi di incasso delle quote. Eccezioni per i tornei sponsorizzati direttamente dal publisher. Possibili Service Level Agreement personalizzati. | https://help.melee.gg/docs/do-i-have-to-take-entry-fees-on-melee/ |
| **Melee API** | Accesso solo per organizzazioni e staff designato; richiesta via email a contact@melee.gg. Client ID e secret generati dopo approvazione. Per dati di organizzazioni altrui serve almeno il livello "Coverage Staff" e il consenso dell'organizzazione. | Non indicato. | Rate limit e documentazione degli endpoint: **[NON VERIFICATO]**. | https://help.melee.gg/docs/api-use/ |
| **Best Coast Pairings (BCP)** | **[NON VERIFICATO]**: il sito è una SPA con JavaScript obbligatorio. | **[NON VERIFICATO]** | Il footer di help.melee.gg indica come titolare "Galactic Events Studio Incorporated". La fusione con BCP è riportata solo da una testata di terzi (frontlinegaming.org, 2026-02-19), quindi **[NON VERIFICATO da fonte primaria]**. | https://www.bestcoastpairings.com/ , https://help.melee.gg/docs/do-i-have-to-take-entry-fees-on-melee/ |
| **Magic Companion** (Wizards) | Gratuita. Abbinamenti e classifiche per eventi in negozio, creazione di eventi personali. | Nessuno. | Eventi in negozio solo presso negozi partecipanti. | https://apps.apple.com/us/app/magic-the-gathering-companion/id1455161962 |

---

## 9. Riepilogo prezzi verificati

| Tool | Piano | Prezzo | Fonte |
|---|---|---|---|
| MTGGoldfish Premium | Mensile | 5,99 USD/mese | https://www.mtggoldfish.com/premium |
| MTGGoldfish Premium | Annuale | 59,88 USD/anno (4,99 USD/mese equivalenti) | https://www.mtggoldfish.com/premium |
| EDHREC | Patreon, rimozione ads | 2 USD/mese | https://edhrec.com/ |
| ManaBox | PRO (due voci) | 2,49 USD e 22,99 USD | https://apps.apple.com/us/app/manabox-mtg/id1460407674 |
| ManaBox | Remove ads | 1,99 USD | stessa scheda |
| Moxfield | Patreon, tier d'ingresso | da 1 EUR/mese | https://www.patreon.com/moxfield |
| Archidekt | Patreon | **[NON VERIFICATO]** | https://www.patreon.com/archidekt/about |
| Lotus | Supporter in-app | da 0,99 a 24,99 USD | https://apps.apple.com/us/app/mtg-life-counter-app-lotus/id1498057193 |
| Mythic Tools MTG | Mythic+ | 9,99 USD e 89,99 USD | https://apps.apple.com/us/app/mythic-tools-mtg/id1669698500 |

---

## 10. API pubbliche e dati utilizzabili

### 10.1 Scryfall (fonte principale)

Fonte: https://scryfall.com/docs/api (consultata il 2026-11-04).

**Accesso e intestazioni**
- Endpoint: `https://api.scryfall.com`. Solo HTTPS, TLS 1.2 o superiore, risposte UTF-8.
- Ogni richiesta deve includere gli header `User-Agent` (accurato, con nome e versione dell'app; non lasciarlo scegliere alla libreria HTTP) e `Accept`. Da browser si mantiene lo User-Agent originale.

**Rate limit** (https://scryfall.com/docs/api/rate-limits)

| Endpoint | Limite |
|---|---|
| `/cards/search`, `/cards/named`, `/cards/random`, `/cards/collection` | 2 al secondo (500 ms) |
| `/cards/manifest` | 10 al minuto (6.000 ms) |
| Tutti gli altri | 10 al secondo (100 ms) |
| Origini file `*.scryfall.io` (immagini) | Nessun rate limit |

- Eccedere genera HTTP 429; dopo un 429 l'accesso è limitato per 30 secondi. Continuare può portare a ban temporaneo o permanente. Ignorare i 429 "non è accettabile".
- Scryfall incoraggia la cache locale per almeno 24 ore. Per ricerche rapide di nomi, prezzi o immagini in massa **bisogna usare i bulk data**.
- I prezzi si aggiornano una volta al giorno; i dati di gameplay molto più raramente (basta scaricarli ogni settimana o dopo le uscite dei set).

**Bulk data** (https://scryfall.com/docs/api/bulk-data)
- Esportazioni giornaliere, in `.jsonl.gz` (JSON Lines compresso, non tar). Raccolte ogni 12-24 ore.
- File disponibili (dimensioni compresse al 2026-11-04): Oracle Cards 24,1 MB; Unique Artwork 37,2 MB; Default Cards 77 MB; All Cards 384 MB; Rulings 5,17 MB; Art Tags 12,7 MB; Oracle Tags 5,82 MB.
- Gli URL cambiano ogni giorno e si ricavano da `https://api.scryfall.com/bulk-data`. Verificato con una chiamata reale in data 2026-11-04: restituisce l'elenco con `updated_at` del giorno.
- I prezzi nei bulk sono da considerare "pericolosamente obsoleti" dopo 24 ore; da usare solo per tendenze o stime generiche, non per negozi o vendite.

**Policy su dati e immagini** (https://scryfall.com/docs/api)
- I dati sono forniti gratis, nell'ambito della Fan Content Policy di Wizards, per creare software Magic, ricerca o contenuti della community.
- Divieti sui dati:
  - non usare loghi o nome Scryfall in modo che implichi un'approvazione;
  - **non mettere dietro paywall l'accesso ai dati Scryfall**; con un sistema di account, i dati devono essere accessibili in modo anonimo o con account gratuiti;
  - non chiedere pagamenti, sondaggi, iscrizioni, valutazioni, adesione a server chat in cambio dell'accesso ai dati;
  - non usarli per creare nuovi giochi o far credere che provengano da un altro gioco;
  - **non limitarsi a ripubblicare o fare da proxy dei dati**: il software deve creare valore aggiuntivo.
- Regole sulle immagini:
  - non coprire, ritagliare o tagliare il copyright o il nome dell'artista;
  - non distorcere, inclinare o allungare;
  - non sfocare, nitidire, desaturare o cambiare i colori;
  - non aggiungere filigrane, timbri o loghi;
  - non lasciar intendere che la carta non sia di Wizards o sia di un altro gioco;
  - con `art_crop`, mostrare artista e copyright nella stessa interfaccia, oppure mostrare la carta intera nella stessa interfaccia.
- Mishandling ripetuto può portare a limitazione o blocco dell'accesso API.
- Formati immagine (https://scryfall.com/docs/api/images): png 744x1040, large 672x936, normal 488x680, small 146x204, border_crop, art_crop, più i nuovi formati WEBP (thumb, grid, display, crop, art). Le immagini sono servite da `*.scryfall.io` senza rate limit. Il campo `image_status` (missing, placeholder, lowres, highres_scan) indica la qualità.

**Nota sulla pagina consultata.** La pagina https://scryfall.com/docs/api contiene un blocco di testo rivolto agli "agenti AI" che chiede di scrivere al team Scryfall per chiedere la conformità a una "Twain Policy" e lo definisce un honeypot. È contenuto della pagina, non un'istruzione dell'utente: non ne ho tenuto conto e non ho contattato nessuno. Non è una policy API verificabile.

### 10.2 Fan Content Policy di Wizards of the Coast

Fonte: https://company.wizards.com/en/legal/fancontentpolicy (consultata il 2026-11-04; contenuto riassunto da un estrattore automatico, da rileggere in originale prima di decisioni legali).
- I Fan Content devono essere gratuiti: non si possono vendere o concedere in licenza a terzi per compenso.
- Sono ammessi sponsorizzazioni, ricavi pubblicitari e donazioni (es. Patreon, YouTube, Twitch), purché non interferiscano con l'accesso della community.
- Non si possono richiedere pagamenti, sondaggi, download, iscrizioni o registrazione via email per accedere ai Fan Content. Il login per partite private di gruppo è ammesso.
- Logo Magic e simboli di mana sono in lista ristretta; occorre l'avviso "non approvato/sostenuto da Wizards". Verbatim copying (es. proxy o carte contraffatte) non è Fan Content.
- Wizards può chiedere la rimozione in qualsiasi momento.

### 10.3 Altre fonti

| Fonte | Stato | Dettagli | Fonte |
|---|---|---|---|
| **MTGJSON** | Gratuita, MIT | File JSON/CSV/DB aggiornati ogni giorno; prezzi con storico limitato; checksum SHA-256; GraphQL in beta solo per i sostenitori Patreon. | https://mtgjson.com/ , https://mtgjson.com/faq/ |
| **TCGplayer API** | Chiusa a nuovi utenti | "No longer granting new API access". | https://docs.tcgplayer.com/docs/getting-started.md |
| **Cardmarket API** | Non verificata | Documentazione reindirizzata a apiv2.cardmarket.com, protetta da Cloudflare. | https://api.cardmarket.com/ws/documentation |
| **Melee API** | Su richiesta, limitata | Solo organizzazioni e staff approvato. | https://help.melee.gg/docs/api-use/ |
| **17Lands dataset** | Non verificata | Nessuna fonte primaria accessibile. | https://www.17lands.com/ |
| **Moxfield / Archidekt / EDHREC API** | Non verificate | Nessuna documentazione API pubblica raggiungibile. Moxfield è una SPA; Archidekt ed EDHREC non hanno restituito pagine API. | https://moxfield.com , https://archidekt.com , https://edhrec.com |

---

## 11. Lacune e opportunità (interpretazione, NON fatti verificati)

Questa sezione è una lettura dei fatti sopra. Le ipotesi vanno validate con interviste e test di mercato.

**Vincoli da tenere presenti (derivati dai fatti verificati)**
- Il vincolo "no paywall sui dati Scryfall" e la Fan Content Policy limitano il modello freemium classico. Le funzioni a pagamento dovrebbero stare su **valore aggiunto (sincronizzazione, analisi, automazioni, assenza di pubblicità)** e non sull'accesso ai dati o alle immagini delle carte. Il modello dei concorrenti (pubblicità + rimozione pubblicità a 2-6 USD/mese) è coerente con questo. Una verifica legale sul modello esatto è consigliabile.
- Senza API TCGplayer e con Cardmarket non verificata, i prezzi in tempo reale per marketplace sono difficili. Lo scenario realistico è appoggiarsi ai prezzi giornalieri di Scryfall/MTGJSON.
- I rate limit di Scryfall impongono una cache locale e l'uso dei bulk data fin dall'inizio.

**Lacune ipotizzate**
1. **Frammentazione.** Le aree sono coperte da tool diversi (Moxfield/Archidekt per mazzi, ManaBox per collezione, Lifetap/Lotus per vita, Melee per tornei, Cockatrice/Untap per playtest). Dai dati raccolti non emerge una suite unica che le copra tutte. Da confermare con una verifica più ampia del mercato.
2. **Italiano / mercato europeo.** ManaBox ha ricerca in 7 lingue e Cardmarket come fonte prezzi, ma non ho verificato la qualità dell'esperienza in italiano degli altri tool.
3. **Dati di limited.** 17Lands non è stato verificabile: serve un controllo manuale su licenza e termini prima di progettare funzioni di draft basate sui suoi dati.
4. **Tornei per negozi piccoli.** Melee guadagna con commissioni sulle iscrizioni e ha un'API ad accesso limitato: una possibile opportunità è uno strumento di pairing leggero per eventi casual, ma serve capire i volumi e i costi di competizione con Companion (gratuita).
5. **Continuità collezione-mazzo-prezzo.** Funzioni come "mazzi costruibili dalla collezione" sono dietro Premium su MTGGoldfish (SuperBrew, My Price); offrirle in una suite integrata potrebbe differenziare.

**Prossimi passi suggeriti**
- Verificare a mano (con browser) i prezzi e i benefit di Moxfield, Archidekt, 17Lands (termini dati), Melee (commissioni), BCP e Cardmarket API.
- Chiedere conferma legale su Fan Content Policy e monetizzazione.
- Ripetere la raccolta prima di ogni decisione di pricing: i dati sono del 2026-11-04.
