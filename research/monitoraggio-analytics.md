# Ricerca: analytics, monitoraggio degli errori e uptime per l'alpha aperta

Data di consultazione: **2026-11-25**. Le affermazioni riportano l'URL della fonte primaria accanto al testo. Le deduzioni mie, compresi i collegamenti a file del repository e i conti sulle risorse del VPS, sono marcate **[DERIVATO]**. Ciò che non ho potuto confermare da fonte primaria è marcato **[NON VERIFICATO]**.

Metodo: solo pagine dei fornitori (listini, documentazione, DPA, elenchi dei sub-responsabili), repository sorgente su GitHub (letti con `gh api`), testi delle autorità (Garante, EDPB, CNIL, Commissione europea, Corte di giustizia) e il testo del GDPR nella versione pubblicata dal Garante. Il contesto del progetto viene da `docs/adr/0005-*`, `docs/adr/0016-*`, `docs/adr/0023-*`, `docker/web/Caddyfile`, `compose.yaml`, `docs/deploy.md`, `research/vps-alpha-hosting.md`, `research/security-baseline.md`, `packages/web/src/shell/PrivacyNoticeDialog.tsx`, `packages/web/src/locales/it.json` e `packages/api/src/http/app.ts`. Questo file raccoglie fatti e opzioni; non decide.

Limiti di questa sessione:

- EUR-Lex ha risposto a ogni richiesta automatica con una pagina vuota (`202`, verifica anti-bot). Il testo dell'art. 5(3) della direttiva ePrivacy è quindi citato dal par. 1 delle Linee guida EDPB 2/2023 e dalla sua trasposizione italiana (art. 122 del Codice privacy), riportata testualmente dalle Linee guida cookie del Garante. Gli articoli del GDPR sono citati dal testo pubblicato dal Garante (https://www.garanteprivacy.it/documents/10160/0/Regolamento+UE+2016+679.+Arricchito+con+riferimenti+ai+Considerando+Aggiornato+alle+rettifiche+pubblicate+sulla+Gazzetta+Ufficiale++dell%27Unione+europea+127+del+23+maggio+2018).
- L'elenco dei partecipanti al Data Privacy Framework (dataprivacyframework.gov) è un'applicazione JavaScript che non ho potuto interrogare: la partecipazione di PostHog e Sentry è riportata da ciò che dichiarano i loro DPA.
- I listini in dollari sono riportati così come sono; non so dire se includano l'IVA per un privato in Italia **[NON VERIFICATO]**.
- La documentazione di OVHcloud non ha una guida al monitoraggio del VPS; ho usato lo schema dell'API pubblica di OVHcloud.

## Sintesi

