import { useState } from "react";
import logo from "../assets/logo.svg";
import { navLinks, WHATSAPP_NUMBER, WHATSAPP_MSG } from "../config/site";

const waHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MSG)}`;

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-white/80 backdrop-blur border-b">
      <div className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2">
          <img src={logo} alt="Logo" className="h-8 w-auto" />
          <span className="font-semibold text-movi-dark hidden sm:inline">Distribuidor Movistar</span>
        </a>

        {/* Nav desktop */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((l) => (
            <a key={l.label} href={l.href} className="text-sm hover:text-movi-primary transition">
              {l.label}
            </a>
          ))}
          <a
            href={waHref}
            target="_blank"
            rel="noreferrer"
            className="text-sm px-4 py-2 rounded-xl border border-movi-primary text-movi-dark hover:bg-movi-primary hover:text-white transition"
          >
            WhatsApp
          </a>
        </nav>

        {/* Hamburguesa */}
        <button
          onClick={() => setOpen(v => !v)}
          className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border"
          aria-label="Abrir menú"
        >
          ☰
        </button>
      </div>

      {/* Nav móvil */}
      {open && (
        <div className="md:hidden border-t bg-white">
          <nav className="mx-auto max-w-7xl px-4 py-3 flex flex-col gap-3">
            {navLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="py-2 border-b last:border-none"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </a>
            ))}
            <a
              href={waHref}
              target="_blank"
              rel="noreferrer"
              className="text-center px-4 py-2 rounded-xl border border-movi-primary text-movi-dark hover:bg-movi-primary hover:text-white transition"
              onClick={() => setOpen(false)}
            >
              Atención por WhatsApp
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}

