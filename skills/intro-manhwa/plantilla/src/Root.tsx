import React from "react";
import { Composition } from "remotion";
import { ALTO, ANCHO, DURACION, FPS } from "./datos";
import { Intro } from "./Intro";

export const Root: React.FC = () => (
  <Composition id="Intro" component={Intro} durationInFrames={DURACION} fps={FPS} width={ANCHO} height={ALTO} />
);