- **Oggi l'app non ha analytics, monitoraggio degli errori o controlli di uptime esterni.** L'informativa dice "Nessuno strumento di statistiche (analytics), nessuna pubblicità e nessun modulo di feedback" e "Nessun cookie" (`packages/web/src/locales/it.json`, `privacyNotice.absent` e `privacyNotice.device`). Qualunque scelta in questo file cambia quel testo **[DERIVATO]**.
- **La CSP è il vincolo tecnico principale.** `script-src 'self'` e `connect-src 'self' https://cards.scryfall.io` (`docker/web/Caddyfile`) bloccano sia uno script caricato dal fornitore sia l'invio di eventi a un suo dominio. Restano due strade: (a) mettere lo script nel bundle Vite e inoltrare gli eventi da Caddy a un percorso dello stesso dominio (tutti i fornitori qui documentano un proxy o un tunnel), oppure (b) aprire la CSP a un'altra origine, cosa che contraddice ADR 0016 e richiederebbe un nuovo ADR **[DERIVATO]**.
- **Il VPS-1 ha 4 GB di RAM e 40 GB di disco** (`research/vps-alpha-hosting.md`). I limiti di memoria dei servizi in `compose.yaml` sommano 2 GB (256m + 256m + 512m + 1g), e la build sull'host ha toccato un picco di 1346 MiB (`docs/deploy.md`) **[DERIVATO]**. PostHog self-hosted (16 GB, https://posthog.com/docs/self-host) e Sentry self-hosted (16 GB + 16 GB di swap, https://develop.sentry.dev/self-hosted/) non ci stanno. Plausible CE consiglia almeno 2 GB per ClickHouse (https://github.com/plausible/community-edition), quindi sarebbe molto stretto. Ci stanno invece Umami (Node + PostgreSQL), GoatCounter (un binario Go con SQLite), GlitchTip (256–512 MB, https://glitchtip.com/documentation/install), Bugsink e Uptime Kuma **[DERIVATO]**.
- **PostHog EU Cloud** salva i dati a Francoforte su AWS (https://posthog.com/docs/privacy/gdpr-compliance, https://posthog.com/subprocessors). Il piano gratuito include ogni mese 1M di eventi analytics, 5K registrazioni di session replay e 100K eccezioni di error tracking (https://posthog.com/pricing). Con `cookieless_mode: "always"` non scrive nulla nel browser e conta i visitatori con un hash giornaliero calcolato sul server (https://posthog.com/tutorials/cookieless-tracking). Il fornitore però è **PostHog, Inc.** (USA), che riceve i dati europei tramite il DPF e usa Cloudflare in tutto il mondo per i dati in transito (https://posthog.com/dpa, https://posthog.com/subprocessors).
- **Plausible** ha sede in Estonia e ospita i dati presso Hetzner (Falkenstein), UpCloud e Bunny, tutte società europee. Il suo script non scrive nulla sul dispositivo (https://plausible.io/data-policy, https://plausible.io/eu-hosted-web-analytics). Non ha un piano gratuito: lo Starter parte da 9 $ al mese per 10k pagine viste, con eventi personalizzati inclusi (https://plausible.io/#pricing).
- **Umami self-hosted** usa solo Node e PostgreSQL, come lo stack attuale (https://umami.is/docs/install), ed è sotto licenza MIT. Nella versione 3.5 cattura anche gli errori JavaScript (`data-errors`, https://umami.is/docs/tracker-configuration). **GoatCounter** è gratuito "for reasonable public usage" (https://www.goatcounter.com/help/terms) e sa leggere i log JSON di Caddy (`goatcounter import -format caddy`, `cmd/goatcounter/import.go` in https://github.com/arp242/goatcounter).
- **Errori.** Il piano gratuito Developer di Sentry include 5k errori al mese, un utente e 30 giorni di storico (https://sentry.io/pricing/), con dati a Francoforte se l'organizzazione nasce nella regione UE (https://docs.sentry.io/organization/data-storage-location/). Il fornitore è Functional Software, Inc. (USA), con DPF e SCC (https://sentry.io/legal/dpa/). **Gli SDK recenti di Sentry inviano di default l'IP e i body delle richieste**: serve una configurazione `dataCollection` esplicita (https://docs.sentry.io/platforms/javascript/data-management/data-collected/). GlitchTip e Bugsink accettano gli SDK di Sentry e si possono ospitare sul VPS. Bugsink offre anche un servizio gestito da una società olandese, con dati nell'UE (https://www.bugsink.com/).
- **Uptime.** Un monitor sullo stesso VPS non può avvisare quando il VPS è giù **[DERIVATO]**. Tra le opzioni esterne gratuite: UptimeRobot (società slovacca, 50 monitor ogni 5 minuti, uso commerciale ammesso, https://uptimerobot.com/pricing/, https://uptimerobot.com/terms/), Better Stack (Better Stack, Inc., Delaware; 10 monitor con controlli ogni 3 minuti, https://betterstack.com/uptime, https://betterstack.com/privacy) e Healthchecks.io (società lettone, ospitata su Hetzner; è un *heartbeat*, cioè avvisa quando un job come l'importer giornaliero smette di dare segni di vita, https://healthchecks.io/pricing/, https://healthchecks.io/privacy/). L'API di OVHcloud espone lo stato dei servizi sull'IP principale del VPS (ping, ssh, http, https…) e le statistiche del disco (https://eu.api.ovh.com/1.0/vps.json). La guida pubblicata sul monitoraggio via ping con avviso email riguarda però i server dedicati, non i VPS.
- **Consenso.** L'art. 5(3) ePrivacy non riguarda solo i cookie. L'EDPB ci include anche il codice JavaScript che fa inviare al browser informazioni dal dispositivo e la raccolta di header come lo user agent a fini di fingerprinting (Linee guida 2/2023 v2, par. 33 e 43). Il `localStorage` usato solo nel dispositivo ne resta fuori (par. 44). Anche uno strumento "senza cookie" va quindi valutato rispetto alle esenzioni. Il Garante assimila gli analytics ai cookie tecnici, quindi senza consenso, se si limitano a "statistiche aggregate" su un solo sito, impediscono il *single out* (per esempio mascherando "almeno la quarta componente" dell'IP) e il fornitore non combina i dati con altri. La CNIL usa criteri analoghi e raccomanda di conservare i dati al massimo per 25 mesi (https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9677876, https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies-solutions-pour-les-outils-de-mesure-daudience).
- **Informativa e contratti.** Ogni fornitore esterno diventa un responsabile del trattamento ai sensi dell'art. 28 GDPR: serve un contratto (DPA) e va nominato tra i destinatari (art. 13, par. 1, lett. e). Con un fornitore USA servono anche la menzione del trasferimento e il meccanismo usato (art. 13, par. 1, lett. f). Il DPF è in vigore: il Tribunale UE ha respinto il ricorso Latombe il 3 settembre 2025 (https://curia.europa.eu/site/upload/docs/application/pdf/2025-09/cp250106en.pdf). Per il monitoraggio degli errori, il legittimo interesse legato alla sicurezza della rete è riconosciuto dal considerando 49 e dalle Linee guida EDPB 1/2024 (par. 126), a patto di superare il test di necessità e il bilanciamento. Nessun testo letto dice se uno script di error tracking nel browser rientri nell'esenzione "strettamente necessaria" dell'art. 5(3) **[NON VERIFICATO]**.

## 0. Vincoli del progetto

Fatti dal repository:

- **User first, niente tracciamento se evitabile.** ADR 0005: "EU users mean GDPR consent for tracking ads, so non-tracking ads are preferred."
- **CSP e header.** ADR 0016: Caddy invia "a CSP that forbids framing and limits scripts to the site's own"; "Styles alone may be inline". Il Caddyfile ha `default-src 'self'; script-src 'self'; … connect-src 'self' https://cards.scryfall.io; worker-src 'self' blob:` e `Referrer-Policy no-referrer` (`docker/web/Caddyfile`). ADR 0016, nelle conseguenze: "A banner from an ad network (ADR 0005) would need the CSP opened to its origins."
- **Log.** L'access log di Caddy maschera l'IP con `ip_mask 24 64`, cancella tutti gli header della richiesta (`request>headers delete`) e conserva i file per 14 giorni (`roll_keep_for 14d`, `docker/web/Caddyfile`). L'API annota gli eventi di sicurezza "without full IP addresses" (ADR 0016).
- **Rete.** Il servizio `api` sta solo sulle reti `proxy` e `database`, entrambe `internal: true`, con il commento "the api calls no outside service". Solo `web` (Caddy) e `importer` stanno sulla rete `internet` (`compose.yaml`).
- **Risorse.** I limiti di memoria sono `web` 256m, `api` 256m, `importer` 512m e `postgres` 1g (`compose.yaml`). Il VPS è un OVHcloud VPS-1: 2 vCore, 4 GB, 40 GB NVMe (`research/vps-alpha-hosting.md`), con 2 GB di swap. La build sull'host ha raggiunto 1346 MiB di memoria non recuperabile (`docs/deploy.md`).
- **Hosting UE.** ADR 0016, "Hosting": "The alpha runs on an OVHcloud VPS in an EU data centre". ADR 0023 ha scartato GitHub Pages perché "it would bring GitHub (USA) into the privacy notice for every visit".
- **Endpoint di salute.** `GET /api/health` risponde `{ ok: true }` quando esistono le tabelle del catalogo, altrimenti `503` (`packages/api/src/http/app.ts`). Il guard dei tester (ADR 0023), quando è acceso, copre anche `/api` (`docker/web/Caddyfile`).
- **Informativa attuale.** Base giuridica: "legittimo interesse del titolare alla sicurezza del servizio (art. 6, par. 1, lett. f del GDPR)". Destinatari: OVHcloud, Scryfall, GitHub. "Nessun cookie". "Nessuno strumento di statistiche (analytics)" (`packages/web/src/locales/it.json`).

Conseguenze **[DERIVATO]**:

- Uno script di terzi caricato dal loro dominio viola `script-src 'self'`. Uno SDK messo nel bundle passa, ma i suoi invii verso un dominio del fornitore violano `connect-src`. Le alternative sono un percorso dello stesso dominio, inoltrato da Caddy (che è già su `internet`), oppure un nuovo ADR che apra la CSP. AGENTS.md chiede di fermarsi e far scegliere al titolare quando una correzione contraddice un ADR.
- Un tunnel che passi dall'API, come l'helper `serveTunnelIntegration` di Sentry, richiederebbe di mettere `api` su una rete con uscita verso Internet, contro l'impianto attuale di `compose.yaml`. Un inoltro fatto da Caddy non lo richiede.
- Quando Caddy fa da proxy, aggiunge di default `X-Forwarded-For` con l'IP del client (https://caddyserver.com/docs/caddyfile/directives/reverse_proxy, "Defaults"). L'IP completo arriverebbe quindi al fornitore anche se il nostro log lo maschera. Plausible lo richiede per l'hash e per il filtro anti-bot (https://plausible.io/docs/proxy/introduction). Per gli altri fornitori si può valutare se toglierlo con `header_up -X-Forwarded-For`, sapendo che si perderebbero la geolocalizzazione e la distinzione tra visitatori.
- Un servizio in più sul VPS deve stare, insieme agli altri, sotto i 4 GB, con margine per la build. Deve anche seguire il baseline dei container: utente non root, `read_only`, `cap_drop`, limiti di risorse, immagine fissata per digest (ADR 0016).

## 1. Analytics che rispettano la privacy

### 1.1 PostHog

**Hosting e contratto**

- PostHog Cloud EU è "a managed version of PostHog that's hosted on servers based in Frankfurt" (https://posthog.com/docs/privacy/gdpr-compliance).
- Sub-responsabili: Amazon Web Services ("USA (PostHog US Cloud) or Germany (PostHog EU Cloud)"), Cloudflare ("Global edge locations (dynamic, worldwide) for data in transit"), Modal Labs (calcolo serverless, Germania per EU Cloud) e Wiz (Germania, Francia). Elenco aggiornato al 6 novembre 2026 (https://posthog.com/subprocessors).
- Il DPA è con **PostHog, Inc.** Si genera in autonomia da `app.posthog.com/legal`, già controfirmato, "Any plan, including the free one". Prevede il DPF (clausola 10.3: "Processor confirms that it participates in the EU-US Data Privacy Framework") e le SCC come alternativa (https://posthog.com/dpa).
- Sui progetti EU la cattura dell'IP è "automatically disabled by default". PostHog però riceve comunque l'IP e lo usa per la geolocalizzazione e il rilevamento dei bot prima di scartarlo (https://posthog.com/docs/privacy/data-collection).

**Piano gratuito** (https://posthog.com/pricing)

- Ogni mese: "Analytics 1M events", "Session replay 5K recordings", "Feature flags 1M requests", "Error tracking 100K exceptions", "Surveys 1500 responses".
- "No credit card, not a trial", "1 project, 1-year data retention". Le registrazioni di replay restano un mese. Oltre il limite, sul piano gratuito "any additional events are permanently dropped".
- Gli eventi anonimi "can be up to 4x cheaper than identified ones"; il default dello SDK web è `person_profiles: 'identified_only'` (https://posthog.com/docs/data/anonymous-vs-identified-events).

**Cookie e archiviazione nel browser**

- Default `localStorage+cookie`: "Limited things are stored in the cookie such as the distinctID and the sessionID". L'opzione `memory` "Stores everything in page memory, which means data is only persisted for the duration of the page view". Con `disable_persistence: true`, "PostHog creates a new anonymous ID on every page load" (https://posthog.com/docs/libraries/js/persistence).
- `cookieless_mode: "always"`: "PostHog never stores data in cookies or local/session storage" e ignora `opt_in_capturing()`/`opt_out_capturing()`. Il conteggio usa `hash(team_id, daily_salt, ip_address, user_agent, hostname)`, con un sale giornaliero "which we delete once that day's events have been processed". Prima va attivato "Enable cookieless tracking" nelle impostazioni del progetto. Limiti: utenti contati come nuovi ogni giorno, nessuna geolocalizzazione né rilevamento dei bot. Per evitare l'identificazione si imposta `person_profiles: 'never'` (https://posthog.com/tutorials/cookieless-tracking).
- `cookieless_mode: "on_reject"` serve per chi vuole un banner: senza consenso conta con l'hash, con il consenso usa i cookie (stessa pagina).
- Anche con la persistenza disattivata, lo stato di opt-out viene salvato di default in `localStorage` (`opt_out_capturing_persistence_type`, https://posthog.com/docs/privacy/data-collection). Se si usa solo `cookieless_mode: "always"` e non si chiama mai l'opt-out, nessuno scrive quella chiave **[DERIVATO]**.
- Nella SPA, `persistence: "memory"` durerebbe per tutta la sessione nell'app, perché la navigazione interna non ricarica la pagina, e ripartirebbe da zero a ogni ricarica **[DERIVATO]**.

**Cosa raccoglie di default** (https://posthog.com/docs/product-analytics/autocapture, https://posthog.com/docs/privacy/data-collection)

- Lo SDK web cattura di default pageview, pageleave, clic su `a`, `button`, `form`, `input`, `select`, `textarea`, `label`, invii e modifiche di form, contenuti `contenteditable` e copie negli appunti. Si disattiva con `autocapture: false`, che però "does not disable navigation autocapture (pageviews and pageleaves)".
- Il session replay registra "Clicks, mouse movements, scrolling, and snapshots of the DOM"; maschera di default gli input, "General text is not masked by default" (https://posthog.com/docs/session-replay/privacy).
- Il campo dei clic catturati include il testo dell'elemento ("clicked span with text \"Delete\""). Nell'app, i campi della decklist e della ricerca contengono testo scritto dall'utente **[DERIVATO]**.

**Eventi di prodotto.** Per un evento come "PDF generato" si chiama `posthog.capture('pdf_generated', { … })` dallo SDK. In alternativa si aggiungono proprietà ai clic catturati con `data-ph-capture-attribute-*` (https://posthog.com/docs/product-analytics/autocapture).

**CSP e first party**

- Lo SDK si installa da npm (`pnpm add posthog-js@1`). Di default "lazy-loads extensions such as surveys or the session replay 'recorder'" dal CDN di PostHog. Per non caricare nulla da fuori ci sono `posthog-js/dist/module.no-external` (senza estensioni), `module.full.no-external` (con le estensioni nel bundle) e un bundle `module.slim`, sperimentale (https://posthog.com/docs/libraries/js).
- PostHog indica come CSP `script-src 'self' https://*.posthog.com; connect-src 'self' https://*.posthog.com` e aggiunge: "or use a reverse proxy so everything is first-party" (stessa pagina).
- Esiste una guida ufficiale per Caddy, anche con percorso sotto lo stesso dominio (`handle_path /yourpath-proxy/static*` verso `eu-assets.i.posthog.com`, il resto verso `eu.i.posthog.com`, con `header_up -Cookie` e il filtro dell'`Authorization`) (https://posthog.com/docs/advanced/proxy/caddy). PostHog avverte: "If you use a self-hosted proxy, PostHog can't help troubleshoot".
- Con lo SDK `module.full.no-external` nel bundle e un `handle_path` in Caddy verso `eu.i.posthog.com`, la CSP attuale non cambierebbe **[DERIVATO]**.

**Self-hosting.** Servono 4 vCPU, 16 GB di RAM e più di 30 GB di disco. È "officially unsupported", senza CVE pubblicati, con licenza MIT. Sopra circa 300k eventi al mese PostHog suggerisce il cloud (https://posthog.com/docs/self-host). Il VPS-1 non basta **[DERIVATO]**.

### 1.2 Plausible

**Hosting.** "Plausible is incorporated as a legal entity in Estonia". I dati dei visitatori stanno "on servers owned by Hetzner, a German company, in Falkenstein, Germany"; il database e gli export su UpCloud (Finlandia); il CDN è Bunny (Slovenia). "These are the only three providers that touch visitor data" (https://plausible.io/eu-hosted-web-analytics). Il DPA è pubblicato su https://plausible.io/dpa.

**Prezzi** (https://plausible.io/#pricing, valori mostrati in dollari)

- Starter: 9 $ al mese fino a 10k pagine viste al mese, un sito, "No retention limit", "Goals and custom events". Growth: 14 $ (3 siti). Business: 19 $ (10 siti, "Custom Properties", funnel). La pagina offre "30-day free trial. No credit card required" e "2 months free" con il pagamento annuale. Non c'è un piano gratuito.
- Le proprietà personalizzate degli eventi (per esempio il formato carta di un PDF) sono elencate solo nel piano Business **[DERIVATO]** dalla tabella dei piani.

**Cosa raccoglie** (https://plausible.io/data-policy)

- URL della pagina (solo host e percorso, "Query parameters are discarded except for supported campaign and referral parameters"), referrer, browser, sistema operativo e tipo di dispositivo, paese/regione/città, scroll e tempo di permanenza, pageview ed eventi personalizzati.
- Visitatori unici: `hash(daily_salt + website_domain + ip_address + user_agent)`; "The salt is rotated and deleted every 24 hours. Raw IP addresses and User-Agent data are never stored."
- "Our script stores nothing on the visitor's device. It sets no cookies and writes nothing to local storage". Legge soltanto il flag `plausible_ignore` in `localStorage`, se presente, senza scriverlo né inviarlo.
- Plausible afferma: "By using Plausible, you do not need cookie banners for analytics or to collect consent for tracking." È una posizione del fornitore, non di un'autorità **[DERIVATO]**.

**CSP e first party.** "Using the NPM package? The tracker is already part of your own code, so you only need to proxy the event endpoint". La guida al proxy chiede di inoltrare l'IP reale in `X-Forwarded-For`, senza il quale "Plausible's bot filter will drop the event silently", insieme a una lista di header (`User-Agent`, `Accept-Language`, `Sec-Fetch-*` …), e di non inoltrare `Cookie` né `Authorization` (https://plausible.io/docs/proxy/introduction). Con il pacchetto npm nel bundle e un percorso di Caddy, la CSP resterebbe invariata **[DERIVATO]**.

**Community Edition (self-hosted)**

- Docker Compose. "CPU must support SSE 4.2 or NEON instruction set" (ClickHouse). "At least 2 GB of RAM is recommended for running ClickHouse and Plausible without fear of OOMs" (https://github.com/plausible/community-edition, tag `v3.2.2`).
- Licenza AGPLv3. Due rilasci l'anno. Funnel, user journey, obiettivi di revenue e SSO "are not available". Solo supporto della comunità (https://plausible.io/self-hosted-web-analytics).
- Su un VPS da 4 GB, che ha già 2 GB di limiti assegnati e picchi di build da 1,3 GB, 2 GB in più per ClickHouse lascerebbero poco o nessun margine **[DERIVATO]**.

### 1.3 Umami

**Self-hosted**

- Richiede "Node.js version 20.19 or newer" e PostgreSQL (minimo v12.14). Si installa da sorgente, con Docker Compose o con un'immagine Docker (https://umami.is/docs/install). Licenza MIT (repository `umami-software/umami`). Ultima versione: v3.5.0, 12 novembre 2026.
- Nessuna pagina letta indica requisiti minimi di RAM o disco **[NON VERIFICATO]**. Usa PostgreSQL come lo stack attuale, quindi potrebbe avere un database e un ruolo propri nel container `postgres` esistente, che ha un limite di 1 GB, oppure un'istanza separata **[DERIVATO]**.
- Sul self-hosted "data is retained indefinitely unless you manually delete it" (https://umami.is/docs/faq).
- Il nome dello script e l'endpoint di raccolta si possono cambiare (`TRACKER_SCRIPT_NAME`, `COLLECT_API_ENDPOINT`, https://umami.is/docs/environment-variables). Con `data-host-url` si indica dove inviare gli eventi (https://umami.is/docs/tracker-configuration).

**Cloud**

- Hobby: 0 $ al mese, "Up to 100K events per month", 1 sito, 6 mesi di conservazione. Pro: 20 $ al mese, 1M eventi, 2 anni (https://umami.is/pricing).
- "Umami Cloud offers US and EU data regions, selected during account setup"; la regione "does not mean that all processing takes place within that region: CDN routing, security, support, and operational logging may involve services outside it" (https://umami.is/docs/cloud/faq).
- Sub-responsabili: ClickHouse (USA/UE), Hetzner (UE), Vercel ("Hosting and deployment services", USA), Upstash (USA) e altri statunitensi (https://umami.is/subprocessors). Il DPA è con Umami Software, Inc. e prevede le SCC (https://umami.is/dpa).

**Cosa raccoglie e come conta**

- "Umami's web tracker does not use cookies" (https://umami.is/docs/faq).
- L'identificatore di sessione è un hash di ID del sito, IP, User-Agent e un sale. "The salt rotates monthly by default" (https://umami.is/docs/metric-definitions). Dalla v3.5.0 `data-salt-rotation` accetta `hourly`, `daily`, `weekly` o `monthly`, ma richiede `ENABLE_CLIENT_SALT` sul server (https://umami.is/docs/tracker-configuration).
- Con il sale mensile, lo stesso visitatore resta collegabile per un mese. Questo è più lontano dall'"aggregato" del Garante rispetto al sale giornaliero di Plausible e PostHog. Con `daily` le due soluzioni si avvicinano **[DERIVATO]**.

**Eventi ed errori.** Gli eventi personalizzati si inviano con `data-umami-event="…"`, con proprietà `data-umami-event-*`, oppure da JavaScript; i nomi sono limitati a 50 caratteri (https://umami.is/docs/track-events). Dalla v3.5.0 `data-errors="true"` cattura "uncaught JavaScript exceptions and unhandled promise rejections", con `umami.captureException()` e `data-release` (https://umami.is/docs/tracker-configuration). Quanto valga come strumento di error tracking (stack trace, source map) non l'ho verificato **[NON VERIFICATO]**.

**CSP.** Lo script si può servire dallo stesso dominio, inoltrando da Caddy verso il container Umami, oppure includere nel bundle **[DERIVATO]**. Che esista un pacchetto npm ufficiale del tracker non l'ho verificato **[NON VERIFICATO]**.

### 1.4 GoatCounter

- Servizio ospitato "free donation-supported" oppure self-hosted (https://www.goatcounter.com/). "GoatCounter.com is currently offered for free for reasonable public usage. … sending millions of pageviews/day isn't" (https://www.goatcounter.com/help/terms).
- Dove si trovano i server di goatcounter.com non è scritto nelle pagine lette **[NON VERIFICATO]**. Le pagine lette non citano nemmeno un DPA **[NON VERIFICATO]**.
- Salva tabelle aggregate per giorno o per ora, "with no way to link data between them". Raccoglie browser, sistema, paese, dimensione dello schermo, referrer e percorso. Raccogliere le singole pageview è un'opzione "disabled by default" (https://www.goatcounter.com/help/privacy).
- Sessioni: `concat(siteID, User-Agent, IP)` associato in memoria a un UUID casuale per 8 ore. "The IP address and User-Agent are never stored to the database or disk" (https://www.goatcounter.com/help/sessions).
- Il fornitore ritiene che non serva un avviso di consenso (https://www.goatcounter.com/help/gdpr). Anche questa è una posizione del fornitore **[DERIVATO]**.
- Eventi: si inviano con `count({ event: true, path: … })` o con l'attributo `data-goatcounter-click`. "The path doubles as the event name" (https://www.goatcounter.com/help/events).
- CSP: l'integrazione standard chiede `script-src https://gc.zgo.at` e `connect-src https://MYCODE.goatcounter.com/count`. In alternativa "you can host the count.js script anywhere you want, or include it directly in your page", e "the /count endpoint is guaranteed to remain compatible" (https://www.goatcounter.com/help/csp, https://www.goatcounter.com/help/countjs-host).
- Self-hosted: un binario Go con SQLite o PostgreSQL, "SQLite should work well for most smaller sites" (https://github.com/arp242/goatcounter). Licenza: EUPL 1.2 leggermente modificata (file `LICENSE` del repository). Ultima versione: v2.7.0, 15 dicembre 2025.
- **Statistiche dai log di Caddy, senza JavaScript.** `goatcounter import` accetta `-format caddy` ("Caddy JSON logs") e `-follow` per seguire il file mentre cresce (`cmd/goatcounter/import.go`, https://www.goatcounter.com/help/logfile). Il nostro access log però cancella tutti gli header (`request>headers delete`), quindi User-Agent e Referer non ci sono, e maschera l'IP a /24. Un'importazione darebbe solo percorsi, orari ed esiti, senza browser né visitatori distinti, a meno di cambiare il filtro del log (ADR 0016) **[DERIVATO]**. Per una SPA, il log vede le richieste a `/api/*`: una decklist risolta o una ricerca sono già eventi di prodotto visibili dal server, mentre la generazione del PDF avviene nel browser (ADR 0001) e il server non la vede **[DERIVATO]**.

## 2. Monitoraggio degli errori (frontend e API)

### 2.1 Sentry SaaS

**Regione dati** (https://docs.sentry.io/organization/data-storage-location/)

- La regione si sceglie quando si crea l'organizzazione e "can't be changed". UE = "Frankfurt, Germany".
- Nella regione scelta stanno "Error events, activity, and issue links", "Releases, debug symbols, and source maps". Possono stare negli USA "regardless of your selected Data Storage Location": account utente, metadati delle integrazioni, token di accesso, impostazioni dell'organizzazione, dati condivisi in un ticket di supporto. I controlli di uptime vengono fatti da più paesi, quindi "may be stored outside your selected data region".
- Dalla tabella dei piani, "Data Residency" risulta spuntata per tutti i piani, compreso Developer (https://sentry.io/pricing/).

**Piani** (https://sentry.io/pricing/)

- Developer: "Free", "Limited to one user", 5k errori, 5M span, 50 replay, 1 uptime monitor, 1 cron monitor, 5 GB di log, "30-day lookback", avvisi via email.
- Team: 26 $ al mese con pagamento annuale, 50k errori, utenti illimitati, fino a 90 giorni.

**Contratto** (https://sentry.io/legal/dpa/, https://sentry.io/legal/subprocessors/)

- Il DPA è con Functional Software, Inc. d/b/a Sentry e si accetta elettronicamente. "Sentry complies with the Data Privacy Framework … In the event that the Data Privacy Framework is invalidated … the parties agree to be subject to … the SCCs".
- Sub-responsabili principali: Google Cloud (USA/UE), Intercom (USA), OpenAI (USA, "AI/ML services"), Mailgun (UE), SendGrid (USA); affiliate in Austria, Canada e Paesi Bassi.

**Cosa invia lo SDK di default** (https://docs.sentry.io/platforms/javascript/data-management/data-collected/, https://docs.sentry.io/platforms/javascript/guides/react/configuration/options/)

- Dalla 10.57.0 c'è l'opzione `dataCollection`. "Starting with version 11, the defaults always apply": `userInfo` (IP compreso) `true`, header e cookie raccolti (con i valori sensibili sostituiti da `[Filtered]`), `httpBodies` tutti i tipi (oggi solo i body delle richieste in arrivo sul server), query string raccolta.
- "By default, the SDK sends the user's IP address. To disable it, set `dataCollection: { userInfo: false }`". Anche così, "IP addresses can still reach Sentry through collected HTTP headers" come `X-Forwarded-For`; la documentazione suggerisce di aggiungere `"forwarded", "-ip", "remote-", "via", "-user"` alle liste `deny`.
- "The request URL … is always sent". Nel browser lo SDK invia `Referer` e `User-Agent`. Il replay, se attivato, "masks all text content, images … and user input" di default.
- Lato server, lo scrubbing è "enabled by default". Si può chiedere di non salvare gli IP, ma "Geographic information is extracted from the user's IP address. This occurs even if the setting to stop storing IP addresses is turned on"; per toglierla serve una regola come `[Remove] [Anything] from [$user.geo.**]` (https://docs.sentry.io/security-legal-pii/scrubbing/server-side-scrubbing/).
- Per questo progetto **[DERIVATO]**: il body di `POST /api/decklists/resolve` è la decklist dell'utente. Con i default di Sentry finirebbe negli eventi d'errore dell'API, insieme all'IP. L'informativa oggi dice che il server "non li conserva".

**Hono e Node.** C'è uno SDK dedicato, `@sentry/hono`, con middleware per il runtime scelto (https://docs.sentry.io/platforms/javascript/guides/hono/). Come si integri con `@hono/node-server` va verificato sulla guida "Manual Setup" **[NON VERIFICATO]**.

**Source map da Vite.** Si usa il plugin `@sentry/bundler-plugins` (secondo la pagina letta), con un `SENTRY_AUTH_TOKEN` passato alla build (https://docs.sentry.io/platforms/javascript/sourcemaps/uploading/vite/). La build avviene sul VPS (ADR 0012), quindi il token dovrebbe stare nel `.env` del VPS o la build dovrebbe passare in CI **[DERIVATO]**.

**Tunnel e CSP** (https://docs.sentry.io/platforms/javascript/configuration/tunneling/)

- `tunnel: true` nel browser invia gli eventi "to the managed tunnel, a path on your own origin derived from the DSN". Sul server, `serveTunnelIntegration()` risponde a quel percorso e accetta "Only events for your server's DSN and your allowedDsns, so the tunnel can't be used as an open proxy". Inoltra "The visitor's real IP address, without cookies or auth headers".
- Il tunnel si può anche scrivere a mano su un percorso a scelta, per esempio `/tunnel`.
- Contro i blocker, Sentry consiglia lo SDK da npm nel bundle (https://docs.sentry.io/platforms/javascript/troubleshooting/).
- Per questo progetto **[DERIVATO]**: l'helper del tunnel gira nel processo Node, quindi `api` avrebbe bisogno di uscire verso `*.ingest.de.sentry.io`, cosa che oggi `compose.yaml` esclude. L'alternativa è un `reverse_proxy` di Caddy dal percorso del tunnel all'endpoint di ingestione del progetto. Che basti un proxy "muto", senza leggere l'envelope, non l'ho verificato **[NON VERIFICATO]**.

**Self-hosted.** Minimo "16 GB RAM + 16 GB swap", 20 GB di disco, CPU x86-64-v3 per ClickHouse (https://develop.sentry.dev/self-hosted/). Non ci sta sul VPS-1 **[DERIVATO]**.

### 2.2 PostHog error tracking

- Rientra nel piano gratuito: 100K eccezioni al mese (https://posthog.com/pricing).
- Browser: l'autocapture delle eccezioni usa `onError` e `onUnhandledRejection` (https://posthog.com/docs/privacy/data-collection). Le eccezioni sono un'estensione caricata in modo lazy: `module.no-external` "disables all extensions such as Replay, Surveys, Exceptions", quindi per tenere la CSP chiusa serve `module.full.no-external` (https://posthog.com/docs/libraries/js).
- Node: `posthog-node` con `enableExceptionAutocapture: true` e `captureException()`. C'è un handler dedicato per Express (`setupExpressErrorHandler`); per Hono non ho trovato un'integrazione dedicata **[NON VERIFICATO]**. Il server deve poter raggiungere PostHog, e `api` oggi non esce su Internet **[DERIVATO]** (https://posthog.com/docs/error-tracking/installation/node).
- Source map: plugin `@posthog/rollup-plugin` in `vite.config`, con `POSTHOG_API_KEY` (chiave personale), `POSTHOG_PROJECT_ID` e `POSTHOG_HOST`, che di default punta a `https://us.i.posthog.com` e va quindi impostato sull'host UE. `deleteAfterUpload: true` è il default (https://posthog.com/docs/error-tracking/upload-source-maps/vite).
- Analytics ed errori con un solo fornitore, un solo DPA e un solo proxy in Caddy **[DERIVATO]**.

### 2.3 GlitchTip

- Compatibile con gli SDK di Sentry: "Our app is compatible with Sentry client SDKs, but easier to run". Include anche performance, **uptime monitoring** e log (https://glitchtip.com/).
- Self-hosted: PostgreSQL 14+ e un solo servizio in modalità all-in-one; Valkey/Redis è opzionale. "Recommended system requirements: 512 MB RAM … Minimum … 256 MB RAM when using all-in-one setup". Come ordine di grandezza, 1 milione di eventi al mese "may require 30GB of disk" (https://glitchtip.com/documentation/install).
- Hosted: Free con 1.000 eventi al mese e 30 giorni di conservazione; Small a 15 $ al mese per 100k eventi. "We offer hosting in both the US and EU (Germany)". Il footer porta a un DPA. La società è Burke Software and Consulting (https://glitchtip.com/pricing); in che paese abbia sede non l'ho verificato **[NON VERIFICATO]**.
- Source map con `glitchtip-cli sourcemaps inject` e `upload` (https://glitchtip.com/sdkdocs/javascript).
- Potrebbe usare un database e un ruolo propri nel PostgreSQL esistente, ma il limite di 1 GB del container andrebbe rivisto **[DERIVATO]**. Se ospitato sul VPS, il suo uptime monitoring non vede i guasti del VPS stesso **[DERIVATO]**.

### 2.4 Bugsink

- "Fully compatible with Sentry's open-source SDKs"; basta cambiare il DSN (https://www.bugsink.com/).
- Gestito: "Your application data stays in the EU, hosted and managed by a Dutch company". Free con 15K eventi al mese, un utente e 5K eventi conservati; 75K eventi a 16 € al mese (https://www.bugsink.com/, sezione Pricing).
- Self-hosted: immagine Docker amd64/arm64, SQLite di default, poi MySQL; PostgreSQL "has not been extensively tested, but it should work" (https://www.bugsink.com/docs/docker-install/). "A single cheap server can handle up to 1.5 million events per day" (https://www.bugsink.com/docs/single-server-production/). Requisiti di RAM non indicati nelle pagine lette **[NON VERIFICATO]**.
- Licenza PolyForm Shield 1.0.0, con parti BSD-3 derivate da Sentry (file `LICENSE`). Non è una licenza open source OSI **[DERIVATO]**.
- Source map caricate con `sentry-cli` puntato all'istanza Bugsink (https://www.bugsink.com/docs/sourcemaps/). Limiti di ingestione per 5 minuti e per ora, con `429` oltre soglia (https://www.bugsink.com/docs/ingestion-rate-limits-and-retention/).

## 3. Uptime e salute del VPS

**Premessa [DERIVATO].** Un monitor ospitato sullo stesso VPS (Uptime Kuma, GlitchTip) si spegne insieme al VPS, quindi non può avvisare proprio nel caso più importante. Il controllo che conta va fatto dall'esterno. Il bersaglio naturale è `https://leyline.website/api/health`, che verifica anche il database. Con il guard dei tester acceso risponderebbe `401`, e il controllo va configurato per accettarlo o per inviare una credenziale (ADR 0023).

### 3.1 Servizi esterni

| Servizio | Società | Gratuito | Note | Fonte |
|---|---|---|---|---|
| UptimeRobot | UptimeRobot s. r. o., diritto slovacco | 50 monitor, intervallo 5 min, "Good for personal and commercial projects", HTTP/keyword/ping/porta, 5 integrazioni | SSL monitoring solo a pagamento; Solo da 9–10 € al mese | https://uptimerobot.com/pricing/, https://uptimerobot.com/terms/ |
| Better Stack | Better Stack, Inc., Delaware; "We process personal data primarily in the European Union" | "10 monitors, 10 heartbeats and a status page with 3-minute checks"; il piano gratuito include anche 100.000 eccezioni al mese | Prodotto ampio (log, errori, RUM) | https://betterstack.com/uptime, https://betterstack.com/pricing, https://betterstack.com/privacy |
| Healthchecks.io | SIA Monkey See Monkey Do, Riga (Lettonia); hosting Hetzner | Hobbyist 0 $, 20 job | Heartbeat: avvisa se un ping atteso non arriva; adatto all'importer giornaliero | https://healthchecks.io/pricing/, https://healthchecks.io/privacy/ |
| updown.io | **[NON VERIFICATO]** sede | Nessun piano gratuito: a crediti, "10 websites every 2 minutes from 1.83 €/month" | IPv4/IPv6 | https://updown.io/ |
| Sentry Uptime | Functional Software, Inc. | 1 uptime monitor nel Developer | Controlli da più paesi, i dati possono uscire dalla regione | https://sentry.io/pricing/, https://docs.sentry.io/organization/data-storage-location/ |

- Un controllo di uptime esterno manda richieste dal fornitore al nostro sito. Non tocca i dati dei visitatori e non riguarda l'art. 5(3) **[DERIVATO]**. Il fornitore tratta solo l'email del titolare.

### 3.2 Uptime Kuma (self-hosted)

- Controlli HTTP(s), TCP, keyword, JSON, ping, DNS, push, container Docker; notifiche via Telegram, Discord, email e "90+ notification services". Avvio con `docker run … louislam/uptime-kuma:2`. Licenza MIT; ultima versione 2.5.12, 17 novembre 2026 (https://github.com/louislam/uptime-kuma).
- Requisiti di RAM non indicati nel README **[NON VERIFICATO]**.
- Sul VPS potrebbe controllare i container e i job dall'interno, ma non può segnalare un VPS spento o irraggiungibile. Su un altro host (per esempio un PC di casa o un secondo VPS) avrebbe senso come controllo esterno **[DERIVATO]**.

### 3.3 OVHcloud

- L'API pubblica del VPS espone `GET /vps/{serviceName}/status` ("Retrieve the service status of the main IP for this VPS"), con stato per `dns`, `http`, `https`, `ping`, `smtp`, `ssh` e `tools`. Espone anche `GET /vps/{serviceName}/disks/{id}/monitoring` e `/use` per le statistiche del disco, con periodi `today`, `lastday`, `lastweek`, `lastmonth` e `lastyear` (https://eu.api.ovh.com/1.0/vps.json). Nello schema letto non c'è un endpoint di statistiche CPU/RAM a livello di VPS.
- La guida sul monitoraggio via ping con avviso email al contatto tecnico ("Enabled with proactive intervention") riguarda i server dedicati (https://docs.ovhcloud.com/en/guides/bare-metal-cloud/dedicated-servers/network-ip-monitoring). La guida al pannello del VPS non ne parla (https://docs.ovhcloud.com/en/guides/bare-metal-cloud/virtual-private-servers/understand-vps-control-panel). Se OVHcloud avvisi via email quando un VPS non risponde non l'ho verificato **[NON VERIFICATO]**.
- La FAQ dice che dal pannello si può "monitoring resources" (https://docs.ovhcloud.com/en/guides/bare-metal-cloud/virtual-private-servers/vps-faq).

### 3.4 Cosa danno già Caddy e Docker

- **Access log.** Per ogni richiesta, data/ora, rete del client mascherata, metodo, percorso ed esito, conservati 14 giorni (`docker/web/Caddyfile`, `privacyNotice.data.accessLog`). Da qui si possono contare, senza nuovi dati, le richieste per percorso (`/api/decklists/resolve`, `/api/cards/...`) e gli errori 5xx e 503 della concurrency cap. Basta leggere il file, per esempio con `jq` **[DERIVATO]**.
- **Metriche.** Con l'opzione globale `metrics`, Caddy espone in formato Prometheus contatori e istogrammi `caddy_http_request_duration_seconds` ecc. su `http://localhost:2019/metrics` (API admin), oppure li invia via OTLP. "Note that metrics have some performance overhead on really busy servers" (https://caddyserver.com/docs/metrics, https://caddyserver.com/docs/caddyfile/options). Servirebbe poi qualcosa che le legga (Prometheus o altro), cioè un altro servizio sul VPS **[DERIVATO]**.
- **Healthcheck dei container.** `web` e `api` hanno già un `healthcheck` in `compose.yaml`, ma nessuno manda un avviso quando un container diventa `unhealthy` **[DERIVATO]**.

## 4. Conseguenze legali (Italia/UE)

### 4.1 Art. 5(3) ePrivacy e art. 122 del Codice privacy

- Art. 5(3) ePD: "the storing of information, or the gaining of access to information already stored, in the terminal equipment of a subscriber or user" è ammesso solo con consenso o per necessità specifiche; non riguarda solo i cookie ma anche le "similar technologies" (EDPB, Linee guida 2/2023, par. 1, https://www.edpb.europa.eu/system/files/documents/2024-10/edpb_guidelines_202302_technical_scope_art_53_eprivacydirective_v2_en_0.pdf).
- Trasposizione italiana (art. 122, comma 1, Codice privacy, citato dal Garante): l'archiviazione o l'accesso "sono consentiti unicamente a condizione che il contraente o l'utente abbia espresso il proprio consenso … Ciò non vieta l'eventuale archiviazione tecnica o l'accesso … nella misura strettamente necessaria al fornitore di un servizio della società dell'informazione esplicitamente richiesto dal contraente o dall'utente a erogare tale servizio" (https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9677876).

### 4.2 Linee guida EDPB 2/2023, versione 2.0 (adottata il 7 ottobre 2024)

- Par. 33: rientra nell'art. 5(3) il "JavaScript code, where the accessing entity instructs the browser of the user to send asynchronous requests with the targeted information".
- Par. 43: usare gli header HTTP ("user agent") o meccanismi come ETag "to collect information (for example in the context of fingerprinting …) can lead to the application of Article 5(3) ePD".
- Par. 44: l'uso di "cookies, local storage" dentro il browser "would not constitute a 'gaining of access' … as long as the information does not leave the device, but when this information or any derivation of this information is accessed, Article 5(3) ePD would apply".
- Par. 54–55: il tracciamento basato solo sull'IP può ricadere nell'art. 5(3) quando l'IP "originates from the terminal equipment" (per esempio IPv4 statico del router, IPv6).
- Par. 40 e 56: le Linee guida non analizzano le esenzioni; "the applicability of this article does not systematically mean that consent needs to be collected".
- Quindi **[DERIVATO]**: uno script di analytics "senza cookie" che invia pageview, User-Agent e dimensioni dello schermo resta un accesso ai sensi dell'art. 5(3). La domanda non è "usa cookie?", ma "rientra in un'esenzione?". Lo stesso vale per uno SDK di error tracking che invia dal browser stack trace e User-Agent. Il `localStorage` attuale dell'app resta fuori finché i dati non lasciano il dispositivo (già annotato in `research/security-baseline.md`).

### 4.3 Garante, Linee guida cookie e altri strumenti di tracciamento (10 giugno 2021, doc. web 9677876)

https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9677876

- Gli identificatori "passivi" come il fingerprinting sono soggetti alle stesse regole; l'utente "non dispone di strumenti autonomamente azionabili" contro di essi.
- Per gli strumenti tecnici il titolare ha "il solo obbligo di fornire specifica informativa, anche eventualmente inserita all'interno di quella di carattere generale". Se ci sono solo strumenti tecnici, l'informazione si può dare "nella homepage o nell'informativa generale senza l'esigenza di apporre specifici banner".
- Par. 7.2, analytics: sono equiparati ai tecnici se è precluso il *single out*. Una misura è "il mascheramento almeno della quarta componente dell'indirizzo" IP. Devono essere limitati "unicamente alla produzione di statistiche aggregate" e usati "in relazione ad un singolo sito". I terzi che forniscono il servizio "non dovranno comunque combinare i dati … con altre elaborazioni … nè trasmetterli a loro volta ad ulteriori terzi".
- Se il titolare fa da sé l'elaborazione statistica, l'analisi è lecita anche senza quelle misure, purché non vada oltre "un mero conteggio statistico".
- Sul consenso: "il semplice scrolling non è mai idoneo" e, per impostazione predefinita, al primo accesso nessuno strumento non tecnico va attivato.

### 4.4 CNIL (riferimento comparativo, non vincolante in Italia)

https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies-solutions-pour-les-outils-de-mesure-daudience

- Esenzione per la misura dell'audience se la finalità è "strictement limitée à la seule mesure de l'audience … pour le compte exclusif de l'éditeur" e se produce "des données statistiques anonymes uniquement". Esclusi l'incrocio con altri trattamenti, la trasmissione di dati non anonimi a terzi e il tracciamento tra siti.
- Raccomandazioni: informare gli utenti nell'informativa, durata dei traccianti di circa 13 mesi, conservazione "pour une durée maximale de vingt-cinq mois". Attenzione anche ai "transferts de données hors de l'Union européenne".
- La CNIL mette a disposizione uno strumento di autovalutazione per i fornitori, che non vale come certificazione.

### 4.5 Cosa deve aggiungere l'informativa (art. 13 GDPR)

Dal testo dell'art. 13, par. 1 (versione del Garante, link nei Limiti): identità del titolare; finalità e base giuridica (lett. c); i legittimi interessi perseguiti, se la base è l'art. 6(1)(f) (lett. d); i destinatari (lett. e); l'eventuale trasferimento verso un paese terzo, con l'esistenza o meno di una decisione di adeguatezza o il riferimento alle garanzie (lett. f).

Per questo progetto **[DERIVATO]**, rispetto a `privacyNotice` in `it.json`:

- **`purpose`**: oggi la finalità è solo "sicurezza del servizio". Statistiche d'uso e diagnosi degli errori sono finalità nuove: vanno nominate, con la loro base giuridica (legittimo interesse o consenso).
- **`data`**: quali dati raccoglie lo strumento (pagine, eventi, browser, paese, stack trace…), come tratta l'IP e per quanto tempo li conserva.
- **`recipients`**: il fornitore, come responsabile ai sensi dell'art. 28, e dove si trovano i dati.
- **`device`**: se lo strumento scrive qualcosa nel browser, va detto. Con PostHog cookieless, Plausible, Umami o GoatCounter non scrive nulla, e "Nessun cookie" resta vero.
- **`absent`**: la frase "Nessuno strumento di statistiche (analytics)" va tolta o corretta.
- Trasferimenti: con PostHog, Sentry, Umami Cloud o Better Stack, cioè società USA o con sub-responsabili USA, vanno citati il DPF o le SCC.

### 4.6 Art. 28: responsabile del trattamento e DPA

- Art. 28, par. 1: il titolare "ricorre unicamente a responsabili del trattamento che presentino garanzie sufficienti". Par. 2: niente sub-responsabili "senza previa autorizzazione scritta, specifica o generale". Par. 3: serve "un contratto o … altro atto giuridico" con materia, durata, natura, finalità, tipi di dati e categorie di interessati.
- Dove trovare il DPA: PostHog (self-serve, anche sul piano gratuito, https://posthog.com/dpa), Sentry (accettazione elettronica, https://sentry.io/legal/dpa/), Plausible (https://plausible.io/dpa), Umami Cloud (https://umami.is/dpa), GlitchTip (link nel footer di https://glitchtip.com/pricing), Better Stack ("governed by the data processing agreement available at: betterstack.com/dpa", https://betterstack.com/terms).
- Con uno strumento self-hosted sul VPS di OVHcloud non si aggiunge un nuovo responsabile: resta OVHcloud, già nell'informativa **[DERIVATO]**.

### 4.7 Trasferimenti verso gli USA

- Art. 45: il trasferimento "è ammesso se la Commissione ha deciso che il paese terzo … garantisc[e] un livello di protezione adeguato". Art. 46: in mancanza, servono garanzie adeguate, per esempio "le clausole tipo di protezione dei dati adottate dalla Commissione".
- Il 10 luglio 2023 la Commissione ha adottato la decisione di adeguatezza per il Data Privacy Framework: i dati possono fluire "to companies in the United States that participate in the Data Privacy Framework" (https://commission.europa.eu/law/law-topic/data-protection/international-dimension-data-protection/eu-us-data-transfers_en).
- Il 3 settembre 2025 il Tribunale UE ha respinto il ricorso di annullamento (T-553/23, Latombe), confermando che alla data della decisione gli USA garantivano un livello adeguato (https://curia.europa.eu/site/upload/docs/application/pdf/2025-09/cp250106en.pdf). Un appello (C-703/25 P) risulta pendente secondo l'elenco InfoCuria mostrato da una ricerca; non l'ho letto **[NON VERIFICATO]**.
- PostHog (https://posthog.com/dpa, clausola 10.3) e Sentry (https://sentry.io/legal/dpa/) dichiarano di partecipare al DPF e di passare alle SCC se il DPF cadesse.
- Con PostHog EU o Sentry EU i dati degli eventi stanno a Francoforte, ma il fornitore resta una società USA. Parte del trattamento (Cloudflare per PostHog, account e supporto per Sentry) avviene fuori dalla regione. Rispetto a ADR 0016 ("EU hosting") e all'esclusione di GitHub Pages in ADR 0023, è una scelta da fare in modo esplicito **[DERIVATO]**.

### 4.8 Error monitoring e legittimo interesse

- Considerando 49: il trattamento "strettamente necessario e proporzionato al fine di garantire la sicurezza della rete e dell'informazione" costituisce legittimo interesse (già in `research/security-baseline.md`).
- EDPB, Linee guida 1/2024 sull'art. 6(1)(f), versione 1.0 adottata l'8 ottobre 2024 ("version for public consultation"): tre condizioni cumulative (interesse legittimo, necessità, bilanciamento); par. 126: le misure di sicurezza "may, in principle, be based on Article 6(1)(f) GDPR, provided that its conditions (including the necessity and balancing tests) are complied with"; par. 127: la sicurezza "cannot justify an excessive processing of personal data" e va verificato il principio di minimizzazione (https://www.edpb.europa.eu/system/files/2024-10/edpb_guidelines_202401_legitimateinterest_en.pdf).
- **[DERIVATO]** Diagnosticare gli errori dell'app è vicino alla finalità che l'informativa già dichiara ("capire cosa è successo quando qualcosa non va"). La minimizzazione però pesa sul bilanciamento: senza IP, senza body delle richieste (le decklist), senza replay e con una conservazione breve.
- **[NON VERIFICATO]** Nessun testo letto (EDPB, Garante, CNIL) dice se uno script di error tracking nel browser rientri nell'esenzione "strettamente necessaria" dell'art. 5(3)/art. 122. Il legittimo interesse riguarda la base giuridica GDPR, non l'esenzione ePrivacy. È la domanda aperta più delicata sul lato frontend. L'error tracking del solo server (API) non tocca il terminale dell'utente.

## 5. Tabella comparativa

Prezzi come pubblicati il 2026-11-25. Per "Consenso?" intendo se è plausibile restare nell'esenzione del Garante con la configurazione indicata; non è un parere legale **[DERIVATO]**.

| Opzione | Copre | Costo | Dove stanno i dati | Scrive sul dispositivo | Consenso? | Impatto CSP | Risorse sul VPS |
|---|---|---|---|---|---|---|---|
| PostHog EU Cloud | Analytics + errori (+ replay) | 0 € fino a 1M eventi e 100K eccezioni al mese | Francoforte (AWS); società USA; Cloudflare globale per il transito | No con `cookieless_mode: "always"`; sì di default | Possibile esenzione in cookieless, con autocapture e replay spenti e IP scartato; trasferimento USA da citare | Nessuno con `module.full.no-external` + proxy Caddy | Nessuna (proxy in Caddy) |
| PostHog self-hosted | Analytics + errori | Gratuito (MIT) | VPS | Come sopra | Come sopra, senza terzi | Nessuno | 4 vCPU, 16 GB: **non ci sta** |
| Plausible Cloud | Analytics | Da 9 $ al mese (10k pagine viste) | Hetzner Falkenstein, UpCloud, Bunny; società estone | No | Il fornitore dice di no; criteri del Garante plausibilmente rispettati (hash giornaliero, aggregato) | Nessuno con npm + proxy Caddy | Nessuna |
| Plausible CE | Analytics | Gratuito (AGPLv3) | VPS | No | Come sopra, senza terzi | Nessuno (stesso dominio) | ≥ 2 GB per ClickHouse: **molto stretto** |
| Umami self-hosted | Analytics (+ errori JS base) | Gratuito (MIT) | VPS | No | Sale mensile di default; con `daily` più vicino all'aggregato | Nessuno (stesso dominio) | Node + PostgreSQL, requisiti **[NON VERIFICATO]**; può usare il PostgreSQL esistente |
| Umami Cloud | Analytics (+ errori JS base) | 0 $ fino a 100K eventi al mese | Regione UE per i dati analytics; società USA, Vercel e altri USA | No | Come sopra; trasferimento USA da citare | Proxy o CSP aperta | Nessuna |
| GoatCounter hosted | Analytics | Gratuito ("reasonable public usage") | **[NON VERIFICATO]** | No | Il fornitore dice di no; dati solo aggregati | `count.js` nel bundle + proxy, oppure CSP aperta | Nessuna |
| GoatCounter self-hosted / import log | Analytics | Gratuito (EUPL) | VPS | No (con import log: nessuno script) | Import dai log: nessun accesso al dispositivo | Nessuno | Un binario Go + SQLite (piccolo **[DERIVATO]**) |
| Sentry SaaS (EU) | Errori (+ 1 uptime monitor) | 0 € Developer: 5k errori, 1 utente, 30 giorni | Francoforte per eventi e source map; società USA; account e supporto negli USA | No **[DERIVATO]** | Server: legittimo interesse. Browser: esenzione ePrivacy **[NON VERIFICATO]** | Nessuno con npm + tunnel Caddy | Nessuna |
| GlitchTip self-hosted | Errori + uptime | Gratuito | VPS | No **[DERIVATO]** | Come Sentry, senza terzi | Nessuno (stesso dominio) | 256–512 MB + PostgreSQL 14+ |
| GlitchTip hosted (EU) | Errori + uptime | 0 $ fino a 1.000 eventi al mese | Germania; società **[NON VERIFICATO]** | No **[DERIVATO]** | Come Sentry | Proxy o CSP aperta | Nessuna |
| Bugsink self-hosted | Errori | Gratuito (PolyForm Shield) | VPS | No **[DERIVATO]** | Come Sentry, senza terzi | Nessuno | SQLite; RAM **[NON VERIFICATO]** |
| Bugsink gestito | Errori | 0 € fino a 15K eventi al mese | UE, società olandese | No **[DERIVATO]** | Come Sentry | Proxy o CSP aperta | Nessuna |
| UptimeRobot / Better Stack / Healthchecks.io | Uptime / heartbeat | 0 € (piani gratuiti) | Slovacchia / USA con trattamento UE / Lettonia | No | Non riguarda i visitatori | Nessuno | Nessuna |
| Uptime Kuma sul VPS | Uptime interno | Gratuito (MIT) | VPS | No | Non riguarda i visitatori | Nessuno | Piccolo **[NON VERIFICATO]**; **non avvisa se il VPS è giù** |
| Log e metriche di Caddy | Conteggi lato server, 5xx | 0 € | VPS | No | Nessun nuovo accesso al dispositivo; base già nell'informativa | Nessuno | Metriche: serve un collettore |

## 6. Domande aperte per la decisione

1. **Serve davvero un analytics nel browser?** Il server vede già le ricerche e le risoluzioni delle decklist nell'access log. Non vede la generazione del PDF, che avviene nel browser (ADR 0001). Il dato "PDF generato" giustifica uno script, o basta un contatore lato server (per esempio una chiamata `POST` anonima allo stesso dominio, senza identificativi)?
2. **Fornitore USA con dati a Francoforte (PostHog, Sentry) o fornitore europeo (Plausible, Bugsink gestito, GlitchTip EU) o self-hosted?** ADR 0016 dice "EU hosting" e ADR 0023 ha scartato GitHub per non portare gli USA nell'informativa. Un fornitore USA è coerente con questi ADR o richiede un nuovo ADR?
3. **CSP.** Va bene la strada "SDK nel bundle + inoltro da Caddy su un percorso dello stesso dominio", che lascia `script-src 'self'` e `connect-src` come sono? Oppure si preferisce aprire la CSP, cosa che contraddice ADR 0016 e richiede un nuovo ADR?
4. **IP verso il fornitore.** Caddy, come proxy, aggiunge `X-Forwarded-For` con l'IP completo. Plausible lo richiede. Per gli altri, lo si toglie (perdendo paese e visitatori distinti) o lo si accetta, scrivendolo nell'informativa?
5. **Budget.** Plausible non ha un piano gratuito (da 9 $ al mese). PostHog, Umami Cloud, Sentry Developer, GlitchTip Free e Bugsink Free sono gratuiti entro i limiti. Il costo è un criterio decisivo?
6. **RAM del VPS.** Un servizio in più sul VPS-1 (Umami, GlitchTip, Bugsink, GoatCounter) va misurato insieme alla build sull'host (`docs/deploy.md`). Plausible CE probabilmente non ci sta senza passare a un piano superiore. Si accetta un servizio in più da mantenere e aggiornare sul VPS?
7. **Error tracking nel browser e art. 5(3).** Ci basta l'error tracking del server, che non accede al dispositivo, o vogliamo anche quello del frontend? Nel secondo caso: si accetta l'incertezza sull'esenzione, si chiede un parere, o si mostra una scelta all'utente?
8. **Minimizzazione negli errori dell'API.** Se si sceglie un SDK di tipo Sentry, la configurazione `dataCollection` deve escludere almeno IP, header e body (le decklist), coerentemente con "il server risponde e non li conserva" dell'informativa. Quanto deve durare la conservazione degli eventi d'errore?
9. **Uptime.** Quale controllo esterno (UptimeRobot, Better Stack, Healthchecks.io per l'importer) e quale canale di avviso (email, Telegram…)? Il controllo su `/api/health` deve funzionare anche quando il guard dei tester è acceso?
10. **Informativa.** Chi riscrive `privacyNotice` (finalità, dati, destinatari, trasferimenti, "Cosa non c'è") nello stesso ticket che introduce lo strumento, prima che vada in produzione?
