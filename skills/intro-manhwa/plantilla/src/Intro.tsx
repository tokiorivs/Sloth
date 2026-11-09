import React from "react";
import { AbsoluteFill, Audio, Easing, Img, interpolate, random, staticFile, useCurrentFrame } from "remotion";
import { ALTO, ANCHO, FPS, INTRO, NARRADOR, VERTICAL, type Frase } from "./datos";
import { Narrador } from "./Narrador";

/**
 * La intro: cada frase sobre su viñeta (entera al frente, con zoom lento, y ella misma desenfocada detrás), el narrador
 * a un lado actuando la frase y abriendo la boca con la voz, y el subtítulo palabra por palabra. Horizontal: viñeta a la
 * izquierda, narrador a la derecha. Vertical: viñeta arriba, narrador abajo.
 */
const LETRA = "'Arial Black', 'Arial', sans-serif";

function fraseEn(s: number): number {
  let i = 0;
  INTRO.frases.forEach((f, j) => {
    if (s >= f.desde - 0.05) i = j;
  });
  return i;
}

const Fondo: React.FC<{ f: Frase; s: number }> = ({ f, s }) => {
  const t = s - f.desde;
  const zoom = 1 + 0.07 * Math.min(1, Math.max(0, t) / 3.5);
  // Entra con un golpe: un destello blanco que se apaga en 0.2 s.
  const destello = interpolate(t, [0, 0.2], [0.55, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const caja: React.CSSProperties = VERTICAL
    ? { left: 60, top: 100, width: ANCHO - 120, height: ALTO * 0.4 }
    : { left: 70, top: 60, width: ANCHO * 0.56, height: ALTO - 120 };
  return (
    <AbsoluteFill>
      <Img src={staticFile(f.vineta)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(28px) brightness(0.38)", transform: "scale(1.15)" }} />
      <div style={{ position: "absolute", ...caja, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Img
          src={staticFile(f.vineta)}
          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", transform: `scale(${zoom})`, boxShadow: "0 20px 60px rgba(0,0,0,0.6)", borderRadius: 6 }}
        />
      </div>
      <AbsoluteFill style={{ background: "white", opacity: destello }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)" }} />
    </AbsoluteFill>
  );
};

const Subtitulo: React.FC<{ f: Frase; s: number }> = ({ f, s }) => {
  if (s > f.hasta + 0.3) return null;
  const caja: React.CSSProperties = VERTICAL
    ? { left: 60, right: 60, top: ALTO * 0.47, textAlign: "center", fontSize: 62 }
    : { left: 70, width: ANCHO * 0.56, bottom: 70, fontSize: 62 };
  return (
    <div style={{ position: "absolute", ...caja, fontFamily: LETRA, fontWeight: 900, lineHeight: 1.12, letterSpacing: 0.5 }}>
      {f.palabras.map(([t, p], i) => {
        const dicha = s >= t;
        const pop = interpolate(s - t, [0, 0.12], [1.08, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              marginRight: "0.28em",
              color: dicha ? NARRADOR.color : "white",
              transform: `scale(${dicha ? pop : 1})`,
              WebkitTextStroke: "10px black",
              paintOrder: "stroke fill",
              textShadow: "0 6px 18px rgba(0,0,0,0.7)",
            }}
          >
            {p}
          </span>
        );
      })}
    </div>
  );
};

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const s = frame / FPS;
  const i = fraseEn(s);
  const f = INTRO.frases[i];
  const t = Math.max(0, s - f.desde);
  // La actuación llega con una curva en 0.35 s; el temblor se apaga en 0.6 s; respira siempre.
  const e = interpolate(t, [0, 0.35], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const gira = { inclina: -4, acerca: 0, tiembla: 0, grita: 0, calma: 0 }[f.actua] * e * (i % 2 ? -1 : 1);
  const crece = 1 + ({ inclina: 0, acerca: 0.06, tiembla: 0.03, grita: 0.12, calma: 0 }[f.actua] * e) + 0.012 * Math.sin(s * 2.2);
  const amp = { tiembla: 7, grita: 10 }[f.actua as "tiembla" | "grita"] ?? 0;
  const fuerza = amp * Math.max(0, 1 - t / 0.6);
  const dx = (random(`x${frame}`) - 0.5) * 2 * fuerza;
  const dy = (random(`y${frame}`) - 0.5) * 2 * fuerza;
  const ojos = f.ojos * (0.85 + 0.15 * Math.sin(s * 9));
  const abre = INTRO.boca[frame] ?? 0;
  const alto = VERTICAL ? ALTO * 0.38 : ALTO * 0.88;
  return (
    <AbsoluteFill style={{ background: "#0b0b0d" }}>
      <Fondo f={f} s={s} />
      <div
        style={{
          position: "absolute",
          right: VERTICAL ? -20 : 0,
          bottom: 0,
          transform: `translate(${dx}px, ${dy}px) rotate(${gira}deg) scale(${crece})`,
          transformOrigin: "50% 100%",
          filter: `drop-shadow(0 0 6px rgba(0,0,0,0.9)) drop-shadow(0 0 22px ${NARRADOR.color}40)`,
        }}
      >
        <Narrador alto={alto} abre={abre} ojos={ojos} />
      </div>
      <Subtitulo f={f} s={s} />
      {INTRO.voz && <Audio src={staticFile(INTRO.voz)} />}
    </AbsoluteFill>
  );
};
