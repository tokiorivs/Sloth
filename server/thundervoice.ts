import type { IncomingMessage, ServerResponse } from 'node:http'
import type { EstadoThunderVoice } from '../shared/types.ts'
import { json } from './http.ts'
import { entradaMcp } from './mcp-externos.ts'

/**
 * ThunderVoice: una app aparte (proyectos de manhwa, guiones, Libro Maestro, viñetas cortadas y audios) con su propio
 * servidor web y su MCP, que llega a los hilos con los demás de `mcp-externos.ts`. Aquí, lo que enseña el selector de la
 * card «Intro de manhwa»: si hay ThunderVoice, si su servidor responde y sus proyectos.
 */

/** Su servidor web: el mismo al que habla su MCP (`THUNDERVOICE_URL`, o el puerto 8000). */
const urlServidor = (env?: Record<string, string>) => (env?.THUNDERVOICE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')

/** Se pide al abrir el compositor; si el servidor está apagado, el selector lo dice en vez de la lista. */
async function estado(): Promise<EstadoThunderVoice> {
  const s = entradaMcp('thundervoice')
  if (!s) return { instalado: false, activo: false, proyectos: [] }
  try {
    const r = await fetch(`${urlServidor(s.env)}/api/projects`, { signal: AbortSignal.timeout(3000) })
    if (!r.ok) return { instalado: true, activo: false, proyectos: [] }
    const lista = (await r.json()) as { id: number; name: string }[]
    return { instalado: true, activo: true, proyectos: lista.map((p) => ({ id: p.id, nombre: p.name })) }
  } catch {
    return { instalado: true, activo: false, proyectos: [] }
  }
}

export async function thundervoiceApi(req: IncomingMessage, res: ServerResponse, path: string): Promise<boolean> {
  if (path !== '/api/thundervoice' || req.method !== 'GET') return false
  return json(res, 200, await estado())
}
