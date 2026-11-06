r"""elabora_natura.py - prepara i loop dei suoni della natura per Bonaccia.

Uso:  python tools\elabora_natura.py "<cartella dei grezzi Freesound>" "<cartella di uscita (audio\natura)>"

I grezzi sono gli mp3 «<id>_preview_hq.mp3» (scaricati con l'MCP freesound). Per ognuno si prende una
finestra di 60 secondi (scelta a mano guardando livello e picchi), si porta il livello a circa -19 dBFS
RMS, si comprime piano e si limitano i picchi, poi mp3 a 96 kbps. Il ciclo senza stacchi lo fa il sito
(dissolvenza incrociata di 3 secondi sul buffer decodificato).
"""
import os
import subprocess
import sys
import numpy as np

SR = 44100
#           id      nome       inizio  durata
LOOP = [
    (392304, "pioggia", 130, 60),   # pioggia vista da dentro, finestra aperta: scura e morbida
    (578524, "mare", 7, 60),        # onde calme
    (730149, "fiume", 82, 60),      # fiume che mormora
    (460559, "fontana", 0, 60),     # fontana in un cortile
    (844605, "bosco", 98, 60),      # bosco al mattino con uccelli
]
TARGET = -19.0


def pcm(f, ss, t):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(ss), "-t", str(t), "-i", f, "-f", "f32le",
                          "-ac", "2", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2)


def stats(x):
    rms = 20 * np.log10(np.sqrt((x ** 2).mean()) + 1e-12)
    pk = 20 * np.log10(np.abs(x).max() + 1e-12)
    return rms, pk


def main():
    src, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    for sid, nome, ss, t in LOOP:
        f = os.path.join(src, f"{sid}_preview_hq.mp3")
        x = pcm(f, ss, t)
        rms, pk = stats(x)
        gain = TARGET - rms
        dest = os.path.join(out, f"natura_{nome}.mp3")
        af = f"highpass=f=35,volume={gain:.2f}dB,acompressor=threshold=-20dB:ratio=3:attack=15:release=250:makeup=1,alimiter=limit=0.89"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(ss), "-t", str(t), "-i", f, "-af", af,
                        "-ac", "2", "-ar", str(SR), "-c:a", "libmp3lame", "-b:a", "96k", dest], check=True)
        y = pcm(dest, 0, t + 1)
        r2, p2 = stats(y)
        print(f"{nome}: prima RMS {rms:.1f} picco {pk:.1f} -> dopo RMS {r2:.1f} picco {p2:.1f}, {os.path.getsize(dest) // 1024} KB")


if __name__ == "__main__":
    main()
