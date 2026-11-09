import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { isAbsolute, join, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { EstadoFlashEdit } from '../shared/types.ts'
import { guardar } from './disco.ts'
import { cuerpo, json } from './http.ts'
import { entradaMcp } from './mcp-externos.ts'

/**
 * FlashEdit Studio: el editor de resúmenes de la persona (series con capítulos), con su propio MCP (`insert_intro` pone
 * una intro al inicio de un capítulo y empuja lo demás). El MCP llega a los hilos con `mcp-externos.ts`; aquí, lo que
 * enseña el compositor de las cards con `flashedit` (la «Intro de manhwa»): sus series y capítulos, leídos de su base sin
 * escribir en ella, y la carpeta donde se guarda una copia de cada intro, que se elige en Opciones → FlashEdit.
 */

/** Su base, donde la deja la app (Tauri, `com.tokiorivs.flasheditstudio`) o donde diga `FLASHEDIT_DB`, como su MCP. */
function base(env?: Record<string, string>): string {
  if (env?.FLASHEDIT_DB || process.env.FLASHEDIT_DB) return (env?.FLASHEDIT_DB || process.env.FLASHEDIT_DB)!
  const datos =
    process.platform === 'win32'
      ? (process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming'))
      : process.platform === 'darwin'
        ? join(homedir(), 'Library', 'Application Support')
        : (process.env.XDG_DATA_HOME ?? join(homedir(), '.local', 'share'))
  return join(datos, 'com.tokiorivs.flasheditstudio', 'flashedit.db')
}

/** Sin elegir, junto a los renders de FlashEdit. */
const CARPETA = join(homedir(), 'Documents', 'flashedit_renders', 'intros')

export function flashedit(app: string) {
  const archivo = join(app, 'data', 'flashedit.json')
  const leerCarpeta = (): string => {
    try {
      return JSON.parse(readFileSync(archivo, 'utf8')).carpeta || CARPETA
    } catch {
      return CARPETA
    }
  }

  function estado(): EstadoFlashEdit {
    const s = entradaMcp('flashedit')
    const db = base(s?.env)
    if (!s || !existsSync(db)) return { instalado: false, series: [], carpeta: leerCarpeta() }
    const d = new DatabaseSync(db, { readOnly: true })
    try {
      const series = d.prepare('SELECT id, name FROM series ORDER BY updated_at DESC').all() as { id: string; name: string }[]
      const caps = d.prepare('SELECT id, series_id, name FROM chapters ORDER BY created_at').all() as { id: string; series_id: string; name: string }[]
      return {
        instalado: true,
        carpeta: leerCarpeta(),
        series: series.map((x) => ({ id: x.id, nombre: x.name, capitulos: caps.filter((c) => c.series_id === x.id).map((c) => ({ id: c.id, nombre: c.name })) }))
      }
    } finally {
      d.close()
    }
  }

  async function api(req: IncomingMessage, res: ServerResponse, path: string): Promise<boolean> {
    if (path === '/api/flashedit' && req.method === 'GET') {
      try {
        return json(res, 200, estado())
      } catch (e) {
        return json(res, 500, { error: `No se pudo leer FlashEdit: ${e instanceof Error ? e.message : e}` })
      }
    }
    if (path === '/api/flashedit/carpeta' && req.method === 'POST') {
      const { carpeta } = await cuerpo<{ carpeta?: string | null }>(req)
      const limpia = carpeta?.trim().replace(/^"(.*)"$/, '$1')
      if (limpia && !isAbsolute(limpia)) return json(res, 400, { error: 'Pega la ruta completa de la carpeta, como C:\\Users\\tu\\Videos\\intros.' })
      guardar(archivo, JSON.stringify({ carpeta: limpia ? resolve(limpia) : null }, null, 1))
      return json(res, 200, estado())
    }
    return false
  }

  return { api }
}
