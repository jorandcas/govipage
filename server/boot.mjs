import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";

// Cargar dotenv SOLO en desarrollo
if (process.env.NODE_ENV !== "production") {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const dotenv = await import("dotenv");
  dotenv.config({ path: path.resolve(__dirname, ".env.local") });
  console.log("⚡ Variables cargadas desde server/.env.local");
}

import express from "express";
import cors from "cors";
import multer from "multer";

// ⬇️ INICIALIZACIÓN DE APP Y PUERTO
const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const HOST = "0.0.0.0";

// ⬇️ CORS (lista blanca por entorno)
const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS bloqueado para origen: ${origin}`));
    },
    credentials: true,
  })
);

// ⬇️ PARSERS
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

// ---------- Storage local (persistente) ----------
const UPLOAD_BASE = process.env.UPLOAD_DIR || "/app/uploads"; // en Coolify montas /data/uploads -> /app/uploads
fs.mkdirSync(UPLOAD_BASE, { recursive: true });

// Base pública para armar links (tu dominio de API)
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");
// Token admin (ya lo tienes)
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";

// ---------- Multer (memoria) ----------
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(png|jpe?g|webp)$/i.test(file.mimetype);
    if (!ok) return cb(new Error("Formato no permitido. Usa PNG/JPG/WEBP."));
    cb(null, true);
  },
});

// ---------- Helpers ----------
function sanitize(name = "") {
  return String(name)
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

function escapeHtml(v = "") {
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function prettyLabel(key = "") {
  const k = String(key)
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase();
  return k.charAt(0).toUpperCase() + k.slice(1);
}

function normalizeValue(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "Sí" : "No";
  if (Array.isArray(v)) return v.map((x) => String(x)).join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function extractAdminToken(req) {
  return (
    req.query.token ||
    req.get("x-admin-token") ||
    ((req.get("authorization") || "").match(/^Bearer\s+(.+)$/i) || [])[1]
  );
}

// Guarda archivo en disco y retorna ruta relativa segura
async function saveFileToDisk({ buffer, originalname, mimetype, folderRel }) {
  const ext =
    mimetype?.includes("png") ? "png" :
      mimetype?.includes("webp") ? "webp" :
        "jpg";

  const safeName = sanitize(originalname || `archivo.${ext}`);
  const fileName = `${Date.now()}-${safeName}`;
  const folderAbs = path.join(UPLOAD_BASE, folderRel);

  fs.mkdirSync(folderAbs, { recursive: true });

  const fileAbs = path.join(folderAbs, fileName);
  await fs.promises.writeFile(fileAbs, buffer);

  const relPath = path.posix.join(folderRel.split(path.sep).join("/"), fileName);
  return relPath; // ejemplo: portas/2026.../123-ine-frente.jpg
}

// Link de descarga protegido (solo mesa)
function adminDownloadUrl(relPath) {
  if (!PUBLIC_BASE_URL) return relPath; // fallback si no setearon base url
  // Nota: va protegido por token en query. Si prefieres header, lo ajustamos.
  return `${PUBLIC_BASE_URL}/admin/download?token=${encodeURIComponent(
    ADMIN_TOKEN
  )}&file=${encodeURIComponent(relPath)}`;
}

// --- Email (Brevo)
async function sendBrevoEmail({ to, subject, html, cc = [], replyTo }) {
  if (!process.env.BREVO_API_KEY) {
    console.warn("[BREVO] BREVO_API_KEY no definido; omitiendo envío.");
    return { skipped: true };
  }

  const toList = (to || []).filter(Boolean).map((email) => ({ email }));
  if (toList.length === 0) throw new Error('Parámetro "to" vacío');

  const ccList = (cc || []).filter(Boolean).map((email) => ({ email }));

  const payload = {
    sender: { email: process.env.FROM_EMAIL, name: process.env.FROM_NAME },
    to: toList,
    subject,
    htmlContent: html,
  };
  if (ccList.length) payload.cc = ccList;
  if (replyTo) payload.replyTo = { email: replyTo };

  const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    console.error("[BREVO] Error", resp.status, json);
    throw new Error(json?.message || `Brevo ${resp.status}`);
  }
  return json;
}

// --- Plantilla correo CLIENTE
function buildClientEmailHtml({ data, folio, createdAt, brand = {} }) {
  const color = brand.color || "#00A9E0";
  const logoUrl = brand.logoUrl || "";
  const nombre = escapeHtml((data.nombreCompleto || "").split(" ")[0] || "");
  const numero = escapeHtml(data.numeroPortar || "");
  const plan = escapeHtml(data.planElegido || "");
  const tel = escapeHtml(data.numeroContacto || "");
  const calle = escapeHtml(data.calle || "");
  const numext = escapeHtml(data.numeroExterior || "");
  const cp = escapeHtml(data.codigoPostal || "");
  const nip = escapeHtml(data.nip || "");
  const fecha = createdAt
    ? new Date(createdAt).toLocaleString()
    : new Date().toLocaleString();

  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"/><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7fb;padding:24px 0">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden">
        <tr><td style="background:${color};padding:20px 24px" align="left">
          ${logoUrl
      ? `<img src="${logoUrl}" alt="Movistar" style="height:28px;display:block">`
      : `<div style="color:#fff;font-weight:700;font-size:18px">Distribuidor Movistar</div>`
    }
        </td></tr>
        <tr><td style="padding:24px">
          <h1 style="margin:0 0 12px;font-size:22px;color:#111827">¡Gracias, ${nombre}!</h1>
          <p style="margin:0 0 16px;color:#374151">Hemos recibido tu solicitud de portabilidad y <b>tu proceso ha iniciado</b>.</p>
          <p style="margin:0 0 16px;color:#374151"><b>Folio:</b> ${folio}<br/><b>Fecha:</b> ${escapeHtml(fecha)}</p>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin:12px 0;border:1px solid #E5E7EB;border-radius:12px">
            <tr><td style="padding:10px 12px;width:40%;color:#6B7280">Número a portar</td><td style="padding:10px 12px">${numero}</td></tr>
            <tr><td style="padding:10px 12px;color:#6B7280">NIP</td><td style="padding:10px 12px">${nip}</td></tr>
            <tr><td style="padding:10px 12px;color:#6B7280">Plan elegido</td><td style="padding:10px 12px">${plan}</td></tr>
            <tr><td style="padding:10px 12px;color:#6B7280">Teléfono de contacto</td><td style="padding:10px 12px">${tel}</td></tr>
            <tr><td style="padding:10px 12px;color:#6B7280">Dirección</td><td style="padding:10px 12px">${calle} ${numext}, CP ${cp}</td></tr>
          </table>
          <div style="margin-top:20px">
            <a href="https://wa.me/522228774712" style="background:${color};color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;display:inline-block;font-weight:700">Atención por WhatsApp</a>
          </div>
          <p style="margin:20px 0 0;font-size:12px;color:#6B7280">Si no solicitaste este trámite, responde este correo.</p>
        </td></tr>
        <tr><td style="padding:16px 24px;background:#F3F4F6;color:#6B7280;font-size:12px">© ${new Date().getFullYear()} Distribuidor Movistar.</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// --- Plantilla correo MESA (dinámica)
function buildOpsEmailHtmlDynamic({ data = {}, folio, urls = {}, createdAt, meta = {} }) {
  const color = "#00A9E0";
  const fecha = createdAt ? new Date(createdAt).toLocaleString() : new Date().toLocaleString();

  const ORDER_FIRST = [
    "nombreCompleto", "email", "numeroPortar", "nip", "numeroContacto",
    "planElegido", "calle", "numeroExterior", "codigoPostal",
    "descripcionVivienda", "aceptaTyC", "origen", "userAgent"
  ];

  const entries = Object.entries(data);
  const idx = (k) => {
    const i = ORDER_FIRST.indexOf(k);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  entries.sort((a, b) => {
    const ai = idx(a[0]), bi = idx(b[0]);
    if (ai !== bi) return ai - bi;
    return a[0].localeCompare(b[0]);
  });

  const rows = entries.map(([k, v]) => `
    <tr>
      <td style="padding:8px 10px;width:38%;color:#6B7280;border-bottom:1px solid #E5E7EB;">${escapeHtml(prettyLabel(k))}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #E5E7EB;">${escapeHtml(normalizeValue(v))}</td>
    </tr>
  `).join("");

  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"/><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7fb;padding:24px 0">
    <tr><td align="center">
      <table role="presentation" width="720" cellpadding="0" cellspacing="0" style="max-width:720px;background:#fff;border-radius:16px;overflow:hidden">
        <tr><td style="background:${color};padding:16px 20px;color:#fff;font-weight:700">Nueva solicitud de portabilidad · Folio ${escapeHtml(String(folio))}</td></tr>
        <tr><td style="padding:18px 20px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:12px;border-collapse:collapse;overflow:hidden">
            <tr><td colspan="2" style="background:#F9FAFB;padding:10px 12px;font-weight:700;color:#111827;border-bottom:1px solid #E5E7EB">Datos capturados en el formulario</td></tr>
            ${rows}
          </table>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;border:1px solid #E5E7EB;border-radius:12px;border-collapse:collapse;overflow:hidden">
            <tr><td colspan="2" style="background:#F9FAFB;padding:10px 12px;font-weight:700;color:#111827;border-bottom:1px solid #E5E7EB">Archivos (descarga segura)</td></tr>
            <tr><td style="padding:10px 12px;width:38%;color:#6B7280;border-bottom:1px solid #E5E7EB">INE Frente</td>
                <td style="padding:10px 12px;border-bottom:1px solid #E5E7EB"><a href="${urls.frente || "#"}" target="_blank">Descargar</a></td></tr>
            <tr><td style="padding:10px 12px;color:#6B7280">INE Reverso</td>
                <td style="padding:10px 12px"><a href="${urls.reverso || "#"}" target="_blank">Descargar</a></td></tr>
          </table>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;border:1px solid #E5E7EB;border-radius:12px;border-collapse:collapse;overflow:hidden">
            <tr><td colspan="2" style="background:#F9FAFB;padding:10px 12px;font-weight:700;color:#111827;border-bottom:1px solid #E5E7EB">Meta</td></tr>
            <tr><td style="padding:8px 10px;width:38%;color:#6B7280;border-bottom:1px solid #E5E7EB">Folio</td><td style="padding:8px 10px;border-bottom:1px solid #E5E7EB">${escapeHtml(String(folio))}</td></tr>
            <tr><td style="padding:8px 10px;color:#6B7280;border-bottom:1px solid #E5E7EB">Fecha creación</td><td style="padding:8px 10px;border-bottom:1px solid #E5E7EB">${escapeHtml(fecha)}</td></tr>
            <tr><td style="padding:8px 10px;color:#6B7280;border-bottom:1px solid #E5E7EB">Origen</td><td style="padding:8px 10px;border-bottom:1px solid #E5E7EB">${escapeHtml(data.origen || "landing-movistar")}</td></tr>
            <tr><td style="padding:8px 10px;color:#6B7280;border-bottom:1px solid #E5E7EB">User-Agent</td><td style="padding:8px 10px;border-bottom:1px solid #E5E7EB">${escapeHtml(data.userAgent || meta.userAgent || "")}</td></tr>
            <tr><td style="padding:8px 10px;color:#6B7280">IP</td><td style="padding:8px 10px">${escapeHtml(meta.ip || "")}</td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:12px 20px;background:#F3F4F6;color:#6B7280;font-size:12px">Este correo fue generado automáticamente.</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ---------- Health público ----------
app.get("/health", (req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || "dev", time: new Date().toISOString() });
});

// ---------- Descarga segura (requiere ADMIN_TOKEN) ----------
app.get("/admin/download", async (req, res) => {
  try {
    const token = extractAdminToken(req);
    if (!ADMIN_TOKEN) return res.status(500).json({ ok: false, error: "ADMIN_TOKEN not set" });
    if (token !== ADMIN_TOKEN) return res.status(401).json({ ok: false, error: "unauthorized" });

    const rel = String(req.query.file || "");
    if (!rel) return res.status(400).json({ ok: false, error: "file is required" });

    // prevenir path traversal
    const abs = path.resolve(UPLOAD_BASE, rel);
    const base = path.resolve(UPLOAD_BASE);
    if (!abs.startsWith(base)) return res.status(400).json({ ok: false, error: "invalid path" });

    return res.sendFile(abs);
  } catch (e) {
    console.error("[admin/download] error:", e);
    return res.status(500).json({ ok: false, error: e?.message || "error" });
  }
});

// ---------- Endpoint principal ----------
app.post(
  "/api/portabilidad",
  upload.fields([
    { name: "ineFrente", maxCount: 1 },
    { name: "ineReverso", maxCount: 1 },
    { name: "frente", maxCount: 1 }, // alias compatibles
    { name: "reverso", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      // 1) data
      const rawData = req.body?.data || "{}";
      const data = JSON.parse(rawData);

      // 2) archivos
      const fFrente = req.files?.ineFrente?.[0] || req.files?.frente?.[0] || null;
      const fReverso = req.files?.ineReverso?.[0] || req.files?.reverso?.[0] || null;
      if (!fFrente || !fReverso) {
        return res.status(400).json({ ok: false, error: "INE frente y reverso son requeridos" });
      }

      // 3) folio + carpeta
      const folio = crypto.randomUUID();
      const now = new Date().toISOString().replace(/[:.]/g, "-");
      const folderRel = `portas/${now}-${sanitize(data?.numeroPortar || "sin-numero")}-${folio.slice(0, 8)}`;

      // 4) guardar archivos
      const relFrente = await saveFileToDisk({
        buffer: fFrente.buffer,
        originalname: `ine-frente-${fFrente.originalname}`,
        mimetype: fFrente.mimetype,
        folderRel,
      });

      const relReverso = await saveFileToDisk({
        buffer: fReverso.buffer,
        originalname: `ine-reverso-${fReverso.originalname}`,
        mimetype: fReverso.mimetype,
        folderRel,
      });

      // 5) URLs seguras para Mesa (requiere ADMIN_TOKEN)
      const urlFrente = adminDownloadUrl(relFrente);
      const urlReverso = adminDownloadUrl(relReverso);

      const createdAt = new Date();
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

      // 6a) correo mesa
      const emailStatus = { mesa: null, cliente: null };
      try {
        const htmlOps = buildOpsEmailHtmlDynamic({
          data,
          folio,
          urls: { frente: urlFrente, reverso: urlReverso },
          createdAt,
          meta: { ip, userAgent: data.userAgent },
        });

        const rMesa = await sendBrevoEmail({
          to: [process.env.MESA_CONTROL],
          cc: [process.env.CC_OPERACIONES],
          subject: `Nueva solicitud de portabilidad – Folio ${folio}`,
          html: htmlOps,
        });
        emailStatus.mesa = { ok: true, resp: rMesa };
      } catch (e) {
        emailStatus.mesa = { ok: false, error: e.message };
        console.error("[BREVO] Falló envío a Mesa de Control:", e.message);
      }

      // 6b) correo cliente
      try {
        const clienteEmail = String(data.email || "").trim();
        if (clienteEmail) {
          const htmlCliente = buildClientEmailHtml({ data, folio, createdAt, brand: { color: "#00A9E0" } });
          const rCliente = await sendBrevoEmail({
            to: [clienteEmail],
            subject: "Hemos recibido tu solicitud de portabilidad",
            html: htmlCliente,
            replyTo: process.env.MESA_CONTROL,
          });
          emailStatus.cliente = { ok: true, resp: rCliente };
        } else {
          emailStatus.cliente = { ok: false, error: "Email vacío" };
        }
      } catch (e) {
        emailStatus.cliente = { ok: false, error: e.message };
        console.error("[BREVO] Falló envío al cliente:", e.message);
      }

      // 7) respuesta
      return res.json({
        ok: true,
        folio,
        folder: folderRel,
        files: { frente: relFrente, reverso: relReverso },
        urls: { frente: urlFrente, reverso: urlReverso },
        emailStatus,
      });
    } catch (err) {
      console.error("[POST /api/portabilidad] ERROR:", err);
      return res.status(500).json({ ok: false, error: err?.message || "Server error" });
    }
  }
);

// Endpoint de salud API
app.get("/api/health", (req, res) => {
  res.status(200).send("ok");
});

// ---------- Start ----------
app.listen(PORT, HOST, () => {
  console.log(`[API] Ready on ${HOST}:${PORT} (env: ${process.env.NODE_ENV || "dev"})`);
});
