import { useEffect, useRef, useState } from "react";
import "./AppPlate.css";

interface PlateLayer {
  id: number;
  src: string;
}

interface AppPlateProps {
  src: string | null;
}

/** The one persistent atmosphere plate for the whole app. Crossfades
 *  directly from the old image to the new one — the previous image stays
 *  put underneath at full opacity while the new one fades in on top, so
 *  there's never a beat where nothing but the flat --bg shows through
 *  (which used to read as a dip to black between categories). Older
 *  layers are dropped once the newest finishes fading in. */
export default function AppPlate({ src }: AppPlateProps) {
  const [layers, setLayers] = useState<PlateLayer[]>(src ? [{ id: 0, src }] : []);
  const nextId = useRef(1);

  useEffect(() => {
    setLayers((prev) => {
      if (!src) return [];
      if (prev.length && prev[prev.length - 1].src === src) return prev;
      const layer = { id: nextId.current++, src };
      // No fade-in animation will run to trigger the onAnimationEnd
      // cleanup below, so drop older layers immediately instead of
      // leaking them.
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return [layer];
      return [...prev, layer];
    });
  }, [src]);

  return (
    <div className="app-plate-layer" aria-hidden="true">
      {layers.map((layer, i) => {
        const isTop = i === layers.length - 1;
        return (
          <img
            key={layer.id}
            className={`app-plate plate${isTop ? " app-plate--entering" : ""}`}
            src={layer.src}
            alt=""
            onAnimationEnd={() => {
              if (!isTop) return;
              // Safe to drop everything below once the new image has
              // fully covered it.
              setLayers((prev) => prev.slice(-1));
            }}
          />
        );
      })}
      <div className="app-plate-vignette" />
      <div className="grain-overlay" />
    </div>
  );
}
