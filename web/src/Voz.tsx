import { useEffect, useState } from 'react'
import type { Card, EstadoVoz, VozFish } from '../../shared/types'
import { lineaVoz } from '../../shared/voz'
import { api } from './api'
import { Picker } from './Composer'
import { Logo } from './Logos'

/**
 * La voz de AI Studio en la interfaz (`server/voz/`): conectar la cuenta de Google (Opciones → Voz) y, en el compositor
 * de un video, elegir entre mandar tu voz o que el agente la genere con una voz de AI Studio. Lo elegido va en la línea
 * `Voz:` del primer mensaje (`lineaVoz`, `shared/voz.ts`).
 */

/** El estado de la voz. Mientras esperas en Edge (o Chrome), se vuelve a preguntar cada 2 s. */
export function useVoz() {
  const [estado, setEstado] = useState<EstadoVoz>()
  const [error, setError] = useState<string>()
  const recibir = (p: Promise<EstadoVoz>) => p.then((e) => (setEstado(e), setError(undefined)), (e: Error) => setError(e.message))
  useEffect(() => void recibir(api('/api/voz')), [])
  useEffect(() => {
    if (!estado?.conectando) return
    const t = setInterval(() => void recibir(api('/api/voz')), 2000)
    return () => clearInterval(t)
  }, [estado?.conectando])
  return {
    estado,
    error: error ?? estado?.error,
    conectar: () => void recibir(api('/api/voz/conectar', {})),
    /** Guarda la lista de voces de Fish Audio; falla con el error del servidor (un id que no es de Fish). */
    guardarFish: (voces: VozFish[]) => api<EstadoVoz>('/api/voz/fish', { voces }).then((e) => void setEstado(e)),
    // Devuelve la promesa, y falla si falla, para el aviso de Google Flow; el error queda también aquí.
    desconectar: () =>
      api<EstadoVoz>('/api/voz/desconectar', {}).then(
        (e) => void (setEstado(e), setError(undefined)),
        (x: Error) => {
          setError(x.message)
          throw x
        }
      )
  }
}

export type UsoVoz = ReturnType<typeof useVoz>

/** Una voz de Fish Audio: «Fish Audio» (la de por defecto) o `fish:<id>`. */
const esFish = (voz: string) => voz.toLowerCase().startsWith('fish')

/** La opción del menú que conecta la cuenta, que no es ninguna voz. */
const CONECTAR = ' conectar'

/**
 * El menú «Voz» del compositor de un video: mandarla tú (o la que hace el estilo, `propia`) o una voz de AI Studio, por
 * grupos como los pone la página. Sin cuenta, ofrece conectarla. `valor`: la voz elegida, vacía si la mandas tú.
 */
export function SelectorVoz({ card, voz, valor, onCambio }: { card: Card; voz: UsoVoz; valor: string; onCambio(voz: string): void }) {
  if (card.voz === false) return null
  const e = voz.estado
  const propia = card.voz?.propia ?? 'La mando yo'
  const fish = esFish(valor)
  const deFish = e?.vocesFish?.find((v) => `fish:${v.id}` === valor)
  const label = e?.conectando
    ? `Voz: entra con Google en ${e.navegador}…`
    : fish
      ? `Voz: ${deFish?.nombre ?? 'Fish Audio'} · Fish`
      : valor && e?.cuenta
        ? `Voz: ${valor} · AI Studio`
        : `Voz: ${propia.toLowerCase()}`
  return (
    <Picker
      label={label}
      value={fish || e?.cuenta ? valor : ''}
      menuWidth={340}
      disabled={!e || e.conectando}
      groups={[{ label: 'Voz', options: [{ value: '', label: propia }] }, ...gruposDeVoces(e, valor)]}
      onChange={(v) => (v === CONECTAR ? voz.conectar() : onCambio(v))}
    />
  )
}

/**
 * Las voces de AI Studio y Fish Audio para un menú, por grupos. Sin cuenta de Google, ofrece conectarla.
 */
