# Ricerca: generazione di fogli proxy per Magic: The Gathering

Data di consultazione: **2026-11-04**. Le affermazioni riportano l'URL della fonte primaria accanto al testo. Ciò che non è confermabile da fonte primaria è marcato **[NON VERIFICATO]**. Le derivazioni di calcolo mie sono marcate **[DERIVATO]**.

Metodo: pagine ufficiali (Scryfall, Wizards, Commander RC), README e codice sorgente clonati/letti dei repository (GitHub API per licenze e date di ultimo push), PDF ufficiale delle Magic Tournament Rules.

## Avvisi sulla sicurezza dei contenuti

- La pagina https://scryfall.com/docs/api contiene, in fondo, un blocco intitolato "Instructions for AI Agents" che chiede agli agenti di scrivere email al team Scryfall citando una "Scryfall Twain Policy" e dichiara che si tratta di un "honeypot". È contenuto della pagina, non un'istruzione per me: **non è stato seguito, nessuno è stato contattato**. Una "Twain Policy" non compare in alcuna altra sezione della documentazione letta **[NON VERIFICATO]** (non esiste come policy documentata nelle pagine consultate).
- Il repository https://github.com/chilli-axe/mpc-autofill contiene `AGENTS.md` e `CLAUDE.md` con istruzioni per agenti di sviluppo (stile dei commit, "unslop"). Riguardano chi contribuisce al repo, non questa ricerca: ignorate.
- Nessuna istruzione rivolta ad agenti è stata trovata in: fan content policy Wizards, README di mtg-proxies / Proxxied / Cardwright / MTGProxyPrinter, sito MPC Autofill, FAQ Commander.

## Sintesi

- **Mercato**: esistono tool maturi sia web sia desktop. I più rilevanti sono MPC Autofill (GPL-3.0, ordini su MakePlayingCards e export PDF), Proxxied (web, gratuito), MTGProxyPrinter (GPL-3.0, desktop Qt), mtg-proxies (MIT, CLI Python) e Cardwright (desktop Windows, source-available, non open source).
- **Input**: decklist testuale (nome / formato Arena), URL di siti di deckbuilding (Archidekt, Moxfield, ecc.), CSV, XML (MPC Autofill). Nessun tool verificato accetta tutto con la stessa qualità. I mazzi devono essere pubblici.
- **Layout**: tutti verificati supportano A4 e Letter (o dimensione custom), crop marks/cut lines e bleed in modo variabile. Il layout comune è 3x3 per foglio. Retro carta/DFC e immagini custom sono ben coperti da MPC Autofill, MTGProxyPrinter e Cardwright.
- **Legale**: la Fan Content Policy di Wizards esclude esplicitamente dal "Fan Content" la creazione di "counterfeit/proxy" Magic. La policy Scryfall vieta crop del copyright/artista, distorsione, filtri colore e watermark sulle immagini. I tool di stampa di proxy si muovono quindi in un'area non coperta dalla policy Wizards; l'uso personale/playtest è tollerato nella pratica ma **non autorizzato esplicitamente** da fonte primaria.
- **Regole di gioco**: nelle Magic Tournament Rules (in vigore dal 2026-02-27) i giocatori non possono creare proxy propri; solo l'Head Judge, in casi limitati. Nel Commander ufficiale (mtgcommander.net) le carte non ufficiali non sono ammesse di default. Il casual tra amici dipende dall'accordo dei giocatori (non regolato da fonte primaria).
- **Tecnica**: carta 63x88 mm (2,5x3,5 in). Scryfall PNG 744x1040 px è circa 300 dpi sulla carta fisica **[DERIVATO]**. Il PDF preciso si ottiene con unità in mm, scala 100% in stampa e calibrazione dell'offset.

## 1. Competitor

Data ultima attività = campo `pushed_at` dell'API GitHub alla data di consultazione.

