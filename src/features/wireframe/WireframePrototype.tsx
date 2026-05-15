"use client";

import { memo, useEffect } from "react";
import { initWireframePrototype } from "./wireframeInteractions";
import { WIREFRAME_MARKUP } from "./wireframeMarkup";

const wireframeMarkup = { __html: WIREFRAME_MARKUP };

const WireframeMarkupHost = memo(function WireframeMarkupHost() {
  return <div dangerouslySetInnerHTML={wireframeMarkup} />;
});

export function WireframePrototype() {
  useEffect(() => {
    return initWireframePrototype();
  }, []);

  return <WireframeMarkupHost />;
}
