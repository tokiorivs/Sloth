import React from "react";
import { Img, staticFile } from "remotion";
import { NARRADOR as N } from "./datos";

/**
 * El narrador a `alto` píxeles de alto. `abre` (0 a 1) es cuánto abre la boca en este cuadro y `ojos` (0 a 1), cuánto
 * brillan. Con mandíbula, se recorta del mismo dibujo y baja; detrás queda `hueco`, oscuro. Con imagen abierta, se
 * cambia a ella. Lo demás (moverse, inclinarse) lo hace quien lo pone en escena.
 */
export const Narrador: React.FC<{ alto: number; abre: number; ojos: number }> = ({ alto, abre, ojos }) => {
  const [rx, ry, rw, rh] = N.recorte;
  const k = alto / rh;
  const baja = N.mandibula ? Math.round((N.baja ?? 14) * abre) : 0;
  const imagen = N.abierta && !N.mandibula && abre > 0.35 ? N.abierta : N.imagen;
  const capa: React.CSSProperties = { position: "absolute", left: 0, top: 0, width: N.ancho, height: N.alto };
  return (
    <div style={{ position: "relative", width: rw * k, height: alto, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: -rx * k, top: -ry * k, width: N.ancho, height: N.alto, transform: `scale(${k})`, transformOrigin: "0 0" }}>
        <Img src={staticFile(imagen)} style={capa} />
        {N.mandibula && baja > 0 && (
          <>
            {N.hueco && (
              <div
                style={{
                  position: "absolute",
                  left: N.hueco[0],
                  top: N.hueco[1],
                  width: N.hueco[2] - N.hueco[0],
                  height: N.hueco[3] - N.hueco[1] + baja,
                  background: "#160e0c",
                  borderRadius: 6 + baja / 2,
                }}
              />
            )}
            <Img
              src={staticFile(N.imagen)}
              style={{ ...capa, clipPath: `polygon(${N.mandibula.map(([x, y]) => `${x}px ${y}px`).join(",")})`, transform: `translateY(${baja}px)` }}
            />
          </>
        )}
        {N.ojos?.map(([x, y, r], i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - r * 2,
              top: y - r * 2,
              width: r * 4,
              height: r * 4,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${N.color} 0%, ${N.color}88 30%, transparent 70%)`,
              opacity: ojos,
              mixBlendMode: "screen",
            }}
          />
        ))}
      </div>
    </div>
  );
};
