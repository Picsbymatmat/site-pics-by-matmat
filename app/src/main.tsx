import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./styles/global.css";
import App from "./App.tsx";
import { getFavicon } from "./lib/cloudinary.ts";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);

// Favicon from Cloudinary's `favicon` tag (§12, §13: "sourced from the
// Cloudinary favicon tag rather than a file in the repo"). index.html's
// static <link rel="icon" href="/favicon.svg"> is the pre-fetch default so
// there is never a moment with no favicon at all; this swaps the href in
// once (if ever) the tag resolves to something. Cloudinary's delivery URL
// isn't necessarily an .svg, so the type attribute is dropped rather than
// left claiming a format that may no longer match.
getFavicon().then((photo) => {
  if (!photo) return;
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.removeAttribute("type");
  link.href = photo.src;
});
