# Prove automatiche di Bonaccia

Pilotano Chrome senza finestra (protocollo CDP, solo Node 22 o successivo: nessuna dipendenza da installare). Servono Chrome in `C:\Program Files\Google\Chrome\Application` e rete (le recitazioni arrivano dalla CDN MP3Quran).

## Come si lanciano

1. Dentro la cartella del progetto: `python -m http.server 8093 --bind 127.0.0.1` (altra porta: variabile `PORTA_SITO`).
2. In un altro terminale, per ogni prova: `node tools/prove/<nome>.mjs`. Ogni prova stampa `OK` o `FALLITO` e un totale. Gli aiuti usano `Bonaccia.QuranPlayer._debug`, `_debugState` e `_debugSleep` di `js/recitazioni.js`.
3. File temporanei e schermate: `%TEMP%\bonaccia-prove\`.

## Le prove

| File | Cosa verifica | Durata |
|---|---|---|
| `dati_corrotti.mjs` | l'app parte e non va in errore con dati salvati rovinati (tipi sbagliati, JSON rotto, Sure inesistenti, diario incompleto) | 1 min |
| `lettore_barra_timer.mjs` | spinner, barra (trascinamento senza salti, rilascio), tempo rimanente, precedente/successiva, timer con dissolvenza, «Alla fine» | 2 min |
| `lettore_tocchi_rapidi.mjs` | tocchi a raffica, cambio voce e livelli durante il caricamento, mix dell'utente ripristinato, suono già in corso non toccato, «Ripeti» | 2 min |
| `lettore_focus.mjs` | il focus da tastiera non si perde quando la scheda viene ridisegnata | 20 s |
| `voci_e_protezione.mjs` | 5 voci, selezione protetta di Mishary Al-Afasy (elenco, ricerca, riproduzione forzata, precedente/successiva, fine Sura, cambio voce, preferenze salvate), Al-Salimi e Al-Baqarah, salvataggio offline rifiutato oltre 100 MB | 3 min |
| `suoni_e_schede.mjs` | tutte le atmosfere (registrazioni e sintetiche) producono suono senza picchi, schede Suoni, Calma (respiro e 8 esercizi guidati), Sonno («Buonanotte»), Diario, esportazioni, tema | 2 min |
| `schermi.mjs` | nessuno scorrimento orizzontale e lettore dentro la scheda da 320 a 1280 px | 1 min |
| `offline_1_con_rete.mjs` poi `offline_2_senza_rete.mjs` | uso senza rete: la fase 1 installa il service worker e salva una Sura; **poi si ferma il server** e la fase 2 (Chrome con la CDN irraggiungibile) controlla che app, Sura salvata (con salto di posizione), suoni e voce guida funzionino e che un errore di rete non lasci lo stato bloccato | 2 min |

`python tools/test_headless.py` è un controllo rapido (la pagina si disegna e ci sono le 5 voci).

## Da ricordare

- Le prove non sostituiscono l'ascolto né la prova su iPhone: non verificano l'audio che si sente, la schermata di blocco e l'interruttore laterale.
- Se cambi i guadagni del motore, `BG_REF` in `js/recitazioni.js` o le Sure di un recitatore, rilancia `lettore_barra_timer.mjs`, `voci_e_protezione.mjs` e `lettore_tocchi_rapidi.mjs`.
