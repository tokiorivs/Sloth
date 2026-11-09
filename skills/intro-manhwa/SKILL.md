---
name: intro-manhwa
description: Hace la intro de un video de YouTube de resumen de manhwa o anime, de 20 a 45 segundos, para enganchar al que lo ve antes del resumen largo. Un narrador (el personaje del canal, un títere 2D cuya boca se mueve con su voz) presenta el conflicto más fuerte sobre las viñetas del capítulo, con subtítulos palabra por palabra. Lee la historia del Libro Maestro de ThunderVoice. Úsala cuando pidan una intro, un gancho o una presentación para un video de manhwa o anime.
---

# Intro de manhwa

`<skill>` es esta carpeta y `<base>` es `video-base`, junto a ella. Lee su [`LEEME.md`](../video-base/LEEME.md) (los
errores ya vistos) antes de empezar. Los scripts van con el `python` del sistema (el que tiene rembg y Pillow).

## La esencia

- **Engancha en el primer segundo.** La primera frase ya es el conflicto, el secreto o la pregunta: nada de «hola» ni
  «bienvenidos». Sale de la historia de verdad, no de un gancho genérico.
- **Un narrador que se reconoce.** El personaje del canal, siempre el mismo, habla a cámara: abre la boca con su voz,
  se inclina, se acerca o tiembla según lo que dice.
- **Lo que dice, se ve.** Cada frase sobre la viñeta que la muestra.
- **Corta y deja con ganas.** De 20 a 45 s y termina pidiendo que se quede: el resumen empieza justo después.

## 1. La historia

Si el mensaje trae `ThunderVoice: proyecto <id> «<nombre>»`, lee con el MCP `thundervoice`:

- `libro_maestro(project_id)`: la historia hasta ahora (un resumen por capítulo) y sus capítulos. Si avisa que falta el
  resumen, pide `completo=True` o lee el guion del último capítulo con `obtener_guion(script_id)`.
- Si el usuario dice de qué capítulo es la intro, ese capítulo manda; si no, el último con guion mejorado.

Sin esa línea, la historia es lo que cuenta el usuario en el mensaje. Si no hay ni una ni otra, pregúntale de qué va.
Si ThunderVoice no responde, dile que lo inicie (`run_server.bat`) y espera.

Listo cuando puedes decir en una frase de qué va el capítulo y cuál es su momento más fuerte.

## 2. El gancho

Escribe `guion.md` (el texto que se dice, una frase por renglón) siguiendo [`GUION.md`](GUION.md). Muéstraselo al
usuario solo si lo pidió; si no, sigue.

Listo cuando `guion.md` tiene de 5 a 9 frases y dicho en voz alta dura de 20 a 45 s (unas 2,5 palabras por segundo).

## 3. El proyecto y las viñetas

```
python -B -X utf8 <skill>/scripts/nuevo.py <Carpeta> --formato <vertical|horizontal> [--narrador <id>]
```

`<Carpeta>` es la de la línea `Carpeta:`; el formato, el de `Formato:` (sin ella, horizontal: es para YouTube). Sin
`--narrador` usa el primero de `narradores/` (`narrador.py lista`). Dice la voz del narrador.

Para cada frase, una viñeta que la muestre: `listar_escenas(project_id)` → `listar_cortes(scene_id)` →
`listar_vinetas(scene_id, slicer_id)` dan sus rutas. **Lo que pida el usuario manda:** si nombra capítulos («las
viñetas del 12 y el 15»; en ThunderVoice se llaman como `cap_0012`), búscalas solo ahí; si nombra viñetas
(«panel_034 del 12»), usa esas en el orden que diga; si adjunta imágenes, van esas. Si nombró menos que frases, el
resto lo eliges tú del mismo capítulo. Mira candidatas juntas en una hoja (no sueltas) y elige las que
tienen personajes o acción; descarta las que son solo un globo de texto vacío o una onomatopeya. Sin ThunderVoice, usa
las imágenes que adjuntó el usuario (`Imagen adjunta:`).

Escribe `guion.json` en la raíz del proyecto: cada frase con su `texto`, su `vineta` (ruta absoluta), cómo `actua` el
narrador (`calma`, `inclina`, `acerca`, `tiembla` o `grita`: `grita` y `tiembla` solo en uno o dos golpes fuertes) y
cuánto brillan sus `ojos` (0 a 1; más en los golpes). `"pausa": 0.3` entre frases.

