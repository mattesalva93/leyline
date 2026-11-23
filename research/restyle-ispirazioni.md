# Ricerca: ispirazioni per il restyle dell'app web

Data di consultazione: **2026-11-23**. Ogni riferimento ha l'URL accanto e una riga su cosa vale la pena prendere. Le deduzioni mie sono marcate **[DERIVATO]**. I siti che non ho potuto vedere sono marcati **[NON VERIFICATO]** con il motivo: il loro aspetto non è descritto, né ricostruito a memoria.

## Metodo

- **Regole (movimento, temi, fogli dal basso, stati vuoti):** fonti primarie, cioè MDN, W3C WCAG, Apple HIG (letta tramite il JSON pubblico di developer.apple.com, perché la pagina HTML richiede JavaScript), la documentazione Material (m1.material.io e la documentazione ufficiale `material-components-android` su GitHub, perché m3.material.io richiede JavaScript), Nielsen Norman Group, i sistemi di design Radix, Vercel Geist e Carbon.
- **Aspetto delle app di settore:** screenshot a 1440 px presi con Chromium headless (il Playwright del repo, lanciato da uno script nella scratchpad, senza cliccare nulla) per Scryfall, Moxfield, Archidekt, ManaBox, MPCFill, Proxxied e MTG Print. Dopo questo primo giro, il permesso di lanciare altri screenshot è stato negato. Le pagine di lavoro vere (il mazzo aperto su Moxfield, il sandbox di Archidekt, il Proxy Builder di Proxxied) sono quindi descritte solo dai loro changelog e dalle guide, mai dall'immagine.
- **Gallerie di ispirazione:** Dribbble, Behance, Mobbin, Land-book, Refero e Godly non hanno restituito contenuti leggibili (vedi la sezione "Fonti bloccate"). Awwwards risponde, ma la sua categoria giochi raccoglie siti promozionali in 3D, non strumenti.
- **Punto di partenza:** lo stile attuale (`packages/web/src/theme.css`) è neo-brutalista: bordi neri spessi, accento lime, Space Grotesk e JetBrains Mono, tema chiaro e scuro. Le superfici sono descritte in `GLOSSARY.md` e in `packages/web/src/workspace/` (`DesktopWorkspace`, `PhoneWorkspace`, `side-panel/`, `line-panel/`, `ui/BoardPanel.tsx`).
- **Vincoli che questa ricerca rispetta:** le scansioni Scryfall non si alterano mai (ADR 0004, poi ADR 0007 e ADR 0013); i componenti sono nostri, scritti su Radix e Tailwind (ADR 0010).

## Sintesi

