// src/components/IntentFilters.jsx
import { intents } from "../config/plans";

// Mapea imágenes desde src/assets (funciona en dev y en build con hash)
const RAW_INTENT_ICONS = import.meta.glob("../assets/*.{png,svg,webp}", {
  eager: true,
  query: "?url",
  import: "default",
});

const INTENT_ICONS = {};
for (const [path, url] of Object.entries(RAW_INTENT_ICONS)) {
  const base = path.split("/").pop().replace(/\.(png|svg|webp)$/i, "").toLowerCase();
  INTENT_ICONS[base] = url;
}

// Acepta basename ("intent-movies") o rutas viejas ("/src/assets/intent-movies.png")
function resolveIntentIcon(icon) {
  if (!icon) return null;
  const base = icon.split("/").pop().replace(/\.(png|svg|webp)$/i, "").toLowerCase();
  return INTENT_ICONS[base] || null;
}

export default function IntentFilters({ activeIntent, onSelect }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {intents.map((i) => {
        const active = i.id === activeIntent;
        const iconSrc = resolveIntentIcon(i.icon || i.iconName);

        return (
          <button
            key={i.id}
            type="button"
            onClick={() => onSelect(i.id)}
            className={[
              "relative rounded-3xl px-4 pt-10 pb-5 text-center transition bg-white",
              "border hover:shadow-sm",
              active ? `${i.color?.border ?? "border-blue-500"} ${i.color?.ring ?? "ring-2 ring-blue-200"}` : "border-gray-300",
            ].join(" ")}
          >
            {/* Icono flotante */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <div
                className={[
                  "grid place-items-center w-16 h-16 rounded-2xl shadow-sm border bg-white overflow-hidden",
                  active ? i.color?.border ?? "border-blue-500" : "border-gray-200",
                ].join(" ")}
              >
                {iconSrc ? (
                  <img src={iconSrc} alt={i.label} className="w-10 h-10 object-contain" />
                ) : (
                  <span className={`text-2xl ${active ? i.color?.text ?? "text-blue-700" : "text-gray-500"}`}>★</span>
                )}
              </div>
            </div>

            {/* Texto */}
            <span className={`block text-sm leading-snug mt-2 ${active ? i.color?.text ?? "text-blue-700" : "text-gray-800"}`}>
              {i.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
