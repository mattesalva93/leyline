# Ricerca: condividere il PDF con la Web Share API

Data di consultazione: **2026-11-11**. Le affermazioni riportano l'URL della fonte primaria accanto al testo. Le deduzioni mie sono marcate **[DERIVATO]**.

## Sintesi

- `navigator.share({ files })` apre il menu di condivisione nativo, ma solo con una _transient activation_: senza, la promessa viene rifiutata con `NotAllowedError` e l'activation viene consumata dalla chiamata (https://w3c.github.io/web-share/, algoritmo di `share()`, passi 6 e 7).
- La durata della transient activation la sceglie il browser; la specifica HTML dice che "is expected be at most a few seconds" (https://html.spec.whatwg.org/multipage/interaction.html#transient-activation-duration).
- Creare il PDF richiede di scaricare un'immagine per ogni stampa del foglio: su un mazzo intero richiede più di qualche secondo, quindi `share()` chiamato alla fine della generazione arriverebbe fuori dalla finestra del tocco **[DERIVATO]**.
- `navigator.canShare()` non richiede transient activation e risponde `false` se il browser non sa condividere file (https://w3c.github.io/web-share/, algoritmo di `canShare()` e "validate share data", passo 3).
- Errori di `share()`: `AbortError` se l'utente chiude il menu, `InvalidStateError` se un'altra condivisione è in corso, `NotAllowedError` senza activation o per sicurezza, `TypeError` se i file non sono supportati, `DataError` se il destinatario fallisce (https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share).

## Supporto della condivisione di file

Da `api.Navigator.share.data_files_parameter` in https://github.com/mdn/browser-compat-data (`api/Navigator.json`, ramo `main`):

| Browser          | File condivisibili da |
| ---------------- | --------------------- |
| Chrome desktop   | 89 (`share()` completo su tutti i sistemi solo da 128; prima solo ChromeOS e Windows) |
| Chrome Android   | 76                    |
| Edge             | 81 (`share()` su tutti i sistemi da 93) |
| Safari macOS/iOS | 14                    |
| Samsung Internet | 11.0                  |
| Firefox desktop  | no (`share()` solo dietro `dom.webshare.enabled`) |
| Firefox Android  | no (`share()` sì, da 79, ma senza file) |
| WebView Android  | no                    |

Anche i browser desktop condividono file: il supporto della funzione da solo non distingue un telefono da un computer **[DERIVATO]**.
