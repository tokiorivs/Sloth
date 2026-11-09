import { useEffect, useState } from 'react'
import type { EstadoFlashEdit } from '../../shared/types'
import { api } from './api'
import { Picker } from './Composer'

/**
 * FlashEdit Studio en la interfaz (`server/flashedit.ts`). En el compositor de las cards con `flashedit` (la intro de
 * manhwa), el menú «FlashEdit: serie › capítulo», que manda la línea `FlashEdit:` (`lineaFlashEdit`): al terminar, la
 * skill guarda una copia en la carpeta de Opciones → FlashEdit y pone la intro al inicio de ese capítulo con
 * `insert_intro` del MCP `flashedit`. Sin FlashEdit no sale nada.
 */
export function useFlashEdit(activo = true) {
  const [estado, setEstado] = useState<EstadoFlashEdit>()
  useEffect(() => {
    if (activo) void api<EstadoFlashEdit>('/api/flashedit').then(setEstado, () => setEstado(undefined))
  }, [activo])
  return { estado, poner: setEstado }
}

/** El capítulo elegido, con el nombre de su serie. */
function capitulo(e: EstadoFlashEdit | undefined, id: string) {
  for (const s of e?.series ?? []) {
    const c = s.capitulos.find((x) => x.id === id)
    if (c) return { serie: s.nombre, nombre: c.nombre, id }
  }
}

export const lineaFlashEdit = (e: EstadoFlashEdit | undefined, id: string) => {
  const c = capitulo(e, id)
  if (!c || !e) return ''
  return `FlashEdit: al terminar, guarda una copia en ${e.carpeta} y pon la intro al inicio del capítulo «${c.serie} › ${c.nombre}» (chapterId ${c.id}) con insert_intro del MCP flashedit.`
}

export function SelectorFlashEdit({ uso, valor, onCambio }: { uso: ReturnType<typeof useFlashEdit>; valor: string; onCambio(id: string): void }) {
  const e = uso.estado
  if (!e?.instalado) return null
  const c = capitulo(e, valor)
  return (
    <Picker
      label={c ? `FlashEdit: ${c.serie} › ${c.nombre}` : 'FlashEdit: no la pongo en un capítulo'}
      value={c ? valor : ''}
      menuWidth={360}
      groups={[
        { label: 'FlashEdit', options: [{ value: '', label: 'No la pongo en un capítulo' }] },
        ...e.series.filter((s) => s.capitulos.length).map((s) => ({ label: s.nombre, options: s.capitulos.map((x) => ({ value: x.id, label: x.nombre })) }))
      ]}
      onChange={onCambio}
    />
  )
}

/** Opciones → FlashEdit: la carpeta donde se guarda una copia de cada intro que va a un capítulo. */
export function FlashEditOpciones({ uso }: { uso: ReturnType<typeof useFlashEdit> }) {
  const [carpeta, setCarpeta] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const e = uso.estado
  if (!e?.instalado) return null
  const guardar = (valor: string | null) => {
    setOcupado(true)
    setError('')
    api<EstadoFlashEdit>('/api/flashedit/carpeta', { carpeta: valor })
      .then((d) => (uso.poner(d), setCarpeta('')))
      .catch((x: Error) => setError(x.message))
      .finally(() => setOcupado(false))
  }
  return (
    <div className="item">
      <div className="fila">
        <div className="fila-nombre">
          <strong>Carpeta de las intros</strong>
          <span className="mono">{e.carpeta}</span>
        </div>
      </div>
      <form className="opcion-fila fila-extra" onSubmit={(x) => (x.preventDefault(), carpeta.trim() && guardar(carpeta))}>
        <input placeholder="Pega la ruta de otra carpeta" value={carpeta} onChange={(x) => setCarpeta(x.target.value)} autoComplete="off" />
        <button className="primary" disabled={ocupado || !carpeta.trim()}>
          Guardar
        </button>
        <button type="button" className="ghost" disabled={ocupado} onClick={() => guardar(null)}>
          La de siempre
        </button>
      </form>
      <p className="muted small fila-extra">
        Al hacer una intro eliges en el menú «FlashEdit» el capítulo: la intro se pone al inicio de su línea de tiempo y una copia queda en esta carpeta. {e.series.length} series en FlashEdit.
      </p>
      {error && <p className="bad small fila-extra">{error}</p>}
    </div>
  )
}
