r"""analizza_suoni.py - misure acustiche dei suoni di Bonaccia.

Uso:
    python tools\analizza_suoni.py file1.mp3 file2.mp3 ...        # file locali o URL http(s)
    python tools\analizza_suoni.py --json out.json file...        # salva anche i dati
    python tools\analizza_suoni.py --durata 600 url...            # legge al massimo 600 s per file

Per ogni file stampa:
  LUFS     sonorità integrata (EBU R128); LRA = escursione di sonorità (quanto "respira" il suono)
  TP       picco reale in dBTP
  RMS      livello medio in dBFS; CRF = fattore di cresta (picco - RMS)
  corto    sonorità su finestre di 1 s: mediana, e la distanza dal 5° al 95° percentile (regolarità)
  salti    il salto di livello più grande tra due secondi consecutivi entrambi "attivi", in dB
  sil      quota di secondi quasi muti (sotto -60 dBFS): pause o silenzio digitale
  pic3     quanto i momenti più forti (95° percentile, finestre di 3 s) superano la sonorità mediana, in dB
  bande    quota di energia sotto 250 Hz | 250-2k | 2-4k | 4-8k | oltre 8k (in %)
  CENT     centroide spettrale in Hz (più alto = più chiaro e sibilante)
  PEND     pendenza dello spettro in dB per ottava (rosa = -3, marrone = -6, bianco = 0)
  ACUTI    quota di energia oltre 4 kHz, dove cade spesso la frequenza dell'acufene

Serve ffmpeg nel PATH, numpy e scipy.
"""
import argparse
import json
import re
import subprocess
import sys

import numpy as np
from scipy import signal

SR = 44100
BANDE = [(20, 250), (250, 2000), (2000, 4000), (4000, 8000), (8000, 20000)]


def leggi(src, durata):
    cmd = ["ffmpeg", "-v", "error", "-t", str(durata), "-i", src, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


def ebur128(src, durata):
    cmd = ["ffmpeg", "-nostats", "-t", str(durata), "-i", src, "-af", "ebur128=peak=true", "-f", "null", "-"]
    err = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace").stderr
    blocco = err[err.rfind("Summary:"):]
    def prendi(nome):
        m = re.search(nome + r":\s+(-?[\d.]+)", blocco)
        return float(m.group(1)) if m else float("nan")
    return prendi("I"), prendi("LRA"), prendi("Peak")


def db(x):
    return 20 * np.log10(max(x, 1e-12))


def analizza(src, durata):
    x = leggi(src, durata)
    if len(x) < SR:
        raise SystemExit(f"File troppo corto o illeggibile: {src}")
    lufs, lra, tp = ebur128(src, durata)
    rms = db(np.sqrt((x ** 2).mean()))
    pk = db(np.abs(x).max())

    # sonorità a finestre di 1 s (RMS in dBFS)
    n = len(x) // SR
    fin = x[: n * SR].reshape(n, SR)
    liv = 20 * np.log10(np.sqrt((fin ** 2).mean(axis=1)) + 1e-12)
    # ignora i secondi quasi muti (pause tra versetti) per i percentili della regolarità
    attivi = liv[liv > liv.max() - 40]
    p5, p50, p95 = np.percentile(attivi, [5, 50, 95])
    # pause: secondi quasi muti (sotto -60 dBFS), e salti di livello tra due secondi entrambi "attivi"
    silenzio = 100.0 * float((liv < -60).mean())
    att = liv > liv.max() - 40
    coppie = att[1:] & att[:-1]
    salti = np.abs(np.diff(liv))[coppie]
    salto_max = float(salti.max()) if len(salti) else 0.0
    # dinamica a 3 s tra le parti attive: quanto sale il suono rispetto alla sua mediana (picchi di 3 s)
    n3 = len(liv) // 3
    liv3 = 10 * np.log10((10 ** (liv[: n3 * 3].reshape(n3, 3) / 10)).mean(axis=1) + 1e-12)
    att3 = liv3[liv3 > liv3.max() - 40]
    sopra_med = float(np.percentile(att3, 95) - np.median(att3))

    # spettro medio (Welch)
    f, p = signal.welch(x, SR, nperseg=8192)
    tot = p[(f >= 20) & (f <= 20000)].sum()
    bande = [100 * p[(f >= a) & (f < b)].sum() / tot for a, b in BANDE]
    cent = float((f * p).sum() / p.sum())
    # pendenza: regressione di log2(f) contro dB, su 100-8000 Hz (spettro in densità, quindi bianco = 0)
    m = (f >= 100) & (f <= 8000)
    pend = float(np.polyfit(np.log2(f[m]), 10 * np.log10(p[m] + 1e-20), 1)[0])
    return {
        "file": "/".join(src.replace("\\", "/").split("/")[-3 if src.startswith("http") else -1:]), "durata_s": round(len(x) / SR, 1),
        "lufs": lufs, "lra": lra, "tp": tp, "rms": round(rms, 1), "crf": round(pk - rms, 1),
        "mediana": round(float(p50), 1), "banda_reg": round(float(p95 - p5), 1), "salto_max": round(salto_max, 1), "silenzio_pct": round(silenzio, 1), "picchi3s": round(sopra_med, 1),
        "bande": [round(b, 1) for b in bande], "centroide": round(cent), "pendenza": round(pend, 1),
        "acuti_4k": round(bande[3] + bande[4], 1),
    }


def stampa(r):
    b = " | ".join(f"{v:5.1f}" for v in r["bande"])
    print(f"{r['file'][:34]:34} {r['durata_s']:7.1f}s  LUFS {r['lufs']:6.1f}  LRA {r['lra']:4.1f}  TP {r['tp']:5.1f}  "
          f"CRF {r['crf']:4.1f}  reg {r['banda_reg']:4.1f}  salto {r['salto_max']:4.1f}  sil {r['silenzio_pct']:4.1f}%  pic3 {r['picchi3s']:4.1f}  "
          f"bande% {b}  CENT {r['centroide']:5d}  PEND {r['pendenza']:5.1f}  ACUTI {r['acuti_4k']:5.1f}%")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("file", nargs="+")
    ap.add_argument("--json")
    ap.add_argument("--durata", type=int, default=900)
    a = ap.parse_args()
    ris = []
    for src in a.file:
        try:
            r = analizza(src, a.durata)
        except (subprocess.CalledProcessError, SystemExit) as e:
            print(f"ERRORE su {src}: {e}", file=sys.stderr)
            continue
        ris.append(r)
        stampa(r)
    if a.json:
        with open(a.json, "w", encoding="utf-8") as fh:
            json.dump(ris, fh, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
