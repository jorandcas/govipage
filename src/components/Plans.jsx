import { useMemo, useState } from "react";
import IntentFilters from "./IntentFilters";
import { intents, plans } from "../config/plans";
import { WHATSAPP_NUMBER } from "../config/site";
import ModalPortabilidad from "./ModalPortabilidad";

// === Base de API desde .env de Vite ===
const API_BASE = import.meta.env.VITE_API_BASE;
if (!API_BASE) {
  console.error("[Plans] VITE_API_BASE no está definida. Revisa .env / .env.production");
}


// Carga robusta de iconos desde src/assets/icons
const RAW_ICONS = import.meta.glob("../assets/icons/*.{svg,png}", {
  eager: true,
  query: "?url",
  import: "default",
});

const ICONS = {};
for (const [path, url] of Object.entries(RAW_ICONS)) {
  const base = path.split("/").pop().replace(/\.(svg|png|webp)$/i, "").toLowerCase();
  ICONS[base] = url; // url ya viene con el nombre hasheado correcto del build
}

const getIconUrl = (name) => ICONS[String(name).toLowerCase()] || null;

export default function Plans() {
  const wa = (msg) =>
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  const [activeIntent, setActiveIntent] = useState(intents[0].id);

  // Estado del modal
  const [modal, setModal] = useState({ open: false, plan: "" });

  const openModal = (planName) => {
    console.log("Abriendo modal con plan:", planName);
    setModal({ open: true, plan: planName });
  };

  const closeModal = () => setModal({ open: false, plan: "" });

  // Handler que recibe el FormData del modal y DEVUELVE el JSON de la API
  const handleFormSubmit = async (fd) => {
  if (!API_BASE) throw new Error("API no configurada (VITE_API_BASE)");

  const url = `${API_BASE}/api/portabilidad`;
  console.log("[Plans] POST ->", url);

  let res;
  try {
    res = await fetch(url, { method: "POST", body: fd });
  } catch (e) {
    // error de red (CORS, servidor caído, DNS, etc.)
    throw new Error(`No se pudo conectar con la API: ${e.message}`);
  }

  let json = {};
  try {
    json = await res.json();
  } catch {
    // si la API no respondió JSON, deja json como {}
  }

  console.log("[Plans] status:", res.status, "json:", json);

  if (!res.ok || !json?.ok) {
    // muestra error legible del backend si existe, si no usa el código HTTP
    throw new Error(json?.error || `HTTP ${res.status}`);
  }

  return json; // { ok:true, folio, ... }
};


  const favoritePlanId = useMemo(
    () => intents.find((i) => i.id === activeIntent)?.planId,
    [activeIntent]
  );

  return (
    <section id="planes" className="max-w-7xl mx-auto px-4 py-12">
      {/* Filtros con icono flotante */}
      <IntentFilters activeIntent={activeIntent} onSelect={setActiveIntent} />

      {/* Grid de planes */}
      <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
        {plans.map((p) => {
          const isFav = p.id === favoritePlanId;

          return (
            <article
              key={p.id}
              className="relative h-full flex flex-col rounded-3xl border shadow-sm overflow-hidden bg-white"
            >
              {/* Favorito */}
              {isFav && (
                <div className="absolute -left-8 top-4 rotate-[-35deg] bg-green-500 text-white text-xs px-8 py-1 shadow">
                  Favorito
                </div>
              )}

              <div className="p-6 flex flex-col gap-4 flex-1">
                {/* Título + PUJ */}
                <header className="text-center">
                  <h3 className="font-semibold">{p.name}</h3>
                  <p className="text-xs text-green-700 mt-1">
                    Política de Uso Justo <span className="inline-block align-middle">🛈</span>
                  </p>
                </header>

                {/* Medallón GB */}
                <div className="rounded-2xl">
                  <div className={`${p.color} rounded-2xl h-28 grid place-items-center text-white`}>
                    <div className="text-4xl font-extrabold text-center">{p.dataLabel}</div>
                  </div>
                </div>

                {/* Precio + promo */}
                <div className="text-center min-h-24 flex flex-col items-center justify-center">
                  <div className="text-gray-400 line-through">${p.strikePrice}</div>
                  <div className="text-3xl font-bold">${p.price}</div>
                  <div className="text-sm text-gray-600">{p.promoNote}</div>
                  {p.hotspot && (
                    <div className="mt-1 text-blue-700 font-medium">Con Hotspot</div>
                  )}
                </div>

                {/* Beneficios */}
                <div className="flex flex-col items-center">
                  <div className="text-slate-600 -mt-1 text-base">x3 meses</div>
                </div>

                {/* Separador + Con Hotspot */}
                <div className={`mt-4 flex items-center gap-3 text-lg font-extrabold ${p.titleColor}`}>
                  <span className="h-px bg-current/40 flex-1" />
                  <span>Con Hotspot</span>
                  <span className="h-px bg-current/40 flex-1" />
                </div>

                {/* Apps ilimitadas */}
                <div className="mt-3 flex justify-center gap-2">
                  {p.apps.map((app) => {
                    const src = getIconUrl(app);
                    return src ? (
                      <img key={app} src={src} alt={app} className="w-7 h-7 rounded-md" />
                    ) : (
                      <span key={app} className="text-xs px-2 py-1 bg-gray-100 rounded">
                        {app}
                      </span>
                    );
                  })}
                </div>

                <div className={`${p.titleColor} text-center font-semibold`}>Ilimitadas</div>

                {/* Empujar CTAs al fondo */}
                <div className="mt-auto" />

                {/* CTAs */}
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      console.log("✅ Botón Contrata ahora presionado para:", p.name);
                      openModal(p.name);
                    }}
                    className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  >
                    Contrata ahora
                  </button>

                    <a
                      href={wa(`Hola, me interesa el ${p.name}`)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-center rounded-xl border border-green-600 py-2 hover:bg-green-50 transition"
                    >
                      Contrata en WhatsApp
                    </a>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <ModalPortabilidad
        isOpen={modal.open}
        planName={modal.plan}
        onClose={closeModal}
        onSubmit={handleFormSubmit}
      />
    </section>
  );
}