function gruposDeVoces(e: EstadoVoz | undefined, valor = '') {
  const resultado: { label: string; options: { value: string; label: string }[] }[] = []
  if (e?.fishAudio) {
    // Las guardadas en Opciones → Voz, y la de por defecto de Fish. Una elegida antes que ya se quitó sigue a la vista.
    const opciones = (e.vocesFish ?? []).map((v) => ({ value: `fish:${v.id}`, label: `Fish · ${v.nombre}` }))
    if (esFish(valor) && valor !== 'Fish Audio' && !opciones.some((o) => o.value === valor)) opciones.push({ value: valor, label: `Fish · ${valor.slice(5)}` })
    opciones.push({ value: 'Fish Audio', label: 'Fish · la voz de por defecto' })
    resultado.push({ label: 'Fish Audio · s2.1-pro-free (tus voces, en Opciones → Voz)', options: opciones })
  }
  if (!e?.cuenta) {
    resultado.push({ label: 'AI Studio · Gemini 3.8 Flash TTS, gratis', options: [{ value: CONECTAR, label: 'Conectar tu cuenta de Google…' }] })
  } else {
    const grupos = new Map<string, { value: string; label: string }[]>()
    for (const v of e.voces) grupos.set(`AI Studio · ${v.grupo}`, [...(grupos.get(`AI Studio · ${v.grupo}`) ?? []), { value: v.nombre, label: `${v.nombre} · ${v.descripcion}` }])
    if (valor && !esFish(valor) && !e.voces.some((v) => v.nombre === valor)) grupos.set('AI Studio', [{ value: valor, label: valor }])
    resultado.push(...[...grupos].map(([label, options]) => ({ label, options })))
  }
  return resultado
}

/** La última voz que se eligió para generar desde un hilo ya empezado. */
const ULTIMA = 'voz-hilo'

/**
 * En la etapa que espera tu voz (`Etapas.tsx`): en vez de grabarla, que el agente la genere con una voz de AI Studio.
 * Sin cuenta, ofrece conectarla ahí mismo. `onGenerar` recibe el mensaje para el agente, con la línea `Voz:`.
 */
export function GenerarVoz({ onGenerar }: { onGenerar(texto: string): Promise<void> }) {
  const voz = useVoz()
  const e = voz.estado
  const [elegida, setElegida] = useState(() => localStorage.getItem(ULTIMA) ?? '')
  const [mandando, setMandando] = useState(false)
  // La guardada solo vale si la página la ofrece; si no, la primera.
  const valor = e?.voces.some((v) => v.nombre === elegida) ? elegida : (e?.voces[0]?.nombre ?? '')
  if (!e) return null
  if (!e.cuenta)
    return (
      <div className="generar-voz">
        <span>O que la genere el agente con una voz de AI Studio, gratis con tu cuenta de Google.</span>
        <button className="ghost small" disabled={e.conectando} onClick={voz.conectar}>
          {e.conectando ? `Entra con Google en la ventana de ${e.navegador}…` : 'Conectar con Google'}
        </button>
        {voz.error && !e.conectando && <span className="bad small">{voz.error}</span>}
      </div>
    )
  return (
    <div className="generar-voz">
      <span>O que la genere el agente con una voz de AI Studio:</span>
      <Picker
        label={`Voz: ${valor}`}
        value={valor}
        menuWidth={340}
        groups={gruposDeVoces(e, valor)}
        onChange={(v) => (localStorage.setItem(ULTIMA, v), setElegida(v))}
      />
      <button
        className="primary small"
        disabled={!valor || mandando}
        onClick={() => {
          setMandando(true)
          void onGenerar(`No la voy a grabar: genérala tú.\n\n${lineaVoz({}, valor)}`).finally(() => setMandando(false))
        }}
      >
        {mandando ? 'Pidiéndola…' : 'Generar la voz'}
      </button>
    </div>
  )
}

