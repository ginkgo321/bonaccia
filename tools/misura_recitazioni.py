r"""misura_recitazioni.py - misura la sonorità delle recitazioni (3 voci x 114 Sure) e scrive js/recitazioni_livelli.js.

Uso:   python tools\misura_recitazioni.py [--secondi 180] [--obiettivo -18]

Per ogni file della CDN legge i primi N secondi con ffmpeg (filtro ebur128) e ricava la sonorità integrata.
Il guadagno è obiettivo - misurata, limitato tra -18 e +6 dB, arrotondato a 0,5 dB: il sito lo applica in
riproduzione (js/recitazioni.js) per portare tutte le Sure allo stesso livello, vicino a quello dei suoni di Bonaccia.
I risultati intermedi stanno in tools/livelli_cache.json, così rilanciare il programma misura solo i file mancanti.
Serve ffmpeg nel PATH e node (per leggere js/recitazioni_data.js).
"""
import argparse
import json
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent
CACHE = RADICE / "tools" / "livelli_cache.json"
USCITA = RADICE / "js" / "recitazioni_livelli.js"


def leggi_dati():
    js = ("global.window={};require('./js/recitazioni_data.js');const D=window.Bonaccia.QuranData;"
          "console.log(JSON.stringify({r:Object.fromEntries(Object.entries(D.reciters).map(([k,v])=>[k,v.baseUrl])),"
          "s:D.surahs.map(s=>[s.n,s.pad])}))")
    out = subprocess.run(["node", "-e", js], cwd=RADICE, capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def misura(url, secondi):
    cmd = ["ffmpeg", "-nostats", "-t", str(secondi), "-i", url, "-af", "ebur128", "-f", "null", "-"]
    err = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace").stderr
    blocco = err[err.rfind("Summary:"):]
    m = re.search(r"\bI:\s+(-?[\d.]+) LUFS", blocco)
    return float(m.group(1)) if m else None


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--secondi", type=int, default=180)
    ap.add_argument("--obiettivo", type=float, default=-18.0)
    ap.add_argument("--processi", type=int, default=6)
    a = ap.parse_args()

    dati = leggi_dati()
    cache = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}
    lavori = []
    for rid, base in dati["r"].items():
        for n, pad in dati["s"]:
            chiave = f"{rid}/{n}"
            if cache.get(chiave) is None:
                lavori.append((chiave, base + pad + ".mp3"))
    print(f"{len(lavori)} file da misurare (primi {a.secondi} s ciascuno)", flush=True)

    def un_lavoro(l):
        chiave, url = l
        for _ in range(3):
            try:
                v = misura(url, a.secondi)
                if v is not None:
                    return chiave, v
            except Exception:
                pass
        return chiave, None

    fatti = 0
    with ThreadPoolExecutor(a.processi) as ex:
        for chiave, v in ex.map(un_lavoro, lavori):
            cache[chiave] = v
            fatti += 1
            if fatti % 20 == 0:
                CACHE.write_text(json.dumps(cache, indent=0), encoding="utf-8")
                print(f"  {fatti}/{len(lavori)}", flush=True)
    CACHE.write_text(json.dumps(cache, indent=0), encoding="utf-8")

    gain, mediane = {}, {}
    for rid in dati["r"]:
        vals = [cache.get(f"{rid}/{n}") for n, _ in dati["s"]]
        buoni = sorted(v for v in vals if v is not None)
        mediane[rid] = buoni[len(buoni) // 2] if buoni else a.obiettivo
        riga = {}
        for (n, _), v in zip(dati["s"], vals):
            if v is None:
                continue
            g = max(-18.0, min(6.0, a.obiettivo - v))
            riga[n] = round(g * 2) / 2
        gain[rid] = riga
    pred = {rid: round(max(-18.0, min(6.0, a.obiettivo - m)) * 2) / 2 for rid, m in mediane.items()}
    mancanti = sum(1 for rid in dati["r"] for n, _ in dati["s"] if cache.get(f"{rid}/{n}") is None)

    corpo = json.dumps({"obiettivo": a.obiettivo, "predefinito": pred, "gain": gain}, separators=(",", ":"))
    USCITA.write_text(
        "/* Bonaccia – guadagno (dB) per portare ogni recitazione allo stesso livello. Lo scrive tools/misura_recitazioni.py. */\n"
        "window.Bonaccia = window.Bonaccia || {};\n"
        f"window.Bonaccia.QuranLevels = {corpo};\n", encoding="utf-8")
    print(f"Scritto {USCITA.name}: obiettivo {a.obiettivo} LUFS, guadagni predefiniti {pred}, file non misurati: {mancanti}")


if __name__ == "__main__":
    sys.exit(main())
