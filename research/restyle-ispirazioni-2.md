# Ricerca: ispirazioni per il restyle dell'app web, secondo giro

Data di consultazione: **2026-11-23**. Ogni riferimento ha l'URL accanto e una riga su cosa vale la pena prendere. Le deduzioni mie sono marcate **[DERIVATO]**. I siti che non ho potuto vedere sono marcati **[NON VERIFICATO]** con il motivo: il loro aspetto non è descritto, né ricostruito a memoria.

## Perché un secondo giro

Il primo giro (`research/restyle-ispirazioni.md`) ha prodotto tre prototipi: «Tavolo» (griglia di scansioni a tutta larghezza con un cassetto in basso), «Anteprima fissa» (tre zone con una carta grande fissa) e «Incolla e vai» (passi in sequenza). L'utente li ha scartati tutti e tre. Sembravano versioni scure, economiche e generiche del design attuale, da SaaS qualunque, e la loro struttura restava troppo vicina alle tre zone di oggi (decklist a sinistra, griglia al centro, ispettore a destra). Questo giro cerca **strutture originali e identità forti**.

Ambito, in ordine di profondità:

1. **Prodotti analoghi**: flussi del tipo «tante immagini in ingresso, una versione scelta per ciascuna, stampa», cioè stampa di foto, fotolibri, fogli di adesivi, configuratori di stampa su richiesta, etichette, strumenti di selezione delle foto (culling), imposizione di stampa.
2. **Strutture oltre «griglia più pannelli laterali»**: canvas infinito, tavoli spaziali, moodboard, timeline dei programmi di montaggio, viste divise, pile di carte.
3. (più leggero) Dominio TCG, solo ciò che il primo giro non copriva.
4. (più leggero) Interazioni per scegliere una stampa.
5. (più leggero) Identità che fanno evolvere quella neo-brutalista attuale.

## Metodo

- **Fonti:** siti dei prodotti, centri di assistenza ufficiali, pagine degli store, repository dei caratteri su GitHub (letti con `gh api`). Le gallerie (Dribbble, Mobbin, Behance) non sono state usate come fonte: il primo giro le ha trovate illeggibili.
- **Nessuno screenshot:** in questo giro ho letto solo il testo delle pagine. Dove descrivo un'interfaccia, la descrizione viene dalle parole del produttore, non da un'immagine.
- **Pagine con HTTP 403:** i centri di assistenza di Adobe (helpx.adobe.com) e di Capture One rispondono 403 a WebFetch; per Adobe, il tentativo con `curl` è stato negato dai permessi. Per Lightroom Classic e Capture One riporto quello che dicono gli estratti del motore di ricerca di quelle stesse pagine, marcati **[ESTRATTO]**: non ho letto la pagina intera.
- **Vincoli che le direzioni rispettano:** un solo tema scuro (ADR 0020); le scansioni non si alterano, non si coprono e non si ritagliano oltre il profilo della carta (ADR 0004, sostituita da ADR 0007, sostituita da ADR 0013); componenti nostri su Radix e Tailwind (ADR 0010); prima il telefono; niente Beleren; niente Vaul (il primo giro lo ha trovato non mantenuto); movimento minimo.

## Sintesi

1. **Gli strumenti di selezione delle foto risolvono già il nostro problema: «tante varianti di una cosa, sceglierne una».** Lightroom ha le pile con una foto in cima e la coppia «select / candidate» con «Make Select» (**[ESTRATTO]**). Foto di Apple ha le raffiche con «Make a Selection». Narrative Select raggruppa le foto in scene e mette per prima la migliore. È esattamente il rapporto tra una riga del decklist e le sue stampe **[DERIVATO]**.
2. **Chi stampa foto fa vedere il foglio come una pagina con le celle, non come un'anteprima a parte.** Lightroom Print ha il «Contact Sheet» con righe e colonne e il «Custom Package», in cui si trascinano le foto dalla filmstrip sulla pagina (**[ESTRATTO]**). Tabletop Simulator costruisce un mazzo da un «card sheet», una griglia d'immagini «tagliata» in carte. Dex mostra una collezione come un raccoglitore da 9 tasche. Il foglio può essere il luogo di lavoro, non l'ultimo passo **[DERIVATO]**.
3. **I programmi di montaggio separano «sorgente» e «programma».** Il Cut page di DaVinci Resolve mette tutte le clip di una cartella in un unico «nastro» da scorrere e ha una «sync bin» che mostra le clip alternative per il punto corrente. Le stampe di una carta sono la sorgente; il decklist è il programma **[DERIVATO]**.
4. **I canvas servono come navigazione, non come impaginazione libera.** Freeform salva «scene» di una lavagna e le scorre con Avanti e Indietro, anche su iPhone, e le esporta in PDF. I frame di Excalidraw ritagliano i loro figli e si esportano uno per uno. Allume (ex Muse) annida lavagne dentro lavagne e rifiuta lo zoom infinito. Questo risponde all'obiezione del primo giro: le carte non si muovono liberamente, ma il canvas può ospitare «pagine» posate da `core` **[DERIVATO]**.
5. **L'ombra rigida del neo-brutalismo ha un parente di stampa: il fuori registro del risografo.** La risografia stampa un colore per tamburo, con inchiostri semitrasparenti che si sovrappongono, e ogni passaggio in più aumenta il rischio di «misregistration» (Moniker Press). Un secondo colore spostato di qualche pixel sotto i controlli (mai sotto le scansioni) fa evolvere l'identità attuale invece di sostituirla con un SaaS scuro **[DERIVATO]**.

---

## 1. Prodotti analoghi

### 1.1 Selezione delle foto (culling)

