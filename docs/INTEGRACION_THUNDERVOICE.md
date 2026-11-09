# Integración de ThunderVoice con Sloth (Para Introducciones de Manhwa/Anime)

Este documento sirve como guía e instrucción directa para el chat de **Sloth** (Claude Code) para conectarse y extraer información, guiones y viñetas desde **ThunderVoice**.

---

## 1. Estado de la Conexión MCP

ThunderVoice ya está registrado en tu configuración global de Claude (`~/.claude.json`) como servidor MCP:
* **Comando:** `C:\Users\cesar\Documents\programas\ThunderVoice\python_env\python.exe`
* **Script:** `C:\Users\cesar\Documents\programas\ThunderVoice\mcp_server.py`
* **Prerrequisito:** El servidor web de ThunderVoice debe estar corriendo (`run_server.bat` en `C:\Users\cesar\Documents\programas\ThunderVoice` escuchando en `http://127.0.0.1:8000`).

Sloth toma esa misma entrada de `~/.claude.json` (`server/thundervoice.ts`) y la suma a los MCP de cada hilo, con
cualquier agente (Claude, Codex, OpenCode, Cursor, Muse, Pi…), también en la copia de desarrollo, que usa `data/claude`.
Si cambias la entrada o la quitas, se aplica en el siguiente hilo que empiece; los que ya corren siguen con la de antes.

---

## 2. Herramientas Disponibles en el Chat de Sloth

Cuando le hables al agente de Sloth, puede utilizar estas herramientas de ThunderVoice directamente:

| Herramienta | Qué hace |
| :--- | :--- |
| `mcp__thundervoice__estado_servidor` | Comprueba si ThunderVoice está activo y responde. |
| `mcp__thundervoice__listar_proyectos` | Lista los manhwas/animes guardados con sus IDs y nombres. |
| `mcp__thundervoice__listar_escenas` | Lista los capítulos procesados de un manhwa específico (`project_id`). |
| `mcp__thundervoice__obtener_guion` | Descarga el texto completo y los diálogos del capítulo (`script_id`). |
| `mcp__thundervoice__libro_maestro` | La historia hasta ahora (un resumen por capítulo) y qué capítulos tienen guion mejorado (`project_id`); con `completo=True`, el libro entero. Es la base del gancho de la intro. |
| `mcp__thundervoice__listar_personajes` | Consulta los nombres de personajes y sus roles en la historia. |
| `mcp__thundervoice__listar_cortes` | Lista los cortes de viñetas (*Slicers*) generados para cada capítulo. |
| `mcp__thundervoice__listar_vinetas` | **Obtiene las rutas de imagen de cada viñeta individual** (`panel_001.png`, etc.) listas para usarse en el video. |

---

## 3. Instrucción para pegar en el chat de Sloth

Copia y pega el siguiente texto en el chat de Sloth para que cree la introducción del video de YouTube:

```text
Actúa como director audiovisual para mi canal de resúmenes de Manhwa/Anime en YouTube.

Tienes acceso al servidor MCP de ThunderVoice. Por favor realiza lo siguiente:
1. Usa la herramienta `mcp__thundervoice__listar_proyectos` para identificar el manhwa en el que estamos trabajando.
2. Consulta el guion del proyecto con `obtener_guion` y analiza el conflicto principal, el giro de trama o la escena más impactante.
3. Con `listar_vinetas`, extrae las rutas de 4 o 5 viñetas clave del manhwa cortadas por ThunderVoice para usarlas como recursos visuales.
4. Redacta un guion de introducción (Hook) de alto impacto de 30 a 45 segundos diseñado para retener a la audiencia antes del resumen largo.
5. Ensambla el video de introducción sincronizando las viñetas seleccionadas, los subtítulos dinámicos y la narración.
```

---

## 4. Flujo de Trabajo Recomendado

```
[ThunderVoice]                               [Sloth]
Webtoon Slicer  ───> Viñetas cortadas ───┐
Guiones y Voz   ───> Texto y audios   ───┼──> Agente MCP ──> Ensamblado (Remotion/FFmpeg) ──> Introducción YouTube
```

* **ThunderVoice:** Realiza el trabajo pesado de descargar el manhwa, recortar viñetas limpias sin burbujas de texto y sincronizar personajes.
* **Sloth:** Extrae ese material mediante MCP, redacta el gancho narrativo de la introducción y renderiza el clip con subtítulos dinámicos y efectos visuales de alta retención.
