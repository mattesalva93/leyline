# Ricerca: VPS europeo per l'alpha, con margine per crescere

Data di consultazione: **2026-11-18**. Le affermazioni riportano l'URL della fonte primaria accanto al testo. Le deduzioni mie, compresi i conti con l'IVA e i collegamenti a file del repository, sono marcate **[DERIVATO]**. Ciò che non ho potuto confermare da fonte primaria è marcato **[NON VERIFICATO]**.

Metodo: solo pagine dei fornitori (listini, documentazione, condizioni contrattuali, API pubbliche), lette il 2026-11-18. Il contesto del progetto viene da `compose.yaml`, `Dockerfile`, `docs/deploy.md`, `docs/adr/0012-deploy-over-ssh-off-until-a-vps-is-chosen.md` e `research/ai-deckbuilding.md`. Limiti di questa sessione: le pagine di listino di Scaleway per rete, storage, database e GPU hanno risposto `403` a una richiesta automatica, e lo strumento di lettura web ha esaurito la quota a metà ricerca. I punti rimasti aperti per questo motivo sono marcati **[NON VERIFICATO]**. Questo file raccoglie fatti e opzioni; non decide.

Conversione IVA: chi decide è un privato in Italia, quindi si applica l'IVA italiana del 22%. Dove un listino è IVA esclusa, il prezzo con IVA è `netto × 1,22`, arrotondato al centesimo **[DERIVATO]**. Hetzner, Netcup e Contabo hanno un selettore di paese con l'aliquota italiana al 22% (https://www.hetzner.com/cloud/regular-performance, https://www.netcup.com/en/server/vps, https://contabo.com/en/vps/), e la pagina italiana di OVHcloud mostra già il prezzo con IVA al 22% (3,81 € + IVA = 4,65 € IVA incl., https://www.ovhcloud.com/it/vps/).

## Sintesi

- **Due offerte rispettano tutti i vincoli entro 10 € al mese IVA inclusa:** **OVHcloud VPS-1** (2 vCore, 4 GB, 40 GB NVMe, IPv4, backup giornaliero incluso, 4,65 € IVA incl., https://www.ovhcloud.com/it/vps/) e **Hetzner Cloud CX23** (2 vCPU x86, 4 GB, 40 GB NVMe, 20 TB, IPv4 incluso, 5,99 € + IVA, cioè circa 7,31 €, https://www.hetzner.com/cloud/cost-optimized). Ma Hetzner oggi mostra le offerte Cost-Optimized come "Currently not available" (https://www.hetzner.com/cloud). **Netcup VPS 500 G12.5** ci sta appena con la durata di un mese (circa 9,74 € **[DERIVATO]**), e **Contabo Cloud VPS 4** solo con il prezzo per 24 mesi.
- **Escluse per prezzo:** Hetzner Regular Performance (CPX22, 2 vCPU/4 GB a 16,99 € + IVA, https://www.hetzner.com/cloud/regular-performance), OVHcloud Public Cloud (d2-4 a 11,44 € + IVA, IPv4 a parte, https://www.ovhcloud.com/it/public-cloud/prices/), Scaleway (DEV1-S 2 vCPU/2 GB a circa 6,55 € + IVA, più disco e IPv4, https://www.scaleway.com/en/pricing/virtual-instances/) e IONOS (VPS M+ a 12 € + IVA dopo 3 mesi promozionali, più 10 € di attivazione, https://www.ionos.it/server/vps).
- **Ridimensionamento:** su Hetzner il cambio di tipo richiede il server spento, copia il disco e riavvia. Si può tornare a un piano più piccolo solo se non si è ingrandito il disco (`upgrade_disk: false`) (https://docs.hetzner.cloud/cloud.spec.json, `change_type`). OVHcloud VPS, Netcup e Contabo ammettono solo upgrade in loco: per scendere di piano serve un nuovo server e una migrazione (https://www.ovhcloud.com/it/vps/, https://www.netcup.com/en/helpcenter/documentation/general/instance-upgrade, https://contabo.com/en/vps/).
- **Firewall del fornitore:** Hetzner (gratuito, stateful), Netcup (stateful, nel pannello SCP), Contabo ("Free Firewall") e OVHcloud. Quello di OVHcloud, l'Edge Network Firewall, filtra **solo IPv4** e ha al massimo 20 regole per IP (https://docs.ovhcloud.com/en/guides/bare-metal-cloud/dedicated-servers/firewall-network).
- **Assistente AI futuro:** `research/ai-deckbuilding.md` propone modelli Claude chiamati via Messages API, un validatore deterministico in codice e dati carte locali. Quindi niente GPU né modelli locali sul server. La crescita attesa è modesta: qualche centinaio di MB di RAM per il processo dell'assistente e qualche tabella in più **[DERIVATO]**.

## Cosa serve al server

Fatti dal repository:

- Quattro servizi Compose: `web` (Caddy con la SPA già compilata), `api` (Node), `importer` (Node, import giornaliero) e `postgres` (`postgres:18-alpine`) (`compose.yaml`).
- Le immagini vengono costruite **sull'host** a ogni deploy: "The host builds on every deploy, so it needs the RAM and disk of a `pnpm install` and a Vite build" (ADR 0012).
- Il database pesa circa 182 MB e Postgres usa circa 80 MB di RAM a riposo; l'importer legge in streaming il bulk `all_cards` (circa 384 MB compressi al 2026-11-04, https://scryfall.com/docs/api/bulk-data, citato in `research/ai-deckbuilding.md`).

Deduzioni **[DERIVATO]**:

- **RAM:** a regime l'app sta bene in 2 GB. Il picco viene dalla build sull'host (`pnpm install` più Vite più due `docker build`) mentre i servizi sono accesi, e 2 GB senza swap sono stretti. 4 GB danno margine senza dover aggiungere swap.
- **Disco:** il database pesa poco. Le immagini Node, la cache di build di Docker e i layer vecchi crescono a ogni deploy finché non si esegue `docker builder prune`. 20 GB bastano solo pulendo spesso; 40 GB sono comodi.
- **Traffico:** un'alpha a pochi tester e un download giornaliero da circa 400 MB (circa 12 GB al mese) stanno ben dentro qualunque franchigia vista qui. Le immagini delle carte arrivano da `cards.scryfall.io` direttamente nel browser, non dal server.
- **ARM:** l'host costruisce le proprie immagini (ADR 0012), quindi su un server arm64 Docker scarica le varianti arm64 delle immagini base e compila lì. Non serve un registry multi-arch. Che `node:26.13.0-slim`, `caddy:2.11-alpine` e `postgres:18-alpine` siano pubblicate anche per arm64 è **[NON VERIFICATO]** in questa sessione, e anche le eventuali dipendenze npm con binari nativi andrebbero provate. x86 evita la domanda.

## Crescita per l'assistente AI di deckbuilding

Da `research/ai-deckbuilding.md`:

- L'architettura proposta è un workflow con router (Haiku) e orchestrator (Sonnet) via Messages API con tool use, structured outputs e un "Validatore deterministico (codice, nessun LLM)" (sezioni 3.2–3.5). I modelli girano sull'infrastruttura Anthropic, a pagamento a token (sezione 3.6).
- I dati vengono da "bulk locale / API (cache)", da Commander Spellbook via HTTP e dalle regole complete "CR locali (RAG/grep)" (sezione 3.3). Per la pipeline bastano "Oracle Cards + Oracle Tags + Rulings" (sezione 2.2).
- L'Agent SDK è indicato solo come opzione se servono subagent o tool MCP locali (sezione 3.5).

Crescita probabile del server **[DERIVATO]**:

- **GPU: nessuna.** Il modello non gira sul server. Una GPU servirebbe solo se si cambiasse idea e si ospitasse un modello aperto; per questo caso riporto sotto quali fornitori le hanno.
- **CPU e RAM:** un processo Node in più (o una route in più nell'`api`) che resta in attesa delle risposte del modello. Il lavoro è soprattutto I/O, con qualche centinaio di MB di RAM e la CPU usata dal validatore. Se si usasse l'Agent SDK, che porta il loop di Claude Code e sessioni concorrenti, la RAM crescerebbe con il numero di sessioni aperte. Da misurare.
- **Database:** tabelle per i tag Oracle e i rulings (pochi MB compressi: 5,82 MB e 5,17 MB secondo la sezione 2.2) e forse le sessioni di chat. `pg_trgm` copre già la ricerca per nome. **pgvector non è richiesto** dalla proposta, che parla di "RAG/grep" sulle regole: servirebbe solo se si sceglie la ricerca semantica, e allora con un servizio di embedding esterno o un piccolo modello di embedding su CPU.
- **Rete:** chiamate in uscita verso `api.anthropic.com` e Commander Spellbook. Il firewall del fornitore deve permettere il traffico in uscita (vedi Netcup: una regola EGRESS fa scattare un DROP di default).
- **In sintesi:** passare da 4 GB a 8 GB di RAM e restare su 2–4 vCPU dovrebbe bastare anche con l'assistente. Il costo che cresce davvero sono i token, non il server.

## Hetzner Cloud

Fonti: https://www.hetzner.com/cloud, https://www.hetzner.com/cloud/cost-optimized, https://www.hetzner.com/cloud/regular-performance, https://www.hetzner.com/cloud/general-purpose, documentazione https://docs.hetzner.com e API https://docs.hetzner.cloud.

**Disponibilità.** La pagina panoramica mostra "Shared Resources Currently not available … Cost-Optimized … starting from € 5.99 per month, excl. VAT" (https://www.hetzner.com/cloud). Le schede dei singoli piani contengono la frase "This product is currently unavailable. Please check back later." anche per piani di altre famiglie. Se sia un testo statico o lo stato reale per sede è **[NON VERIFICATO]**: va controllato nella Console.

**Prezzi (IVA esclusa, "Price incl. IPv4", 20 TB di traffico in UE):**

| Piano | Arch. | vCPU / RAM / disco | €/mese | €/ora | Con IVA 22% **[DERIVATO]** | Sedi | Fonte |
|---|---|---|---|---|---|---|---|
| CX23 | x86 (Intel/AMD) | 2 / 4 GB / 40 GB NVMe | 5,99 | 0,0096 | 7,31 | NBG1, HEL1 | https://www.hetzner.com/cloud/cost-optimized |
| CAX11 | Arm (Ampere) | 2 / 4 GB / 40 GB | 6,49 | 0,0104 | 7,92 | NBG1, HEL1 | idem |
| CX33 | x86 | 4 / 8 GB / 80 GB | 8,99 | 0,0144 | 10,97 | NBG1, HEL1 | idem |
| CX43 | x86 | 8 / 16 GB / 160 GB | 16,49 | 0,0264 | 20,12 | NBG1, HEL1 | idem |
| CPX22 | AMD | 2 / 4 GB / 80 GB | 16,99 (HEL1), 19,99 (NBG1) | 0,0272 | 20,73 | HEL1, NBG1 | https://www.hetzner.com/cloud/regular-performance |
| CPX12 | AMD | **1** / 2 GB / 40 GB | 9,99 (HEL1), 11,99 | 0,0160 | 12,19 | | idem |
| CCX13 (vCPU dedicate) | AMD | 2 / 8 GB / 80 GB | 36,99 | 0,0593 | 45,13 | | https://www.hetzner.com/cloud/general-purpose |

- **Fatturazione:** oraria con tetto mensile: "Your server's bill will never exceed its monthly price cap." Le ore si arrotondano per eccesso, e un server spento si paga finché esiste (https://docs.hetzner.com/cloud/billing/faq/). Nessun vincolo di durata minima è dichiarato nelle pagine lette. Traffico oltre i 20 TB: 1,00 € + IVA per TB.
- **Aumento prezzi del 15 giugno 2026:** riguarda i piani cloud per i nuovi ordini **e i rescale** dei server esistenti; IP, volumi e snapshot sono esclusi (https://www.hetzner.com/pressroom/standardization-and-price-adjustment-of-our-server-products/).
- **IPv4:** Primary IPv4 a 0,50 € + IVA al mese, IPv6 gratis, fatturati a parte rispetto al server (https://docs.hetzner.com/general/infrastructure-and-availability/ipv4-pricing/, https://docs.hetzner.com/cloud/billing/faq/). I listini dei server dicono però "Price incl. IPv4". Come questi due dati si combinino in fattura è **[NON VERIFICATO]**.
- **Snapshot:** 0,0143 € + IVA per GB al mese, sullo spazio compresso. **Backup:** 20% del prezzo del server, con 7 slot (https://www.hetzner.com/cloud/cost-optimized, https://docs.hetzner.com/cloud/billing/faq/). Per CX23: circa 1,20 € + IVA **[DERIVATO]**.
- **Firewall:** "stateful firewalls … without additional costs", assegnabili a più server; reti private incluse (https://www.hetzner.com/cloud).
- **Ridimensionamento:** "Server must be powered off for this command to succeed. This copies the content of its disk, and starts it again. … If the disk gets upgraded, the Server type can not be downgraded any more. If you plan to downgrade the Server type, set `upgrade_disk` to `false`." (https://docs.hetzner.cloud/cloud.spec.json, `POST /servers/{id}/actions/change_type`). Si resta nella stessa architettura, cioè x86 o Arm; si può passare tra vCPU condivise e dedicate; dopo aver ingrandito il disco la partizione va estesa a mano (https://docs.hetzner.com/cloud/servers/faq/).
- **Volumi:** da 10 GB a 10 TB, ingrandibili "while it is in use, with no downtime", mai rimpiccioliti; solo per server cloud (https://docs.hetzner.com/cloud/volumes/faq/). Prezzo per GB **[NON VERIFICATO]**: la pagina indicata dalla documentazione restituisce 404.
- **Crescita oltre il VPS:** reti private, load balancer, object storage (https://www.hetzner.com/cloud). Nelle pagine lette non c'è un Postgres gestito **[NON VERIFICATO]**. Le GPU esistono solo come server dedicati ("GPU-Line", es. GEX131, https://www.hetzner.com/dedicated-rootserver/gex131/), non come istanze cloud.
- **DPA:** contratto standard ex art. 28, concluso nel pannello dell'account (accounts.hetzner.com/account/dpa) con una checkbox, senza contratti individuali. Non è automatico: "This contract for processing orders is not concluded automatically" (https://docs.hetzner.com/general/company-and-policy/data-protection-at-hetzner/, https://www.hetzner.com/legal/terms-and-conditions/).
- **Sedi UE:** Falkenstein, Norimberga (DE) e Helsinki (FI) (https://www.hetzner.com/cloud).

## OVHcloud VPS (gamma 2027)

Fonte principale: https://www.ovhcloud.com/it/vps/. La gamma VPS 2027 è disponibile per i nuovi ordini dal post del 17/06/2026 (https://blog.ovhcloud.com/en/posts/vps-2027/).

| Piano | vCore / RAM / disco | Banda pubblica | € + IVA/mese | IVA incl. (dalla pagina) |
|---|---|---|---|---|
| VPS-1 | 2 / 4 GB / 40 GB NVMe | 500 Mbps | 3,81 | 4,65 |
| VPS-2 | 4 / 8 GB / 75 GB | 1 Gbps | 7,21 | 8,80 |
| VPS-3 | 6 / 12 GB / 100 GB | 2 Gbps | 10,40 | 12,69 |
| VPS-4 | 8 / 24 GB / 200 GB | 3 Gbps | 19,96 | 24,35 |

- **Incluso:** traffico illimitato, IPv4 dedicato, IPv6, anti-DDoS, un backup giornaliero (delle 24 ore precedenti), SLA 99,9% (https://www.ovhcloud.com/it/vps/).
- **Prezzo e durata:** i prezzi sono "Da …". Se valgano senza impegno o richiedano un impegno, e se ci siano costi di attivazione, è **[NON VERIFICATO]**: la pagina parla di impegno di 6 e 12 mesi solo per la promozione sui backup. Per confronto, con la gamma precedente OVHcloud vendeva sia a mese sia con prepagamento di 6 e 12 mesi (https://blog.ovhcloud.com/en/posts/pricing-evolution-of-public-cloud-bare-metal-and-vps-at-ovhcloud/). Va controllato nel configuratore.
- **Snapshot e backup:** Snapshot "Da 0,30 €", backup Premium con 7 giorni "Da 1,10 €", entrambi gratis per 1, 2 o 3 mesi a seconda dell'impegno (https://www.ovhcloud.com/it/vps/). IVA inclusa o esclusa in quelle due cifre: **[NON VERIFICATO]**.
- **Firewall:** l'Edge Network Firewall vale anche per i VPS. Ha al massimo 20 regole per IP e "this feature is only available for IPv4 addresses"; si attiva da solo durante un attacco DDoS (https://docs.ovhcloud.com/en/guides/bare-metal-cloud/dedicated-servers/firewall-network). Se l'host pubblica anche su IPv6, quel traffico resta coperto solo dal firewall del sistema operativo **[DERIVATO]**. Costo **[NON VERIFICATO]**: la guida non lo dice.
- **Ridimensionamento:** "Aumenta istantaneamente le risorse del tuo VPS, senza interruzioni né migrazioni di dati", se c'è capacità nello stesso datacenter. "Per cambiare verso una configurazione inferiore (downgrade) è invece necessario sottoscrivere un nuovo piano, trasferire i dati e poi disattivare il servizio precedente" (https://www.ovhcloud.com/it/vps/, FAQ). RAM e vCore si adeguano da soli, ma lo spazio su disco va ripartizionato a mano in rescue mode, con rischio di perdita dati (https://help.ovhcloud.com/csm/asia-vps-repartitioning-vps-after-upgrade?id=kb_article_view&sysparm_article=KB0047725). Un VPS non può cambiare sede (https://docs.ovhcloud.com/en/guides/bare-metal-cloud/virtual-private-servers/vps-faq). Se l'upgrade riavvii il server è **[NON VERIFICATO]**.
- **Crescita oltre il VPS:** la pagina VPS elenca come opzioni database gestiti, load balancer, IP aggiuntivi e storage esterno (https://www.ovhcloud.com/it/vps/). Public Cloud ha istanze GPU, per esempio `l4-90` (1× L4 24 GB) a 0,75 € + IVA l'ora (https://www.ovhcloud.com/it/public-cloud/prices/). Se un VPS possa entrare nella rete privata vRack con istanze Public Cloud è **[NON VERIFICATO]**.
- **Architettura:** x86. Nessuna offerta ARM vista nella pagina VPS **[NON VERIFICATO]**.
- **Sedi:** la pagina ha una sezione "Localizzazioni" caricata dinamicamente: quali datacenter UE offrano VPS 2027 è **[NON VERIFICATO]**.
- **DPA:** "Contratto per il trattamento dei dati" in PDF tra i contratti generali: https://contract.eu.ovhapis.com/1.0/pdf/OVH_Data_Protection_Agreement-it.pdf (elencato in https://www.ovhcloud.com/it/terms-and-conditions/contracts/). La FAQ GDPR dice: "This document is provided as an attachment to our contracts" (https://www.ovhcloud.com/en-gb/personal-data-protection/faq/).

## OVHcloud Public Cloud

Fonte: https://www.ovhcloud.com/it/public-cloud/prices/ (prezzi IVA esclusa).

| Istanza | vCore / RAM / disco | €/ora | €/mese | IVA incl. **[DERIVATO]** |
|---|---|---|---|---|
| d2-2 | **1** / 2 GB / 25 GB | 0,0104 | 5,71 | 6,97 |
| d2-4 | 2 / 4 GB / 50 GB | 0,0206 | 11,44 | 13,96 |
| d2-8 | 4 / 8 GB / 50 GB | 0,0372 | 20,60 | 25,13 |
| b3-8 | 2 / 8 GB | 0,0512 | 31,77 (piano 12 mesi) | |

- La pagina dice che le istanze "non includono un indirizzo IPv4 di default", e che l'IPv4 pubblico è un'opzione a pagamento con il prezzo visibile nel pannello. Le d2 sono descritte come "ideali per test, sviluppo e ambienti sandbox".
- Snapshot dei volumi: circa 0,04307 € + IVA per GB al mese.
- **Fuori budget:** la prima istanza con 2 vCore costa 13,96 € IVA inclusa, prima dell'IPv4 **[DERIVATO]**. Resta però il percorso naturale di crescita dentro OVHcloud: istanze grandi, PostgreSQL gestito, GPU e vRack.

## Scaleway

Fonte: https://www.scaleway.com/en/pricing/virtual-instances/ ("Prices before tax"; "List prices include egress and IPv6 addresses. Storage (local, block) and attached public IPv4 addresses are excluded.").

| Istanza | Arch. | vCPU / RAM | €/ora | ~€/mese |
|---|---|---|---|---|
| STARDUST1-S | x86 | 1 / 1 GB | 0,0006 | 0,43 |
| DEV1-S | x86 | 2 / 2 GB | 0,00898 | 6,55 |
| DEV1-M | x86 | 3 / 4 GB | 0,0202 | 14,74 |
| BASIC2-A2C-4G | arm64 | 2 / 4 GB | 0,023 | 16,79 |
| PLAY2-NANO | x86 | 2 / 4 GB | 0,02754 | 20,10 |
| BASIC3-X2C-4G | x86 | 2 / 4 GB | 0,03945 | 28,79 |

- **Disco a parte:** Block Storage "Volume Low Latency 5K" a circa 0,0949 € al GB al mese, cioè circa 1,90 € per 20 GB; snapshot a circa 0,0358 € al GB al mese. Sono dati dal catalogo incluso nella stessa pagina, zona `fr-par-1`.
- **IPv4:** escluso dal prezzo. Il costo dell'IPv4 per le istanze è **[NON VERIFICATO]**: la pagina di rete ha risposto 403. L'IPv4 dei server bare metal è indicato a 0,005 € l'ora, circa 3,65 € al mese.
- **Conto DEV1-S:** 6,55 + 1,90 più l'IPv4 fa almeno 8,45 € + IVA, cioè almeno 10,31 € **[DERIVATO]**. Supera il budget, e ha solo 2 GB.
- **Zone UE:** il catalogo nomina `fr-par-1/2/3`, `nl-ams-1/2/3`, `pl-waw-1/2/3` e `it-mil-1/2/3`. DEV1-S compare solo nelle zone di Parigi, Amsterdam e Varsavia.
- **PostgreSQL gestito:** il nodo `db-dev-s` costa circa 9,93 € + IVA al mese a Parigi (catalogo nella stessa pagina).
- **Ridimensionamento, firewall (security group), GPU, DPA:** **[NON VERIFICATO]**. Le pagine relative non erano leggibili in questa sessione.

## Netcup

Fonti: https://www.netcup.com/en/server/vps, https://www.netcup.com/en/server/vps/vps-1000-g12.5-iv-24m-eu, help center https://www.netcup.com/en/helpcenter/documentation/.

I prezzi mostrati includono l'IVA tedesca al 19%. Il netto è il lordo diviso 1,19, e il prezzo italiano è il netto per 1,22 **[DERIVATO]**.

| Piano (x86, G12.5) | vCore / RAM / disco | 12 mesi (DE 19%) | Prezzo barrato (DE 19%) | 1 mese con IVA IT **[DERIVATO]** |
|---|---|---|---|---|
| VPS 500 | 2 / 4 GB / 64 GB SSD | 8,26 | 9,50 | circa 9,74 |
| VPS 1000 | 4 / 8 GB / 128 GB | 14,50 | 16,68 | circa 17,10 |
| VPS 2000 | 8 / 16 GB / 256 GB | 26,92 | 30,96 | circa 31,74 |

- **Durata:** "Choose between a minimum contract term of one, twelve, or 24 months"; sconti del 13% a 12 mesi e del 26% a 24. Il prezzo barrato vale come canone a 1 mese, perché 9,50 × 0,87 ≈ 8,26 **[DERIVATO]**. Lo stesso listino esiste per ARM64 (VPS 500 ARM G12.5: 2 vCore, 4 GB, 64 GB NVMe, stessi prezzi) (https://www.netcup.com/en/server/arm-server). Niente fatturazione oraria.
- **Costi:** attivazione 0,00 €. Con "No preference Europe" la sede è scelta da netcup tra AT, DE e NL. Scegliere una sede precisa costa di più: +1,86 € sul VPS 1000. Togliere l'IPv4 fa risparmiare 0,60 € (https://www.netcup.com/en/server/vps/vps-1000-g12.5-iv-24m-eu).
- **Traffico:** illimitato, ma "If the average network traffic of the last 24 hours exceeds 2 TB, a temporary throttling to 200 Mbps is applied" (stessa pagina).
- **Snapshot** (copy-on-write) inclusi (stessa pagina).
- **Firewall:** stateful nel Server Control Panel. Le regole si applicano subito, senza riavvio. Se si crea una regola EGRESS, il default in uscita diventa DROP. Non copre il Cloud vLAN (https://www.netcup.com/en/helpcenter/documentation/server/firewall, aggiornato al 23 luglio 2026).
- **Ridimensionamento:** upgrade solo nella stessa generazione e fascia, dal Customer Control Panel. "After an upgrade, a vServer will be restarted." Lo spazio disco nuovo va integrato a mano. Niente downgrade: "cancel your plan and place a new order". Niente cambio di sede (https://www.netcup.com/en/helpcenter/documentation/general/instance-upgrade). Si aggiunge spazio con Local Block Storage fino a 8 TB, a 0,012 € al GB (https://www.netcup.com/en/server/vps). Rete privata tramite Cloud vLAN (indice del help center).
- **Crescita oltre il VPS:** root server con core dedicati (RS 500 G12.5: 2 core dedicati, 4 GB, 12,93 € DE a 12 mesi, https://www.netcup.com/en/server/root-server) e vGPU (RS 2000 vGPU 7 con NVIDIA H200, da 121,77 € DE al mese, oggi "SOLD OUT", https://www.netcup.com/en/server/vgpu). Nessun Postgres gestito visto **[NON VERIFICATO]**.
- **DPA:** si genera gratis nel Customer Control Panel (Master Data > Order Processing), con firma elettronica, sul modello di netcup e senza personalizzazioni (https://www.netcup.com/en/helpcenter/documentation/general/dpa).

## Contabo

Fonte: https://contabo.com/en/vps/ (Core VPS).

| Piano | vCPU / RAM / disco | Snapshot | Porta | IVA esclusa (prezzo a 24 mesi) | Con IVA 22% **[DERIVATO]** |
|---|---|---|---|---|---|
| Cloud VPS 4 | 4 / 8 GB / 100 GB SSD | 1 | 200 Mbit/s | 4,40 | 5,37 |
| Cloud VPS 6 | 6 / 12 GB / 200 GB SSD o 100 GB NVMe | 2 | 300 Mbit/s | 6,00 | 7,32 |
| Cloud VPS 8 | 8 vCPU (**[NON VERIFICATO]**) | 3 | 600 Mbit/s | 11,20 | 13,66 |

- **Prezzo e durata:** "The price displayed is the effective monthly rate for a 24-month subscription including applicable taxes. Minimum initial contract length: 1 month". La tabella aggiunge "for the first 24 months". "A one-time setup fee applies to new Cloud VPS 4 instances (monthly contracts only)." Il canone mensile senza impegno, l'importo del setup e il prezzo dopo i primi 24 mesi sono **[NON VERIFICATO]**.
- **Traffico:** in ingresso illimitato; in uscita illimitato con fair use e possibile throttling.
- **Inclusi:** "DDoS protection, Firewall, dedicated IPv4 and IPv6"; backup automatico come add-on a pagamento.
- **Ridimensionamento:** "scale RAM, vCores, and storage in place from the Customer Control Panel without rebuilding the server". Il passaggio alla linea Performance VPS invece "is a one-time move, not an in-place upgrade". Downgrade, riavvio durante l'upgrade, GPU e database gestiti: **[NON VERIFICATO]**.
- **DPA:** le condizioni generali prevedono il ruolo di processor ex art. 28 "insofar as an agreement on data processing on behalf a controller is concluded", insieme all'opzione delle clausole contrattuali standard UE (https://contabo.com/en/legal/terms-and-conditions/). Dove si stipula: **[NON VERIFICATO]**.
- **Sedi UE:** l'elenco delle sedi non era leggibile nella pagina scaricata **[NON VERIFICATO]**.

## IONOS

Fonte: https://www.ionos.it/server/vps (IVA esclusa).

| Piano | vCore / RAM / disco | Primi 3 mesi | Prezzo pieno | Attivazione |
|---|---|---|---|---|
| VPS S+ | **1** / 2 GB / 60 GB NVMe | 2 € | 5 € | 10 € |
| VPS M+ | 2 / 4 GB / 120 GB | 4 € | 12 € | 10 € |
| VPS L+ | 4 / 8 GB / 240 GB | 7 € | 22 € | 10 € |

- Traffico illimitato fino a 1 Gbit/s, firewall configurabile, immagini del server (snapshot), dual stack IPv4/IPv6, rimborso entro 30 giorni.
- Sedi dei datacenter: "Germania, Spagna, Gran Bretagna o Stati Uniti".
- **Fuori budget:** VPS M+ costa 12 € + IVA (14,64 €) dopo la promozione, più 10 € di attivazione **[DERIVATO]**. VPS S+ ha un solo vCore.
- Durata minima, ridimensionamento e DPA: **[NON VERIFICATO]**. Non approfonditi, visto che il prezzo esclude l'offerta.

## Confronto

Prezzi in €/mese per il piano più piccolo che rispetta 2 vCPU, 2 GB, 20 GB e IPv4. "IVA IT" è **[DERIVATO]** dove il listino è IVA esclusa.

| | Hetzner CX23 | OVHcloud VPS-1 | Netcup VPS 500 | Contabo Cloud VPS 4 | Scaleway DEV1-S | OVH Public d2-4 | IONOS VPS M+ |
|---|---|---|---|---|---|---|---|
| vCPU / RAM / disco | 2 / 4 GB / 40 GB | 2 / 4 GB / 40 GB | 2 / 4 GB / 64 GB | 4 / 8 GB / 100 GB | 2 / 2 GB / volume a parte | 2 / 4 GB / 50 GB | 2 / 4 GB / 120 GB |
| Arch. | x86 (Arm: CAX11) | x86 | x86 (anche ARM64) | x86 **[NON VERIFICATO]** | x86 | x86 | x86 **[NON VERIFICATO]** |
| Prezzo con IVA IT | 7,31 | 4,65 | circa 9,74 (1 mese); circa 8,47 (12 mesi) | 5,37 (24 mesi) | almeno 10,31 + IPv4 | 13,96 + IPv4 | 14,64 dopo 3 mesi |
| ≤ 10 € | sì | sì | sì, al limite | solo a 24 mesi | no | no | no |
| Fatturazione | oraria con tetto | mensile ("Da", impegno **[NON VERIFICATO]**) | 1/12/24 mesi | da 1 mese, setup sul mensile | oraria | oraria | mensile, promo 3 mesi |
| Disponibile oggi | **"Currently not available"** | sì | sì (possibile ritardo) | sì | sì | sì | sì |
| IPv4 | incluso | incluso | incluso | incluso | a pagamento | a pagamento | incluso |
| Traffico | 20 TB | illimitato | illimitato, throttling oltre 2 TB/24 h | illimitato, fair use | egress incluso | **[NON VERIFICATO]** | illimitato |
| Firewall del fornitore | sì, gratis | sì, solo IPv4, 20 regole | sì | sì | **[NON VERIFICATO]** | sì (security group) | sì |
| Snapshot | 0,0143 €/GB + IVA | da 0,30 € | inclusi | 1 incluso | ~0,036 €/GB | ~0,043 €/GB | inclusi (immagini) |
| Backup | 20% del server | giornaliero incluso | **[NON VERIFICATO]** | add-on | **[NON VERIFICATO]** | a pagamento | **[NON VERIFICATO]** |
| Resize in loco | sì, a server spento; downgrade solo senza disco ingrandito | upgrade senza interruzione dichiarata; niente downgrade | upgrade con riavvio; niente downgrade | upgrade in loco; downgrade **[NON VERIFICATO]** | **[NON VERIFICATO]** | sì (OpenStack) **[NON VERIFICATO]** | **[NON VERIFICATO]** |
| Gradini successivi (IVA IT) | CX33 10,97; CX43 20,12 | VPS-2 8,80; VPS-3 12,69 | VPS 1000 ~17,10; VPS 2000 ~31,74 | VPS 6 7,32; VPS 8 13,66 | DEV1-M ~17,98 + extra | d2-8 25,13 | L+ 26,84 |
| Volumi / rete privata | sì / sì | storage esterno / **[NON VERIFICATO]** | Local Block Storage / Cloud vLAN | storage extra / **[NON VERIFICATO]** | sì / sì | sì / vRack | **[NON VERIFICATO]** |
| DB gestito | **[NON VERIFICATO]** (non visto) | sì | no (non visto) | **[NON VERIFICATO]** | sì (da ~9,93 + IVA) | sì | **[NON VERIFICATO]** |
| GPU dallo stesso fornitore | dedicati (GEX) | Public Cloud (L4 da 0,75 €/h) | vGPU H200 (esaurita) | **[NON VERIFICATO]** | **[NON VERIFICATO]** | sì | sì (server GPU) |
| DPA art. 28 | checkbox nel pannello | PDF allegato ai contratti | generato nel CCP | previsto dalle condizioni | **[NON VERIFICATO]** | come VPS | **[NON VERIFICATO]** |

## Raccomandazione candidata

1. **OVHcloud VPS-1, con VPS-2 come primo gradino.** Costa 4,65 € IVA inclusa (8,80 € il VPS-2) e il listino italiano mostra già l'IVA al 22%. Ha 4 GB e 2 vCore, IPv4, traffico illimitato e un backup giornaliero incluso. Il DPA è un PDF pubblico allegato ai contratti. L'upgrade è in loco, e dentro lo stesso fornitore c'è tutto il percorso di crescita: Public Cloud, PostgreSQL gestito, GPU. I contro sono tre. Il downgrade richiede una migrazione. L'Edge Network Firewall copre solo IPv4, quindi conviene non pubblicare un record AAAA, il che va d'accordo con la nota di `docs/deploy.md` su `PUBLISH_ADDRESS=0.0.0.0`. Infine dopo un upgrade il disco va ripartizionato a mano **[DERIVATO]**.
2. **Hetzner Cloud CX23, con CX33 come primo gradino, se è ordinabile.** Costa circa 7,31 € IVA inclusa (CX33 circa 10,97 €). Ha la fatturazione oraria, il firewall gratuito che copre anche IPv6, le reti private e i volumi ingrandibili senza fermo. È l'unico, tra quelli verificati, che permette di tornare a un piano più piccolo, purché non si ingrandisca il disco. Il rescale vuole il server spento, ma per un'alpha pochi minuti di fermo sono accettabili **[DERIVATO]**. Il contro decisivo: oggi Hetzner segna i Cost-Optimized come non disponibili, e l'alternativa Regular Performance (CPX22 a circa 20,73 €) esce dal budget.

Riserva: **Netcup VPS 500 G12.5** (circa 9,74 € al mese con la durata mensile, oppure circa 8,47 € con 12 mesi). Ha firewall, snapshot inclusi, DPA e un'opzione ARM64. È al limite del budget, non ha downgrade, l'upgrade fa riavviare il server e manca un database gestito.

## Domande aperte

- **Impegno:** OVHcloud VPS-1 a 3,81 € + IVA richiede un impegno, o è il prezzo senza vincoli? Ci sono costi di attivazione? Va controllato nel configuratore prima di ordinare.
- **Disponibilità Hetzner:** CX23 o CX33 sono ordinabili oggi a Norimberga o Helsinki? Se no, conviene aspettare o passare a OVHcloud?
- **Sede del datacenter:** l'owner vuole una sede precisa (per esempio vicina all'Italia, o in Germania) o basta "UE"? Netcup fa pagare la sede scelta; per OVHcloud VPS 2027 l'elenco delle sedi va verificato.
- **IPv6:** l'alpha pubblica solo IPv4? È più semplice con l'Edge Network Firewall di OVHcloud e con la nota su Let's Encrypt in `docs/deploy.md`.
- **Build sull'host:** con 4 GB la build di ADR 0012 sull'host è accettabile? Oppure si mette subito swap, o si sceglie un piano da 8 GB (OVHcloud VPS-2, Hetzner CX33)? Va misurato il picco di RAM di `docker compose up --build` in staging.
- **Backup oltre lo snapshot:** basta il backup giornaliero incluso (OVHcloud) o lo snapshot manuale, o serve anche un `pg_dump` esterno, per esempio su object storage dello stesso fornitore?
- **ARM:** l'owner vuole tenere aperta l'opzione ARM (Hetzner CAX, Netcup ARM64)? Prima andrebbe provata la build arm64 delle tre immagini base e delle dipendenze native.
- **Assistente AI:** confermata l'architettura con LLM ospitato via API, non serve una GPU sul server. Se invece si valutassero modelli aperti ospitati in proprio, la scelta del fornitore cambierebbe: GPU su OVHcloud Public Cloud, su Hetzner dedicati GEX o su Netcup vGPU.
- **Scaleway e Contabo:** vale la pena verificare a mano le pagine che qui non erano leggibili (IPv4, firewall, ridimensionamento e DPA di Scaleway; canone mensile e costo di setup di Contabo)? Oggi nessuno dei due batte le prime due opzioni.
