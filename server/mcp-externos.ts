import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { McpStdioServerConfig } from '@anthropic-ai/claude-agent-sdk'

/**
 * Los MCP de las apps de la persona que Sloth suma a cada hilo: ThunderVoice (manhwas, guiones, Libro Maestro, viñetas)
 * y FlashEdit Studio (su editor de resúmenes: series, capítulos, `insert_intro`). No se configuran en Sloth: se toman tal
 * cual del `~/.claude.json` de la persona, el de su Claude de siempre, aunque la copia de desarrollo use `data/claude`
 * (`CLAUDE_CONFIG_DIR`). Sin su entrada, o si su programa ya no está, no se suman.
 */
const EXTERNOS = ['thundervoice', 'flashedit'] as const

export type Externo = (typeof EXTERNOS)[number]

/** La entrada de ese MCP en `~/.claude.json`, si está y su programa existe. */
export function entradaMcp(nombre: Externo): { command: string; args: string[]; env: Record<string, string> } | undefined {
  try {
    const s = JSON.parse(readFileSync(join(homedir(), '.claude.json'), 'utf8'))?.mcpServers?.[nombre]
    if (!s?.command || (s.type && s.type !== 'stdio') || !existsSync(s.command)) return
    return { command: s.command, args: Array.isArray(s.args) ? s.args : [], env: s.env ?? {} }
  } catch {
    return
  }
}

/** Para los `mcpServers` de cada hilo, como el de la voz y el de Flow. */
export function mcpExternos(): Record<string, McpStdioServerConfig> {
  return Object.fromEntries(
    EXTERNOS.flatMap((n) => {
      const s = entradaMcp(n)
      return s ? [[n, { type: 'stdio' as const, ...s }]] : []
    })
  )
}