Listo cuando cada frase tiene una viñeta distinta que la muestra.

## 4. La voz

Una grabación por frase, en orden: `fuentes/voz/01.wav`, `02.wav`… Con la voz de la línea `Voz:` si la trae (cómo, en
[VOZ.md](../video-base/VOZ.md)); si no, con la del narrador (`voz` en su `narrador.json`, como `fish:<id>`), con
`generar_voz` del MCP `voz` y esa voz. Si no hay ninguna, pregúntale al usuario cuál.

Luego, desde la raíz del proyecto:

```
python -B -X utf8 <skill>/scripts/armar.py
```

Listo cuando dice cuántas frases y segundos son, y `public/voz.wav` existe.

## 5. El video

```
npx remotion render src/index.ts Intro out/intro.mp4 --codec=h264 --pixel-format=yuv420p --color-space=bt709 --crf=18
node <base>/scripts/hoja.mjs out/intro.mp4 revision/hoja.png --cada 1.5
node <base>/scripts/comprobar.mjs out/intro.mp4 --fps 30
```

Mira la hoja: el narrador entero en cuadro, el subtítulo sin tapar su cara, cada viñeta con su frase. Si algo falla,
arréglalo en `guion.json` o la plantilla, vuelve a armar y renderiza otra vez.

Listo cuando `out/intro.mp4` pasa `comprobar.mjs` y la hoja se ve bien.

## 6. A FlashEdit

Solo si el mensaje trae la línea `FlashEdit: … (chapterId <id>) …`:

1. Copia `out/intro.mp4` a la carpeta que dice la línea, como `<carpeta del video>.mp4` (créala si no está; si ya
   hay uno con ese nombre, súmale `-2`, `-3`…).
2. Con el MCP `flashedit`, `insert_intro` con ese `chapterId`, la ruta absoluta de la copia y la `duration` en segundos
   (la de `comprobar.mjs`). Pone la intro de primer clip, con su voz, y empuja la narración, la música y los marcadores
   del capítulo. Si responde que el capítulo ya empieza con una intro, vuelve a llamarla con `replace: true`: la cambia
   por la nueva.
3. Dile al usuario dónde quedó la copia y que al abrir el capítulo en FlashEdit la intro ya está al inicio.

Si el MCP `flashedit` no está, guarda solo la copia y dile que la ponga a mano.

Listo cuando la copia está en la carpeta y `insert_intro` respondió sin error.

## Formato

- `Formato: horizontal` (la de siempre, 1920×1080): la viñeta a la izquierda, el narrador de cuerpo entero a la
  derecha y el subtítulo abajo a la izquierda. Sin portada: es el inicio del video de YouTube.
- `Formato: vertical` (1080×1920, un adelanto para Shorts): la viñeta arriba, el subtítulo al centro y el narrador
  abajo. Lleva su portada de primer cuadro ([PORTADA.md](../video-base/PORTADA.md)).

## El narrador

Vive en `<skill>/narradores/<id>/` (de cada quien, fuera del repo): su imagen y `narrador.json`. Es un títere 2D de un
solo dibujo: la `mandibula` (un polígono) baja con la voz y deja ver el `hueco` oscuro, y los `ojos` pueden brillar con
su `color`, que también pinta la palabra dicha del subtítulo. Uno que ya trae su boca abierta dibujada usa `abierta` en
vez de la mandíbula. Sin narradores, sale el perro de video-explicativo.

Para uno nuevo (el usuario manda su imagen):

1. `python -B -X utf8 <skill>/scripts/narrador.py crear <id> <imagen> --voz <fish:<id> o voz de AI Studio> --nombre "…"`
   le quita el fondo.
2. `narrador.py rejilla <id> <x> <y> <ancho> <alto>` sobre la cabeza: lee en `rejilla.png` dónde se juntan los
   dientes y dónde acaba la barbilla.
3. En `narrador.json`: `mandibula` (de 8 a 12 puntos, de la línea entre los dientes a la barbilla, sin las mejillas),
   `hueco` (`[x1, y1, x2, y2]`: la franja entre los dientes, un poco más angosta que la boca), `baja` (12 a 18 px) y,
   si tiene ojos que brillan, `ojos` (`[x, y, radio]` cada uno) y su `color`.
4. `narrador.py ver <id>` y mira `vista.png`: cerrada, a medias y abierta. Si se ve una ranura recta o se mueve la
   mejilla, angosta el `hueco` o la `mandibula` y vuelve a mirar.
