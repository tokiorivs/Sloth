"""
Crea el proyecto de una intro en la carpeta `<nombre>` (la de la línea `Carpeta:` de Sloth), en el directorio actual:
copia la plantilla de Remotion, pone el narrador en public/narrador y src/datos/narrador.json, enlaza node_modules al
que comparten todas las intros (espacio.py de video-base) y deja una viñeta negra para que se vea en Remotion Studio.

    python -B -X utf8 nuevo.py <nombre> [--formato vertical|horizontal] [--narrador <id>]

Sin `--narrador`, el primero de `narradores/`; si no hay ninguno, el perro de video-explicativo (con su boca abierta).
Dice la voz del narrador: es la que se usa si el mensaje no trae una línea `Voz:` con otra.
"""

import json
import shutil
import sys
from pathlib import Path

from PIL import Image

SKILL = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SKILL.parent / "video-base" / "scripts"))
sys.path.insert(0, str(Path(__file__).resolve().parent))
from narrador import NARRADORES, lista  # noqa: E402


def perro() -> tuple[Path, dict]:
    """El narrador de reserva: el perro de video-explicativo, con su pose normal y su boca abierta."""
    d = SKILL.parent / "video-explicativo" / "personaje" / "perro"
    img = Image.open(d / "normal.webp")
    caja = img.convert("RGBA").getchannel("A").getbbox() or (0, 0, *img.size)
    return d, {
        "nombre": "El perro",
        "imagen": "normal.webp",
        "abierta": "normal-abierta.webp",
        "ancho": img.width,
        "alto": img.height,
        "recorte": [caja[0], caja[1], caja[2] - caja[0], caja[3] - caja[1]],
        "color": "#ffd600",
        "voz": "",
    }


def main() -> None:
    args = sys.argv[1:]
    opc = {}
    for k in ("--formato", "--narrador"):
        if k in args:
            i = args.index(k)
            opc[k] = args[i + 1] if i + 1 < len(args) else ""
            del args[i:i + 2]
    formato = opc.get("--formato", "horizontal")
    if len(args) != 1 or formato not in ("vertical", "horizontal"):
        sys.exit(__doc__)
    aqui = Path.cwd()
    if (aqui / "package.json").exists():
        aqui = aqui.parent
    destino = aqui / args[0]
    if destino.exists():
        sys.exit(f"{destino} ya existe: usa otro nombre.")

    id_ = opc.get("--narrador") or next(iter(lista()), "")
    if id_:
        origen = NARRADORES / id_
        if not (origen / "narrador.json").exists():
            sys.exit(f"No hay narrador «{id_}». Los que hay: {', '.join(lista()) or 'ninguno'}.")
        n = json.loads((origen / "narrador.json").read_text(encoding="utf-8"))
    else:
        origen, n = perro()

    shutil.copytree(SKILL / "plantilla", destino, ignore=shutil.ignore_patterns("__pycache__", "node_modules"))
    for d in ("public/narrador", "public/vinetas", "fuentes/voz", "out", "revision"):
        (destino / d).mkdir(parents=True, exist_ok=True)
    for clave in ("imagen", "abierta"):
        if n.get(clave):
            shutil.copy2(origen / n[clave], destino / "public" / "narrador" / n[clave])
            n[clave] = f"narrador/{n[clave]}"
    datos = destino / "src" / "datos"
    (datos / "narrador.json").write_text(json.dumps(n, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    (datos / "formato.json").write_text(json.dumps({"formato": formato}) + "\n", encoding="utf-8", newline="\n")
    intro = json.loads((datos / "intro.json").read_text(encoding="utf-8"))
    intro["formato"] = formato
    (datos / "intro.json").write_text(json.dumps(intro, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
    Image.new("RGB", (800, 1000), (20, 20, 24)).save(destino / "public" / "vinetas" / "00.jpg")

    from espacio import enlazar_modulos
    enlazar_modulos(destino, "intro-manhwa", SKILL / "plantilla")
    print(f"{destino} listo ({formato}). Narrador: {n['nombre']} · voz: {n.get('voz') or '(ninguna: usa la de la línea Voz: o pídela)'}")


if __name__ == "__main__":
    main()