| Riferimento | Cosa prendere |
|---|---|
| Lightroom Classic, Compare e Survey, https://helpx.adobe.com/lightroom-classic/desktop/viewing-photos/browse-compare-photos.html **[ESTRATTO]** | Compare mostra due foto affiancate: la «select» (attiva) e la «candidate». Si promuove la candidata con «Make Select»; la freccia destra porta la candidata successiva contro la stessa select. Survey affianca più foto, con un bordo bianco sull'attiva e un'icona per togliere una foto dal confronto; le anteprime rimpiccioliscono man mano che se ne aggiungono. |
| Lightroom Classic, pile, https://helpx.adobe.com/lightroom-classic/desktop/organize-photos-in-lightroom-classic/grouping-photos-stacks.html **[ESTRATTO]** | Una pila chiusa mostra solo la foto in cima, con il numero di foto nell'angolo in alto a sinistra. Un clic sul numero apre la pila; «Move To Top Of Stack» cambia la foto in cima. Le modifiche su una pila chiusa toccano solo la foto in cima. |
| Foto di Apple, raffiche, https://support.apple.com/guide/photos/view-photo-bursts-pht8745d2677/mac | Una raffica è una sola miniatura; con un doppio clic si vedono tutti gli scatti. «Make a Selection», poi un clic su ogni scatto da tenere (compare un segno di spunta) e le frecce per scorrere; alla fine si sceglie «Keep Only Selection» o «Keep Everything». |
| Narrative Select, https://narrative.so/select | Le foto dello stesso momento formano una «Scene»; dentro la scena sono ordinate «from Best in scene to Undesirable, with the reason shown» e «The best frame surfaces first». Un pannello «Close-Ups» mostra i volti senza zoom. Survey Mode: si selezionano le foto e con N se ne vedono fino a 12 affiancate. Le frecce passano alla foto successiva «the moment you tap your arrow key». |
| Aftershoot, https://aftershoot.com/ | Raggruppa i fotogrammi simili e separa i duplicati veri dalle varianti volute. Due viste, «Grid and Loupe», più Survey Mode per confrontare i duplicati e «Spray Can» per valutare con un clic. |
| Photo Mechanic, Contact Sheet, https://docs.camerabits.com/support/solutions/articles/48000207551 | Più provini aperti come schede in alto; ogni miniatura ha una casella «tagged», una barra colorata per la classe di colore e le stelle; sotto, il nome del file e fino a tre righe di informazioni configurabili. Un cursore sopra i provini regola la dimensione delle miniature. |
| Photo Mechanic, finestra di anteprima, https://docs.camerabits.com/support/solutions/articles/48001144384 (dal riassunto della ricerca web) | Si apre con la barra spaziatrice dal provino; ha una striscia di miniature che mostra tutte le foto o solo le selezionate. |
| Capture One, Compare Variant, https://support.captureone.com/hc/en-us/articles/360002481017 **[ESTRATTO]** | Un'immagine di riferimento viene «pinned to the Viewer» con un bordo arancio; le altre immagini selezionate compaiono accanto a lei, una alla volta. In Capture One Studio se ne possono mostrare fino a 11. |
| Darkroom, https://darkroom.co/ | «There is no separate library and no import»: l'editor lavora sulla libreria di Foto. «Start on a phone, finish on a Mac. Same tools, no handoff.» |

**Spunti [DERIVATO]:**
- **La riga come pila.** Una riga del decklist è una pila: chiusa mostra la stampa scelta, con il numero di stampe disponibili in un angolo *fuori* dalla scansione; aperta mostra le stampe. «Move to top» corrisponde a «usa questa stampa». Le tessere sorelle sono la stessa pila con più carte in cima.
- **Select contro candidate.** Per scegliere tra 30 stampe di un'isola basica non serve una griglia di 30: basta la stampa attuale fissa e le candidate che scorrono accanto con le frecce (Lightroom Compare, Capture One Compare Variant). La griglia (Survey, fino a 12 come Narrative) resta per un colpo d'occhio.
- **Ordinare, non filtrare.** Narrative mette per prima la foto migliore della scena. Per noi «la migliore» può essere la stampa predefinita, poi le stampe nella lingua della riga, poi le altre: un ordine, non un filtro che nasconde.
- **Lo stesso strumento su telefono e desktop** (Darkroom): la selezione funziona a tasti sul desktop e a scorrimento sul telefono, ma è lo stesso gesto mentale, una carta alla volta.

### 1.2 Ordini di stampe, fotolibri, fogli di adesivi

| Riferimento | Cosa prendere |
|---|---|
| Lightroom Classic, layout del modulo Stampa, https://helpx.adobe.com/lightroom-classic/desktop/print-photos/print-module-layouts-templates.html **[ESTRATTO]** | Tre stili: «Single Image/Contact Sheet» (più foto della stessa misura, con margini, righe, colonne e dimensione della cella), «Picture Package» (una foto in più misure, con «Auto Layout» che riduce i tagli) e «Custom Package», in cui si trascinano le foto «from the Filmstrip to the page preview». Il centro dello schermo è la pagina, la filmstrip sta sotto. |
| Snapfish (App Store), https://apps.apple.com/gb/app/id330035194 | Il «prints builder» permette di «zoom & pan in the crop area, edit print quantity & size» e di scegliere la finitura «for entire photo order»; avverte «Be sure to review the cropping of your prints before you order». Le opzioni sono per foto (quantità, misura) o per ordine (carta). |
| Artifact Uprising, guida al fotolibro, https://www.artifactuprising.com/diy/photo-book-building-guide | Quattro strumenti a sinistra (Image, Layout, Text, Preview). Le foto aspettano in una barra in basso: «use this bottom bar to drag and drop images into your layouts». «Be sure to place a photo in every grey box so it doesn't print blank.» Il bordo grigio segna la zona di rifilo; un avviso segnala la bassa risoluzione. «Preview» dà «a bird's-eye view of your finished pages». |
| Google Foto, modifica di un fotolibro, https://support.google.com/photos/answer/7378727?hl=en&co=GENIE.Platform%3DDesktop | Il layout di una pagina si cambia passando sopra la pagina e cliccando le miniature di layout sul lato; si trascina dentro la foto per spostarla; le pagine si riordinano trascinandole accanto ad altre o dal pannello di anteprima. |
| Blurb BookWright, https://www.blurb.com/bookwright | Griglie libere, linee di rifilo e di abbondanza, «layout suggestions you can use in one click», immagini trascinate sulla pagina. La pagina non descrive la struttura dello schermo. |
| Sticker Mule, fogli di adesivi, https://www.stickermule.com/products/sticker-sheets | Si sceglie la misura del foglio e la quantità, poi si carica il disegno. Due strade: impaginare da sé con i loro modelli, oppure «upload a .zip containing your designs and we'll lay them out for you». La bozza («online proof») arriva dopo il pagamento e si possono chiedere modifiche gratis. |
| StickerApp, fogli di adesivi, https://stickerapp.com/sticker-academy/product-info/sticker-sheets (dal riassunto della ricerca web) | Un editor nel browser in cui si posano i disegni sul foglio e si sceglie misura e forma di ogni adesivo. La pagina di istruzioni (https://stickerapp.com/support/how-to/custom-sticker-sheets) è un indice senza i passi. |
| Avery Design & Print, https://www.avery.com/software/design-and-print | Si parte da un modello «made to fit your Avery product», si progetta, si fondono i dati da un foglio di calcolo e si fa l'anteprima. Elenca «Edit One / Edit All» senza spiegarlo. |
| Printful, generatore di mockup, https://www.printful.com/mockup-generator | «Pick an item, add your design, and save the template»; poi «click **Preview** to see it on a variety of mockups»; si scaricano più mockup insieme. |