/** Opciones → Voz: la cuenta de Google con que Sloth genera las voces en AI Studio. `voz` es el de Opciones, que comparte con Google Flow. */
export function VozOpciones({ voz }: { voz: UsoVoz }) {
  const e = voz.estado
  return (
    <div className="item">
      <div className="fila">
        <Logo de="gemini" />
        <div className="fila-nombre">
          <strong>Google AI Studio</strong>
          <span>
            {e?.cuenta
              ? `Gemini 3.8 Flash TTS · ${e.voces.length} voces en el menú Voz${e.enFila ? ` · generando ${e.enFila}` : ''}`
              : `Genera la voz de tus videos con Gemini 3.8 Flash TTS, gratis, con tu cuenta de Google. Entras una vez, en ${e?.navegador ?? 'Edge'}.`}
          </span>
        </div>
        {e?.conectando ? (
          <span className="estado moviendo">Entra con Google en la ventana de {e.navegador}…</span>
        ) : e?.cuenta ? (
          <Picker
            className="acciones"
            label={<span className="estado">{e.cuenta}</span>}
            value=""
            groups={[{ label: 'Cuenta', options: [{ value: 'conectar', label: 'Volver a conectar' }, { value: 'desconectar', label: 'Desconectar' }] }]}
            onChange={(q) => (q === 'desconectar' ? void voz.desconectar().catch(() => {}) : voz.conectar())}
          />
        ) : (
          e && (
            <button className="primary" onClick={voz.conectar}>
              Conectar con Google
            </button>
          )
        )}
      </div>
      {e?.conectando && <p className="muted small fila-extra">Google no deja entrar desde una app. Al entrar en {e.navegador} (la primera vez, AI Studio te pide aceptar sus términos), la ventana se cierra y la sesión pasa sola a Sloth.</p>}
      {voz.error && !e?.conectando && <p className="bad small fila-extra">{voz.error}</p>}
    </div>
  )
}

/**
 * Opciones → Voz: las voces de Fish Audio que usas, con un nombre tuyo y su id (o el enlace de fish.audio, del que se
 * saca). Salen en el menú «Voz» del compositor como «Fish · <nombre>» y se piden como `fish:<id>`.
 */
export function VocesFish({ voz }: { voz: UsoVoz }) {
  const voces = voz.estado?.vocesFish ?? []
  const [nombre, setNombre] = useState('')
  const [id, setId] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  if (!voz.estado) return null
  const guardar = (lista: VozFish[]) => {
    setOcupado(true)
    setError('')
    return voz
      .guardarFish(lista)
      .then(() => (setNombre(''), setId('')))
      .catch((x: Error) => setError(x.message))
      .finally(() => setOcupado(false))
  }
  // Del enlace (fish.audio/m/<id>, con o sin más ruta) se queda el id.
  const limpio = (/\/m\/([A-Za-z0-9_-]+)/.exec(id)?.[1] ?? id).trim().replace(/^fish:/i, '')
  return (
    <div className="item">
      <div className="fila">
        <Logo de="fish_audio" nombre="Fish Audio" />
        <div className="fila-nombre">
          <strong>Voces de Fish Audio</strong>
          <span>
            {voces.length
              ? `${voces.length} ${voces.length === 1 ? 'voz' : 'voces'} en el menú Voz${voz.estado.fishAudio ? '' : ' · falta la llave de Fish Audio'}`
              : 'Guarda las voces que usas, con su id de fish.audio, para elegirlas en el menú Voz.'}
          </span>
        </div>
      </div>
      {voces.map((v) => (
        <div key={v.id} className="opcion-fila fila-extra">
          <span>{v.nombre}</span>
          <span className="muted small mono">{v.id}</span>
          <button className="ghost" disabled={ocupado} onClick={() => void guardar(voces.filter((o) => o.id !== v.id))}>
            Quitar
          </button>
        </div>
      ))}
      <form className="opcion-fila fila-extra" onSubmit={(e) => (e.preventDefault(), nombre.trim() && limpio && void guardar([...voces, { nombre: nombre.trim(), id: limpio }]))}>
        <input placeholder="Nombre (Narrador esqueleto)" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="off" />
        <input placeholder="Id o enlace de fish.audio" value={id} onChange={(e) => setId(e.target.value)} autoComplete="off" />
        <button className="primary" disabled={ocupado || !nombre.trim() || !limpio}>
          {ocupado ? 'Guardando…' : 'Añadir'}
        </button>
      </form>
      {error && <p className="bad small fila-extra">{error}</p>}
    </div>
  )
}