1. **Nelle app di settore la scansione è l'unica decorazione della griglia.** Scryfall mostra la griglia di stampe senza cornice e senza didascalia, su un fondo quasi bianco. I controlli stanno sopra la griglia, scritti come una frase: «All prints as Images sorted by Name : Auto» (screenshot di https://scryfall.com/search?q=lightning+bolt&unique=prints&as=grid). Per far risaltare una scansione già carica di dettagli bastano il fondo e lo spazio tra le tessere, senza cornici **[DERIVATO]**.
2. **Lo stato vuoto sostituisce bene la landing page.** NN/g chiede che uno stato vuoto dica cosa apparirà, insegni come riempirlo e offra l'azione diretta, oppure dei dati di esempio (https://www.nngroup.com/articles/empty-state-interface-design/). MTG Print apre direttamente sulla textarea, con un mazzo d'esempio come placeholder (screenshot di https://mtgprint.net). MPCFill mostra un'area vuota con una frase che indica il menu «Add Cards» (screenshot di https://mpcfill.com/editor). Excalidraw mette suggerimenti che puntano alla barra degli strumenti e spariscono al primo gesto (https://plus.excalidraw.com/docs/sdk/excalidraw/api/children-components/welcome-screen).
3. **Le regole del movimento convergono.** Le animazioni durano 150–300 ms e quelle di uscita sono più brevi di quelle di entrata. Si anima solo `transform` e `opacity`. Con `prefers-reduced-motion` il movimento lascia il posto a una dissolvenza, invece di sparire del tutto (MDN, WCAG 2.3.3, Material, Atlassian, Apple; vedi la sezione 7). WCAG esclude esplicitamente opacità e colore dalla «motion animation».
4. **I pannelli laterali non sono l'unico modello del settore.** Archidekt offre sei viste dello stesso mazzo: Stacks, Grid, Scroll, Text, Table e Brewer. Offre anche un'anteprima fissa sulla destra che cambia al passaggio del mouse (https://archidekt.com/news/3108703, https://archidekt.com/news/20605672). mtgproxy.net è un flusso a passi con Back e Next (https://mtgproxy.net/). Figma UI3 ha provato pannelli che si nascondono da soli e li ha scartati perché rendevano il lavoro «too unstable» (https://www.figma.com/blog/behind-our-redesign-ui3/).
5. **I temi scuri del settore sono grigio carbone con un solo accento caldo.** Si vede su ManaBox (ambra) e su Archidekt (arancio nella barra scura). Material e Apple chiedono un fondo grigio scuro invece del nero, e avvertono che sul fondo scuro le ombre si vedono poco (https://github.com/material-components/material-components-android/blob/master/docs/theming/Dark.md, Apple HIG Dark Mode). Su fondo scuro, quindi, una tessera selezionata si segnala con un bordo o un anello, non con un'ombra **[DERIVATO]**.

---

## 1. Identità visiva generale

### Palette

| Riferimento | Cosa prendere |
|---|---|
| Scryfall, https://scryfall.com/search?q=lightning+bolt&unique=prints&as=grid (screenshot) | Barra in alto indaco molto scuro con la ricerca dentro; tutto il resto è un fondo lavanda chiarissimo. Il colore lo portano solo le carte. È il modello di un tema chiaro neutro e «freddo». |
| Moxfield, https://moxfield.com/decks/public (screenshot) | Fondo grigio chiaro e un solo accento viola, sul pulsante di ricerca e sui bordi dei pulsanti secondari («Filters», «Sort»). L'interruttore del tema scuro è una luna nella barra. |
| Archidekt, https://archidekt.com/ (screenshot) | Barra in alto grigio carbone e pulsante primario arancio pieno («Deck sandbox»). Le anteprime dei mazzi hanno sotto la miniatura delle barre segmentate nei colori dell'identità di colore: il colore di Magic usato come dato, non come decorazione. |
| ManaBox, https://manabox.app (screenshot) | Tema solo scuro: fondo carbone, pannelli appena più chiari, icone ambra in quadrati arrotondati. Nei mockup del telefono, le righe dei raccoglitori hanno l'arte come sfondo e una striscia colorata sul bordo sinistro. |
| Proxxied, https://proxxied.com (screenshot) | Fondo bianco con un colore diverso per ogni sezione (pulsanti blu, viola, verde e ambra), un logo arrotondato e un banner a nastro. Va tenuto come contro-esempio: con troppi accenti, accanto a scansioni già colorate, nessun pulsante spicca **[DERIVATO]**. |
| MTG Print, https://mtgprint.net (screenshot) | Barra verde oliva, footer magenta e un'illustrazione decorativa (fata e simboli di mana) ai lati del form. Tono «fantasy» ottenuto con un'illustrazione, non con l'interfaccia. |
| Radix Colors, https://www.radix-ui.com/colors | Scale di 12 passi con un ruolo per passo, varianti chiare, scure e alpha, e grigi tinti (mauve, slate, sage, olive, sand) da accoppiare all'accento. È un modello per derivare i due temi dagli stessi ruoli. |
| Radix Themes, https://www.radix-ui.com/themes/docs/theme/color | I ruoli dei passi: 1–2 sfondi, 3–5 componenti interattivi, 6–8 bordi, 9–10 colori pieni, 11–12 testo accessibile. Il grigio viene accoppiato all'accento in automatico. |
| Vercel Geist, https://vercel.com/geist/colors | Ruoli a gruppi: 100–300 sfondi (normale, hover, attivo), 400–600 bordi (normale, hover, attivo), 700–800 sfondi ad alto contrasto, 900–1000 testo. Il grigio-alpha è riservato a ombre e overlay. |
| Linear, https://linear.app/now/how-we-redesigned-the-linear-ui | I temi nascono da tre variabili (base, accento, contrasto) calcolate in LCH. Linear ha ridotto l'accento per un aspetto «more neutral and timeless». |
| Apple HIG Dark Mode, https://developer.apple.com/design/human-interface-guidelines/dark-mode | Contrasto di almeno 4.5:1, meglio 7:1 per il testo piccolo. Il palette scuro non è l'inversione di quello chiaro. Suggerisce di «soften» le immagini dal fondo bianco nel tema scuro: per le scansioni non si può fare (ADR 0004), quindi tocca alla cornice attorno **[DERIVATO]**. Apple sconsiglia anche un'impostazione del tema propria dell'app; l'app oggi ne ha una. |
| Material Dark theme, https://github.com/material-components/material-components-android/blob/master/docs/theming/Dark.md | Superfici grigio scuro, non nere. Le superfici più alte sono più chiare. «Shadows are less effective» sul fondo scuro. |

**Doppio tema [DERIVATO]:**
- Le scansioni hanno bordi neri, bianchi, argento o nessun bordo (le stampe borderless). Un fondo grigio medio-scuro (né nero né bianco) separa dal fondo sia le carte dal bordo nero sia quelle dal bordo bianco, in entrambi i temi.
- Il tema chiaro dello stile attuale ha bordi neri spessi. Il tema scuro dovrà trovare un'altra separazione, perché un bordo nero su fondo scuro scompare.

### Tipografia

| Riferimento | Cosa prendere |
|---|---|
| Beleren, https://mtg.wiki/page/Beleren | È il carattere proprietario di Wizards per i nomi delle carte. Imitarlo farebbe sembrare l'app un prodotto ufficiale; va evitato **[DERIVATO]**. |
| Fraunces, https://github.com/undercasetype/Fraunces | Serif «Old Style» morbido, licenza OFL. Ha gli assi `opsz`, `SOFT` e `WONK`, e il progetto stesso lo dichiara adatto ai titoli più che al testo corrente. Porta un tono «da libro di fiabe» solo nei titoli, senza Gothic **[DERIVATO]**. |
| Geist Sans e Mono, https://vercel.com/font | Stile «restrained» di ispirazione svizzera, 9 pesi, OFL, con il cirillico. Un'alternativa neutra a Space Grotesk per l'interfaccia. |
| Linear, https://linear.app/now/how-we-redesigned-the-linear-ui | Inter Display per i titoli e Inter per il testo: due ottiche della stessa famiglia per avere gerarchia senza un secondo carattere. |

### Tono

- **Le app viste non usano un'interfaccia «fantasy».** Tutte (Scryfall, Moxfield, Archidekt, ManaBox) hanno un'interfaccia sans-serif neutra e lasciano il fantasy all'arte delle carte: un'arte ritagliata nelle anteprime dei mazzi (Moxfield, Archidekt) o un'illustrazione di sfondo nell'hero (Archidekt) (screenshot citati sopra).
- **Il kitsch arriva quando l'interfaccia imita la carta.** Pergamena, oro, font medievali: nessuna delle app viste lo fa **[DERIVATO]**.

## 2. Griglia di tessere con immagini di carte

| Riferimento | Cosa prendere |
|---|---|
| Scryfall, griglia delle stampe (screenshot, URL sopra) | Quattro colonne di circa 245 px a 1440 px, spazi stretti (circa 8–10 px, stimati dall'immagine), nessuna cornice, nessuna didascalia, nessuna ombra. Gli angoli arrotondati sono quelli della scansione. |
| Archidekt, viste del mazzo, https://archidekt.com/news/3108703 | «Grid shows all card images at all times» invece delle pile; le categorie stanno una sopra l'altra. Con Ctrl+clic, o una pressione lunga sul telefono, le carte selezionate si evidenziano in arancio. |
| Archidekt, impostazioni delle carte, https://archidekt.com/news/20605672 | Ogni elemento sopra la carta si può spegnere. Un clic fuori dai pulsanti apre i dettagli. Le azioni stanno in un menu «…» in basso a destra. |
| Material grid lists (m1), https://m1.material.io/components/grid-lists.html | Spazio di 4 dp o 1 dp tra le immagini. L'azione primaria occupa tutta la tessera e non ha bisogno di icona. Le azioni secondarie stanno nella stessa posizione su tutte le tessere. |
| Material Dark theme e Apple Dark Mode (URL sopra) | Le ombre si vedono poco sul fondo scuro. Nel tema scuro, rilievo e selezione si mostrano con la luminosità della superficie o con un bordo. |

**Spunti [DERIVATO]:**
- **Selezione.** Un anello fuori dal profilo della carta, distanziato da un filo del colore del fondo, così l'anello non tocca mai il bordo nero o bianco della scansione. Lo stile attuale fa già qualcosa di simile con `--color-selection-edge`.
- **Densità.** Il cursore della larghezza delle tessere esiste già (`TileWidthSlider`). Scryfall e Archidekt suggeriscono spazi stretti e nessuna didascalia: nome, quantità e avvisi vanno in una linguetta fuori dall'immagine, mai sopra l'immagine (ADR 0004 vieta di coprirla).
- **Gruppi.** Le barre segmentate di Archidekt e le strisce laterali di ManaBox mostrano che si può segnare un gruppo con il colore fuori dall'immagine. È il ruolo che oggi hanno i colori `sibling`.

## 3. Struttura del workspace

Oggi: pannello del decklist a sinistra, al centro la griglia o il foglio, a destra l'ispettore, con pannelli ridimensionabili e linguette sui bordi (`DesktopWorkspace.tsx`). Alternative trovate:

| Struttura | Riferimento | Pro e contro per decklist → stampe → PDF **[DERIVATO]** |
|---|---|---|
| **Pannelli laterali più griglia** (attuale) | Figma UI3, https://www.figma.com/blog/behind-our-redesign-ui3/ : pannelli flottanti ridimensionabili, barra degli strumenti sottile in basso, interfaccia nascondibile del tutto. Scartati i pannelli che si nascondono da soli. | **Pro:** testo, carte e dettaglio sono visibili insieme. **Contro:** a 1280 px la griglia resta stretta; con tre zone che scorrono ciascuna per conto suo, è difficile capire dove si trova il focus. |
| **Griglia più anteprima fissa a destra** | Archidekt «Static card», https://archidekt.com/news/20605672 : un'anteprima grande, fissata a destra, che cambia al passaggio del mouse, con sotto i controlli per cambiare stampa. | **Pro:** sostituisce l'ispettore con qualcosa che mostra la carta in grande, cioè ciò che serve per scegliere una stampa. **Contro:** il passaggio del mouse non esiste sul telefono. |
| **Lista o tabella più anteprima** | Archidekt Text e Table, https://archidekt.com/news/3108703 : righe di testo, l'immagine segue il cursore, quantità con i tasti `+` e `-`. | **Pro:** compatta, veloce per correggere quantità e nomi; il decklist e le carte diventano una vista sola. **Contro:** si perde il colpo d'occhio sulle stampe, che è il cuore di un generatore di proxy. |
| **Scorrimento orizzontale per categoria** | Archidekt Scroll, https://archidekt.com/news/3108703 : righe di carte che scorrono di lato. Il team stesso la chiama «weird» sul desktop, migliore sul telefono. | **Pro:** sul telefono una riga per sezione (main, sideboard, token). **Contro:** sul desktop scorrere di lato con la rotella è scomodo, per ammissione dello stesso team. |
| **Passi in sequenza** | mtgproxy.net, https://mtgproxy.net/ : inserimento, poi impostazioni di stampa in modali, poi Back e Next e «Download Print». Material steppers (m1), https://m1.material.io/components/steppers.html : passi non lineari per flussi in cui si può entrare in qualsiasi punto. | **Pro:** è il percorso dell'utente occasionale; il telefono lo fa già, con lista, carte e foglio. **Contro:** tornare al testo per correggere una riga costa un cambio di passo; Material sconsiglia gli stepper per form brevi. |
| **Guidato dalla palette di comandi** | cmdk, https://github.com/dip/cmdk : menu di comandi non stilizzato, filtro automatico, gruppi, stato di caricamento e vuoto, dialog costruito su Radix Dialog. | **Pro:** aggiungere una carta, cambiare stampa e andare al PDF sono tutti comandi raggiungibili da tastiera; si integra con Radix (ADR 0010). **Contro:** invisibile a chi non lo conosce; può affiancare la struttura, non sostituirla. |
| **Canvas o tavolo** | Figma UI3 (sopra): il canvas al centro, i pannelli che compaiono quando servono. | **Pro:** le carte come oggetti su un tavolo; il foglio come «tappeto». **Contro:** l'impaginazione la decide già `core`, quindi muovere le carte liberamente su un canvas non ha un senso nel dominio. |
| **Cassetto in basso** | Fogli nonmodali di Apple, https://developer.apple.com/design/human-interface-guidelines/sheets : agiscono sulla vista madre senza chiudersi. Material bottom sheet persistente (m1), https://m1.material.io/components/bottom-sheets.html : alla stessa elevazione dell'app, integrato nel layout. | **Pro:** la griglia occupa tutta la larghezza e il dettaglio della riga sale dal basso, sia sul desktop sia sul telefono, con un solo modello. **Contro:** sul desktop largo lo spazio verticale è il più scarso. |

## 4. Ricerca e aggiunta di carte

| Riferimento | Cosa prendere |
|---|---|
| Scryfall (screenshot) | La ricerca è dentro la barra scura in alto, sempre visibile. I controlli dei risultati sono scritti come una frase. Il conteggio sta in una riga sola: «1 – 60 of 72 cards where the name includes "lightning" and the name includes "bolt"». È la query riletta in linguaggio naturale. |
| Archidekt, guida EDHREC, https://edhrec.com/guides/how-to-use-archidekt-the-mtg-deckbuilding-site | La barra di ricerca del mazzo ha tre modi: «Quick add» per nome, «Detailed add» e «Syntax». Il grande pulsante «Search» apre una ricerca completa. Si possono trascinare immagini da Scryfall o da EDHREC dentro il mazzo. |
| Archidekt home (screenshot) | Un campo largo con accanto una tendina «Cards» per scegliere cosa cercare, e un placeholder che insegna la sintassi: «Search for: Sol Ring, set:DOM, etc». |
| mtgproxy.net, https://mtgproxy.net/ | Una barra che accetta nomi e filtri (prefissi di set e di tipo), un pulsante «?» per l'aiuto sulla sintassi e un conteggio corrente («0 cards»). |
| MPCFill editor (screenshot) | Le versioni si scorrono con le frecce ❮ e ❯ e un contatore «1 / 487» sotto ogni slot. Per scorrere poche versioni funziona; con molte serve un selettore a griglia **[DERIVATO]**. |
| Proxxied, https://proxxied.com/how-it-works | Un modale «artwork» per scegliere una stampa, girare le facce e confrontare le stampe. La scelta resta legata al progetto. |
| cmdk (sopra) | `Command.Loading` e `Command.Empty` coprono gli stati di caricamento e di nessun risultato. |

**Anteprima e zoom [DERIVATO]:** le tre forme trovate sono l'immagine che segue il cursore (Archidekt Text), l'anteprima fissa (Archidekt Static card) e il modale (Proxxied). L'app ha già `zoomed-card`. L'anteprima fissa è l'unica che funziona anche senza passaggio del mouse.

## 5. Al posto della landing page

| Riferimento | Cosa prendere |
|---|---|
| NN/g, stati vuoti, https://www.nngroup.com/articles/empty-state-interface-design/ | Tre compiti: lo stato del sistema, un indizio per imparare, una via diretta. L'esempio di Loggly offre due strade: collegare le proprie fonti oppure caricare dati demo. Avverte di non mostrare «nessun dato» mentre si sta ancora caricando. |
| MTG Print (screenshot) | L'app è il form: una frase sopra («Paste a deck in Magic The Gathering Arena format… You can download a PDF») e la textarea con un mazzo d'esempio come placeholder. Nessuna landing. |
| MPCFill editor (screenshot) | Un'area vuota al centro con due righe: «Your project is empty at the moment. Use the **Add Cards** menu on the right to get started!». L'indicazione punta a un controllo che si vede. |
| Excalidraw WelcomeScreen, https://plus.excalidraw.com/docs/sdk/excalidraw/api/children-components/welcome-screen | Al centro logo, titolo e un menu breve (aiuto, apri file). Attorno, suggerimenti che puntano al menu e alla barra degli strumenti. Tutto sparisce appena l'utente sceglie uno strumento o disegna qualcosa. |
| Figma UI3 (sopra) | Lo stesso principio applicato all'interfaccia: i pannelli compaiono quando servono. |

**Spunti [DERIVATO]:**
- Il workspace vuoto diventa il primo passo: il decklist occupa il centro, con un placeholder che è un mazzo d'esempio, e un pulsante «Prova con un mazzo d'esempio» (ispirato a Loggly) che usa `example-decklist.ts`.
- La griglia vuota mostra, al posto delle tessere, la sagoma di 3–4 slot con una frase che indica il decklist, come fa MPCFill.
- I quattro passi del tutorial attuale diventano suggerimenti in linea che spariscono alla prima azione, come in Excalidraw.

## 6. Layout del telefono

| Riferimento | Cosa prendere |
|---|---|
| NN/g, bottom sheet, https://www.nngroup.com/articles/bottom-sheet/ | Il foglio dal basso è per compiti brevi e non sostituisce la navigazione tra pagine. Non si impilano fogli. Il tasto Indietro deve chiuderlo. Va sempre messo un pulsante Chiudi visibile oltre alla maniglia. L'argomento della raggiungibilità col pollice è «largely incorrect». |
| Apple HIG Sheets (URL sopra) | Un solo foglio alla volta. Per compiti lunghi è meglio una vista a schermo intero. Un foglio nonmodale agisce sulla vista madre senza chiudersi (l'esempio è il formato di testo in Note). |
| Material bottom sheet (m1), https://m1.material.io/components/bottom-sheets.html | L'altezza iniziale non supera la linea guida dei 16:9; il foglio si espande a tutto schermo e poi scorre al suo interno; si chiude col trascinamento, con una X o col tasto Indietro; il foglio modale scurisce il resto. |
| ManaBox (mockup nello screenshot di https://manabox.app) | Barra in fondo con cinque voci (Home, Search, Collection, Decks, Scan), quella attiva in ambra. Nel dettaglio della carta, un pulsante ambra «Versions» apre le stampe. |
| Archidekt, https://archidekt.com/news/3108703 | La pressione lunga sul telefono sostituisce Ctrl+clic per selezionare più carte. |
| Vaul, https://github.com/emilkowalski/vaul | Drawer React molto usato, ma il README dice: «This repo is unmaintained». Da non adottare come dipendenza **[DERIVATO]**. |

**Spunto [DERIVATO]:** oggi il telefono ha i passi in una barra in fondo e il pannello della riga a schermo intero (`PhoneWorkspace`, `PhoneLinePanel`). Le fonti sostengono questa scelta: il dettaglio della riga è un compito lungo (stampe, quantità, avvisi), e Apple suggerisce lo schermo intero per i compiti lunghi. Un foglio a metà altezza andrebbe bene solo per azioni rapide sulla tessera.

## 7. Movimento e caricamenti (issue #82)

### Regole dalle fonti primarie

| Regola | Fonte |
|---|---|
| `prefers-reduced-motion: reduce` chiede di «removes, reduces, or replaces» il movimento. L'esempio sostituisce una pulsazione in scala con una dissolvenza di opacità. | MDN, https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion |
| WCAG 2.3.3 (AAA): il movimento innescato da un'interazione dev'essere disattivabile. «Motion animation does not include changes of color, blurring, or opacity». | W3C, https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html |
| «reduced motion doesn't mean the user wants no motion»: usare un'animazione più sottile che mostri ancora le relazioni. | Chrome for Developers, https://developer.chrome.com/docs/web-platform/view-transitions/same-document |
| Il movimento dev'essere breve e annullabile; per interazioni frequenti va evitato; l'utente non deve aspettare la fine di un'animazione. | Apple HIG Motion, https://developer.apple.com/design/human-interface-guidelines/motion |
| Sul desktop 150–200 ms; sul telefono 225 ms in entrata e 195 ms in uscita; oltre 400 ms «may feel too slow». | Material m1, https://m1.material.io/motion/duration-easing.html |
| Token M3 da 50 a 1000 ms; decelerazione in entrata (`cubic-bezier(0.05, 0.7, 0.1, 1)` per l'enfasi), accelerazione in uscita; la durata cresce con la distanza percorsa. | https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md |
| L'uscita dura 50–100 ms meno dell'entrata. Un pannello si chiude nella direzione da cui è entrato. Si animano solo `transform` e `opacity`, al massimo uno o due attributi per volta. | Atlassian, https://atlassian.design/foundations/motion/applying-motion |
| Le animazioni durano meno di 300 ms, con `ease-out`, devono essere interrompibili, e le azioni da tastiera non si animano. | Emil Kowalski, https://emilkowal.ski/ui/great-animations |
| Lo skeleton serve per i caricamenti dell'intera pagina sotto i 10 secondi; lo spinner per un singolo modulo tra 2 e 10 secondi; sotto 1 secondo non serve nulla; lo shimmer può essere «distracting». | NN/g, https://www.nngroup.com/articles/skeleton-screens/ |
| Un'immagine si può rappresentare come uno spazio vuoto delle stesse dimensioni finché non arriva. Lo skeleton non va sui controlli. | Carbon, https://carbondesignsystem.com/patterns/loading-pattern/ |
| Riservare lo spazio dell'immagine con `width`/`height` o `aspect-ratio`; le traslazioni composite non contano per il CLS. | web.dev, https://web.dev/articles/optimize-cls |

### Tecniche per gli elementi della #82

| Elemento | Tecnica | Con `prefers-reduced-motion` |
|---|---|---|
| **Riordino animato della griglia** | Motion `layout` anima i cambi di posizione con `transform` (https://motion.dev/docs/react-layout-animations). In alternativa, View Transitions con `view-transition-name` unico per tessera o `match-element` (https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API); nomi doppi annullano la transizione (Chrome, sopra). | Motion `MotionConfig reducedMotion="user"` disattiva da solo le animazioni di `transform` e di layout e conserva quelle di opacità (https://motion.dev/docs/react-accessibility). Con le View Transitions: una dissolvenza al posto dello spostamento **[DERIVATO]**. |
| **Skeleton e spinner** | Slot vuoti nelle proporzioni della carta mentre la decklist si risolve (Carbon, NN/g); uno spinner per la singola tessera; una barra di progresso per il PDF, che con molte immagini supera i 10 secondi (NN/g) **[DERIVATO]**. | Nessuno shimmer: slot fermi, oppure una pulsazione solo di opacità, che per WCAG non è movimento. |
| **Comparsa dell'immagine** | Lo slot ha già le proporzioni della carta (`aspect-ratio`, web.dev); l'immagine passa da opacità 0 a 1 in circa 150 ms quando ha finito di caricare **[DERIVATO]**. | L'opacità resta permessa (WCAG); oppure l'immagine compare subito. |
| **Hover del pulsante primario** | Cambio di colore in circa 50–150 ms (Atlassian); niente scala per l'hover, che è un'interazione frequente (Apple). | Il colore non è movimento, quindi resta com'è. |
| **Apertura e chiusura dei pannelli** | Radix mette `data-state="open"`/`"closed"` e sospende lo smontaggio finché l'animazione CSS di uscita non è finita (https://www.radix-ui.com/primitives/docs/guides/animation). Per elementi propri, `@starting-style` e `transition-behavior: allow-discrete` animano `display`, ma MDN li dà a disponibilità limitata (https://developer.mozilla.org/en-US/docs/Web/CSS/transition-behavior). Entrata e uscita nella stessa direzione (Atlassian). | Una dissolvenza di circa 150 ms al posto dello scorrimento (MDN, Apple); oppure il pannello compare subito. |

**Ispirazione visiva per il movimento [NON VERIFICATO]:** le gallerie (Dribbble, Godly, Mobbin) non erano leggibili. Recent.design, dove ora porta Godly, elenca microinterazioni («Coupon Dust Microinteraction», «Payment Swipe Interaction»), ma non ne ho visto nessuna in movimento (http://recent.design/?ref=godly).

## 8. Benchmark di settore

Aspetto e struttura, non prezzi (per quelli vedi `research/competitor.md`).

| App | Cosa ho visto | Cosa prendere |
|---|---|---|
| **Scryfall**, https://scryfall.com/search?q=lightning+bolt&unique=prints&as=grid (screenshot) | Barra indaco con la ricerca; controlli scritti come una frase; paginazione a destra con primo, precedente, casuale, successivo e ultimo; griglia a 4 colonne di scansioni nude su fondo chiarissimo. | Le carte sono le protagoniste e l'interfaccia resta in secondo piano. Il conteggio rilegge la query in parole. |
| **Moxfield**, https://moxfield.com/decks/public (screenshot) | Grigio chiaro, accento viola, pillola scura per la scheda attiva («All Decks»). Anteprime con l'arte ritagliata e titolo e formato in bianco su un gradiente scuro, simboli di colore in basso a sinistra. Il banner del consenso copriva una parte della pagina. | Le anteprime con l'arte ritagliata vanno bene per mazzi e progetti, non per le stampe (ADR 0004). La pagina del mazzo aperto: **[NON VERIFICATO]**, perché il permesso di fare altri screenshot è stato negato. Le viste esistono (testo o immagini, raggruppamento per tipo, colore, CMC e tag) secondo la copia non ufficiale del wiki, https://github-wiki-see.page/m/moxfield/moxfield-public/wiki/Features. |
| **Archidekt**, https://archidekt.com/ (screenshot), https://archidekt.com/news/3108703, https://archidekt.com/news/20605672 | Barra carbone, accento arancio, hero illustrato che sfuma nel bianco, ricerca al centro. Viste del mazzo: Stacks, Grid, Scroll, Text, Table e Brewer; anteprima fissa; elementi della carta disattivabili. | L'anteprima fissa a destra con i controlli delle stampe sotto è il parente più vicino del nostro ispettore. L'editor stesso: **[NON VERIFICATO]** (screenshot negato), descritto solo dalle note degli sviluppatori. |
| **ManaBox**, https://manabox.app (screenshot) | Landing in tema scuro con mockup del telefono: barra in fondo a 5 voci, pulsante ambra «Versions», liste con l'arte come sfondo. | Un tema scuro caldo con un solo accento; la scelta della stampa come azione principale del dettaglio della carta. |
| **MPCFill**, https://mpcfill.com/editor (screenshot) | Barra blu, area di lavoro blu notte; area vuota con una frase che indica il menu; colonna destra con finitura, «Search Settings», «Add Cards», «Download»; slot con frecce e contatore delle versioni. | Lo stato vuoto che indica un controllo visibile; la struttura «lavoro a sinistra, comandi a destra». |
| **Proxxied**, https://proxxied.com (screenshot), https://proxxied.com/how-it-works | Landing bianca e multicolore. Il Proxy Builder (non visto) ha un modale per la scelta delle stampe, controlli di pagina (bleed, spaziatura, guide) ed esportazione PDF o immagini a DPI configurabile. | Il passaggio dal Deck Builder al Proxy Builder: due strumenti distinti invece di uno. L'interfaccia del builder: **[NON VERIFICATO]** (screenshot negato; il changelog non descrive l'interfaccia). |
| **MTG Print**, https://mtgprint.net (screenshot) | Una sola pagina: frase, textarea con un mazzo d'esempio come placeholder, «Submit». Nessun passo di revisione delle carte (testo della pagina). | È il minimo assoluto: la textarea è l'ingresso. Il banner del consenso copriva il form. |
| **mtgproxy.net**, https://mtgproxy.net/ (solo testo) | Ricerca o import, poi impostazioni di stampa in modali raggruppati, poi Back e Next e «Download Print». | Un flusso a passi; le impostazioni di stampa raggruppate per tema. Aspetto: **[NON VERIFICATO]** (letto solo come testo). |

## 9. Fonti bloccate

| Fonte | Motivo |
|---|---|
| Dribbble (https://dribbble.com/tags/card_game_ui, https://dribbble.com/search/mtg-deck-builder) | **[NON VERIFICATO]**: WebFetch ha restituito un contenuto vuoto (pagina resa da JavaScript). Anche la ricerca web non ha trovato shot di Dribbble. |
| Behance (https://www.behance.net/search/projects/mtg%20deck%20builder) | **[NON VERIFICATO]**: HTTP 403. |
| Mobbin (https://mobbin.com/explore/web/screens/empty-state) | **[NON VERIFICATO]**: HTTP 403. |
| Land-book (https://land-book.com/) | **[NON VERIFICATO]**: HTTP 403. |
| Refero (https://refero.design/) | **[NON VERIFICATO]**: è arrivato solo il titolo (pagina resa da JavaScript). |
| Godly (https://godly.website/) | Reindirizza a recent.design, che elenca lavori di branding e animazione, non interfacce di strumenti. |
| Material 3 (https://m3.material.io/) | **[NON VERIFICATO]**: la pagina richiede JavaScript. Ho usato m1.material.io e la documentazione su GitHub. |
| Scryfall e Moxfield via WebFetch | HTTP 403. Le loro pagine pubbliche sono state viste con Chromium headless. |
| Pagine di lavoro di Moxfield, Archidekt e Proxxied | **[NON VERIFICATO]**: dopo il primo giro di screenshot il permesso di lanciarne altri è stato negato. |
| Wiki del frontend di MPCFill (https://github.com/chilli-axe/mpc-autofill/wiki) | La pagina Frontend non si è caricata; l'indice non descrive l'interfaccia. |
| Guide di ManaBox (https://manabox.app/guides) | Solo un redirect verso la FAQ. |

## Spunti per i prototipi [DERIVATO]

1. **«Tavolo di Scryfall».**
   - Tema chiaro neutro, come Scryfall: la barra scura in alto contiene sia la decklist, compressa in un campo che si espande, sia la ricerca.
   - Sotto, la griglia a tutta larghezza con scansioni nude e spazi stretti (Material grid lists).
   - Al passaggio del mouse o al tocco, il dettaglio della riga sale da un cassetto in basso nonmodale (Apple sheets, Material persistent bottom sheet).
   - Le impostazioni di stampa sono una frase sopra la griglia, come la barra dei controlli di Scryfall.
   - Mette alla prova l'idea che le carte bastino come decorazione.
2. **«Anteprima fissa».**
   - Tema scuro carbone con un solo accento caldo (ManaBox, Archidekt).
   - Tre zone: a sinistra il decklist come lista o tabella con quantità `+`/`-` (Archidekt Text e Table); al centro la griglia; a destra una carta grande fissa con le stampe sotto (Archidekt Static card).
   - Sostituisce l'ispettore attuale con la carta in grande.
   - Su fondo scuro la selezione è un anello chiaro, non un'ombra (Material Dark).
3. **«Incolla e vai».**
   - L'app apre su un solo campo al centro, con un placeholder che è un mazzo d'esempio (MTG Print), un pulsante «Prova un mazzo d'esempio» (NN/g, l'esempio Loggly) e suggerimenti che puntano ai controlli e spariscono alla prima azione (Excalidraw WelcomeScreen).
   - Incollato il mazzo, il campo si restringe in una colonna e le tessere entrano con una dissolvenza.
   - Passi espliciti, «Lista → Carte → Foglio», con Back e Next in fondo (mtgproxy.net, Material steppers non lineari): lo stesso modello su desktop e telefono.
4. **«Tastiera prima».**
   - Interfaccia minima in stile Linear (Inter Display e Inter, accento ridotto, LCH) con una palette di comandi (cmdk su Radix Dialog) per aggiungere carte, cambiare stampa, cambiare vista e generare il PDF.
   - La griglia occupa tutto lo schermo; i pannelli compaiono solo su richiesta e restano finché non li si chiude, senza nascondersi da soli (la lezione di Figma UI3).
   - Movimento quasi assente: le azioni da tastiera non si animano (Emil Kowalski).
5. **«Biblioteca».**
   - Tema chiaro caldo (grigi «sand» o «olive» di Radix Colors), titoli in Fraunces con `SOFT` alto e `WONK` spento, e interfaccia in un sans neutro (Geist).
   - Le categorie (main, sideboard, token) diventano righe che scorrono di lato sul telefono e si impilano sul desktop (Archidekt Scroll e Grid).
   - Colore di gruppo in una striscia fuori dall'immagine (ManaBox, le barre di Archidekt).
   - Mette alla prova un tono «fantasy» senza kitsch, portato solo dalla tipografia.
