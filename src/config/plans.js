import { WHATSAPP_NUMBER } from "../config/site";//← WhatsApp Bussiness

// Píldoras (preferencias) que marcan el plan favorito
export const intents = [
  {
    id: "maraton",
    label: "Maratón de pelis sin parar",
    planId: "pro-ilim",
    color: {
      border: "border-fuchsia-500",
      ring: "ring-fuchsia-200",
      text: "text-fuchsia-600",
      badge: "bg-fuchsia-500",
    },
    // Si usas imagen:
    icon: "src/assets/intent-movies.png",
    // Si no tienes imagen aún:
    emojiFallback: "🎬",
  },
  {
    id: "tiktok",
    label: "TikTok 24/7 sin miedo a mis datos",
    planId: "pro-25",
    color: {
      border: "border-sky-500",
      ring: "ring-sky-200",
      text: "text-sky-600",
      badge: "bg-sky-500",
    },
    icon: "src/assets/intent-tiktok.png",
    emojiFallback: "📱",
  },
  {
    id: "videos",
    label: "Disfrutar videos todo el día",
    planId: "pro-35",
    color: {
      border: "border-slate-700",
      ring: "ring-slate-300",
      text: "text-slate-800",
      badge: "bg-slate-800",
    },
    icon: "src/assets/intent-play.png",
    emojiFallback: "▶️",
  },
  {
    id: "podcast",
    label: "Escuchar mi podcast favorito sin pausas",
    planId: "pro-18",
    color: {
      border: "border-pink-500",
      ring: "ring-pink-200",
      text: "text-pink-600",
      badge: "bg-pink-500",
    },
    icon: "src/assets/intent-headphones.png",
    emojiFallback: "🎧",
  },
];

// Planes
export const plans = [
  {
    id: "pro-ilim",
    name: "Plan Pro Ilimitado",
    price: 579,
    strikePrice: 579,
    promoNote: "x3 meses",
    hotspot: true,
    dataLabel: "GB ilimitados",
    color: "bg-fuchsia-600",
    apps: ["whatsapp","facebook","instagram","spotify","tiktok","youtube"],
  },
  {
    id: "pro-35",
    name: "Plan Pro 35",
    price: 429,
    strikePrice: 449,
    promoNote: "x3 meses",
    hotspot: true,
    dataLabel: "35 GB",
    color: "bg-slate-900",
    apps: ["whatsapp","facebook","instagram","spotify","tiktok","youtube"],
  },
  {
    id: "pro-25",
    name: "Plan Pro 25",
    price: 329,
    strikePrice: 349,
    promoNote: "x3 meses",
    hotspot: true,
    dataLabel: "25 GB",
    color: "bg-sky-500",
    apps: ["whatsapp","facebook","instagram","spotify","tiktok","youtube"],
  },
  {
    id: "pro-18",
    name: "Plan Pro 18",
    price: 150,
    strikePrice: 299,
    promoNote: "x3 meses",
    hotspot: true,
    dataLabel: "18 GB + 10 GB",
    color: "bg-pink-500",
    apps: ["whatsapp","facebook","instagram","spotify"],
  },
];
