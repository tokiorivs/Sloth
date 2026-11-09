"""
Arma la intro con lo que dejó el guion: une las frases de la voz, prepara las viñetas y escribe src/datos/intro.json
(cuándo va cada frase y cada palabra, y cuánto abre la boca el narrador en cada cuadro). Desde la raíz del proyecto:

    python -B -X utf8 <skill>/scripts/armar.py

Lee `guion.json`:

    {"pausa": 0.3, "frases": [
      {"texto": "¿Y si te digo que lo traicionaron los suyos...", "vineta": "C:/…/panel_091.jpg", "actua": "inclina", "ojos": 0.5},
      …]}

y la voz de cada frase en `fuentes/voz/01.wav`, `02.wav`… (una por frase, en orden). `actua`: calma, inclina, acerca,
tiembla o grita. `ojos`: de 0 a 1, cuánto brillan (si el narrador tiene). Deja `public/voz.wav` masterizado a −14 LUFS
(masterizar.mjs de video-base) y las viñetas sin márgenes blancos en `public/vinetas/`.
"""

import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops

FPS = 30
SR = 48000
BASE = Path(__file__).resolve().parent.parent.parent / "video-base" / "scripts"


def leer_wav(ruta: Path) -> np.ndarray:
    crudo = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-i", str(ruta), "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"],
                           capture_output=True, check=True).stdout
    return np.frombuffer(crudo, dtype=np.int16).astype(np.float32) / 32768


def sin_margen(img: Image.Image) -> Image.Image:
    """Quita el blanco de alrededor que deja el cortador de viñetas."""
    gris = ImageChops.difference(img, Image.new("RGB", img.size, "white")).convert("L")
    caja = gris.point(lambda p: 255 if p > 25 else 0).getbbox()
    return img.crop(caja) if caja else img


def main() -> None:
    raiz = Path.cwd()
    g = json.loads((raiz / "guion.json").read_text(encoding="utf-8"))
    frases, pausa = g["frases"], float(g.get("pausa", 0.3))
    if not frases:
        sys.exit("guion.json no tiene frases.")
    formato = json.loads((raiz / "src" / "datos" / "formato.json").read_text(encoding="utf-8"))["formato"]

    partes, salida, t = [], [], 0.0
    for i, f in enumerate(frases, 1):
        voz = raiz / "fuentes" / "voz" / f"{i:02d}.wav"
        if not voz.exists():
            sys.exit(f"Falta la voz de la frase {i}: {voz}")
        a = leer_wav(voz)
        # Sin el silencio de las puntas: la pausa entre frases la pone `pausa`.
        sonido = np.where(np.abs(a) > 0.01)[0]
        if len(sonido):
            a = a[max(0, sonido[0] - int(0.03 * SR)): sonido[-1] + int(0.08 * SR)]
        vineta = Path(f["vineta"])
        if not vineta.is_absolute():
            vineta = raiz / vineta
        img = sin_margen(Image.open(vineta).convert("RGB"))
        img.thumbnail((1600, 1600))
        nombre = f"vinetas/{i:02d}.jpg"
        img.save(raiz / "public" / nombre, quality=92)
        dur = len(a) / SR
        palabras = f["texto"].split()
        pesos = np.cumsum([0] + [len(p) + 1 for p in palabras])
        salida.append({
            "texto": f["texto"],
            "desde": round(t, 3),
            "hasta": round(t + dur, 3),
            "vineta": nombre,
            "actua": f.get("actua", "calma"),
            "ojos": float(f.get("ojos", 0.4)),
            "palabras": [[round(t + dur * pesos[j] / pesos[-1], 3), p] for j, p in enumerate(palabras)],
        })
        partes += [a, np.zeros(int(pausa * SR), np.float32)]
        t += dur + pausa
    audio = np.concatenate(partes + [np.zeros(int(0.4 * SR), np.float32)])
    total = len(audio) / SR

    # La boca: el volumen de cada cuadro sobre el de las sílabas fuertes; sube al momento y cae a la mitad por cuadro.
    v = SR // FPS
    n = int(total * FPS)
    rms = np.array([np.sqrt(np.mean(audio[k * v:(k + 1) * v] ** 2)) if k * v < len(audio) else 0.0 for k in range(n)])
    techo = np.percentile(rms[rms > 0], 92) if (rms > 0).any() else 1
    boca = np.clip((rms - 0.12 * techo) / (0.88 * techo), 0, 1)
    for k in range(1, n):
        boca[k] = max(boca[k], boca[k - 1] * 0.55)

    crudo = raiz / "fuentes" / "voz" / "unida.wav"
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", str(crudo)],
                   input=audio.astype(np.float32).tobytes(), check=True)
    subprocess.run(["node", str(BASE / "masterizar.mjs"), str(crudo), str(raiz / "public" / "voz.wav")], check=True)

    intro = {"formato": formato, "total": round(total, 3), "frases": salida, "boca": [round(float(b), 3) for b in boca], "voz": "voz.wav"}
    (raiz / "src" / "datos" / "intro.json").write_text(json.dumps(intro, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
    print(f"{len(salida)} frases, {total:.1f} s, {n} cuadros.")


if __name__ == "__main__":
    main()
