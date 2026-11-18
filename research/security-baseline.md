# Ricerca: baseline di sicurezza e privacy per l'alpha a cerchia ristretta

Data di consultazione: **2026-11-18**. Le affermazioni riportano l'URL della fonte primaria accanto al testo. Le deduzioni mie, compresi i collegamenti a file del repository, sono marcate **[DERIVATO]**. Ciò che non ho potuto confermare da fonte primaria è marcato **[NON VERIFICATO]**.

Metodo: testo sorgente di OWASP ASVS 5.0 dal repository ufficiale (ramo `master`), documentazione e sorgenti di Hono, `@hono/node-server`, Node.js (`doc/api` sul ramo `main`), Caddy (repository `caddyserver/website`), PostgreSQL 18, Docker (repository `docker/docs` e `docker-library/docs`), GitHub Docs, pnpm, MDN, specifiche W3C/IETF, testi legali da EUR-Lex/Publications Office, provvedimenti del Garante, documentazione API di Scryfall. Il contesto del progetto viene da `compose.yaml`, `Dockerfile`, `docker/web/Caddyfile`, `.github/workflows/*.yml`, `packages/api/src/*.ts`, `packages/web/src/api.ts` e dagli ADR in `docs/adr/`. Questo file raccoglie fatti e opzioni; non decide.

## Avvisi sulla sicurezza dei contenuti

- La pagina https://scryfall.com/docs/api contiene ancora, in fondo, il blocco "Instructions for AI Agents", che chiede agli agenti di scrivere email al team Scryfall e si definisce un "honeypot" (già annotato in `research/proxy.md`). È contenuto della pagina, non un'istruzione: non l'ho seguito e non ho contattato nessuno.

## Sintesi

