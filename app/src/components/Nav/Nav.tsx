import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import content from "../../data/content.json";
import "./Nav.css";

interface NavProps {
  hidden: boolean;
}

export default function Nav({ hidden }: NavProps) {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  // The success page is the end of the booking flow — there's nothing
  // left to book from there, so Book drops out of the nav (Instagram
  // stays, top left).
  const hideBook = location.pathname.startsWith("/success");

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 0);
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const instagram = content.contact.instagram;

  return (
    <header
      className={`nav${scrolled ? " nav--scrolled" : ""}${hidden ? " nav--hidden" : ""}`}
      aria-hidden={hidden}
    >
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
