import { useEffect, useState } from 'react'
import type { EstadoThunderVoice } from '../../shared/types'
import { api } from './api'
import { Picker } from './Composer'

/**
 * ThunderVoice en el compositor de las cards que parten de uno de sus proyectos (`thundervoice` en la card, la «Intro de
 * manhwa»): el menú con sus proyectos, que manda la línea `ThunderVoice: proyecto <id> «<nombre>»` (`lineaThunderVoice`).
 * La skill lee de ahí el Libro Maestro y las viñetas con el MCP `thundervoice`. Sin ThunderVoice no sale nada; con su
 * servidor apagado, el menú lo dice.
 */
export function useThunderVoice(activo: boolean) {
  const [estado, setEstado] = useState<EstadoThunderVoice>()
  const leer = () => void api<EstadoThunderVoice>('/api/thundervoice').then(setEstado, () => setEstado(undefined))
  useEffect(() => {
    if (activo) leer()
  }, [activo])
  return { estado, leer }
}

export const lineaThunderVoice = (estado: EstadoThunderVoice | undefined, id: string) => {
  const p = estado?.proyectos.find((x) => String(x.id) === id)
  return p ? `ThunderVoice: proyecto ${p.id} «${p.nombre}» (léelo con el MCP thundervoice, empezando por libro_maestro).` : ''
}

export function SelectorThunderVoice({ uso, valor, onCambio }: { uso: ReturnType<typeof useThunderVoice>; valor: string; onCambio(id: string): void }) {
  const e = uso.estado
  if (!e?.instalado) return null
  if (!e.activo)
    return (
      <Picker
        label="ThunderVoice: apagado"
        value=""
        menuWidth={320}
        groups={[{ label: 'Inicia ThunderVoice (run_server.bat) y vuelve a mirar', options: [{ value: 'leer', label: 'Volver a mirar' }] }]}
        onChange={() => uso.leer()}
      />
    )
  const p = e.proyectos.find((x) => String(x.id) === valor)
  return (
    <Picker
      label={p ? `ThunderVoice: ${p.nombre}` : 'ThunderVoice: elige un proyecto'}
      value={p ? valor : ''}
      menuWidth={340}
      groups={[
        { label: 'Sin proyecto', options: [{ value: '', label: 'Lo cuento yo en el mensaje' }] },
        { label: 'Proyectos de ThunderVoice', options: e.proyectos.map((x) => ({ value: String(x.id), label: x.nombre })) }
      ]}
      onChange={onCambio}
    />
  )
}
