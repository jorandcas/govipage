import { useRef } from "react";
import { WHATSAPP_NUMBER } from "../config/site";

// Azul marca (puedes cambiarlo si usas otro tono)
const BRAND_BLUE = "#00A9E0";

// Carga robusta de iconos desde src/assets/icons
const ICONS = import.meta.glob("../assets/icons/*.{svg,png}", {
  eager: true,
  query: "?url",
  import: "default",
});
const iconByFile = (fileName) => ICONS[`../assets/icons/${fileName}`] || null;

// Ítems (usando tus nombres exactos de archivo)
const features = [
  {
    iconFile: "Valos_movistar_govi-02.svg",
    title: "Cobertura superior",
    text:
      "Disfruta de planes desde $144 mensuales con la cobertura y calidad que mereces. Mientras otras compañías cobran más por servicios similares, con Movistar obtienes más beneficios por menos.",
  },
  {
    iconFile: "velocidad_movistar_govi-03.svg",
    title: "Velocidad Real",
    text:
      "Internet que sí funciona. Disfruta de velocidades reales de navegación. Con Movistar, tu internet no se queda a medias cuando más lo necesitas.",
  },
  {
    iconFile: "libertad_movistar_govi-04.svg",
    title: "Sin permanencia",
    text:
      "Libertad total. Sin compromisos forzosos ni penalizaciones. Tú decides cuándo y cómo usar tu línea.",
  },
  {
    iconFile: "conservar_movistar_govi-05.svg",
    title: "Conserva tu número",
    text:
      "Tu número se queda contigo. Mantén el mismo número que ya conocen tus contactos. El cambio es solo de operador, no de identidad.",
  },
];

export default function WhyMovistar() {
  const scrollerRef = useRef(null);

  const scrollByCard = (dir) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" });
  };

  const wa = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  "Hola, quiero info para portabilidad a Movistar."
)}`;
;

  return (
    <section
      className="text-slate-800"
      style={{ background: `linear-gradient(180deg, ${BRAND_BLUE}0F 0%, white 35%)` }}
    >
      <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">

        {/* Título consistente con el resto */}
        <h2 className="text-center font-extrabold tracking-tight text-3xl md:text-5xl text-slate-900">
          ¿Por qué hacer tu portabilidad a Movistar?
        </h2>

        {/* Desktop: grid */}
        <div className="mt-8 hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <Card key={f.title} {...f} />
          ))}
        </div>

        {/* Mobile: carrusel */}
        <div className="mt-6 relative md:hidden">
          <button
            aria-label="Anterior"
            onClick={() => scrollByCard(-1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/90 text-slate-700 hover:text-slate-900 rounded-full w-9 h-9 grid place-items-center shadow"
          >
            ‹
          </button>
          <button
            aria-label="Siguiente"
            onClick={() => scrollByCard(1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/90 text-slate-700 hover:text-slate-900 rounded-full w-9 h-9 grid place-items-center shadow"
          >
            ›
          </button>

          <div
            ref={scrollerRef}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory px-1 pb-2 scroll-smooth"
          >
            {features.map((f) => (
              <div key={f.title} className="snap-center shrink-0 w-[88%]">
                <Card {...f} />
              </div>
            ))}
          </div>
        </div>

        {/* CTA alineado a tu estilo (verde WhatsApp) */}
        <div className="mt-10 md:mt-12 flex justify-center">
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="inline-block bg-[#25D366] hover:bg-[#1fb357] text-white font-bold px-6 py-3 rounded-xl shadow transition"
          >
            CAMBÍATE AHORA
          </a>
        </div>
      </div>
    </section>
  );

  // ---- Tarjeta (estandarizada con tus cards de planes) ----
  function Card({ iconFile, title, text }) {
    const src = iconByFile(iconFile);
    return (
      <article
        className="h-full bg-white rounded-3xl border border-slate-200/70 shadow-sm hover:shadow-md transition p-6 md:p-7 flex flex-col"
      >
        {/* Ícono en pastilla con aro de marca */}
        <div
          className="w-14 h-14 md:w-16 md:h-16 rounded-2xl grid place-items-center mb-4"
          style={{
            backgroundColor: `${BRAND_BLUE}1A`,        // 10% aprox
            boxShadow: `inset 0 0 0 1px ${BRAND_BLUE}33`, // aro suave
          }}
        >
          {src ? (
            <img src={src} alt="" className="w-8 h-8 md:w-9 md:h-9" />
          ) : (
            <span className="text-2xl">✨</span>
          )}
        </div>

        {/* Título y texto */}
        <h3
          className="text-xl md:text-2xl font-extrabold mb-2"
          style={{ color: BRAND_BLUE }}
        >
          {title}
        </h3>
        <p className="text-[15px] leading-relaxed text-slate-700">
          {text}
        </p>
      </article>
    );
  }
}
