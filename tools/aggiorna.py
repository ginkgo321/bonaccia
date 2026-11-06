"""Da lanciare ogni volta che si aggiorna il sito, prima del commit.

    python tools/aggiorna.py              # sale di una versione (1.1 -> 1.2) con data e ora di adesso
    python tools/aggiorna.py --versione 2.0

Fa tre cose:
  1. riscrive js/version.js (versione, data e ora): compaiono in fondo alla pagina «?» (Capire cosa succede);
  2. alza la cache del service worker in sw.js (bonaccia-vN -> bonaccia-vN+1), così il telefono prende i file nuovi;
  3. controlla che js/version.js sia tra i file messi in cache da sw.js.
"""
import argparse
import re
import sys
from datetime import datetime
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent
VERSION_JS = RADICE / "js" / "version.js"
SW_JS = RADICE / "sw.js"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--versione", help="numero di versione da scrivere (per esempio 2.0); se manca sale di uno")
    args = ap.parse_args()

    testo = VERSION_JS.read_text(encoding="utf-8")
    m = re.search(r"v:\s*'([^']*)'", testo)
    attuale = m.group(1) if m else "1.0"
    if args.versione:
        nuova = args.versione
    else:
        parti = attuale.split(".")
        try:
            parti[-1] = str(int(parti[-1]) + 1)
        except ValueError:
            sys.exit(f"Non riesco a incrementare la versione «{attuale}»: usa --versione.")
        nuova = ".".join(parti)
    adesso = datetime.now().strftime("%Y-%m-%d %H:%M")

    VERSION_JS.write_text(
        "/* Bonaccia – versione del sito. Questo file lo riscrive tools/aggiorna.py: non modificarlo a mano. */\n"
        "window.Bonaccia = window.Bonaccia || {};\n"
        f"window.Bonaccia.Version = {{ v: '{nuova}', date: '{adesso}' }};\n",
        encoding="utf-8",
    )

    sw = SW_JS.read_text(encoding="utf-8")
    mc = re.search(r"var CACHE = 'bonaccia-v(\d+)';", sw)
    if not mc:
        sys.exit("In sw.js non trovo «var CACHE = 'bonaccia-vN';».")
    cache_nuova = int(mc.group(1)) + 1
    sw = sw.replace(mc.group(0), f"var CACHE = 'bonaccia-v{cache_nuova}';")
    if "js/version.js" not in sw:
        sw = sw.replace("'css/style.css', ", "'css/style.css', 'js/version.js', ", 1)
    SW_JS.write_text(sw, encoding="utf-8")

    print(f"Versione {attuale} -> {nuova}, {adesso}; cache service worker: bonaccia-v{cache_nuova}")


if __name__ == "__main__":
    main()
