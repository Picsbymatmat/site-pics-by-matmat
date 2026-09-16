import { useLayoutEffect, useRef } from "react";
import { useLocation, Link } from "react-router-dom";
import content from "../../data/content.json";
import "./Nav.css";

interface NavProps {
  hidden: boolean;
}

export default function Nav({ hidden }: NavProps) {
  const location = useLocation();
  // The success page is the end of the booking flow — there's nothing
  // left to book from there, so Book drops out (Instagram stays, top left).
  const hideBook = location.pathname.startsWith("/success");

  const instagram = content.contact.instagram;

  const navRef = useRef<HTMLElement | null>(null);

  // Publishes this nav's rendered height as a CSS variable so pages that
  // need to fit exactly one viewport (landing, success) can size
  // themselves as calc(100dvh - var(--nav-height)) without guessing —
  // measured rather than relying on a wrapping flex/scroll container,
  // which would hijack window.scrollY away from the document (breaking
  // the category rails' scroll-linked parallax and its scroll restore).
  useLayoutEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const set = () => {
      document.documentElement.style.setProperty("--nav-height", `${el.offsetHeight}px`);
    };
    set();
    const observer = new ResizeObserver(set);
    observer.observe(el);
    return () => observer.disconnect();
  }, [hideBook]);

  return (
    <header ref={navRef} className={`nav${hidden ? " nav--hidden" : ""}`} aria-hidden={hidden}>
      {instagram ? (
        <a
          className="nav__instagram mono"
          href={instagram}
          target="_blank"
          rel="noreferrer"
          tabIndex={hidden ? -1 : 0}
        >
          {content.copy["nav.instagram"]}
        </a>
      ) : (
        <span className="nav__instagram mono" aria-hidden="true">
          {content.copy["nav.instagram"]}
        </span>
      )}
      {/* /book always opens with no category chosen — never preselect one
          from the nav (§3). */}
      {!hideBook && (
        <Link className="nav__book mono" to="/book" tabIndex={hidden ? -1 : 0}>
          {content.copy["nav.book"]}
        </Link>
      )}
    </header>
  );
}
