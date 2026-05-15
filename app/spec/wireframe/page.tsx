import Script from "next/script";
import { WireframePrototype } from "@/features/wireframe/WireframePrototype";

export default function WireframePage() {
  return (
    <>
      <WireframePrototype />
      <Script src="/spec/assets/sfx.js" strategy="afterInteractive" />
    </>
  );
}
