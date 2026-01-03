import { useEffect, useRef, useState } from "react";

// ⬇️ Ajusta estas rutas a tus nombres reales
// Desktop (horizontal/ancho)
import banner1D from "../assets/banners/Banner1-Govi.jpg";
import banner2D from "../assets/banners/Banner2-Govi.jpg";
// Móvil (cuadrado)
import banner1M from "../assets/banners/govi1mobile.jpg"; // <-- cambia si tu archivo tiene otro nombre
import banner2M from "../assets/banners/govi2mobile.jpg"; // <-- cambia si tu archivo tiene otro nombre

const SLIDES = [
  {
    srcD: banner1D,
    srcM: banner1M,
    alt: "¿Pagas más por menos? Cámbiate sin drama. Pro18: 18 GB, redes ilimitadas, roaming.",
    href: "#planes",
  },
  {
    srcD: banner2D,
    srcM: banner2M,
    alt: "Planes profesionales: GB suficientes, hotspot, redes ilimitadas, roaming. Desde $279/mes.",
    href: "#planes",
  },
];

const AUTOPLAY_MS = 6000;
const SWIPE_THRESHOLD = 50;

export default function Banner() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef(null);
  const intervalRef = useRef(null);

  const goTo = (i) => setIndex((i + SLIDES.length) % SLIDES.length);
  const next = () => goTo(index + 1);
  const prev = () => goTo(index - 1);

  // autoplay
  useEffect(() => {
    if (paused) return;
    intervalRef.current = setInterval(next, AUTOPLAY_MS);
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, paused]);

  // swipe móvil
  const onTouchStart = (e) => {
    touchX.current = e.touches?.[0]?.clientX ?? null;
  };
  const onTouchEnd = (e) => {
    const endX = e.changedTouches?.[0]?.clientX ?? null;
    if (touchX.current == null || endX == null) return;
    const delta = endX - touchX.current;
    if (Math.abs(delta) > SWIPE_THRESHOLD) delta > 0 ? prev() : next();
    touchX.current = null;
  };

  // navegación con teclado (accesibilidad)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  return (
    <section
      aria-label="Promociones"
      className="max-w-7xl mx-auto px-4 mt-6 md:mt-10"
    >
      <div
        className="relative overflow-hidden rounded-3xl bg-slate-100"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Alto fijo responsive para que no salte el layout */}
        <div className="h-[200px] sm:h-[230px] md:h-[300px]">
          {SLIDES.map((s, i) => (
            <a
              key={i}
              href={s.href}
              aria-label={s.alt}
              className="absolute inset-0 block w-full h-full"
              style={{
                transform: `translateX(${(i - index) * 100}%)`,
                transition: "transform 450ms ease",
              }}
            >
              {/* <picture>: móvil por defecto, desktop cuando min-width >= 768px */}
              <picture>
                <source media="(min-width: 768px)" srcSet={s.srcD} />
                <img
                  src={s.srcM}
                  alt={s.alt}
                  className="w-full h-full object-cover"
                  loading={i === 0 ? "eager" : "lazy"}
                  draggable={false}
                  // optional: ayuda a que el browser elija mejor la variante
                  sizes="(min-width: 1024px) 1024px, 100vw"
                />
              </picture>
            </a>
          ))}
        </div>

        {/* Flechas */}
        <button
          type="button"
          onClick={prev}
          aria-label="Anterior"
          className="absolute left-3 top-1/2 -translate-y-1/2 grid place-items-center w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
        <button
          type="button"
          onClick={next}
          aria-label="Siguiente"
          className="absolute right-3 top-1/2 -translate-y-1/2 grid place-items-center w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>

        {/* Dots / paginación */}
        <div className="absolute inset-x-0 -bottom-5 md:bottom-3 flex items-center justify-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              aria-label={`Ir al slide ${i + 1}`}
              onClick={() => goTo(i)}
              className={`w-2.5 h-2.5 rounded-full transition ${
                i === index ? "bg-blue-600" : "bg-white shadow ring-1 ring-black/10"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