**Spunti [DERIVATO]:**
- **La pagina al centro, gli elementi in una striscia.** Lightroom Custom Package e Artifact Uprising mettono la pagina al centro e le foto in attesa in una striscia in basso. Per noi la striscia è il decklist (una carta per riga, in ordine) e il centro è il foglio vero, con le sue celle da 63×88 mm.
- **La cella vuota come stato.** Artifact Uprising chiede di riempire ogni riquadro grigio «so it doesn't print blank». La nostra riga da sistemare è una cella del foglio che resta grigia finché non la si risolve: si vede *dove* finirà nel PDF.
- **Opzioni per elemento e per ordine.** Snapfish separa quantità e misura (per foto) dalla carta (per tutto l'ordine). Da noi la stampa e le copie sono per riga, margini e segni di taglio per tutto il foglio: due posti diversi nell'interfaccia.
- **«Lo impaginiamo noi».** Sticker Mule offre di impaginare al posto dell'utente. È ciò che fa già `core`: l'interfaccia non deve fingere un'impaginazione libera.

### 1.3 Imposizione di stampa

| Riferimento | Cosa prendere |
|---|---|
| Fiery Impose, pannello Settings, https://help.fiery.com/jobmaster/FieryImposePlus/6.1/en-us/GUID-A0480C1F-5A31-4F37-9CE7-1D665F43182F.html | Le impostazioni stanno in un pannello della finestra Fiery Preview; «the changes you make are displayed in the Sheet View pane». Si sceglie «Booklet» o «Gangup» in cima al pannello. |
| Imposition Wizard | **[NON VERIFICATO]**: imposition.com reindirizza a ultimate-tech.com, che non ho aperto. Le fonti trovate sono elenchi di terzi (Softpedia) che parlano di «real-time WYSIWYG preview»: non le uso. |
| Quite Imposing, https://www.quiteimposing.com/ | **[NON VERIFICATO]**: la connessione si è chiusa durante la lettura. |

**Spunto [DERIVATO]:** nei programmi di imposizione la vista principale è il foglio di stampa e le impostazioni lo modificano dal vivo. È la «Sheet View» come centro, che oggi da noi è solo una delle due viste del centro (`CentreView`).

## 2. Strutture oltre «griglia più pannelli laterali»

### 2.1 Canvas, lavagne e scene

| Riferimento | Cosa prendere |
|---|---|
| Freeform, scene, https://support.apple.com/guide/freeform/navigate-and-present-scenes-frfm7cc55b64/mac (dal riassunto della ricerca web) | Una scena è una vista salvata della lavagna: si inquadra una parte, si aggiunge dal «Scene Navigator» in basso a sinistra, ci si sposta con Avanti e Indietro, si riordinano trascinandole. Si stampano o si esportano in PDF tutte o una sola. Avverte che una scena può apparire diversa su un altro dispositivo. Esiste anche per iPhone (https://support.apple.com/guide/iphone/navigate-and-present-scenes-iphbe64aa259/ios). |
| Excalidraw, frame, https://plus.excalidraw.com/docs/sdk/codebase/frames | «Frame children are clipped to their frame»; fuori dal frame i figli non si selezionano. All'esportazione di un frame entrano anche le frecce di altri frame che lo raggiungono. |
| Excalidraw+, presentazioni, https://plus.excalidraw.com/use-cases/presentations (dal riassunto della ricerca web) | Il «Frame tool» trasforma parti del disegno in diapositive; l'esportazione dei frame in PDF e PPTX è a pagamento. |
| Allume (ex Muse), https://allume.com/ | «Each Allume board is like a whiteboard that can hold even more whiteboards.» Un «Inbox» di carte sul bordo sinistro tiene quelle non ancora usate. Tra le cose che *non* fa: «Endless canvas zooming or rotation? Nay.» |
| Figma Slides, https://help.figma.com/hc/en-us/articles/24170630629911-Explore-Figma-Slides | Due viste dello stesso canvas: «Slide view» per «a focused look at a single slide» e «Grid view» per «a bird's eye view of the canvas». Si passa dall'una all'altra con un interruttore nella barra laterale. |
| Figma Slides, numeri delle diapositive, https://help.figma.com/hc/en-us/articles/30436550728087-Add-slide-numbers-to-your-presentation (dal riassunto della ricerca web) | Nella vista a griglia le diapositive stanno in righe; la numerazione può ripartire «Within row». |
| tldraw, forme, https://tldraw.dev/docs/shapes | Ogni forma ha un `ShapeUtil` che decide «how it renders, its geometry for hit testing, and how it responds to interactions»; il suo `component` restituisce JSX dentro un `HTMLContainer`. La pagina sulla camera (https://tldraw.dev/docs/camera) ha risposto 404. |
| Tabletop Simulator, snap point, https://kb.tabletopsimulator.com/game-tools/snap-point-tool/ | «locations where dropped Objects will gravitate towards», con una variante che ruota anche l'oggetto. |
| Tabletop Simulator, custom deck, https://kb.tabletopsimulator.com/custom-content/custom-deck/ | «A deck is created from a card sheet, which is an array of images which get "cut up" into cards by the game engine.» Larghezza e altezza della griglia (per esempio 10×7) danno il numero di carte; l'ultima immagine fa da dorso nascosto. |
| Miro, frame, https://help.miro.com/hc/en-us/articles/360018261813-Frames | **[NON VERIFICATO]**: HTTP 403. |

**Spunti [DERIVATO]:**
- **Il canvas posa, non impagina.** L'obiezione del primo giro era che muovere le carte liberamente non ha senso, perché l'impaginazione la decide `core`. Le fonti mostrano un altro uso: i frame (Excalidraw) e i card sheet (Tabletop Simulator) sono contenitori con posti fissi, e gli snap point attirano gli oggetti in quei posti. Le pagine del foglio diventano frame posati sul canvas; le carte ci cadono negli slot che `core` ha calcolato.
- **Le scene come passi.** «Lista», «Carte» e «Foglio» non sono schermate diverse, ma scene dello stesso canvas, con Avanti e Indietro (Freeform). Sul telefono la scena riempie lo schermo; sul desktop si vede anche ciò che le sta attorno.
- **Lavagne dentro lavagne, senza zoom infinito.** Allume annida le lavagne ma rifiuta lo zoom continuo. Una tessera che si apre nella «lavagna» delle sue stampe dà profondità senza l'animazione di zoom, che andrebbe contro il movimento minimo.
- **Due viste dello stesso oggetto** (Figma Slides): «una carta alla volta» e «tutte le carte» non sono due pagine dell'app, ma due inquadrature dello stesso piano.

### 2.2 Moodboard e archivi visivi

| Riferimento | Cosa prendere |
|---|---|
| Milanote, https://www.milanote.com/ | Lavagne in cui «combine notes, images, videos, sketches and more»; l'app mobile serve per catturare «on the go», la pianificazione vera avviene sul desktop. La pagina non descrive colonne né lavagne annidate; il centro di assistenza (https://help.milanote.com/en/articles/2006489-getting-started-with-milanote) ha risposto 404. |
| Are.na, https://www.are.na/about | Ogni contenuto è un «block»; i blocchi stanno in «channels», e lo stesso blocco può stare in più canali. «Are.na is entirely set in Areal, a custom typeface by Dinamo.» «No ads, no personalized recommendations.» |
| mymind, https://mymind.com/ | «Remember everything. Organize nothing.» Niente cartelle («Folders are dead»): si ritrova per colore, parola, marca o data. Etichette delle sezioni in maiuscolo; «A purposefully slow and peaceful experience». |
| Cosmos, https://www.cosmos.so/ | «Start with an image you love and find more like it»; ricerca per tonalità («the exact shade you have in mind»); collezioni per progetto. |
| Eagle, https://en.eagle.cool/ | Vista «waterfall» e altre; anteprima al passaggio del mouse, barra spaziatrice per vedere da vicino, frecce per il file successivo. «Assets keep their original proportions without cropping.» Ricerca per palette di colore. |

**Spunti [DERIVATO]:**
- **«Una stampa è un blocco, la riga è un canale».** Come in Are.na, la stessa stampa (per esempio una pedina) può comparire in più contesti. Più utile come linguaggio che come struttura.
- **Più simili, non più filtri.** Cosmos parte da un'immagine e ne mostra di simili. Nel selettore delle stampe: a partire dalla stampa attuale, le stampe con la stessa arte, poi quelle con la stessa cornice, poi le altre. Richiede dati che il catalogo forse non ha; da verificare.
- **La calma come identità.** mymind e Are.na hanno un'identità forte con pochissimi elementi: un carattere proprio, etichette in maiuscolo, nessun accento acceso. È l'opposto del «SaaS scuro generico», che ha molti elementi deboli.

### 2.3 Montaggio video: sorgente, programma, nastro

| Riferimento | Cosa prendere |
|---|---|
| DaVinci Resolve, Cut page, https://www.blackmagicdesign.com/products/davinciresolve/cut | «Source tape»: «all of the clips in your bin appear in the viewer as a single long "tape"», e la pagina resta sul nastro dopo un taglio per aggiungere altre inquadrature. Due timeline: quella in alto mostra «the entire program», quella in basso è ingrandita sul punto di lavoro. Un solo viewer. La «sync bin» mostra le clip sincronizzate con il punto corrente per scegliere un'inquadratura alternativa. «Append at End» aggiunge in coda. |
| Final Cut Pro, skimming, https://support.apple.com/guide/final-cut-pro/skim-media-vere9ba3609/mac | Con lo skimming attivo, passando il puntatore su una clip del browser o della timeline il viewer mostra il fotogramma sotto il puntatore; una linea rossa verticale, lo «skimmer», segna la posizione. |

**Spunti [DERIVATO]:**
- **Il decklist come timeline.** Le righe in ordine, in una striscia; ogni riga larga quanto le sue copie; i confini delle pagine del foglio segnati sulla striscia come tacche. La timeline in alto mostra tutto il mazzo, quella in basso la zona in lavorazione (Resolve).
- **Le stampe come nastro sorgente.** Tutte le stampe della carta corrente in un'unica striscia da scorrere nel viewer; con lo skimming (Final Cut) il viewer mostra la stampa sotto il puntatore senza clic, e il clic la mette nel programma.
- **La sync bin come selettore.** «Le clip sincronizzate con il punto corrente» corrispondono esattamente a «le stampe della riga corrente»: il selettore delle varianti è una sync bin.

### 2.4 Viste divise, pile, scorrimento

| Riferimento | Cosa prendere |
|---|---|
| Apple HIG, split views, https://developer.apple.com/design/human-interface-guidelines/split-views (letta tramite il JSON pubblico) | «persistently highlight the current selection in each pane that leads to the detail view»; trascinare tra i riquadri; su iPhone in verticale la vista divisa è sconsigliata. Su tvOS di base un terzo e due terzi, oppure metà e metà; un titolo solo sopra la vista divisa. Keynote su macOS circonda la diapositiva con navigatore, note e ispettore. |
| NN/g, mobile usability, https://www.nngroup.com/articles/mobile-usability-2nd-study/ | «Swiping is still less discoverable than most other ways of manipulating mobile content»: serve «a visible cue». Ma per un mazzo di carte o un carosello «mobile-device users typically expect to horizontally swipe». |
| Bento grids, https://bentogrids.com/ | **[NON VERIFICATO]**: è arrivato solo il titolo della pagina. Senza una fonte primaria non descrivo il modello. |

**Spunto [DERIVATO]:** la vista divisa di Apple è la struttura di oggi; Keynote mostra il suo limite: tre riquadri attorno a un oggetto centrale. Le direzioni qui sotto evitano di aggiungere un terzo riquadro e scelgono un solo oggetto principale per schermata.

## 3. Dominio TCG (solo ciò che è nuovo rispetto al primo giro)

| Riferimento | Cosa prendere |
|---|---|
| MTG Arena, Preferred Printing, https://magic.wizards.com/en/news/mtg-arena/mtg-arena-announcements-february-27-2023 | Nella Collezione si espande una carta per vederne le stampe e si tocca il cuore su quella preferita; i mazzi la usano da sé. Senza preferenza, «your decks will default to the latest printing available in your collection». |
| MTG Arena, stili nel menu Preferred Printing, https://magic.wizards.com/en/news/mtg-arena/mtg-arena-announcements-october-23-2023 (dal riassunto della ricerca web) | Stampe e stili delle carte in un unico menu, «all visualizations of a card are all found in the same place»; tolto il pulsante «Styles» separato dal deck builder. Un annuncio successivo (https://magic.wizards.com/en/news/mtg-arena/mtg-arena-announcements-june-3-2024, dal riassunto) lo rimette come interruttore in alto a destra che mostra gli stili di tutto il mazzo insieme. |
| Dex, Binder Display Mode, https://dextcg.com/help/collection/binder-display-mode | «simulates a physical card binder»: 4, 9 (predefinito), 12 o 16 tasche per pagina, 12 e 16 consigliate su schermi grandi; si sfoglia scorrendo a destra e sinistra, con frecce per prima e ultima pagina, un indicatore di pagina toccabile e i tasti freccia sul web. |
| Untap.in, https://untap.in/ | «a free, browser-based table for play-testing trading card game decks», su desktop, tablet o telefono; «does not enforce the rules, so you play the way you would across a real table». |
| Tabletop Simulator, card sheet (sopra, 2.1) | Il mazzo nasce da un foglio a griglia: lo stesso oggetto del nostro PDF, visto al contrario. |

**Spunti [DERIVATO]:**
- **La stampa preferita come stato della carta, non della riga.** Arena ricorda la preferenza per tutti i mazzi. Da noi la scelta vive nella riga (`LineChoices`); un «cuore» per carta è un'idea di prodotto, non di layout, e va valutata a parte.
- **Il raccoglitore come metafora già nota.** Il giocatore conosce le tasche da 9 del raccoglitore fisico. Il foglio A4 da 3×3 carte *è* una pagina di raccoglitore: la metafora coincide con il prodotto.

## 4. Interazioni per scegliere una stampa

| Riferimento | Cosa prendere |
|---|---|
| Shopify, varianti nei temi, https://shopify.dev/docs/storefronts/themes/product-merchandising/variants | Meglio un selettore per ogni opzione che uno solo per tutte le varianti; «when a new variant is selected, the product media and price are updated to reflect the selected variant». |
| Lightroom Compare, Capture One Compare Variant (sopra, 1.1) | Riferimento fisso, candidate a scorrimento. |
| Foto di Apple, raffiche (sopra, 1.1) | Spunta su ciò che si tiene, frecce per scorrere, «Done». |
| Narrative Select Survey (sopra, 1.1) | Fino a 12 affiancate, aperte con un tasto. |
| NN/g mobile usability (sopra, 2.4) | Lo scorrimento laterale tra carte è atteso, ma va segnalato con un indizio visibile. |
| Apple Store, configuratore di iPhone, https://www.apple.com/shop/buy-iphone | **[NON VERIFICATO]**: il testo restituito non contiene il configuratore (pagina resa da JavaScript). |

**Spunti [DERIVATO]:**
- **Le opzioni separate, come Shopify.** Lingua, set e finitura (foil, borderless, showcase) sono opzioni distinte di una stampa. Tre selettori piccoli che restringono le stampe sono più leggibili di una griglia di 40 scansioni, e la scansione grande si aggiorna a ogni scelta.
- **Il ventaglio senza toccare le scansioni.** Un ventaglio o una pila sovrappongono le carte, e coprire una scansione con un'altra non la altera: è come la `CopyPile` di oggi. Quello che resta vietato è disegnarci sopra (ADR 0004 e successive).

## 5. Identità che fanno evolvere quella attuale

| Riferimento | Cosa prendere |
|---|---|
| NN/g, neobrutalism, https://www.nngroup.com/articles/neobrutalism/ | Definizione: «high contrast, blocky layouts, bold colors, thick borders, and "unpolished" elements», con ombre piene di un colore solo. Consigli: 2–3 colori al massimo, titoli espressivi con testo neutro, stati segnalati con sottolineature o cambi di colore invece di gradienti e ombre. |
| Moniker Press, colori risograph, https://www.monikerpress.ca/colours/ | Un tamburo per colore; gli inchiostri sono semitrasparenti e si sovrappongono (blu più rosso dà viola); più passaggi aumentano «the likelihood of misregistration». Nomi: Fl Pink, Fl Orange, Teal, Cornflower, Medium Blue, Flat Gold. |
| Cooper Hewitt, il carattere, https://www.cooperhewitt.org/open-source-at-cooper-hewitt/cooper-hewitt-the-typeface-by-chester-jenkins/ | Sans serif «modified-geometric», disegnato da Chester Jenkins per l'identità del museo, gratuito con licenza SIL OFL. Il catalogo online del museo (https://collection.cooperhewitt.org/ → https://www.si.edu/collections/cooper-hewitt) ha risposto 403: **[NON VERIFICATO]**. |
| Rijksmuseum, collezione, https://www.rijksmuseum.nl/en/collection | Griglia di miniature con il solo titolo come etichetta; le raccolte dei visitatori mostrano data e numero di opere («5 October 2026 \| 24 artworks»). |
| Are.na e mymind (sopra, 2.2) | Un carattere proprio come identità; etichette in maiuscolo; nessun accento acceso. |
| Charm, https://charm.land/ | Identità da terminale fatta di tono e di mascotte, non di colori dichiarati («We make software glamorous.»). La pagina non nomina colori né caratteri. |
| Departure Mono, https://github.com/rektdeckard/departure-mono | Monospazio pixel «inspired by the constraints of early command-line and graphical user interfaces»; il carattere ha licenza SIL OFL (il sito, MIT). Il sito https://departuremono.com/ ha restituito solo il titolo. |
| Instrument Serif, https://github.com/Instrument/instrument-serif | «A condensed, display serif», pensato per le grandi dimensioni, OFL. |
| Bricolage Grotesque, https://github.com/ateliertriay/bricolage | Grottesco espressivo variabile con assi di peso, larghezza e corpo ottico, OFL. |
| IBM Plex, https://github.com/IBM/plex | Famiglia completa (Sans, Serif, Mono, Condensed), OFL. |

**Spunti [DERIVATO]:**
- **Il fuori registro al posto dell'ombra.** Oggi l'ombra rigida è nera e spostata. Su fondo scuro un'ombra nera scompare (primo giro, sezione 1). La stessa forma, stampata in un secondo inchiostro (Fl Pink o Teal) e spostata di 2–3 px, sembra un errore di registro del risografo: resta neo-brutalista e diventa un'identità di stampa. Solo su controlli, linguette e titoli, mai attorno o sopra le scansioni.
- **Il cartellino da museo.** Set e numero di collezione (`set · #123`) sono già un numero d'inventario. Scritti in monospazio sotto la tessera, come il cartellino di un'opera, danno un'identità «archivio» senza decorazioni.
- **La carta bianca come contrasto.** ADR 0020 dice che il foglio resta bianco qualunque sia il tema. Su un fondo molto scuro, una pagina bianca con le sue celle è l'oggetto più luminoso dello schermo: può essere il protagonista, invece di nasconderlo in una seconda vista.

## 6. Spunti per i prototipi [DERIVATO]

Cinque direzioni, diverse tra loro, dalle tre zone di oggi e dai tre prototipi del primo giro. Ognuna ha un solo oggetto principale per schermata. In tutte le scansioni restano intatte, i segni di selezione stanno fuori dal profilo della carta e il movimento si limita a dissolvenze brevi (regole del primo giro, sezione 7).

### 6.1 «Raccoglitore»: si lavora direttamente sulle pagine

- **Idea:** non c'è griglia né foglio separato: il decklist si vede come le pagine che verranno stampate, da sfogliare come un raccoglitore da 9 tasche.
- **Desktop:** un raccoglitore aperto, due pagine affiancate (bianche, ADR 0020) sul fondo scuro; ogni tasca è uno slot di `core` con la sua carta. Sopra, una riga di indice: «Pagina 3 di 7 · 60 carte · 2 da sistemare». Il testo del decklist è la «pagina zero», a sinistra della prima pagina, e si sfoglia come le altre.
- **Telefono:** una pagina per schermo, sfogliata con lo scorrimento laterale, con frecce e indicatore di pagina toccabile come indizio visibile (Dex, NN/g).
- **Scelta della stampa:** un tocco su una tasca la «estrae»: a schermo intero, la stampa attuale fissa a sinistra (select) e le candidate in fila (Lightroom Compare); con un tasto, una griglia di 12 (Narrative Survey). Sul telefono la candidata scorre sotto la select.
- **Foglio e PDF:** non c'è un passo «Foglio»: le pagine sono già il foglio. Una tasca grigia è una riga da sistemare (Artifact Uprising: «every grey box»). Margini e segni di taglio sono impostazioni dell'intero raccoglitore, in un menu sopra le pagine (Snapfish: opzioni per ordine).
- **Identità:** «archivio»: fondo ardesia quasi nero, pagine bianche, cartellini da museo in monospazio sotto le tasche. Cooper Hewitt per l'interfaccia e IBM Plex Mono per set e numeri; un solo accento freddo per la selezione. Nessuna texture: la texture è la pagina bianca.
- **Fonti:** Dex Binder Display Mode, Tabletop Simulator card sheet, Lightroom Print Contact Sheet e Custom Package, Artifact Uprising, Lightroom Compare, Narrative Survey, Cooper Hewitt, Rijksmuseum.

### 6.2 «Moviola»: sorgente sopra, programma sotto

- **Idea:** la struttura di un programma di montaggio: un grande viewer con il «nastro» delle stampe della carta corrente, e sotto il decklist come timeline.
- **Desktop:** in alto, il viewer a tutta larghezza con le stampe della riga corrente in un'unica striscia (source tape). In basso, due timeline: quella sottile mostra tutto il mazzo, con le tacche dove cambia pagina del foglio; quella spessa ingrandisce la zona di lavoro, una cella per riga, larga quanto le sue copie (Resolve). Il testo del decklist si apre come un'altra «traccia» sopra la timeline.
- **Telefono:** il viewer in alto (metà schermo) scorre di lato tra le stampe; la timeline spessa sta in basso e scorre di lato tra le righe. Due scorrimenti laterali in zone diverse, con lo stesso significato («avanti»), quindi nessuna ambiguità di gesto (NN/g, bottom sheet).
- **Scelta della stampa:** passando il puntatore sul nastro, il fotogramma grande mostra la stampa sotto il puntatore (skimming di Final Cut); il clic la «monta» sulla riga. La sync bin è il nome interno del selettore: le stampe della riga.
- **Foglio e PDF:** le tacche di pagina sulla timeline sottile sono il foglio: un clic su un tratto apre quella pagina nel viewer, bianca su fondo scuro. Il PDF è «Esporta», come in un programma di montaggio.
- **Identità:** «sala di montaggio»: nero caldo, una sola luce ambra o rossa da «tally» per la riga attiva, contatori in monospazio («03/60», «p. 2/7»). IBM Plex Sans Condensed per le etichette strette della timeline e IBM Plex Mono per i contatori. Righe sottili al posto dei bordi spessi.
- **Fonti:** DaVinci Resolve Cut page (source tape, due timeline, sync bin), Final Cut Pro skimming, Lightroom Print (filmstrip sotto la pagina), Artifact Uprising (barra in basso), NN/g mobile usability.

### 6.3 «Provini»: una carta alla volta, a matita grassa

- **Idea:** il flusso di chi seleziona le foto di un servizio: il mazzo si rivede una carta alla volta, come una raffica di foto, con il provino completo come vista d'insieme.
- **Desktop:** lo schermo è una «lente» (loupe): la carta corrente grande al centro e, in fila sotto, le sue stampe ordinate (prima la predefinita, poi la lingua della riga, poi le altre: l'ordine di Narrative). Frecce su e giù: riga precedente e successiva; frecce destra e sinistra: stampa candidata; Invio: «tieni». Con la barra spaziatrice si passa al provino di tutto il mazzo (Photo Mechanic), e viceversa.
- **Telefono:** la stessa lente a schermo intero; scorrimento verticale tra le righe, scorrimento laterale tra le stampe, con un'etichetta «1/14 stampe» come indizio visibile.
- **Scelta della stampa:** la riga è una pila (Lightroom stacks): chiusa nel provino, aperta nella lente. Per dividere le copie tra più stampe si spunta ogni stampa da tenere, come «Make a Selection» nelle raffiche di Foto; le spuntate diventano tessere sorelle.
- **Foglio e PDF:** alla fine della revisione (o in ogni momento) il provino diventa il foglio: stesso schermo, celle da 63×88 mm al posto delle miniature, in un'unica dissolvenza.
- **Identità:** «laboratorio fotografico»: fondo grigio molto scuro neutro, senza tinta, perché un grigio neutro non falsa i colori della scansione; un accento rosso «luce di sicurezza» per l'azione. Selezione come un cerchio a matita grassa *attorno* alla carta, fuori dal profilo, con una linea irregolare disegnata in SVG. Instrument Serif per i titoli grandi delle sezioni, IBM Plex Mono per numeri e set.
- **Rischio:** di tutte, è la più vicina all'«Anteprima fissa» del primo giro (una carta grande). Si distingue perché la carta grande *è* lo schermo, senza decklist né griglia accanto; se un prototipo la rende come una terza zona laterale, la direzione è fallita.
- **Fonti:** Lightroom Compare e pile, Foto di Apple raffiche, Narrative Select (scene, ordine, Survey), Aftershoot (Grid e Loupe), Photo Mechanic (provino, barra spaziatrice), Darkroom (stesso strumento su telefono e desktop).

### 6.4 «Tavolo a scene»: un canvas con pagine posate

- **Idea:** un unico piano su cui stanno il decklist, le sezioni del mazzo e le pagine del foglio come frame; i passi sono scene salvate di quel piano.
- **Desktop:** il canvas scuro con tre gruppi di frame, da sinistra a destra: il testo del decklist, le sezioni (main, sideboard, pedine) come frame di carte, le pagine del foglio come frame bianchi. Tre scene fisse, «Lista», «Carte», «Foglio», in un navigatore in basso con Avanti e Indietro (Freeform). Le carte non si spostano a mano: cadono negli slot (snap point di Tabletop Simulator) che `core` ha calcolato, e il frame le ritaglia al suo bordo (Excalidraw).
- **Telefono:** ogni scena riempie lo schermo; Avanti e Indietro al posto della barra dei passi di oggi; si può pizzicare per vedere la scena vicina, ma si torna sempre a una scena.
- **Scelta della stampa:** una tessera si apre nella «lavagna» delle sue stampe, sullo stesso piano, al posto delle altre carte (Allume: lavagne dentro lavagne), senza zoom continuo. Tre selettori piccoli (lingua, set, finitura) restringono le stampe (Shopify).
- **Foglio e PDF:** la scena «Foglio» è il gruppo di pagine bianche; ciascuna si esporta da sola o tutte insieme (Freeform, Excalidraw).
- **Identità:** «stamperia risograph»: fondo inchiostro quasi nero; due inchiostri spot, Fl Pink e Teal (Moniker Press), con il fuori registro al posto dell'ombra rigida sui controlli. Bricolage Grotesque largo e pesante per i titoli dei frame, Departure Mono per etichette e contatori. Una grana leggera solo sul fondo del canvas, mai sulle carte.
- **Movimento:** un passaggio tra scene è uno spostamento della camera, cioè movimento; con `prefers-reduced-motion` diventa un taglio netto o una dissolvenza (primo giro, sezione 7).
- **Fonti:** Freeform scene, Excalidraw frame, Allume, Figma Slides (due viste dello stesso canvas), tldraw (forme come componenti React), Tabletop Simulator snap point e card sheet, Moniker Press, NN/g neobrutalism.

### 6.5 «Decklist viva»: un documento solo

- **Idea:** non c'è separazione tra testo e carte: il decklist è un documento a una colonna in cui ogni riga scritta mostra subito, sotto di sé, le sue tessere; il foglio è l'ultimo blocco del documento.
- **Desktop:** una colonna centrale, larga come una pagina di rivista, con i numeri di riga nel margine sinistro, come in un editor. Ogni riga ha il testo a sinistra e, accanto o sotto, le sue tessere piccole; i titoli delle sezioni sono grandi come titoli di capitolo. Il margine destro, vuoto, ospita i commenti della riga (avvisi, riga da sistemare) come note a margine.
- **Telefono:** la stessa colonna: è l'unica direzione in cui il telefono non cambia struttura.
- **Scelta della stampa:** un tocco sulla tessera apre, dentro il documento e sotto la riga, un blocco di scelta: la scansione grande e tre selettori (lingua, set, finitura) che la aggiornano (Shopify); oppure la fila delle candidate. Il blocco si chiude con Esc o con un tocco fuori; è un'espansione del documento, non un dialogo.
- **Foglio e PDF:** in fondo al documento, il blocco «Foglio» mostra le pagine bianche in fila e il pulsante del PDF; un indice fisso nel margine permette di saltarci da qualsiasi riga.
- **Identità:** «editoriale svizzero»: griglia di colonne rigida, molto spazio vuoto, un solo accento (il lime di oggi, ridotto a filetti e numeri). Instrument Serif per titoli e sezioni, IBM Plex Sans per il testo, IBM Plex Mono per quantità e numeri di riga. Etichette in maiuscolo spaziato come in mymind. Nessuna texture.
- **Fonti:** Are.na (blocchi), mymind (calma, etichette), Shopify varianti, MTG Arena Preferred Printing (le stampe dentro la carta), Artifact Uprising (riquadro grigio da riempire), NN/g neobrutalism (titoli espressivi, testo neutro).

### Come si distinguono

| Direzione | Oggetto principale | Dove vive il decklist | Dove vive il foglio |
|---|---|---|---|
| Raccoglitore | la pagina stampata | pagina zero del raccoglitore | ovunque: è la vista |
| Moviola | la stampa nel viewer | timeline in basso | tacche sulla timeline |
| Provini | una carta alla volta | ordine di revisione | il provino trasformato |
| Tavolo a scene | il piano con i frame | frame di testo | frame di pagine |
| Decklist viva | il documento | è il documento | ultimo blocco |

## 7. Siti per la ricerca manuale

| Sito | Cosa cercare |
|---|---|
| Page Flows, https://pageflows.com/ | Registrazioni di flussi reali («Explore real-world user flows»): cercare ordini di stampe, fotolibri, configuratori, per vedere i passi in movimento. |
| Mobbin, https://mobbin.com/ | Schermate di app per pattern: «photo picker», «print order», «variant selector»; da usare solo come puntatore verso l'app vera (al primo giro HTTP 403). |
| Component Gallery, https://component.gallery/ | 60 componenti in 95 sistemi di design: confrontare carousel, segmented control, toggle group per i selettori di lingua, set e finitura. |
| Fonts In Use, https://fontsinuse.com/ | «An independent archive of typography»: vedere Instrument Serif, Bricolage Grotesque, IBM Plex e Cooper Hewitt in progetti veri, soprattutto su fondo scuro. |
| Brutalist Websites, https://brutalistwebsites.com/ | Archivio di siti brutalisti: cercare quelli scuri, per vedere come reggono i bordi spessi sul nero. |
| Are.na, https://www.are.na/ | Canali pubblici su risograph, contact sheet, card binder, «printed matter»: utile anche per raccogliere la propria moodboard. |
| Cosmos, https://www.cosmos.so/ | Ricerca per immagine simile e per colore: partire da una pagina di raccoglitore o da un provino fotografico. |
| Moniker Press, https://monikerpress.ca/moniker-press-risograph-colour-charts | Le tabelle dei colori risograph e le sovrapposizioni, per scegliere i due inchiostri. |
| Centri di assistenza di Lightroom Classic e Capture One (URL nelle sezioni 1.1 e 1.2) | Le figure delle viste Compare, Survey, pile e Print: da aprire nel browser, perché a me hanno risposto 403. |
| DaVinci Resolve, https://www.blackmagicdesign.com/products/davinciresolve/cut | Le immagini del Cut page: source tape e doppia timeline. |
| Freeform su iPhone, https://support.apple.com/guide/iphone/navigate-and-present-scenes-iphbe64aa259/ios | Come Apple fa navigare le scene su uno schermo piccolo. |
| Dex, https://dextcg.com/help/collection/binder-display-mode | La modalità raccoglitore su telefono e web. |
| Narrative Select, https://narrative.so/select | Le animazioni di Scene, Close-Ups e Survey sulla pagina del prodotto. |

## 8. Fonti bloccate

| Fonte | Motivo |
|---|---|
| Adobe helpx (Lightroom Classic: Compare e Survey, pile, layout di stampa) | HTTP 403 a WebFetch; il download con `curl` è stato negato dai permessi. Contenuto preso dagli estratti del motore di ricerca (**[ESTRATTO]**). |
| Capture One, Compare Variant (https://support.captureone.com/hc/en-us/articles/360002481017) | HTTP 403. Contenuto dall'estratto del motore di ricerca. |
| Mixbook (https://help.mixbook.com/) | HTTP 403. |
| Miro, frame (https://help.miro.com/hc/en-us/articles/360018261813-Frames) | HTTP 403. |
| Jukebox Print, sticker sheet maker (https://www.jukeboxprint.com/sticker-sheet-maker) | HTTP 403. |
| Family Album, ordine di stampe (https://help.family-album.com/hc/en-us/articles/360058842773-How-do-I-order-prints) | HTTP 403. |
| Collezione Cooper Hewitt (https://www.si.edu/collections/cooper-hewitt) | HTTP 403. |
| Chatbooks (https://www.chatbooks.com/how-it-works) | HTTP 404. |
| Milanote, guida (https://help.milanote.com/en/articles/2006489-getting-started-with-milanote) | HTTP 404. |
| tldraw, camera (https://tldraw.dev/docs/camera) | HTTP 404. |
| Tabletop Simulator, ricerca nel mazzo (https://kb.tabletopsimulator.com/game-tools/search/) | HTTP 404. |
| NN/g, articolo sullo swipe stile Tinder | Nessun articolo trovato (l'URL provato ha dato 404). |
| Departure Mono (https://departuremono.com/), Bento Grids (https://bentogrids.com/) | È arrivato solo il titolo (pagine rese da JavaScript). |
| Apple Store, configuratore (https://www.apple.com/shop/buy-iphone) | Il testo restituito non contiene il configuratore. |
| Imposition Wizard (https://www.imposition.com/) | Reindirizza a https://ultimate-tech.com/, non aperto. |
| Quite Imposing (https://www.quiteimposing.com/) | Connessione chiusa durante la lettura. |
| Dribbble, Behance | Non provati: il primo giro li ha già trovati illeggibili. |
