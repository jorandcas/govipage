import { WHATSAPP_NUMBER, WHATSAPP_MSG } from "../config/site";

// Iconos (ya lo tienes)
const ICONS = import.meta.glob("../assets/icons/*.{svg,png}", {
  eager: true, query: "?url", import: "default",
});
const getIconUrl = (name) =>
  ICONS[`../assets/icons/${name}.svg`] ||
  ICONS[`../assets/icons/${name}.png`] ||
  null;

// Assets generales (logo)
const ASSETS = import.meta.glob("../assets/*.{svg,png}", {
  eager: true, query: "?url", import: "default",
});
const getAssetUrl = (name) =>
  ASSETS[`../assets/${name}.svg`] ||
  ASSETS[`../assets/${name}.png`] ||
  null;


export default function Footer() {
  const waHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MSG)}`;
  return (
    <footer className="bg-gray-100 border-t border-gray-300 mt-12">
      <div className="max-w-6xl mx-auto px-4 py-8 grid gap-6 md:grid-cols-3 text-center md:text-left">

        {/* Logo */}
        <div className="flex flex-col items-center md:items-start gap-2">
          {/* Si tu logo está en public/assets/logo.png */}
          <img src={getAssetUrl("logo-movistar")} alt="Movistar" className="h-10" />

          <span className="text-sm text-gray-600">Distribuidor Movistar</span>
        </div>

        {/* Links */}
        <nav className="flex flex-col gap-2 text-sm">
          <a href="/terminos" className="hover:text-blue-600">Términos y condiciones</a>
          <a href="/nosotros" className="hover:text-blue-600">Quiénes somos</a>
        </nav>

        {/* Redes + CTA WhatsApp */}
        <div className="flex flex-col items-center md:items-end gap-3">
          <div className="flex gap-4">
            <a href="https://www.facebook.com/profile.php?id=61578175554857" target="_blank" rel="noreferrer">
              <img src={getIconUrl("facebook")} alt="Facebook" className="w-6 h-6" />
            </a>
            <a href="https://www.instagram.com/govi.comunicaciones/" target="_blank" rel="noreferrer">
              <img src={getIconUrl("instagram")} alt="Instagram" className="w-6 h-6" />
            </a>
          </div>

          <a
            href={waHref}
            target="_blank"
            rel="noreferrer"
            className="inline-block bg-green-500 text-white font-semibold px-4 py-2 rounded-lg hover:bg-green-600 transition"
          >
            Atención a clientes en WhatsApp
          </a>
        </div>
      </div>

      <div className="bg-gray-200 text-gray-600 text-xs text-center py-3">
        © {new Date().getFullYear()} Distribuidor Movistar · Todos los derechos reservados
      </div>
    </footer>
  );
}
