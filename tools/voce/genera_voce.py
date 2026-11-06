"""genera_voce.py - voce guida di Bonaccia, con la stessa voce e la stessa lavorazione di Sofia.

Riusa, senza modificarli, gli strumenti del gioco GET Through (C:\\Users\\df\\.config\\agy-strumenti):
  - voce_sofia: voce «Vindemiatrix», testo preparato per la voce, controllo della durata con nuovi
    tentativi (Gemini TTS a volte salta mezza frase);
  - elabora_voce_sofia: lavorazione «B» (voce un poco più bassa, 9% più lenta, più calda, più morbida).
Gli script originali accettano solo cartelle dentro game\\audio dei giochi, quindi qui si importano le
funzioni e si scrive nella cartella di Bonaccia.

Uso (dalla cartella del progetto):   python -u tools\\voce\\genera_voce.py [nome_frase ...]

Legge   tools\\voce\\frasi.json   (esportato da js\\content.js: una riga per passo di ogni esercizio)
Scrive  tools\\voce\\grezzo\\*.ogg (originali), tools\\voce\\elaborato\\*.ogg (voce lavorata),
        audio\\voce\\*.mp3 (per il sito: l'OGG non si legge su Safari) e audio\\voce\\manifest.json.
Rilanciarlo rigenera solo le frasi nuove o cambiate (registro.json). Con dei nomi sul comando, solo quelle.
"""
import hashlib
import json
import os
import subprocess
import sys
import time

sys.path.insert(0, r"C:\Users\df\.config\agy-strumenti")
sys.path.insert(0, r"C:\Users\df\.config\gemini")
import elabora_voce_sofia as ev  # noqa: E402
import gemini_pool  # noqa: E402
import voce_sofia as vs  # noqa: E402

BASE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
VOCE_DIR = os.path.join(BASE, "tools", "voce")
GREZZO = os.path.join(VOCE_DIR, "grezzo")
ELAB = os.path.join(VOCE_DIR, "elaborato")
WEB = os.path.join(BASE, "audio", "voce")
REG = os.path.join(VOCE_DIR, "registro.json")


def sha(s):
    return hashlib.sha1(s.encode("utf-8")).hexdigest()


def main():
    for d in (GREZZO, ELAB, WEB):
        os.makedirs(d, exist_ok=True)
    with open(os.path.join(VOCE_DIR, "frasi.json"), encoding="utf-8") as f:
        frasi = json.load(f)
    solo = set(sys.argv[1:])
    registro = {}
    if os.path.exists(REG):
        with open(REG, encoding="utf-8") as f:
            registro = json.load(f)

    fatte = saltate = 0
    falliti, dubbi = [], []
    t0 = time.time()
    for n, fr in enumerate(frasi, 1):
        nome, testo = fr["name"], fr["text"]
        if solo and nome not in solo:
            continue
        impronta = sha(testo + "|" + vs.VOCE + "|" + ev.VERSIONE)
        mp3 = os.path.join(WEB, nome + ".mp3")
        if registro.get(nome, {}).get("h") == impronta and os.path.exists(mp3):
            saltate += 1
            continue
        raw = os.path.join(GREZZO, nome + ".ogg")
        tmp = os.path.join(GREZZO, nome + ".nuova.ogg")
        elab = os.path.join(ELAB, nome + ".ogg")
        try:
            sec = None
            for t in range(1, vs.TENTATIVI + 1):
                try:
                    gemini_pool.synthesize_speech(vs.per_la_voce(testo), tmp, voice_name=vs.VOCE)
                except Exception as e:  # a volte Gemini risponde senza audio: si riprova
                    if t == vs.TENTATIVI and sec is None:
                        raise
                    print(f"RIFO {nome}  errore al tentativo {t}: {str(e)[:120]}", flush=True)
                    continue
                sec = vs.durata(tmp)
                if vs.giusta(testo, sec):
                    break
                print(f"RIFO {nome}  {sec:.1f} s per {len(testo)} caratteri (tentativo {t})", flush=True)
            else:
                dubbi.append(nome)
            os.replace(tmp, raw)
            prima, dopo = ev.elabora(raw, elab)
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", elab, "-ac", "1", "-ar", "44100",
                            "-c:a", "libmp3lame", "-b:a", "56k", mp3], check=True, capture_output=True)
            registro[nome] = {"h": impronta, "d": round(vs.durata(mp3), 2)}
            with open(REG, "w", encoding="utf-8") as f:
                json.dump(registro, f, indent=1, sort_keys=True)
            fatte += 1
            print(f"OK   {nome}  {prima:.1f} -> {dopo:.1f} s  {os.path.getsize(mp3) // 1024} KB   [{n}/{len(frasi)}]", flush=True)
        except Exception as e:
            falliti.append(nome)
            if os.path.exists(tmp):
                os.remove(tmp)
            print(f"ERR  {nome}  {str(e)[:200]}", flush=True)

    # manifest per il sito: durata di ogni frase
    items = {k: {"d": v["d"]} for k, v in registro.items() if os.path.exists(os.path.join(WEB, k + ".mp3"))}
    with open(os.path.join(WEB, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump({"voce": vs.VOCE, "lavorazione": ev.VERSIONE, "items": items}, f, indent=1, sort_keys=True)
    print(f"\nVOCE: {fatte} nuove, {saltate} già fatte, {len(falliti)} errori, su {len(frasi)} frasi ({time.time() - t0:.0f} s)")
    if dubbi:
        print("Durata ancora strana (da riascoltare): " + ", ".join(dubbi))
    if falliti:
        print("Non generate: " + ", ".join(falliti))
        sys.exit(1)


if __name__ == "__main__":
    main()
