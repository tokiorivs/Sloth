import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { segundosWav } from '../../shared/voz.ts'
import { leer } from '../opciones.ts'

export const FISH_AUDIO_ENV = 'FISH_AUDIO_API_KEY'
export const MODELO_FISH_AUDIO = 's2.1-pro-free'

/** Obtiene la clave de API de Fish Audio del entorno o del almacenamiento de opciones. */
export function llaveFishAudio(): string {
  return process.env[FISH_AUDIO_ENV] || leer(FISH_AUDIO_ENV)
}

/** Verifica si la clave es válida consultando los modelos disponibles sin costo. */
export async function probarFishAudio(llave: string): Promise<void> {
  const res = await fetch('https://api.fish.audio/model?page_size=1', {
    headers: { Authorization: `Bearer ${llave}` }
  })
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error('Fish Audio no aceptó esa llave. Revísala y vuelve a pegarla.')
    }
    throw new Error(`Fish Audio respondió con código ${res.status}.`)
  }
}

export interface OpcionesFishAudio {
  texto: string
  salida: string
  vozId?: string
  modelo?: string
}

/**
 * Sintetiza texto a voz llamando al endpoint HTTP de Fish Audio (/v1/tts)
 * y escribe directamente el archivo WAV resultante en la ruta de salida.
 */
export async function generarFishAudio({
  texto,
  salida,
  vozId,
  modelo = MODELO_FISH_AUDIO
}: OpcionesFishAudio): Promise<{ segundos: number }> {
  const llave = llaveFishAudio()
  if (!llave) {
    throw new Error('No hay clave de Fish Audio configurada. Añádela en Opciones → Voz o como variable FISH_AUDIO_API_KEY.')
  }

  const res = await fetch('https://api.fish.audio/v1/tts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${llave}`,
      'Content-Type': 'application/json',
      model: modelo
    },
    body: JSON.stringify({
      text: texto,
      reference_id: vozId || undefined,
      format: 'wav'
    })
  })

  if (!res.ok) {
    const errorTexto = await res.text().catch(() => '')
    throw new Error(`Fish Audio respondió con error ${res.status}: ${errorTexto || res.statusText}`)
  }

  const arrayBuffer = await res.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  mkdirSync(dirname(salida), { recursive: true })
  writeFileSync(salida, buffer)

  const segundos = segundosWav(buffer) ?? Math.max(1, Math.round(buffer.length / (2 * 44100)))
  return { segundos: Math.round(segundos * 10) / 10 }
}
