"""
Los narradores de la intro: un dibujo o una foto que se vuelve títere 2D. Viven en `narradores/<id>/` de esta skill
(`narrador.json` y su imagen), que es de cada quien y no entra al repo.

    python -B -X utf8 narrador.py lista
    python -B -X utf8 narrador.py crear <id> <imagen> [--voz fish:<id>|<voz de AI Studio>] [--nombre "…"] [--con-fondo]
    python -B -X utf8 narrador.py rejilla <id> <x> <y> <ancho> <alto>
    python -B -X utf8 narrador.py ver <id>

- `crear` le quita el fondo (rembg; `--con-fondo` lo deja) y escribe su `narrador.json` con el tamaño, el recorte (lo
  que no es transparente) y la voz. Falta la boca: o la `mandibula` (polígono que baja al hablar) con su `hueco` y sus
  `ojos`, o una imagen `abierta` con la boca abierta, del mismo tamaño.
- `rejilla` dibuja esa zona ampliada con las coordenadas cada 20 px, para leer dónde va la mandíbula (`rejilla.png`).
- `ver` dibuja la cabeza con la boca cerrada, a medias y abierta, con los ojos (`vista.png`): míralo antes de usarlo.
"""

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

NARRADORES = Path(__file__).resolve().parent.parent / "narradores"


def guardar(ruta: Path, datos: dict) -> None:
    ruta.write_text(json.dumps(datos, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")


def leer(id_: str) -> tuple[Path, dict]:
    d = NARRADORES / id_
    if not (d / "narrador.json").exists():
        sys.exit(f"No hay narrador «{id_}» en {NARRADORES}. Los que hay: {', '.join(lista()) or 'ninguno'}.")
    return d, json.loads((d / "narrador.json").read_text(encoding="utf-8"))


def lista() -> list[str]:
    return sorted(p.parent.name for p in NARRADORES.glob("*/narrador.json"))


def crear(id_: str, imagen: str, voz: str, nombre: str, con_fondo: bool) -> None:
    d = NARRADORES / id_
    d.mkdir(parents=True, exist_ok=True)
    img = Image.open(imagen).convert("RGBA")
    if not con_fondo:
        from rembg import remove
        img = remove(img.convert("RGB"))
    img.save(d / "base.png")
    caja = img.getchannel("A").point(lambda p: 255 if p > 20 else 0).getbbox() or (0, 0, *img.size)
    x1, y1, x2, y2 = caja
    datos = {
        "nombre": nombre or id_,
        "imagen": "base.png",
        "ancho": img.width,
        "alto": img.height,
        "recorte": [x1, y1, x2 - x1, y2 - y1],
        "color": "#ffd600",
        "voz": voz,
    }
    guardar(d / "narrador.json", datos)
    print(f"{d}: falta la boca (mandibula y hueco, u otra imagen «abierta»). Recorte {datos['recorte']}.")


def rejilla(id_: str, x: int, y: int, w: int, h: int) -> None:
    d, n = leer(id_)
    img = Image.open(d / n["imagen"]).convert("RGBA")
    k = max(1, 600 // max(w, h))
    fondo = Image.new("RGBA", img.size, (60, 60, 60, 255))
    fondo.alpha_composite(img)
    zona = fondo.crop((x, y, x + w, y + h)).resize((w * k, h * k), Image.NEAREST)
    dib = ImageDraw.Draw(zona)
    for yy in range(y - y % 20 + 20, y + h, 20):
        dib.line((0, (yy - y) * k, w * k, (yy - y) * k), fill=(255, 40, 40), width=1)
        dib.text((2, (yy - y) * k + 1), str(yy), fill=(255, 255, 0))
    for xx in range(x - x % 20 + 20, x + w, 20):
        dib.line(((xx - x) * k, 0, (xx - x) * k, h * k), fill=(60, 120, 255), width=1)
        dib.text(((xx - x) * k + 2, 2), str(xx), fill=(0, 255, 255))
    zona.convert("RGB").save(d / "rejilla.png")
    print(d / "rejilla.png")


def cuadro(d: Path, n: dict, abre: float, ojos: float) -> Image.Image:
    """Lo mismo que dibuja Narrador.tsx, para revisarlo sin Remotion."""
    base = Image.open(d / n["imagen"]).convert("RGBA")
    if n.get("abierta") and not n.get("mandibula"):
        return Image.open(d / n["abierta"]).convert("RGBA") if abre > 0.35 else base
    img = base.copy()
    baja = round(n.get("baja", 14) * abre)
    if n.get("mandibula") and baja:
        if n.get("hueco"):
            x1, y1, x2, y2 = n["hueco"]
            ImageDraw.Draw(img).rounded_rectangle((x1, y1, x2, y2 + baja), radius=6 + baja // 2, fill=(22, 14, 12, 255))
        m = Image.new("L", base.size, 0)
        ImageDraw.Draw(m).polygon([tuple(p) for p in n["mandibula"]], fill=255)
        quijada = Image.new("RGBA", base.size, (0, 0, 0, 0))
        quijada.paste(base, (0, 0), m)
        img.alpha_composite(quijada, (0, baja))
    if n.get("ojos") and ojos:
        capa = Image.new("RGBA", base.size, (0, 0, 0, 0))
        c = tuple(int(n["color"][i:i + 2], 16) for i in (1, 3, 5))
        for x, y, r in n["ojos"]:
            ImageDraw.Draw(capa).ellipse((x - r, y - r, x + r, y + r), fill=(*c, int(150 * ojos)))
        img.alpha_composite(capa.filter(ImageFilter.GaussianBlur(14)))
    return img


def ver(id_: str) -> None:
    d, n = leer(id_)
    x, y, w, h = n["recorte"]
    # La cabeza: el tercio de arriba del recorte, o la caja que rodea la boca si ya está.
    if n.get("mandibula"):
        xs = [p[0] for p in n["mandibula"]]
        ys = [p[1] for p in n["mandibula"]]
        cx, cy, lado = (min(xs) + max(xs)) // 2, (min(ys) + max(ys)) // 2, max(max(xs) - min(xs), 120) * 2
        zona = (cx - lado // 2, cy - lado * 2 // 3, cx + lado // 2, cy + lado // 3)
    else:
        zona = (x, y, x + w, y + h)
    tiras = [cuadro(d, n, a, o).crop(zona) for a, o in ((0, 0.2), (0.5, 0.6), (1, 1))]
    lienzo = Image.new("RGB", (sum(t.width for t in tiras), tiras[0].height), (60, 60, 60))
    for i, t in enumerate(tiras):
        lienzo.paste(t, (i * t.width, 0), t)
    lienzo.save(d / "vista.png")
    print(d / "vista.png")


def main() -> None:
    a = sys.argv[1:]
    if not a:
        sys.exit(__doc__)
    if a[0] == "lista":
        for id_ in lista():
            _, n = leer(id_)
            print(f"{id_}: {n.get('nombre')} · voz {n.get('voz') or '(sin voz)'} · {'mandíbula' if n.get('mandibula') else 'abierta' if n.get('abierta') else 'SIN BOCA'}")
        return
    if a[0] == "crear" and len(a) >= 3:
        opc = {k: a[a.index(k) + 1] for k in ("--voz", "--nombre") if k in a}
        crear(a[1], a[2], opc.get("--voz", ""), opc.get("--nombre", ""), "--con-fondo" in a)
    elif a[0] == "rejilla" and len(a) == 6:
        rejilla(a[1], *map(int, a[2:]))
    elif a[0] == "ver" and len(a) == 2:
        ver(a[1])
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