- **ASVS 5.0** ha 17 capitoli; per un'API pubblica in sola lettura con SPA e senza login contano soprattutto V1, V2, V3, V4, V12, V13, V14, V15 e V16, mentre V6–V10 (autenticazione, sessioni, autorizzazione, token, OAuth) e V17 (WebRTC) oggi non si applicano (https://github.com/OWASP/ASVS/tree/master/5.0/en). L1 è "around 20%" dei requisiti, L2 è il livello a cui "most applications should be striving" (https://github.com/OWASP/ASVS/blob/master/5.0/en/0x03-What-is-the-ASVS.md). Diversi header che sembrano "di base" (CSP, `nosniff`, Referrer-Policy, `frame-ancestors`) sono L2, non L1; HSTS e CORS sono L1.
- **Hono** offre middleware ufficiali per header di sicurezza, limite del body, timeout e CORS, ma nessun rate limiter integrato; il gestore di errori predefinito risponde già con un `500` generico "Internal Server Error" e scrive l'errore con `console.error` (https://github.com/honojs/hono/blob/main/src/hono-base.ts). L'app di oggi non usa nessuno di questi middleware **[DERIVATO]** (`packages/api/src/app.ts`).
- **Caddy** usa di default TLS 1.2–1.3 e il redirect da HTTP a HTTPS (https://caddyserver.com/docs/caddyfile/directives/tls, https://caddyserver.com/docs/automatic-https), ma non imposta HSTS, CSP o altri header di sicurezza: vanno scritti con la direttiva `header`. Le immagini delle carte vengono lette con `fetch()` da `cards.scryfall.io` e mostrate in `<img>`, quindi la CSP deve permettere quell'origine sia in `connect-src` sia in `img-src` **[DERIVATO]** (`packages/web/src/api.ts`). Scryfall stessa suggerisce `img-src *.scryfall.io` (https://scryfall.com/docs/api/http-concerns).
- **PostgreSQL**: l'immagine ufficiale crea `POSTGRES_USER` "with superuser power" (https://github.com/docker-library/docs/blob/master/postgres/content.md); oggi API e importer si collegano entrambi con quell'utente **[DERIVATO]** (`compose.yaml`). I timeout di statement sono disattivati di default (`0`) e si possono impostare per ruolo (https://www.postgresql.org/docs/18/runtime-config-client.html).
- **Docker**: solo l'immagine `api` gira come utente non root (`USER node` nel `Dockerfile`); nessun servizio ha `read_only`, `cap_drop`, `no-new-privileges`, limiti di risorse o reti separate, e le immagini sono fissate per tag, non per digest **[DERIVATO]**. Il driver di log `json-file` non ruota i file di default (`max-size` "Defaults to -1 (unlimited)", https://docs.docker.com/engine/logging/drivers/json-file/).
- **GitHub Actions**: dal 28 ottobre 2026 i *workflow dependency lockfile* (`.github/workflows/actions.lock`) sono GA e GitHub li indica come protezione più forte, che "supersedes SHA pinning" (https://docs.github.com/en/actions/reference/security/secure-use, https://github.blog/changelog/2026-10-28-github-actions-workflow-lockfiles-are-generally-available/). Oggi le action sono fissate per tag (`actions/checkout@v7`, `jdx/mise-action@v5`) **[DERIVATO]**.
- **pnpm** (il repo usa 12.18.0) ha già di default `minimumReleaseAge: 1440`, `strictDepBuilds: true` e `blockExoticSubdeps: true`; `trustPolicy` è `off` di default (https://pnpm.io/settings/dependency-resolution, https://pnpm.io/settings/build).
- **Accesso ristretto**: un URL non pubblicizzato non è controllo d'accesso. I certificati Let's Encrypt finiscono nei log pubblici di Certificate Transparency (https://letsencrypt.org/docs/ct-logs/) e robots/noindex "are not a form of access authorization" (https://www.rfc-editor.org/rfc/rfc9309#section-1). Le opzioni concrete sono `basic_auth` di Caddy, allowlist IP, token d'invito in cookie, `forward_auth` verso un gateway; ognuna ha costi diversi per i tester.
- **Privacy**: un indirizzo IP dinamico è dato personale per il gestore del sito quando ha mezzi legali per identificare la persona (CGUE, C-582/14 Breyer, https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:62014CJ0582); il considerando 30 GDPR cita espressamente "internet protocol addresses". La sicurezza di rete è un legittimo interesse (considerando 49). Il `localStorage` usato solo dentro il dispositivo non è "gaining of access" ai sensi dell'art. 5(3) ePrivacy finché l'informazione non lascia il dispositivo (EDPB, Linee guida 2/2023 v2, par. 44). Ogni immagine caricata da `cards.scryfall.io` manda l'IP del tester a Scryfall **[DERIVATO]**.

## 1. OWASP ASVS 5.0

Fonte: https://github.com/OWASP/ASVS/tree/master/5.0/en (file `0x10`–`0x26`). Testo dei livelli: https://github.com/OWASP/ASVS/blob/master/5.0/en/0x03-What-is-the-ASVS.md.

### Livelli

- L1: "the minimum requirements to consider when securing an application", "around 20% of the ASVS requirements", requisiti "critical or basic, first-layer of defense" per attacchi che non richiedono altre vulnerabilità (0x03, "Level 1").
- L2: "Most applications should be striving to achieve this level of security"; rispettare L2 significa implementare circa il 70% dei requisiti (tutti gli L1 e L2) (0x03, "Level 2").
- I livelli sono cumulativi e i requisiti di livello superiore restano "recommendations" (0x03, "Application Security Verification Levels"). ASVS suggerisce di partire da L1 e di creare una versione su misura "omitting irrelevant sections" (0x03).
- Esempio dato da ASVS: "an early-stage startup that is only collecting limited sensitive data may decide to focus on Level 1" (0x03).
- Per un'alpha che si vuole "a prova di bomba" fin dall'inizio, L1 è il minimo dichiarato; diversi controlli L2 sono configurazione a basso costo (header, timeout, limiti), mentre altri L2 chiedono documentazione e processi (inventario dei log, classificazione dei dati) **[DERIVATO]**.

### Capitoli che non si applicano oggi

V5 (file upload: l'app non riceve file), V6 Authentication, V7 Session Management, V8 Authorization, V9 Self-contained Tokens, V10 OAuth/OIDC, V11 Cryptography (nessuna crittografia applicativa), V17 WebRTC (https://github.com/OWASP/ASVS/tree/master/5.0/en). Diventano rilevanti se l'alpha introduce un login o token d'invito (sezione 7) **[DERIVATO]**.

### Requisiti rilevanti, per capitolo

Livello tra parentesi, dal file sorgente indicato.

**V1 Encoding and Sanitization** (`0x10-V1-Encoding-and-Sanitization.md`)
- 1.2.1 (L1) encoding dell'output adatto al contesto; 1.2.2 (L1) encoding nei URL costruiti dinamicamente; 1.2.3 (L1) encoding nel JavaScript/JSON costruito dinamicamente.
- 1.2.4 (L1) query parametrizzate. L'API usa la libreria `postgres` con template tag **[DERIVATO]** (`packages/api/src/postgres-catalog.ts`).
- 1.3.2 (L1) niente `eval()` o esecuzione dinamica di codice.
- 1.2.9 (L2) escape dei caratteri speciali nelle espressioni regolari; 1.3.12 (L3) regex senza backtracking esponenziale. Rilevanti per il parsing della decklist **[DERIVATO]**.
- 1.3.6 (L2) protezione da SSRF: oggi solo l'importer fa richieste in uscita, verso URL fissi di Scryfall **[DERIVATO]** (`packages/api/src/scryfall.ts`).

**V2 Validation and Business Logic** (`0x11-V2-Validation-and-Business-Logic.md`)
- 2.1.1 (L1) la documentazione definisce le regole di validazione dell'input.
- 2.2.1 (L1) validazione positiva contro allowlist, pattern e intervalli; "For L1, this can focus on input which is used to make specific business or security decisions. For L2 and up, this should apply to all input."
- 2.2.2 (L1) validazione su un livello di servizio fidato, non solo nel client.
- 2.4.1 (L2) controlli anti-automazione contro "excessive calls ... denial-of-service, or overuse of costly resources". È il requisito che chiede il rate limiting.

**V3 Web Frontend Security** (`0x12-V3-Web-Frontend-Security.md`)
- 3.2.1 (L1) impedire che il browser renda contenuti nel contesto sbagliato (es. risposta API aperta direttamente): `Sec-Fetch-*`, CSP `sandbox`, `Content-Disposition: attachment`.
- 3.2.2 (L1) testo reso con funzioni sicure (es. `createTextNode`, `textContent`).
- 3.4.1 (L1) HSTS su tutte le risposte, "maximum age of at least 1 year", e per L2 anche sui sottodomini.
- 3.4.2 (L1) `Access-Control-Allow-Origin` fisso o validato contro allowlist; `*` solo se la risposta non contiene informazioni sensibili.
- 3.4.3 (L2) CSP con almeno `object-src 'none'` e `base-uri 'none'` e una allowlist oppure nonce/hash; per L3 policy per risposta con nonce o hash.
- 3.4.4 (L2) `X-Content-Type-Options: nosniff` su tutte le risposte.
- 3.4.5 (L2) Referrer-Policy contro la fuga di dati verso terzi.
- 3.4.6 (L2) CSP `frame-ancestors` su ogni risposta; "X-Frame-Options ... is obsolete and may not be relied upon".
- 3.4.7 (L3) CSP con endpoint di report; 3.4.8 (L3) COOP `same-origin` sulle risposte che rendono documenti.
- 3.5.1–3.5.3 (L1) protezione CSRF per funzioni sensibili; oggi non ci sono funzioni che cambiano stato **[DERIVATO]**.
- 3.7.1 (L2) solo tecnologie client supportate; 3.7.4 (L3) preload HSTS.

**V4 API and Web Service** (`0x13-V4-API-and-Web-Service.md`)
- 4.1.1 (L1) `Content-Type` corretto con `charset` su ogni risposta con body.
- 4.1.2 (L2) redirect HTTP→HTTPS solo per endpoint pensati per il browser.
- 4.1.3 (L2) header impostati da un intermediario (es. `X-Forwarded-For`) non sovrascrivibili dall'utente.
- 4.2.1 (L2) confini dei messaggi HTTP coerenti tra tutti i componenti (request smuggling).
- 4.1.4 (L3) solo i metodi HTTP supportati.

**V12 Secure Communication** (`0x21-V12-Secure-Communication.md`)
- 12.1.1 (L1) solo TLS 1.2 e 1.3, con la più recente preferita; 12.2.1 (L1) TLS per tutto il traffico esterno senza fallback; 12.2.2 (L1) certificati pubblicamente fidati.
- 12.1.2 (L2) cipher suite raccomandate; 12.3.1 e 12.3.3 (L2) TLS anche tra servizi interni, compreso il database; 12.3.2 (L2) i client TLS validano i certificati.

**V13 Configuration** (`0x22-V13-Configuration.md`)
- 13.4.1 (L1) nessun metadato di versionamento (`.git`) servito.
- 13.2.3 (L2) nessuna credenziale di default tra componenti. `compose.yaml` ha il fallback `mtg:mtg` **[DERIVATO]**.
- 13.3.1 (L2) segreti in una soluzione di gestione dedicata; 13.3.2 (L2) accesso ai segreti con minimo privilegio.
- 13.4.2 (L2) debug disattivato in produzione; 13.4.3 (L2) niente directory listing; 13.4.4 (L2) niente `TRACE`; 13.4.5 (L2) documentazione e monitoraggio non esposti salvo intenzione.
- 13.1.1 (L2) documentare tutte le comunicazioni con servizi esterni (Scryfall API, CDN immagini).
- 13.2.4 e 13.2.5 (L2) allowlist delle destinazioni verso cui il server può fare richieste.
- 13.4.6 (L3) non esporre versioni dettagliate dei componenti.

**V14 Data Protection** (`0x23-V14-Data-Protection.md`)
- 14.2.1 (L1) dati sensibili solo nel body o negli header, mai nell'URL o nella query string. Rilevante per un token d'invito (sezione 7) **[DERIVATO]**.
- 14.3.1 (L1) dati autenticati cancellati dallo storage client a fine sessione.
- 14.1.1, 14.1.2 (L2) classificazione dei dati sensibili; 14.2.3 (L2) nessun dato sensibile verso terzi non fidati (tracker); 14.3.3 (L2) nessun dato sensibile in `localStorage` & co.

**V15 Secure Coding and Architecture** (`0x24-V15-Secure-Coding-and-Architecture.md`)
- 15.1.1 (L1) tempi di rimedio documentati per componenti di terze parti vulnerabili; 15.2.1 (L1) nessun componente oltre quei tempi.
- 15.3.1 (L1) restituire solo il sottoinsieme di campi necessario.
- 15.1.2 (L2) inventario/SBOM delle dipendenze; 15.1.3 (L2) documentare le funzioni costose in risorse; 15.2.2 (L2) difese contro la perdita di disponibilità su quelle funzioni. `/api/decklists/resolve` con 50.000 caratteri è la candidata principale **[DERIVATO]**.
- 15.2.3 (L2) in produzione solo le funzioni necessarie.
- 15.3.4 (L2) i proxy trasmettono l'IP originale con campi fidati non falsificabili.
- 15.3.6 (L2) codice JavaScript che previene la prototype pollution; 15.3.7 (L2) difese contro la HTTP parameter pollution.
- 15.2.4 (L3) dipendenze dal repository atteso, senza dependency confusion.

**V16 Security Logging and Error Handling** (`0x25-V16-Security-Logging-and-Error-Handling.md`)
- Tutti L2 tranne 16.5.4 (L3). 16.1.1 inventario dei log; 16.2.1 metadati (quando, dove, chi, cosa); 16.2.2 orologi sincronizzati e UTC; 16.2.5 log dei dati sensibili secondo il livello di protezione; 16.3.4 log degli errori inattesi; 16.4.1 encoding contro la log injection; 16.4.2 log protetti da accesso e modifica; 16.5.1 messaggio generico al client "ensuring no exposure of ... stack traces, queries, secret keys"; 16.5.2 funzionamento sicuro quando una risorsa esterna fallisce; 16.5.3 fallire in modo sicuro, senza fail-open; 16.5.4 (L3) gestore di "last resort" per le eccezioni non gestite.

## 2. API Hono su Node

Versioni nel repo: `hono` 4.13.16, `@hono/node-server` ^2.1.6 (`packages/api/package.json`). Le pagine di documentazione sono su https://hono.dev; dove la documentazione tace ho letto il sorgente su https://github.com/honojs/hono (ramo `main`).

### Header di sicurezza

- `secureHeaders()` (`hono/secure-headers`) imposta di default: rimozione di `X-Powered-By`, `Cross-Origin-Resource-Policy: same-origin`, `Cross-Origin-Opener-Policy: same-origin`, `Origin-Agent-Cluster: ?1`, `Referrer-Policy: no-referrer`, `Strict-Transport-Security: max-age=15552000; includeSubDomains`, `X-Content-Type-Options: nosniff`, `X-DNS-Prefetch-Control: off`, `X-Download-Options: noopen`, `X-Frame-Options: SAMEORIGIN`, `X-Permitted-Cross-Domain-Policies: none`, `X-XSS-Protection: 0`. Non imposta di default CSP, `Permissions-Policy`, `Reporting-Endpoints`. Supporta CSP con nonce (`NONCE`) e l'opzione `overwrite` (https://hono.dev/docs/middleware/builtin/secure-headers).
- Il default HSTS di Hono (15552000 s, 180 giorni) è sotto l'anno minimo di ASVS 3.4.1 **[DERIVATO]**.
- Le risposte dell'API sono JSON e passano da Caddy: gli header si possono mettere in un solo posto (Caddy, sezione 3) o in entrambi; tenerli in uno solo evita due fonti per lo stesso fatto **[DERIVATO]**.

### Limite del body

- `bodyLimit({ maxSize, onError })` (`hono/body-limit`) controlla prima `Content-Length`; senza quell'header legge il body come stream e interviene appena supera il limite (https://hono.dev/docs/middleware/builtin/body-limit). Senza `onError` risponde `413` "Payload Too Large" (https://github.com/honojs/hono/blob/main/src/middleware/body-limit/index.ts).
- Oggi l'API controlla la lunghezza del testo (50.000 caratteri) e delle righe (5.000) **dopo** `c.req.json()`, quindi un body molto grande viene prima letto e parsato per intero **[DERIVATO]** (`packages/api/src/app.ts`).
- Alternativa o complemento a monte: `request_body { max_size }` di Caddy rifiuta con `413` "right away, before any later handlers run" se `Content-Length` supera il limite (https://caddyserver.com/docs/caddyfile/directives/request_body).

### Rate limiting

- Hono non ha un rate limiter integrato; la pagina dei middleware di terze parti elenca "Hono Rate Limiter" (https://github.com/rhinobase/hono-rate-limiter) e Guard Core (https://hono.dev/docs/middleware/third-party). Il README di hono-rate-limiter dice che il pacchetto "is still in development".
- A livello di proxy: Caddy non ha rate limiting nella build standard; il modulo `caddy-ratelimit` "is not an official repository of the Caddy Web Server" e richiede una build con `xcaddy` (https://github.com/mholt/caddy-ratelimit).
- La chiave del limite è l'IP del client. Dietro Caddy, l'IP della connessione vista da Node è quello di Caddy; Caddy "sets or augments" `X-Forwarded-For` e per default "will ignore their values from incoming requests, to prevent spoofing" (https://caddyserver.com/docs/caddyfile/directives/reverse_proxy#defaults). L'API dovrebbe quindi fidarsi di `X-Forwarded-For` solo da Caddy (ASVS 15.3.4) **[DERIVATO]**.
- L'importer non è esposto, ma l'importer stesso è un client di Scryfall soggetto ai suoi limiti (sezione 8).

### Validazione dell'input

- Hono offre il middleware `validator` integrato e validatori ufficiali per Zod, Standard Schema e Valibot (https://hono.dev/docs/guides/validation, https://hono.dev/docs/middleware/third-party).
- Oggi la validazione è scritta a mano con limiti espliciti (lunghezza, regex, allowlist di `lang`) **[DERIVATO]** (`packages/api/src/app.ts`): soddisfa già lo spirito di ASVS 2.2.1; un validatore a schema renderebbe le regole dichiarative (2.1.1 chiede che siano documentate).

### Errori che non rivelano nulla

- Il gestore di errori predefinito di Hono: se l'errore ha `getResponse` (es. `HTTPException`) restituisce quella risposta; altrimenti fa `console.error(err)` e risponde `c.text('Internal Server Error', 500)`. Il 404 predefinito è `'404 Not Found'` (https://github.com/honojs/hono/blob/main/src/hono-base.ts).
- `app.onError` e `app.notFound` permettono di sostituirli (https://hono.dev/docs/api/hono). Un `onError` personalizzato può restituire JSON coerente con le altre risposte dell'API senza dettagli interni (ASVS 16.5.1) **[DERIVATO]**.
- Un errore del driver PostgreSQL non intercettato arriva a `console.error` e quindi nei log di Docker, compreso il testo della query **[DERIVATO]**: rilevante per ASVS 16.2.5 e per i log come dato personale (sezione 8).

### Timeout

- `timeout(ms, exception?)` (`hono/timeout`) rifiuta la promessa allo scadere; non si usa con lo streaming; meglio una factory che un'istanza condivisa di eccezione (https://hono.dev/docs/middleware/builtin/timeout). Il default è `HTTPException(504, { message: 'Gateway Timeout' })` (https://github.com/honojs/hono/blob/main/src/middleware/timeout/index.ts). La pagina non dice che il lavoro sottostante venga annullato: la query continua finché PostgreSQL non la interrompe **[DERIVATO]**, motivo per cui serve anche `statement_timeout` (sezione 4).
- Timeout del server HTTP di Node (https://nodejs.org/api/http.html): `server.requestTimeout` default `300000`; `server.headersTimeout` default "The minimum between `server.requestTimeout` or `60000`"; `server.keepAliveTimeout` default `65000`; `server.timeout` default `0` (nessun timeout); `server.maxRequestsPerSocket` default `0`; `maxHeaderSize` default 16384 (16 KiB). `serve()` di `@hono/node-server` restituisce il server Node e accetta `createServer`/`serverOptions` (https://github.com/honojs/node-server#createserver).
- Caddy a monte ha `read_header` e `read_body_idle` a `1m`, `idle` a 5 minuti, `read_body` e `write` senza timeout (https://caddyserver.com/docs/caddyfile/options#timeouts).

### CORS

- Il middleware `cors()` di Hono ha `origin` default `'*'` (https://github.com/honojs/hono/blob/main/src/middleware/cors/index.ts).
- La SPA chiama `/api/*` sulla stessa origine attraverso Caddy (`packages/web/src/api.ts`, `docker/web/Caddyfile`), quindi non serve CORS: non aggiungere il middleware lascia il browser alla same-origin policy (ASVS 3.4.2) **[DERIVATO]**.

### Permission model di Node (opzione)

- `--permission` è "Stability: 2 - Stable" e limita file system, rete, variabili d'ambiente, processi figli, worker, addon nativi; ma "does not protect against malicious code" ed è un approccio "seat belt" (https://nodejs.org/api/permissions.html). Utile come difesa in profondità, non come confine di sicurezza.

## 3. Caddy

Versione nel repo: immagine `caddy:2.11-alpine` (`Dockerfile`). Documentazione dal repository https://github.com/caddyserver/website (`src/docs/markdown`), pubblicata su https://caddyserver.com/docs.

### TLS e HTTPS

- "Caddy's default TLS settings are secure"; `protocols` "Default min: `tls1.2`, Default max: `tls1.3`"; le cipher suite non sono configurabili per TLS 1.3 (https://caddyserver.com/docs/caddyfile/directives/tls). Soddisfa ASVS 12.1.1 senza configurazione **[DERIVATO]**.
- Nota di compatibilità: "deliberate adjustments to TLS defaults may be made in new minor or patch releases" (stessa pagina): l'immagine fissata per digest (sezione 5) rende i default riproducibili **[DERIVATO]**.
- Caddy "redirects HTTP to HTTPS for you" (https://caddyserver.com/docs/automatic-https).
- L'admin API di Caddy si disattiva con `admin off` nelle opzioni globali (https://caddyserver.com/docs/caddyfile/options#admin).

### Header di sicurezza con la direttiva `header`

- Sintassi `header [<matcher>] [[+|-|?|>]<field> ...]`; `-` rimuove un header, `?` imposta un default solo se assente, `>` imposta con `defer`; il `defer` è automatico quando si rimuove o si usano `?`, `>` o `match` (https://caddyserver.com/docs/caddyfile/directives/header). L'esempio ufficiale "Set security and privacy headers" imposta `Strict-Transport-Security max-age=31536000;`, `X-Content-Type-Options nosniff`, `X-Frame-Options DENY`, con l'avviso "only use if you understand the implications".
- Valori raccomandati da OWASP (https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html): HSTS `max-age=63072000; includeSubDomains; preload` (con l'avvertenza di verificare i requisiti del preload); `X-Content-Type-Options: nosniff`; `Referrer-Policy: strict-origin-when-cross-origin`; `Permissions-Policy` che disattiva ogni funzione non usata; COOP `same-origin`; CORP `same-site`; COEP `require-corp` (con l'avviso che le risorse di terzi non configurate non si caricano); `X-XSS-Protection` non impostato o `0`; `Server` rimosso o non informativo.
- Il Caddyfile oggi imposta solo `X-Robots-Tag "noindex, nofollow"` **[DERIVATO]** (`docker/web/Caddyfile`).
- HSTS su staging: lo staging usa `localhost` con la CA locale di Caddy (ADR 0011). Un HSTS con `includeSubDomains` o `preload` su un dominio condiviso vincola anche altri sottodomini; il preload è ASVS 3.7.4, L3 **[DERIVATO]**.

### Permissions-Policy e Web Share

- La Web Share API definisce la funzione `web-share` con default allowlist `'self'` (https://w3c.github.io/web-share/#permissions-policy). L'app usa `navigator.share` (`packages/web/src/pdf-delivery.ts`), quindi una `Permissions-Policy` restrittiva deve lasciare `web-share=(self)` **[DERIVATO]**.

### COEP e le immagini di Scryfall

- Con `require-corp` un documento carica risorse `no-cors` cross-origin solo se hanno un `Cross-Origin-Resource-Policy` che lo consente; con `credentialless` le carica senza cookie (https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Embedder-Policy). COEP serve per la cross-origin isolation (es. `SharedArrayBuffer`).
- Una richiesta `curl -I` a un'immagine su `cards.scryfall.io` (2026-11-18) ha restituito `access-control-allow-origin: *`, `x-content-type-options: nosniff`, nessun `Cross-Origin-Resource-Policy` **[DERIVATO]**. Quindi con COEP `require-corp` le `<img>` senza attributo `crossorigin` verrebbero bloccate; `fetch()` funziona perché è in modalità CORS. L'app non usa `SharedArrayBuffer` **[DERIVATO]**, quindi COEP non porta benefici e si può omettere.
- CORP sulle risposte dell'app (`same-origin` o `same-site`) riguarda chi incorpora le *nostre* risorse, non le immagini Scryfall che carichiamo **[DERIVATO]**.

### CSP compatibile con immagini Scryfall e PDF nel browser

Fatti:
- Scryfall: per l'API e le risorse "you can grantlist `*.scryfall.com`"; elenco esaustivo suggerito: `connect-src api.scryfall.com embed.scryfall.com; img-src *.scryfall.io style-src embed.scryfall.com; script-src embed.scryfall.com; font-src embed.scryfall.com;`. Le origini delle immagini mandano header CORS per `GET`, `HEAD`, `POST`, `OPTIONS` se la richiesta ha `Origin` (https://scryfall.com/docs/api/http-concerns).
- `connect-src` governa `fetch()`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`, `<a ping>`, `fetchLater()` e ricade su `default-src` (https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/connect-src).
- `style-src` blocca `<style>` e attributi `style` inline senza `'unsafe-inline'`/nonce/hash, ma non le proprietà impostate su `element.style` (https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/style-src).
- OWASP: policy strict con nonce o hash e `'strict-dynamic'`; policy di base `default-src 'self'; frame-ancestors 'self'; form-action 'self';`; variante più stretta `default-src 'none'; script-src 'self'; connect-src 'self'; img-src 'self'; style-src 'self'; frame-ancestors 'self'; form-action 'self';`. `frame-ancestors` non ricade su `default-src` ed è ignorato nel `<meta>`; l'header è "the preferred way". `Content-Security-Policy-Report-Only` non blocca e serve per il rollout (https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html).

Cosa fa oggi il codice **[DERIVATO]**:
- `index.html` costruito (`packages/web/dist/index.html`) carica solo `/assets/*.js` e `/assets/*.css` dalla stessa origine, senza script inline.
- `fetchImages()` legge i byte delle immagini con `fetch(url)` da `cards.scryfall.io` (`packages/web/src/api.ts`) e `pdf-lib` li inserisce nel PDF: serve `connect-src https://cards.scryfall.io` (non basta `img-src`).
- Le anteprime mostrano le immagini in `<img>`: serve `img-src https://cards.scryfall.io`. Non ho trovato `canvas`, `Worker` o `blob:` usati come sorgente di immagini o script; `URL.createObjectURL` serve solo al download del PDF via `<a download>` (`packages/web/src/pdf-delivery.ts`), che è una navigazione e non una richiesta governata da `connect-src`/`img-src`. Quindi `worker-src` e `blob:` non sembrano necessari; da confermare con Report-Only.
- Radix Dialog usa `react-remove-scroll` → `react-style-singleton`, che crea elementi `<style>` a runtime (con nonce solo se `get-nonce` ne fornisce uno) (`node_modules/react-style-singleton/dist/es2015/singleton.js`). Con `style-src 'self'` senza `'unsafe-inline'` lo stile del dialog verrebbe bloccato: le opzioni sono `'unsafe-inline'` solo in `style-src`, oppure un nonce per risposta (che un file statico servito da Caddy non ha senza templating).

Una policy candidata da validare in Report-Only **[DERIVATO]**:

```
default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' https://cards.scryfall.io; connect-src 'self' https://cards.scryfall.io;
font-src 'self'; manifest-src 'self'; base-uri 'none'; object-src 'none';
form-action 'self'; frame-ancestors 'none'
```

Copre i minimi di ASVS 3.4.3 (`object-src 'none'`, `base-uri 'none'`, allowlist) e 3.4.6 (`frame-ancestors`). Se in futuro arrivano banner pubblicitari (ADR 0005), la CSP dovrà aprirsi alle loro origini.

### Log di accesso

- `log` "Enables and configures HTTP request logging"; senza la direttiva non ci sono access log. Output default `stderr`; `Cookie`, `Set-Cookie`, `Authorization` e `Proxy-Authorization` sono registrati come `REDACTED` (https://caddyserver.com/docs/caddyfile/directives/log).
- Il filtro `ip_mask` maschera `request>remote_ip` / `request>client_ip` con un CIDR separato per IPv4 e IPv6; i file ruotano con `roll_size`, `roll_keep` (default 10) e `roll_keep_for` (default 90 giorni) (stessa pagina).
- Il Caddyfile di oggi non ha `log`, quindi Caddy non scrive access log **[DERIVATO]**; scrive comunque i propri log di runtime su stderr, raccolti da Docker.

## 4. PostgreSQL: minimo privilegio

Versione: immagine `postgres:18-alpine` (`compose.yaml`). Documentazione: https://www.postgresql.org/docs/18/.

### Ruoli separati

- L'immagine Docker crea `POSTGRES_USER` "with superuser power and a database with the same name"; per default l'autenticazione `host` è `scram-sha-256` (14+); gli script in `/docker-entrypoint-initdb.d` girano solo con la directory dati vuota (https://github.com/docker-library/docs/blob/master/postgres/content.md). Lo stesso file documenta le varianti `_FILE` (`POSTGRES_PASSWORD_FILE` ecc.) per leggere i segreti da file.
- Oggi `api` e `importer` usano lo stesso `DATABASE_URL` con `POSTGRES_USER` (superuser) **[DERIVATO]** (`compose.yaml`). In più `server.ts` esegue `migrate(sql)` all'avvio dell'API, quindi l'API oggi ha bisogno di privilegi DDL **[DERIVATO]** (`packages/api/src/server.ts`): separare i ruoli richiede di spostare le migrazioni su un ruolo diverso da quello che serve le richieste.
- Diritti del proprietario: "The right to modify or destroy an object is inherent in being the object's owner, and cannot be granted or revoked"; "Default privileges always include all privileges for the owner" (https://www.postgresql.org/docs/18/ddl-priv.html). Un ruolo proprietario delle tabelle, distinto dai ruoli di login, evita che API o importer possano fare `DROP` **[DERIVATO]**.
- Privilegi di default a `PUBLIC`: "`CONNECT` and `TEMPORARY` (create temporary tables) privileges for databases; `EXECUTE` privilege for functions and procedures; and `USAGE` privilege for languages and data types"; nessun privilegio di default su tabelle, sequenze, schemi (https://www.postgresql.org/docs/18/ddl-priv.html).
- Schema `public`: da PostgreSQL 15 `PUBLIC` non ha più `CREATE` sullo schema `public` nei database nuovi; ha ancora `USAGE`. Nei database aggiornati da 14 o precedenti serve `REVOKE CREATE ON SCHEMA public FROM PUBLIC` (https://www.postgresql.org/docs/18/ddl-schemas.html, "Usage Patterns").
- `ALTER DEFAULT PRIVILEGES` imposta i privilegi degli oggetti creati in futuro, non di quelli esistenti; `FOR ROLE target_role` vale per gli oggetti creati da quel ruolo (https://www.postgresql.org/docs/18/sql-alterdefaultprivileges.html). Esempio della pagina: `ALTER DEFAULT PRIVILEGES IN SCHEMA myschema GRANT SELECT ON TABLES TO PUBLIC;`. Per l'API: `ALTER DEFAULT PRIVILEGES FOR ROLE <owner> IN SCHEMA public GRANT SELECT ON TABLES TO <api_role>` **[DERIVATO]**.
- `pg_read_all_data` dà lettura su tutte le tabelle, viste, sequenze e `USAGE` su tutti gli schemi; la pagina avverte di concedere i ruoli predefiniti "only ... where needed" (https://www.postgresql.org/docs/18/predefined-roles.html). È più largo di un `GRANT SELECT` mirato **[DERIVATO]**.
- L'importer fa un import atomico (ADR 0002): ha bisogno di scrivere le tabelle del catalogo; se l'import sostituisce tabelle (create/rename), il ruolo che lo fa deve esserne proprietario o membro del proprietario **[DERIVATO]**.

### Timeout

- `statement_timeout`, `lock_timeout`, `transaction_timeout`, `idle_in_transaction_session_timeout`, `idle_session_timeout`: default `0` (disattivati); per i primi tre "Setting ... in `postgresql.conf` is not recommended because it would affect all sessions"; per `idle_session_timeout` attenzione ai pool di connessioni (https://www.postgresql.org/docs/18/runtime-config-client.html). Si impostano per ruolo con `ALTER ROLE ... SET` (stessa sezione e https://www.postgresql.org/docs/18/sql-alterrole.html).
- Un timeout breve sul ruolo dell'API e uno lungo (o nessuno) sul ruolo dell'importer seguono naturalmente dalla separazione dei ruoli **[DERIVATO]**.

### Sicurezza della connessione

- Il database pubblica la porta solo su `127.0.0.1` (`compose.yaml`) e i servizi parlano sulla rete Compose senza TLS **[DERIVATO]**. ASVS 12.3.1/12.3.3 (L2) chiedono TLS anche tra servizi interni; PostgreSQL supporta TLS lato server (https://www.postgresql.org/docs/18/ssl-tcp.html) e lato client con `sslmode` (https://www.postgresql.org/docs/18/libpq-connect.html#LIBPQ-CONNECT-SSLMODE). Su un solo host con rete Docker isolata è una scelta da prendere, non un default.
- Credenziali di fallback `mtg:mtg` in `compose.yaml` e in CI **[DERIVATO]**: ASVS 13.2.3 (L2) vieta credenziali di default tra componenti in produzione.

## 5. Hardening Docker

Fonti: https://docs.docker.com/reference/compose-file/services/ (dal repository `docker/docs`), https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html.

### Controlli e attributi Compose

- Utente: `user` "overrides the user used to run the container process. The default is set by the image ... If it's not set, then `root`" (services reference, `user`). OWASP RULE #2 "Set a user". Stato: `api`/`importer` girano come `node`; `web` (Caddy) e `postgres` con l'utente di default dell'immagine **[DERIVATO]**.
- `read_only`: container con file system in sola lettura; `tmpfs` monta file system temporanei (services reference). OWASP RULE #8.
- `cap_drop` / `cap_add` (services reference). OWASP RULE #3: "Drop all Linux capabilities and add back only those a container needs. Never use `--privileged`". Caddy ascolta su 80/443: con `cap_drop: [ALL]` deve riavere `NET_BIND_SERVICE` se gira come root o non root senza capability nel binario **[DERIVATO]**; la pagina dell'immagine Caddy mostra un esempio `cap_add` (https://github.com/docker-library/docs/blob/master/caddy/content.md).
- `security_opt: [no-new-privileges]`; le forme `no-new-privileges`, `=true`, `:true` sono equivalenti (services reference, `security_opt`). OWASP RULE #4.
- Risorse: `mem_limit` (coerente con `deploy.resources.limits.memory`), `pids_limit` ("Set to -1 for unlimited PIDs") (services reference). OWASP RULE #7 "Limit resources".
- `init: true` esegue un init come PID 1 che inoltra i segnali e raccoglie i processi (services reference).
- Reti: una rete con `internal: true` è "externally isolated" (https://docs.docker.com/reference/compose-file/networks/). OWASP RULE #5 (reti dedicate) e #5a (le regole di Docker scavalcano UFW: pubblicare su `127.0.0.1`). Oggi tutti i servizi stanno nella rete di default, quindi `web` può raggiungere `postgres` **[DERIVATO]**. Una separazione possibile: rete `frontend` (web, api) e rete `backend` (api, importer, postgres); l'importer deve comunque uscire verso Scryfall. Non ho verificato come una porta pubblicata interagisca con una rete `internal` **[NON VERIFICATO]**.
- Log: `json-file` è il driver di default, `max-size` "Defaults to -1 (unlimited)", `max-file` vale solo con `max-size` (https://docs.docker.com/engine/logging/drivers/json-file/). Senza rotazione i log crescono senza limite, e contengono ciò che scrivono API, importer e Caddy **[DERIVATO]**.
- Segreti: OWASP RULE #12 "Utilize Docker Secrets" e BuildKit secret mounts. Oggi le password passano in variabili d'ambiente (`compose.yaml`) **[DERIVATO]**.
- Socket: OWASP RULE #1, mai montare `docker.sock`. Rootless: Rule #11.

### Immagini

- Pinning: un tag come `alpine:3.21` può cambiare; "To fully secure your supply chain integrity, you can pin the image version to a specific digest", es. `FROM alpine:3.21@sha256:...` (https://docs.docker.com/build/building/best-practices/#pin-base-image-versions). Stato: `node:26.13.0-slim`, `caddy:2.11-alpine`, `postgres:18-alpine` senza digest; `npm install --global pnpm@12.18.0` nel build **[DERIVATO]** (`Dockerfile`).
- Dependabot aggiorna sia `docker` sia `docker-compose` (sezione 6), digest compresi.
- Scansione: OWASP RULE #9 (scansione in CI/CD), RULE #13 (SBOM, firma, provenienza). Strumenti di prima parte: Docker Scout (https://docs.docker.com/scout/) e Trivy, che scansiona immagini, file system e repository per CVE, segreti e misconfigurazioni (`trivy fs --scanners vuln,secret,misconfig`) (https://github.com/aquasecurity/trivy).

## 6. GitHub Actions e supply chain pnpm

### Workflow

Fonte principale: https://docs.github.com/en/actions/reference/security/secure-use.
- `GITHUB_TOKEN`: impostare il default "to read access only for repository contents" e alzare i permessi per singolo job. Stato: `ci.yml` e `deploy.yml` hanno `permissions: contents: read` **[DERIVATO]**. zizmor (`excessive-permissions`) raccomanda `permissions: {}` a livello di workflow e permessi per job (https://docs.zizmor.sh/audits/).
- Pinning: "Pin references to actions to a commit SHA" contro il rischio di backdoor nel repository dell'action. Più forte ancora: "lock your workflow dependencies with a lockfile ... This is the strongest protection available, and supersedes SHA pinning for repositories that adopt it" (stessa pagina).
- Lockfile delle dipendenze dei workflow: `.github/workflows/actions.lock`, generato da `gh actions-lock` (estensione della CLI), da non modificare a mano; registra `ref`, `commit`, `owner_id`, `repo_id`; a runtime verifica che il repository sia lo stesso e che il commit sia raggiungibile dal ref (rifiuta commit presenti solo in un fork); non copre le chiamate a reusable workflow, gli input, i segreti né l'immagine del runner; soddisfa la policy "Require actions to be pinned to a full-length commit SHA" (https://docs.github.com/en/actions/concepts/security/workflow-dependency-lockfiles). GA dal 28 ottobre 2026, anche sul piano Free (https://github.blog/changelog/2026-10-28-github-actions-workflow-lockfiles-are-generally-available/).
- Script injection: passare le espressioni `${{ }}` attraverso una variabile d'ambiente intermedia (secure-use, "Good practices for mitigating script injection attacks"). `deploy.yml` già passa i valori via `env:` **[DERIVATO]**.
- `pull_request_target` e `workflow_run` sono privilegiati, "may have repository write access and access to referenced secrets"; "Workflows that use these triggers must not explicitly check out untrusted code" (secure-use). `deploy.yml` usa `workflow_run` e fa checkout del `head_sha` del run CI, ma solo dopo aver verificato `event == 'push'` e `head_repository.full_name == github.repository` **[DERIVATO]**. zizmor segnala comunque `workflow_run` con l'audit `dangerous-triggers` (https://docs.zizmor.sh/audits/).
- Segreti: mai in chiaro nei workflow; `::add-mask::` per valori sensibili non segreti; "Never use structured data as a secret" (secure-use). Gli environment con revisori: "A workflow job cannot access environment secrets until approval is granted by a reviewer" (secure-use). `deploy.yml` usa `environment: production` **[DERIVATO]**; le regole di protezione si configurano nelle impostazioni del repository.
- `actions/checkout` lascia le credenziali su disco: zizmor `artipacked` raccomanda `persist-credentials: false` (https://docs.zizmor.sh/audits/).
- Altri audit zizmor utili: `template-injection`, `unpinned-uses`, `cache-poisoning`, `secrets-inherit`, `impostor-commit` (https://docs.zizmor.sh/audits/). OpenSSF Scorecards controlla permessi del token, pinning e script injection (secure-use).

### Segreti nel codice

- gitleaks scansiona repository git (`gitleaks git`), directory (`dir`) e stdin; si usa come hook pre-commit; il README dice "Gitleaks is feature complete" e che le release future saranno solo patch di sicurezza (https://github.com/gitleaks/gitleaks).
- Secret scanning di GitHub: gratis sui repository pubblici; per i repository privati di un account personale la pagina non offre GitHub Secret Protection (solo organizzazioni su Team/Enterprise) (https://docs.github.com/en/code-security/secret-scanning/introduction/about-secret-scanning). Il repository è privato su un account personale (`gh repo view`, 2026-11-18) **[DERIVATO]**: senza un repo pubblico la scansione dei segreti va fatta con uno strumento locale o in CI.

### pnpm

Fonti: https://pnpm.io/settings/dependency-resolution, https://pnpm.io/settings/build, https://pnpm.io/cli/audit. Versione nel repo: `pnpm@12.18.0` (`package.json`).
- `minimumReleaseAge`: "Default: 1440" minuti; ritarda l'installazione delle versioni appena pubblicate, "In most cases, malicious releases are discovered and removed from the registry within an hour"; vale anche per le dipendenze transitive; eccezioni con `minimumReleaseAgeExclude`.
- `trustPolicy`: "Default: off"; con `no-downgrade` l'installazione fallisce se il livello di fiducia di un pacchetto (trusted publisher, provenance) è sceso rispetto alle release precedenti; eccezioni con `trustPolicyExclude`, `trustPolicyIgnoreAfter`.
- `blockExoticSubdeps`: "Default: true"; solo le dipendenze dirette possono venire da git o tarball.
- `strictDepBuilds`: "Default: true"; l'installazione fallisce se una dipendenza ha script di build non revisionati. Si approvano con `allowBuilds` in `pnpm-workspace.yaml`. Le vecchie impostazioni `onlyBuiltDependencies`, `neverBuiltDependencies`, `ignoredBuiltDependencies` sono sostituite da `allowBuilds` (https://pnpm.io/settings/build).
- `pnpm audit` interroga l'endpoint advisories del registry e termina con codice 1 se resta un advisory al livello indicato; `pnpm audit signatures` verifica le firme ECDSA del registry contro l'integrity nel lockfile (https://pnpm.io/cli/audit).
- Lockfile: CI e `Dockerfile` usano `pnpm install --frozen-lockfile`; il `Dockerfile` usa anche `--ignore-scripts` **[DERIVATO]**.
- `pnpm-workspace.yaml` oggi contiene solo `packages` **[DERIVATO]**: valgono i default sopra, nessuna `trustPolicy`.

### Aggiornamenti automatici

- Dependabot supporta pnpm v7–v12 con la chiave `npm`, e `docker-compose` (v2, v3) (https://docs.github.com/en/code-security/dependabot/ecosystems-supported-by-dependabot/supported-ecosystems-and-repositories).
- `cooldown` ritarda gli aggiornamenti di un numero di giorni configurabile (`default-days`, e per npm anche per tipo di bump semver); supportato per `github-actions`, `npm`, `docker`, `docker-compose` (https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference). Il formato strutturato del lockfile dei workflow serve anche a Dependabot (https://docs.github.com/en/actions/concepts/security/workflow-dependency-lockfiles).
- Il repository non ha `.github/dependabot.yml` **[DERIVATO]**.
- La disponibilità degli alert Dependabot sui repository privati personali non è indicata nella pagina consultata (https://docs.github.com/en/code-security/dependabot/dependabot-alerts/about-dependabot-alerts) **[NON VERIFICATO]**.
- Renovate è l'alternativa non GitHub; non l'ho approfondito.

## 7. Limitare l'accesso al pubblico dell'alpha

### Perché un URL non pubblicizzato non basta

- Let's Encrypt "submits all certificates we issue to CT logs" (https://letsencrypt.org/docs/ct-logs/): il nome host del sito compare in log consultabili da chiunque appena Caddy ottiene il certificato **[DERIVATO]**.
- robots.txt e simili "are not a form of access authorization" (https://www.rfc-editor.org/rfc/rfc9309#section-1). Lo stesso vale per `X-Robots-Tag` e `<meta name="robots">` già presenti **[DERIVATO]** (`docker/web/Caddyfile`, `packages/web/index.html`).
- Un URL inoltrato da un tester passa a chiunque lo riceva; un segreto nell'URL viola ASVS 14.2.1 (L1) **[DERIVATO]**.

### Opzioni

| Opzione | Come | Pro | Contro |
| --- | --- | --- | --- |
| `basic_auth` di Caddy | Utente e hash (bcrypt di default, `argon2id` disponibile) nel Caddyfile; `caddy hash-password`; supporta `{env.*}` (https://caddyserver.com/docs/caddyfile/directives/basic_auth) | Nessun codice; copre SPA e `/api` in un colpo | RFC 7617: le password viaggiano in chiaro senza HTTPS; il rischio maggiore è il riuso delle password scelte dagli utenti, che sparisce se il server le assegna (https://www.rfc-editor.org/rfc/rfc7617#section-4). Nessun logout, prompt del browser poco amichevole su mobile **[DERIVATO]** |
| Allowlist IP | Matcher `remote_ip` o `client_ip` (con `trusted_proxies`) (https://caddyserver.com/docs/caddyfile/matchers#client-ip) | Nessuna credenziale | I tester da mobile o da casa hanno IP che cambiano; richiede raccogliere i loro IP (dato personale, sezione 8) **[DERIVATO]** |
| Token d'invito | Link con token monouso che il server scambia per un cookie (`__Host-`, `Secure`, `HttpOnly`, `SameSite`: ASVS 3.3.1–3.3.4) | Esperienza fluida, revoca per singolo tester | Codice e stato nuovi; riattiva i capitoli V6–V8 di ASVS; il token non deve restare nell'URL (14.2.1) **[DERIVATO]** |
| `forward_auth` | Caddy chiede a un gateway (es. Authelia, Tailscale) se la richiesta è ammessa; `2xx` = accesso, altrimenti la risposta del gateway torna al client (https://caddyserver.com/docs/caddyfile/directives/forward_auth) | Login vero, MFA, nessun codice nell'app | Un servizio in più da mantenere e da proteggere; con Tailscale ogni tester deve installare un client **[DERIVATO]** |

- Una qualsiasi di queste davanti a tutto il sito fa sì che l'API non sia raggiungibile da chi non è nel cerchio; questo riduce anche il bisogno di rate limiting pubblico durante l'alpha, senza eliminarlo (un tester o un account compromesso può comunque abusare) **[DERIVATO]**.
- Il healthcheck di `web` usa un server separato su `127.0.0.1:8081` (`docker/web/Caddyfile`) e non passerebbe dal controllo d'accesso del sito pubblico **[DERIVATO]**.

## 8. Privacy e GDPR per un'alpha gestita dall'Italia

Testi: GDPR https://eur-lex.europa.eu/eli/reg/2016/679/oj (letto dalla versione XHTML del Publications Office, CELEX 32016R0679); Direttiva ePrivacy consolidata https://eur-lex.europa.eu/eli/dir/2002/58/oj (CELEX 02002L0058-20091219).

### Ambito

- Il GDPR non si applica al trattamento "by a natural person in the course of a purely personal or household activity" (art. 2(2)(c)), cioè "with no connection to a professional or commercial activity" (considerando 18). Un'app pubblicata per tester e destinata a un pubblico più ampio, con pubblicità prevista (ADR 0005), difficilmente rientra nell'eccezione domestica **[DERIVATO]**.

### Log con indirizzi IP

- Dato personale: "any information relating to an identified or identifiable natural person", anche tramite "an online identifier" (art. 4(1)). Considerando 30: identificatori online "such as internet protocol addresses, cookie identifiers".
- CGUE C-582/14 (Breyer): un IP dinamico registrato da un fornitore di servizi online "constitutes personal data ... where the latter has the legal means which enable it to identify the data subject with additional data which the internet service provider has" (https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:62014CJ0582).
- Garante, provvedimento 9 giugno 2022 [doc. web 9782890] su Google Analytics: "l'indirizzo IP costituisce un dato personale nella misura in cui consenta di identificare un dispositivo"; il troncamento dell'ultimo ottetto è "una pseudonimizzazione" (https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9782890).
- Base giuridica: il trattamento "strictly necessary and proportionate for the purposes of ensuring network and information security ... constitutes a legitimate interest" (considerando 49), cioè art. 6(1)(f).
- Conservazione: i dati vanno tenuti in forma identificabile "for no longer than is necessary" (art. 5(1)(e)). OWASP Logging Cheat Sheet: "Never log data unless it is legally sanctioned", de-identificare dove l'identità non serve, rispettare periodi di conservazione né più corti né più lunghi del necessario (https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html).
- Dove stanno oggi gli IP **[DERIVATO]**: Caddy non scrive access log; l'API non ha un logger di richieste; i log Docker non ruotano. Il primo IP registrato arriverà con il primo access log o con un rate limiter, ed è lì che servono durata di conservazione e, se basta, `ip_mask` (sezione 3).
- Registro dei trattamenti: l'obbligo dell'art. 30 non si applica sotto i 250 dipendenti "unless the processing ... is likely to result in a risk ..., the processing is not occasional, or the processing includes special categories" (art. 30(5)). Un log continuo potrebbe non essere "occasional" **[DERIVATO]**.
- Hosting: il fornitore del VPS tratta i dati per conto del titolare e serve un contratto ex art. 28 (di norma il DPA del fornitore) **[DERIVATO]** (art. 28(3)).
- Violazioni: notifica al Garante "without undue delay and, where feasible, not later than 72 hours", salvo rischio improbabile (art. 33(1)).

### Cookie, localStorage e art. 5(3) ePrivacy

- Art. 5(3): memorizzare informazioni o accedere a quelle già memorizzate nel terminale richiede consenso, salvo "technical storage or access ... strictly necessary in order for the provider of an information society service explicitly requested by the subscriber or user to provide the service".
- EDPB, Linee guida 2/2023 sul perimetro tecnico dell'art. 5(3), versione 2.0 "Adopted on 7 October 2024", par. 44: l'uso di informazioni nel browser "such as cookies, local storage" non costituisce "gaining of access" "as long as the information does not leave the device, but when this information or any derivation of this information is accessed, Article 5(3) ePD would apply" (https://www.edpb.europa.eu/system/files/documents/2024-10/edpb_guidelines_202302_technical_scope_art_53_eprivacydirective_v2_en_0.pdf).
- Lo stato dell'app in `localStorage` (tema, lingua, decklist salvata, larghezze dei pannelli) resta nel dispositivo e serve a funzioni richieste dall'utente **[DERIVATO]** (`packages/web/src/shell/theme-choice.ts`, `default-lang.ts`, `saved-decklist.ts`, `workspace/*`). Un cookie d'invito o di autenticazione (sezione 7) sarebbe tecnico e strettamente necessario.
- Garante, "Linee guida cookie e altri strumenti di tracciamento - 10 giugno 2021" (doc. web 9677876): per i cookie tecnici il titolare ha "il solo obbligo di fornire specifica informativa"; gli analytics possono essere assimilati ai tecnici se limitati a "statistiche aggregate", senza "single out", ad esempio mascherando "almeno la quarta componente dell'indirizzo" IP; gli altri richiedono consenso; "il semplice scrolling non è mai idoneo" a esprimere consenso (https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9677876).

### Analytics

- Le opzioni sono: nessun analytics (il feedback arriva dai tester), analytics lato server dai log, o uno strumento che rispetti le condizioni del Garante per l'assimilazione ai cookie tecnici. Il caso Google Analytics del 2022 riguardava il trasferimento negli USA senza misure supplementari (doc. web 9782890); il quadro è cambiato con la decisione di adeguatezza UE-USA (Decisione di esecuzione (UE) 2023/1795, https://eur-lex.europa.eu/eli/dec_impl/2023/1795/oj) **[NON VERIFICATO]**: non ho letto il testo della decisione in questa sessione.

### Informativa

- Se i dati vengono raccolti presso l'interessato, art. 13(1) chiede identità e contatti del titolare, finalità e base giuridica, legittimi interessi se si usa l'art. 6(1)(f), destinatari, eventuali trasferimenti extra UE; art. 13(2) periodo di conservazione, diritti dell'interessato e altro. Nel caso dei log e delle immagini, i destinatari includono il fornitore di hosting e Scryfall **[DERIVATO]**.
- Ogni immagine caricata da `cards.scryfall.io` è una richiesta del browser del tester a un terzo, con il suo IP e, secondo la Referrer-Policy, l'origine del sito (`packages/web/src/api.ts`, ADR 0001) **[DERIVATO]**. L'informativa di Scryfall è su https://scryfall.com/docs/privacy.

### Il canale di feedback

- Qualunque canale raccoglie dati personali (nome, email, account) e attiva l'art. 13 **[DERIVATO]**. Opzioni e cosa comportano **[DERIVATO]**:
  - GitHub Issues: il repository è privato, quindi i tester dovrebbero essere collaboratori o servirebbe un repository pubblico separato; GitHub diventa destinatario.
  - Modulo di terzi (es. Google Forms): un fornitore in più come responsabile o titolare autonomo, possibile trasferimento extra UE.
  - Email o chat dedicata: semplice, ma i dati finiscono in caselle personali senza conservazione definita.
  - Modulo nell'app con tabella in PostgreSQL: dati sotto controllo diretto, ma aggiunge una scrittura pubblica all'API (anti-automazione ASVS 2.4.1, validazione, conservazione, cancellazione su richiesta).
- Minimizzazione: chiedere solo ciò che serve a rispondere al feedback (art. 5(1)(c)).

### Termini di Scryfall rilevanti

- Limiti di `api.scryfall.com`: `/cards/search`, `/cards/named`, `/cards/random`, `/cards/collection` 2 al secondo; `/cards/manifest` 10 al minuto; altri metodi 10 al secondo. "The direct file origins located at *.scryfall.io do not have rate limits." Un `429` limita l'accesso per 30 secondi; insistere può portare a "a temporary or permanent ban"; "It is not acceptable to ignore HTTP 429 responses"; cache di almeno 24 ore; per molte immagini o nomi "you must use the bulk data files" (https://scryfall.com/docs/api/rate-limits).
- Richieste a `api.scryfall.com` solo in HTTPS con "TLS 1.2 or better"; obbligatori `User-Agent` accurato e `Accept` (https://scryfall.com/docs/api). L'importer li manda (`packages/api/src/scryfall.ts`) **[DERIVATO]**.
- Uso di dati e immagini: niente paywall, niente richiesta di pagamenti, sondaggi o iscrizioni "in exchange for access to Scryfall data", accesso anonimo o con account gratuito; non "repackage, republish, or proxy Scryfall data"; non coprire o tagliare copyright e artista, non alterare le immagini (https://scryfall.com/docs/api). Un muro d'accesso per l'alpha (sezione 7) chiede un login per usare dati Scryfall: è temporaneo e non a pagamento, ma va confrontato con "end-users should be able to access card data anonymously or with free accounts" **[DERIVATO]**.
- CORS e CSP: vedi sezione 3 (https://scryfall.com/docs/api/http-concerns).

## Checklist candidata

Controlli verificabili, raggruppati per area, ognuno con la fonte. Sono candidati per ticket, non decisioni.

### ASVS e documentazione
- [ ] Scegliere il livello obiettivo (L1, o L1 più un sottoinsieme L2) e scrivere la versione su misura di ASVS con i capitoli esclusi (https://github.com/OWASP/ASVS/blob/master/5.0/en/0x03-What-is-the-ASVS.md).
- [ ] Documentare le regole di validazione dell'input per endpoint (ASVS 2.1.1).
- [ ] Documentare le funzioni costose (resolve, suggested-tokens) e le difese (ASVS 15.1.3, 15.2.2).
- [ ] Documentare le comunicazioni esterne: Scryfall API, bulk data, CDN immagini (ASVS 13.1.1).
- [ ] Definire i tempi di rimedio per dipendenze vulnerabili (ASVS 15.1.1).

### API Hono
- [ ] `bodyLimit` sulle route POST, con un test che un body oltre il limite riceve `413` prima del parsing (https://hono.dev/docs/middleware/builtin/body-limit).
- [ ] `app.onError` che restituisce JSON generico senza dettagli interni; test che un errore del DB non espone testo della query (ASVS 16.5.1; https://hono.dev/docs/api/hono).
- [ ] `app.notFound` coerente con le altre risposte JSON (https://hono.dev/docs/api/hono).
- [ ] `timeout` sulle route `/api/*` con eccezione da factory (https://hono.dev/docs/middleware/builtin/timeout).
- [ ] Timeout del server Node impostati in modo esplicito (`requestTimeout`, `headersTimeout`) (https://nodejs.org/api/http.html).
- [ ] Rate limiting per IP con chiave presa da `X-Forwarded-For` impostato da Caddy, non dalla connessione (ASVS 2.4.1, 15.3.4; https://caddyserver.com/docs/caddyfile/directives/reverse_proxy#defaults).
- [ ] Nessun middleware CORS; test che una risposta API non contiene `Access-Control-Allow-Origin` (ASVS 3.4.2).
- [ ] Ogni risposta con body ha `Content-Type` con `charset` (ASVS 4.1.1).

### Caddy
- [ ] HSTS `max-age` ≥ 31536000 su tutte le risposte, solo in produzione (ASVS 3.4.1; https://caddyserver.com/docs/caddyfile/directives/header).
- [ ] `X-Content-Type-Options: nosniff` (ASVS 3.4.4).
- [ ] `Referrer-Policy` esplicita (ASVS 3.4.5; https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html).
- [ ] `Permissions-Policy` che disattiva le funzioni non usate e lascia `web-share=(self)` (https://w3c.github.io/web-share/#permissions-policy).
- [ ] COOP `same-origin` (ASVS 3.4.8); CORP sulle risposte dell'app; nessun COEP finché non serve la cross-origin isolation (https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Embedder-Policy).
- [ ] CSP prima in `Content-Security-Policy-Report-Only`, poi applicata, con `object-src 'none'`, `base-uri 'none'`, `frame-ancestors`, `cards.scryfall.io` in `img-src` e `connect-src`; verificare generazione PDF, dialog Radix e condivisione (ASVS 3.4.3, 3.4.6; https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html; https://scryfall.com/docs/api/http-concerns).
- [ ] Rimuovere l'header `Server` (`header -Server`) (https://caddyserver.com/docs/caddyfile/directives/header).
- [ ] `request_body max_size` su `/api/*` (https://caddyserver.com/docs/caddyfile/directives/request_body).
- [ ] `admin off` o admin API confinata (https://caddyserver.com/docs/caddyfile/options#admin).
- [ ] Un test (curl o script) che verifica gli header su `/`, `/assets/*` e `/api/health` (ASVS 3.4.x).

### PostgreSQL
- [ ] Ruolo proprietario dello schema senza login; ruolo `importer` con scrittura sulle tabelle del catalogo; ruolo `api` con solo `SELECT` (https://www.postgresql.org/docs/18/ddl-priv.html).
- [ ] `ALTER DEFAULT PRIVILEGES FOR ROLE <owner>` per dare `SELECT` all'API sulle tabelle future (https://www.postgresql.org/docs/18/sql-alterdefaultprivileges.html).
- [ ] Migrazioni eseguite da un ruolo diverso da quello dell'API (**[DERIVATO]**, `packages/api/src/server.ts`).
- [ ] `ALTER ROLE api SET statement_timeout` (e `idle_in_transaction_session_timeout`) (https://www.postgresql.org/docs/18/runtime-config-client.html).
- [ ] Test che il ruolo API non può fare `INSERT`, `UPDATE`, `DELETE`, `CREATE`, `DROP`.
- [ ] Nessun fallback `mtg:mtg` in produzione; password da file/segreto (`POSTGRES_PASSWORD_FILE`) (ASVS 13.2.3; https://github.com/docker-library/docs/blob/master/postgres/content.md).
- [ ] Decisione esplicita su TLS tra API e database (ASVS 12.3.1, 12.3.3; https://www.postgresql.org/docs/18/ssl-tcp.html).

### Docker
- [ ] Tutti i servizi con `security_opt: [no-new-privileges]` (https://docs.docker.com/reference/compose-file/services/#security_opt).
- [ ] `cap_drop: [ALL]` e solo le capability necessarie (es. `NET_BIND_SERVICE` per Caddy) (OWASP Docker RULE #3).
- [ ] `read_only: true` con `tmpfs` dove serve scrivere (OWASP RULE #8).
- [ ] `mem_limit`, `pids_limit` e limite CPU per servizio (OWASP RULE #7).
- [ ] Reti separate: `web` non raggiunge `postgres` (OWASP RULE #5; https://docs.docker.com/reference/compose-file/networks/).
- [ ] Utente non root anche per Caddy, se compatibile con le porte (OWASP RULE #2).
- [ ] Rotazione dei log (`max-size`, `max-file`) (https://docs.docker.com/engine/logging/drivers/json-file/).
- [ ] Immagini base fissate per digest (https://docs.docker.com/build/building/best-practices/#pin-base-image-versions).
- [ ] Scansione dell'immagine in CI (Docker Scout o Trivy) (OWASP RULE #9; https://github.com/aquasecurity/trivy).

### GitHub Actions e pnpm
- [ ] `permissions: {}` a livello di workflow, permessi per job (https://docs.zizmor.sh/audits/).
- [ ] `.github/workflows/actions.lock` con `gh actions-lock`, oppure action fissate per SHA (https://docs.github.com/en/actions/concepts/security/workflow-dependency-lockfiles).
- [ ] `persist-credentials: false` sui checkout (https://docs.zizmor.sh/audits/).
- [ ] zizmor in CI senza finding aperti (https://docs.zizmor.sh/audits/).
- [ ] Regole di protezione (revisore) sull'environment `production` (https://docs.github.com/en/actions/reference/security/secure-use).
- [ ] Scansione dei segreti (gitleaks in hook o CI) (https://github.com/gitleaks/gitleaks).
- [ ] `trustPolicy: no-downgrade` in `pnpm-workspace.yaml` (https://pnpm.io/settings/dependency-resolution).
- [ ] Mantenere i default `minimumReleaseAge`, `strictDepBuilds`, `blockExoticSubdeps`; approvare gli script con `allowBuilds` (https://pnpm.io/settings/build).
- [ ] `pnpm audit` e `pnpm audit signatures` in CI (https://pnpm.io/cli/audit).
- [ ] `.github/dependabot.yml` per `npm`, `github-actions`, `docker`, `docker-compose` con `cooldown` (https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference).

### Accesso all'alpha
- [ ] Scegliere il meccanismo (basic_auth, allowlist IP, token d'invito, forward_auth) e applicarlo a tutto il sito, API compresa (sezione 7).
- [ ] Test che una richiesta senza credenziali a `/` e a `/api/cards/search` viene rifiutata.
- [ ] Nessun segreto d'accesso nell'URL dopo il primo scambio (ASVS 14.2.1).
- [ ] Se basic_auth: credenziali assegnate dal gestore, non scelte dai tester (https://www.rfc-editor.org/rfc/rfc7617#section-4).

### Privacy
- [ ] Inventario dei log: cosa contiene un IP, dove, per quanto (ASVS 16.1.1; GDPR art. 5(1)(e)).
- [ ] Access log di Caddy (se attivati) con `ip_mask` o conservazione breve e `roll_keep_for` esplicito (https://caddyserver.com/docs/caddyfile/directives/log).
- [ ] Informativa privacy (art. 13): titolare, finalità, base giuridica (art. 6(1)(f) per la sicurezza), destinatari (hosting, Scryfall, canale di feedback), conservazione, diritti.
- [ ] Nessun cookie o strumento non tecnico senza consenso; se analytics, verificare le condizioni del Garante (https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9677876).
- [ ] Contratto art. 28 con il fornitore di hosting.
- [ ] Procedura di data breach entro 72 ore (art. 33).
- [ ] Canale di feedback scelto con dati minimi e conservazione definita (art. 5(1)(c), art. 13).

### Scryfall
- [ ] L'importer gestisce `429` fermandosi e rispettando i limiti (https://scryfall.com/docs/api/rate-limits).
- [ ] Nessuna chiamata dal browser a `api.scryfall.com`; solo immagini da `*.scryfall.io` (https://scryfall.com/docs/api/rate-limits).
- [ ] Verificare il muro d'accesso dell'alpha contro i termini d'uso dei dati Scryfall (https://scryfall.com/docs/api).
