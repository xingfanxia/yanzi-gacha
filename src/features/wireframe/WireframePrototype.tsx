"use client";

import { memo, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BattleExperience } from "@/features/battle/BattleExperience";
import { initWireframePrototype } from "./wireframeInteractions";
import { WIREFRAME_MARKUP } from "./wireframeMarkup";

const wireframeMarkup = { __html: WIREFRAME_MARKUP };

const WireframeMarkupHost = memo(function WireframeMarkupHost() {
  return <div dangerouslySetInnerHTML={wireframeMarkup} />;
});

export function WireframePrototype() {
  const [battleMount, setBattleMount] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    setBattleMount(document.getElementById("wireframeBattleMount"));
  }, []);

  useEffect(() => {
    if (!battleMount) return undefined;
    return initWireframePrototype();
  }, [battleMount]);

  return (
    <>
      <WireframeMarkupHost />
      {battleMount ? createPortal(<BattleExperience embedded />, battleMount) : null}
    </>
  );
}
