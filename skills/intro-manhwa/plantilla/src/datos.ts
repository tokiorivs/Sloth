// Lo que arma cada video: `intro.json` lo escribe scripts/armar.py (frases, tiempos, viñetas y la boca por cuadro) y
// `narrador.json` scripts/nuevo.py (el narrador elegido, copiado a public/narrador).
import intro from "./datos/intro.json";
import narrador from "./datos/narrador.json";

export const FPS = 30;

/** Cómo actúa el narrador en su frase: llega con una curva suave y se queda así hasta la siguiente. */
export type Actua = "calma" | "inclina" | "acerca" | "tiembla" | "grita";

export interface Frase {
  texto: string;
  desde: number;
  hasta: number;
  /** La viñeta de fondo, en public/. */
  vineta: string;
  actua: Actua;
  /** Brillo de los ojos, de 0 a 1 (si el narrador tiene ojos). */
  ojos: number;
  /** Cuándo empieza cada palabra, en segundos desde el inicio del video. */
  palabras: [number, string][];
}

export interface Intro {
  formato: "vertical" | "horizontal";
  total: number;
  frases: Frase[];
  /** Cuánto abre la boca en cada cuadro, de 0 a 1, medido de la voz. */
  boca: number[];
  voz: string | null;
}

/**
 * El narrador como títere 2D. Coordenadas en píxeles de su imagen. Con `mandibula`, la mandíbula (ese polígono) baja
 * con la voz y deja ver `hueco`; con `abierta`, se cambia a esa imagen al hablar (como las poses del perro).
 */
export interface Narrador {
  nombre: string;
  imagen: string;
  ancho: number;
  alto: number;
  /** Lo que se ve de la imagen: x, y, ancho y alto. */
  recorte: [number, number, number, number];
  mandibula?: [number, number][];
  /** El rectángulo oscuro detrás de la mandíbula: x1, y1, x2, y2. */
  hueco?: [number, number, number, number];
  /** Cuánto baja la mandíbula abierta del todo, en píxeles de la imagen. */
  baja?: number;
  abierta?: string;
  ojos?: [number, number, number][];
  color: string;
}

// El JSON importado no sabe de tuplas: se lee como lo escriben armar.py y nuevo.py.
export const INTRO = intro as unknown as Intro;
export const NARRADOR = narrador as unknown as Narrador;
export const VERTICAL = INTRO.formato === "vertical";
export const ANCHO = VERTICAL ? 1080 : 1920;
export const ALTO = VERTICAL ? 1920 : 1080;
export const DURACION = Math.max(1, Math.round(INTRO.total * FPS));