| Tool | Input | Layout/controlli | Personalizzazione | Limiti/paywall | Licenza | Fonte |
|---|---|---|---|---|---|---|
| **MPC Autofill** (chilli-axe) | Testo decklist, CSV (colonne `Quantity, Front, Front ID, Back, Back ID`), XML, URL di siti: Aetherhub, Archidekt, CubeCobra, Deckstats, MagicVille, ManaStack, Moxfield (solo se il backend ha `MOXFIELD_SECRET`), MTGGoldfish, Scryfall, TappedOut | Export PDF nel frontend: A4, A3, Letter, Legal, Tabloid, Custom; margini per lato; bleed (max 0,12 in = 3,048 mm); cut line (forma Cross/Inside/Outside, posizione Inside/Centre/Outside, lunghezza/offset/spessore/colore); angoli arrotondati; DPI immagine; modalità layout per Silhouette (port di silhouette-card-maker). Obiettivo principale: ordine su MakePlayingCards via tool desktop | Immagini scelte da database community (Google Drive indicizzato), tipi carta: Card, Cardback (prefisso `b:`), Token (prefisso `t:`); coppie DFC | Sito dichiara "all of its features will always be free"; la stampa tramite MakePlayingCards ha costo esterno **[NON VERIFICATO]** (prezzi non letti). Moxfield dipende da un segreto lato server | GPL-3.0 (API GitHub). Ultimo push 2026-11-03 | https://github.com/chilli-axe/mpc-autofill ; https://mpcfill.com ; https://github.com/chilli-axe/mpc-autofill/wiki ; codice: `frontend/src/features/import/`, `frontend/src/features/pdf/PDF.tsx`, `frontend/src/common/constants.ts`, `MPCAutofill/cardpicker/integrations/game/mtg.py` (clonato) |
| **Proxxied** (proxxied.com; repo acoreyj/proxies-at-home) | Decklist (`1x Sol Ring`) con immagini da Scryfall; il sito dichiara import da siti di deck (Archidekt, Moxfield) **[NON VERIFICATO]** nel codice, solo da ricerca web | README: fogli 8,5x11 in, carta 2,5x3,5 in, 3x3, bleed on/off con larghezza in mm (nero o bordo specchiato), guide di taglio, crop mark da 1 px sul bordo di taglio, export 1200 DPI con jsPDF, unità in/mm, larghezza/altezza pagina e colonne regolabili | Immagini custom (pre-bleed, es. pack MPCFill), selettore arte alternativa, cache locale | Sito: "Everything you know and love completely free", con accounts introdotti di recente (cosa includano gli account non verificato) | README dichiara MIT; l'API GitHub non rileva un file LICENSE (`license: None`), quindi la licenza è **[NON VERIFICATO]** formalmente. Ultimo push 2026-09-17 | https://github.com/acoreyj/proxies-at-home ; https://proxxied.com |
| **MTGProxyPrinter** (luziferius) | Liste un nome per riga, Arena, MTGO, XMage, TappedOut CSV, Scryfall CSV, `.mwDeck`, regex personalizzata; URL: Archidekt, Deckstats, MTG Arena Zone, MTGDecks, MTGGoldfish, MTGTop8, Moxfield, Scryfall, TCGPlayer Infinite, TappedOut, mtg.wtf (solo mazzi pubblici, "best effort") | Formato carta/pagina, margini, spaziatura configurabili; linee guida per taglio a macchina; angoli arrotondati o vivi; bleed con colore campionato dall'immagine; titolo e numeri di pagina; export PDF (con split in blocchi), sequenza PNG, immagini singole; stampa diretta; carte oversize in pagine separate | Carte custom (solo formato regolare), DFC e carte split con auto-aggiunta del retro, check card per DFC, token Scryfall, traduzione lista, filtri (bordo, full art, funny, digitale), override della stampa | Nessun paywall dichiarato nel README (donazioni Ko-fi) | GPL-3.0. Repo ufficiale su Fossil (mirror GitHub). Ultimo push 2026-11-03 | https://github.com/luziferius/MTGProxyPrinter ; https://chiselapp.com/user/luziferius/repository/MTGProxyPrinter |
| **mtg-proxies** (DiddiZ) | Decklist testo o Arena (`COUNT NAME (SET) NUM`), `archidekt:{id}`, `manastack:{id}` (Archidekt pubblico) | CLI `print`: `--paper WIDTHxHEIGHT` (default A4), `--scale`, `--border_crop PIXELS` (default 14), `--background`, `--cropmarks` (solo png/jpg, ignorato per PDF), `--dpi` (raster), `--faces all/front/back`. Output pdf/png/jpg; usa fpdf2 | Comando `tokens` che aggiunge i token; selezione automatica della miglior stampa; avviso su scansioni a bassa risoluzione; retro/fronte separati | Nessun paywall. Crop marks non disponibili nel PDF | MIT. Ultimo push 2026-10-03 | https://github.com/DiddiZ/mtg-proxies ; codice `mtg_proxies/print_cards.py`, `pyproject.toml` (clonato) |
| **Cardwright** (Boffo90) | Nome carta con galleria stampe, `Nome (SET) NUM`, incolla decklist (Archidekt/Moxfield) e URL mazzo, link Scryfall/Gatherer, `.xml` ordine MPC Autofill, `.json` lista carte, file locali | A4, Letter, A3, Legal, Tabloid, A5, foto 4x6; 3x3, 4x2, 3x4, 4x4, 7 carte Silhouette; PDF/PNG/JPEG; cut guides (croce o angolo), segni di registrazione Silhouette/Cricut, bleed con colore, spostamento pagina per margini di stampante | Upscaling AI fino a 2976x4160 px (1200 DPI a 63x88 mm); retro duplex con offset/rotazione, foglio di test allineamento, foglio di calibrazione colore (9 profili); token; molti giochi (Pokémon, Yu-Gi-Oh, Riftbound) | Solo Windows; uso gratuito delle build ufficiali; ~29 MB per carta upscalata | **Source-available, non open source** (file LICENSE: "NOT open source"); API GitHub: NOASSERTION. Ultimo push 2026-10-14 | https://github.com/Boffo90/cardwright |
| **silhouette-card-maker** (Alan-Cha) | Non letto in dettaglio **[NON VERIFICATO]** | Template Silhouette Studio; il suo layout è ripreso da MPC Autofill (commento in `scmLayout.ts`) | Descrizione: carte DIY e proxy con macchine da taglio Silhouette | Non verificato | MIT (API GitHub) | https://github.com/Alan-Cha/silhouette-card-maker |
| **Moxfield**, **Archidekt** (export di stampa nativo) | Non applicabile | Non verificato: il sito Moxfield (https://moxfield.com/help) è una SPA che senza JavaScript mostra solo "Loading Moxfield" e la pagina non è leggibile; la home Archidekt (https://archidekt.com/) non espone documentazione sull'export di stampa. **[NON VERIFICATO]** l'esistenza di un export PDF/stampa nativo | — | — | Proprietarie **[NON VERIFICATO]** | https://moxfield.com/help ; https://archidekt.com/ |
| **"Magic Proxy"** | Nessun prodotto univoco identificato con questo nome nelle fonti primarie consultate **[NON VERIFICATO]** | — | — | — | — | — |
| **MTG Press** (mtgpress.net) | Citato dal README di mtg-proxies come servizio online alternativo; non analizzato (non trovato altro) **[NON VERIFICATO]** | — | — | — | — | https://github.com/DiddiZ/mtg-proxies |

Osservazioni dal codice:

- mtg-proxies ritaglia `border_crop` pixel (default 14) dai bordi interni per sovrapporre le carte; la scelta è in `mtg_proxies/print_cards.py`. Questo è un ritaglio del bordo immagine, rilevante per la policy Scryfall (sezione 2).
- Cardwright afferma che i builder web inseriscono immagini a ~300 dpi in PDF "1200 DPI". È un'affermazione di marketing dell'autore, non misurata qui. **[NON VERIFICATO]** come confronto.
- MPC Autofill è il solo con CSV a colonne definite e coppie fronte/retro per ID immagine.

## 2. Vincoli legali e di dati

### 2.1 Scryfall (API e immagini)

Fonte: https://scryfall.com/docs/api (letta con curl e User-Agent dichiarato; WebFetch ha ricevuto 403).

- Intestazioni obbligatorie: ogni richiesta ad `api.scryfall.com` deve avere `User-Agent` accurato (non quello di default della libreria) e `Accept`. https://scryfall.com/docs/api
- Dati e immagini sono forniti gratuitamente "as part of the Wizards of the Coast Fan Content Policy" per creare software, ricerca o contenuti community su Magic. https://scryfall.com/docs/api
- Divieti sui dati: non usare logo/nome Scryfall per implicare endorsement; non applicare paywall; non richiedere pagamenti, sondaggi, iscrizioni ecc. per l'accesso ai dati Scryfall; non creare nuovi giochi; non ripubblicare o fare da proxy dei dati Scryfall (il software deve "create additional value"). https://scryfall.com/docs/api
- Regole sulle immagini (testo letterale, "Do not"): coprire, ritagliare o tagliare via copyright o nome artista; distorcere, inclinare o stirare; sfocare, aumentare nitidezza, desaturare o alterare i colori; aggiungere watermark, timbri o loghi propri; collocare le immagini in modo da suggerire che la carta sia creata da altri che Wizards o di un altro gioco. Per `art_crop` bisogna mostrare artista e copyright altrove nella stessa interfaccia, o la carta intera. L'uso scorretto ripetuto può portare al blocco dell'API. https://scryfall.com/docs/api
- Rate limit: `/cards/search`, `/cards/named`, `/cards/random`, `/cards/collection` 2 richieste/s; `/cards/manifest` 10/minuto; altri metodi 10/s; i file da `*.scryfall.io` non hanno rate limit; 429 comporta 30 s di limitazione; caching incoraggiato per almeno 24 ore; per risolvere molte immagini si devono usare i bulk data. https://scryfall.com/docs/api/rate-limits
- Formati immagine: `png` 744x1040 (PNG, sfondo trasparente con angoli arrotondati), `large` 672x936 JPG, `normal` 488x680 JPG, `border_crop` 480x680 JPG, `art_crop` variabile. Campo `image_status`: `missing`, `placeholder`, `lowres`, `highres_scan`. https://scryfall.com/docs/api/images
- CORS: una richiesta HEAD con `Origin` a un'immagine `cards.scryfall.io/png/...` ha restituito `access-control-allow-origin: *` (verificato con curl il 2026-11-04). Quindi il canvas del browser può leggere i pixel senza taint. Il comportamento non è documentato nella pagina CORS ufficiale (la pagina `/docs/api/cors-csp` ha dato 404 a questo indirizzo). **[NON VERIFICATO]** come garanzia contrattuale.

Implicazioni **[DERIVATO]** per un generatore di proxy:

- Bleed con bordo specchiato o riempito, crop del bordo esterno, upscaling, sharpening e correzioni colore di calibrazione (usate da MPC Autofill, MTGProxyPrinter, Cardwright, mtg-proxies) sono in tensione con le regole "non ritagliare/non alterare colori/non aggiungere" se applicate alle immagini Scryfall. La policy è scritta per chi mostra immagini Scryfall in un'app/servizio; se una policy sia applicabile all'uso privato offline non è chiarito dalla fonte **[NON VERIFICATO]**. Non è stata trovata una deroga esplicita per la stampa.
- Applicare filtri di stampa (curve colore) lato utente su file scaricati localmente è diverso dal servire immagini alterate: la linea di confine non è definita da Scryfall.

### 2.2 Wizards of the Coast, Fan Content Policy

Fonte: https://company.wizards.com/en/legal/fancontentpolicy (ultimo aggiornamento indicato: 15 novembre 2017).

- Il Fan Content "does not include the verbatim copying and reposting of Wizards' IP (e.g., ... creating counterfeit/proxy Magic: The Gathering cards, etc.), regardless of whether that content is distributed for free". Quindi la produzione/distribuzione di proxy non rientra nel Fan Content.
- Il Fan Content deve essere gratuito (niente pagamenti, iscrizioni, vendita o licenza a terzi); non è consentito venderlo online o alle convention senza permesso scritto. Loghi e marchi (compresi i simboli MTG) richiedono permesso scritto; Wizards può chiedere di rimuovere contenuti.
- Il testo non dice se la stampa privata di proxy per playtest sia permessa o vietata. **[NON VERIFICATO]** per l'uso personale. La policy non autorizza quindi un servizio che distribuisca o venda proxy.

Implicazione **[DERIVATO]**: un'app che generi PDF localmente per uso personale non è un servizio di vendita; un servizio ospitato che pubblica o vende fogli di carte è la zona ad alto rischio. Una verifica legale è consigliata prima di commercializzare. Non è consulenza legale.

### 2.3 Regole ufficiali e community

- **Tornei sanciti**: Magic Tournament Rules, in vigore dal 27 febbraio 2026, sezione 3.4 Proxy Cards (testo estratto dal PDF ufficiale). Un proxy rappresenta una carta legale che non può più stare nel mazzo senza che il mazzo sia segnato, solo se la carta è stata danneggiata/usurata accidentalmente nel torneo in corso, oppure è un foil senza stampa non-foil. "Players may not create their own proxies; they may only be created by the Head Judge". Il proxy deve essere indicato in modo chiaro e vale solo per la durata del torneo. Costo o rarità non sono motivi validi. https://media.wizards.com/ContentResources/WPN/MTG_MTR_2026_Feb27_EN.pdf (linkato da https://wpn.wizards.com/en/rules-documents)
- **Commander ufficiale** (Rules Committee): "only official Magic the Gathering cards produced by Wizards of the Coast should be used in games"; carte con bordo oro/silver e playtest non devono essere usate; per i bordi argentati servono eccezioni approvate. Il testo della FAQ nomina i "physical proxies" nella domanda ma la risposta citata non tratta i proxy fatti in casa in modo esplicito. https://mtgcommander.net/index.php/faq/
- **Casual Commander**: l'accordo sociale del gruppo non è regolato da fonte primaria ufficiale; qualsiasi prassi (proxy ammessi tra amici, limiti) è convenzione di gruppo. **[NON VERIFICATO]**.
- Nota: il sito blogs.magicjudges.org riporta la stessa 3.4 ma è un sito della comunità giudici, non Wizards; usato solo come controllo incrociato, non come fonte.

## 3. Aspetti tecnici

### 3.1 Dimensioni

- Dimensione carta usata dal codice di tool noti: 63x88 mm (`CardWidthMM = 63`, `CardHeightMM = 88` in https://github.com/chilli-axe/mpc-autofill, `frontend/src/common/constants.ts`); 2,5x3,5 in in mtg-proxies (`print_cards.py`) e Proxxied (README). Nessuna specifica fisica ufficiale Wizards è stata trovata **[NON VERIFICATO]** da fonte Wizards; i valori sono quelli di prassi.
- 63 mm = 2,480 in e 88 mm = 3,465 in **[DERIVATO]**. PNG Scryfall 744x1040 px: 744/2,480 = 300 dpi; 1040/3,465 = 300 dpi **[DERIVATO]**. Quindi le immagini Scryfall rendono al massimo ~300 dpi a dimensione reale: stampare "1200 DPI" richiede upscaling (Cardwright, https://github.com/Boffo90/cardwright) e non aggiunge dettaglio reale altrimenti.
- Bleed MPC Autofill: 0,12 in = 3,048 mm per lato (`BleedEdgeMM`). Raggio angoli: 2,5 mm (`CornerRadiusMM`). https://github.com/chilli-axe/mpc-autofill
- Griglia 3x3: 189x264 mm **[DERIVATO]**; entra in A4 (210x297, margini 10,5 e 16,5 mm) e Letter (215,9x279,4, margini ~13,5 e ~7,7 mm) **[DERIVATO]**. Margini Letter verticali stretti: molte stampanti hanno area non stampabile maggiore. Per questo Cardwright offre lo shift dell'intero layout. https://github.com/Boffo90/cardwright
- Con bleed da 3,048 mm la carta diventa 69,1x94,1 mm **[DERIVATO]**: 3x3 occupa 207,3x282,3 mm e non lascia margini su A4. Per fogli con bleed servono formati più grandi o griglie ridotte (es. 3x2 o A3, coerente con l'offerta di A3/Tabloid in Cardwright).

### 3.2 Generazione PDF

Licenze e attività da API GitHub (2026-11-04):

| Libreria | Ambito | Licenza | Ultimo push | Fonte |
|---|---|---|---|---|
| jsPDF | Browser/Node; usata da Proxxied | MIT | 2026-11-01 | https://github.com/parallax/jsPDF |
| @react-pdf/renderer | React (usata da MPC Autofill) | MIT | 2026-11-03 | https://github.com/diegomura/react-pdf ; dipendenza in `frontend/package.json` di mpc-autofill |
| PDFKit | Node/browser | MIT | 2026-11-03 | https://github.com/foliojs/pdfkit |
| pdf-lib | Browser/Node, manipolazione | MIT | 2024-07-17 (poca attività) | https://github.com/Hopding/pdf-lib |
| pdfmake | Browser/Node, dichiarativa | NOASSERTION (verificare file) | 2026-11-04 | https://github.com/bpampuch/pdfmake |
| fpdf2 | Python (usata da mtg-proxies) | LGPL-3.0 | 2026-11-04 | https://github.com/py-pdf/fpdf2 |
| Typst | Compilatore tipografico, anche WASM | Apache-2.0 | 2026-10-30 | https://github.com/typst/typst |

- Dall'uso nel codice: MPC Autofill genera PDF in un worker (`pdf.worker.ts`) con @react-pdf/renderer e converte in mm; Proxxied usa jsPDF con canvas per bleed; mtg-proxies usa fpdf2 con unità `mm` e formato A4 (`FPDF(orientation="P", unit="mm", format="A4")`).
- Dettagli di precisione (unità native in pt, arrotondamento dell'engine, interpolazione delle immagini): non verificati dalla documentazione per ogni libreria in questa sessione. **[NON VERIFICATO]**. Raccomandato un test di misura con righello e confronto su carta reale (mediante Cardwright o stampa di prova).
- Disegno vettoriale per crop marks e cut line (non raster) è la scelta di MPC Autofill (`CutLine*` in `PDF.tsx`); mtg-proxies disegna i crop mark solo nei raster. https://github.com/chilli-axe/mpc-autofill ; https://github.com/DiddiZ/mtg-proxies
- Dimensioni PDF: un mazzo Commander completo in alta risoluzione pesa circa 140 MB (mtg-proxies); MTGProxyPrinter e Cardwright offrono split in più file. https://github.com/DiddiZ/mtg-proxies ; https://github.com/luziferius/MTGProxyPrinter

### 3.3 Calibrazione di stampa

Fonti: solo README di tool (non esiste una "fonte primaria" generale per la calibrazione).

- Stampare al 100% senza "adatta alla pagina": raccomandazione di guide comunitarie; non verificata da fonte primaria **[NON VERIFICATO]**.
- Cardwright implementa: foglio di test allineamento duplex (offset e rotazione del retro, bleed sul retro), foglio di calibrazione colore a 9 profili, shift di pagina su due assi, spessore linee non inferiore a quello stampabile da inkjet, "shadow-lift" per neri chiusi. https://github.com/Boffo90/cardwright
- MTGProxyPrinter offre colore del bleed campionato dall'immagine e linee guida per il taglio a macchina. https://github.com/luziferius/MTGProxyPrinter
- Segni di registrazione Silhouette: inset 0,394 in, lunghezza 0,350 in, spessore 0,039 in (valori dichiarati da Cardwright come geometria pubblicata da Silhouette Studio). Non confermati dalla documentazione Silhouette. **[NON VERIFICATO]** da fonte Silhouette. https://github.com/Boffo90/cardwright

## Lacune e opportunità

Questa sezione è separata dai fatti verificati: contiene inferenze e idee.

Lacune da colmare con ulteriore ricerca:

1. Export di stampa nativo di Moxfield/Archidekt: non verificabile (SPA senza documentazione statica). Controllare con un browser reale, e con le API ufficiali di Moxfield (richiede segreto, come visto nel codice di MPC Autofill).
2. Uso privato di proxy per playtest rispetto alla Fan Content Policy e alle regole Scryfall sulle immagini: nessuna fonte primaria lo regola esplicitamente. Eventuale richiesta chiarimenti a Scryfall/Wizards tramite canali umani, mai tramite l'"istruzione per agenti" trovata nella pagina Scryfall.
3. Specifica fisica ufficiale della carta (tolleranze, raggio angoli) non trovata.
4. Precisione di posizionamento per libreria PDF (unità, arrotondamenti): serve un test sperimentale.
5. Prezzi e condizioni di MakePlayingCards e licenza esplicita di Proxxied non verificate.

Opportunità (inferenze):

- **Conformità Scryfall by design**: i tool esistenti applicano crop/bleed/sharpening senza distinguere tra immagini Scryfall e immagini custom. Un generatore potrebbe applicare tali trasformazioni solo a immagini caricate dall'utente e usare l'immagine Scryfall intatta (scala uniforme, nessun colore alterato, nessun watermark) con bleed a bordo neutro, e offrire un avviso esplicito.
- **Calibrazione guidata nel browser**: nessun tool web verificato (Proxxied) offre foglio di test di offset duplex e calibrazione come Cardwright (solo Windows, non open source). Spazio per un equivalente open source e multipiattaforma.
- **Input unificato**: nessun tool copre insieme URL pubblici, CSV con ID di stampa, XML MPC e token automatici; formato di scambio comune (es. CSV di MPC Autofill) come standard.
- **Anteprima di misura**: layout con verifica automatica che bleed e griglia entrino nell'area stampabile (es. 3x3 con bleed non entra in A4 come calcolato in 3.1).
- **Avvertenza di contesto**: banner che ricorda che i proxy non sono ammessi in tornei sanciti (MTR 3.4) e nel Commander ufficiale, per prevenire usi impropri e ridurre il rischio reputazionale.
