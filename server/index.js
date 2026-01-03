import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';


// =========================
// Config básica del server
// =========================
const app = express();

// Opcional: restringe CORS por ambiente
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);
app.use(
  cors(
    ALLOWED_ORIGINS.length
      ? { origin: ALLOWED_ORIGINS }
      : undefined // si no hay lista, permite cualquiera (como estaba)
  )
);
app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 5174; // en cPanel lo setea Passenger
const HOST = "0.0.0.0";

// =========================
// ENV / Supabase
// =========================
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE || process.env.SERVICE_ROLE; // <- fix
const BUCKET = process.env.SUPABASE_BUCKET || "portabilidad";

// opcional: si tu bucket es público, pon SUPABASE_PUBLIC_BUCKET=1
const PUBLIC_BUCKET = process.env.SUPABASE_PUBLIC_BUCKET === "1";
const SIGNED_TTL = Number(
  process.env.SUPABASE_SIGNED_URL_TTL || 60 * 60 * 24 * 7
); // 7 días

if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL");
if (!SERVICE_KEY)
  throw new Error("Missing SUPABASE_SERVICE_ROLE / SERVICE_ROLE");

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// =========================
// Multer (subida de archivos)
// =========================
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB c/u
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(png|jpe?g|webp)$/i.test(file.mimetype);
    if (!ok) return cb(new Error("Formato no permitido. Usa PNG/JPG/WEBP."));
    cb(null, true);
  },
});

// =========================
// Helpers
// =========================
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

// === Subir a Supabase Storage y obtener URL (pública o firmada)
async function uploadToStorage({ buffer, mimetype, destPath }) {
  // 1) subir
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(
    destPath,
    buffer,
    {
      contentType: mimetype,
      upsert: true, // sobrescribe si existe
    }
  );

  if (upErr) {
    console.error("[Storage] Upload error:", upErr);
    throw new Error("Error subiendo archivo a Storage");
  }

  // 2) URL
  if (PUBLIC_BUCKET) {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(destPath);
    return data.publicUrl;
  } else {
    const { data, error } = await supabase
      .storage
      .from(BUCKET)
      .createSignedUrl(destPath, SIGNED_TTL);
    if (error) {
      console.error("[Storage] Signed URL error:", error);
      throw new Error("Error generando URL firmada");
    }
    return data.signedUrl;
  }
}

// === Email (Brevo)
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
  if (ccList.length > 0) payload.cc = ccList; // <- solo si hay cc
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

// === Plantilla correo CLIENTE (bonito)
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
  const nip = escapeHtml(data.nip || ""); // COMPLETO (lo pediste así)
  const fecha = createdAt
    ? new Date(createdAt).toLocaleString()
    : new Date().toLocaleString();

  return `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<title>Confirmación de solicitud</title>
<style>.preheader{display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all}a[x-apple-data-detectors]{color:inherit!important;text-decoration:none!important}</style>
</head>
<body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif">
  <span class="preheader">Tu proceso de portabilidad ha iniciado. Folio ${folio}.</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7fb;padding:24px 0">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden">
        <tr><td style="background:${color};padding:20px 24px" align="left">
          ${
            logoUrl
              ? `<img src="${logoUrl}" alt="Movistar" style="height:28px;display:block">`
              : `<div style="color:#fff;font-weight:700;font-size:18px">Distribuidor Movistar</div>`
          }
        </td></tr>
        <tr><td style="padding:24px">
          <h1 style="margin:0 0 12px;font-size:22px;color:#111827">¡Gracias, ${nombre}!</h1>
          <p style="margin:0 0 16px;color:#374151;line-height:1.5">Hemos recibido tu solicitud de portabilidad y <b>tu proceso ha iniciado</b>.</p>
          <p style="margin:0 0 16px;color:#374151;line-height:1.5">
            <b>Folio:</b> ${folio}<br/>
            <b>Fecha:</b> ${escapeHtml(fecha)}
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin:12px 0;border:1px solid #E5E7EB;border-radius:12px">
            <tr><td colspan="2" style="background:#F9FAFB;color:#111827;font-weight:700;padding:10px 12px;border-bottom:1px solid #E5E7EB">Resumen de tu solicitud</td></tr>
            <tr><td style="padding:10px 12px;width:40%;color:#6B7280">Número a portar</td><td style="padding:10px 12px">${numero}</td></tr>
            <tr><td style="padding:10px 12px;color:#6B7280">NIP</td><td style="padding:10px 12px">${nip}</td></tr>
            <tr><td style="padding:10px 12px;color:#6B7280">Plan elegido</td><td style="padding:10px 12px">${plan}</td></tr>
            <tr><td style="padding:10px 12px;color:#6B7280">Teléfono de contacto</td><td style="padding:10px 12px">${tel}</td></tr>
            <tr><td style="padding:10px 12px;color:#6B7280">Dirección</td><td style="padding:10px 12px">${calle} ${numext}, CP ${cp}</td></tr>
          </table>
          <div style="margin-top:20px">
            <a href="https://wa.me/522228774712" style="background:${color};color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;display:inline-block;font-weight:700">Atención por WhatsApp</a>
          </div>
          <p style="margin:20px 0 0;font-size:12px;color:#6B7280">Si no solicitaste este trámite, por favor responde este correo.</p>
        </td></tr>
        <tr><td style="padding:16px 24px;background:#F3F4F6;color:#6B7280;font-size:12px">© ${new Date().getFullYear()} Distribuidor Movistar. Todos los derechos reservados.</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// === Plantilla correo MESA (todos los campos + adjuntos)
function buildOpsEmailHtmlDynamic({ data = {}, folio, urls = {}, createdAt, meta = {} }) {
  const color = "#00A9E0";
  const fecha = createdAt
    ? new Date(createdAt).toLocaleString()
    : new Date().toLocaleString();

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

  return `<!doctype html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1"/><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" /></head>
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
            <tr><td colspan="2" style="background:#F9FAFB;padding:10px 12px;font-weight:700;color:#111827;border-bottom:1px solid #E5E7EB">Adjuntos / Storage</td></tr>
            <tr><td style="padding:10px 12px;width:38%;color:#6B7280;border-bottom:1px solid #E5E7EB">INE Frente</td>
                <td style="padding:10px 12px;border-bottom:1px solid #E5E7EB"><a href="${urls.frente || "#"}" target="_blank">Abrir archivo</a></td></tr>
            <tr><td style="padding:10px 12px;color:#6B7280">INE Reverso</td>
                <td style="padding:10px 12px"><a href="${urls.reverso || "#"}" target="_blank">Abrir archivo</a></td></tr>
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

// =========================
// Healthchecks
// =========================
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    env: process.env.NODE_ENV || "dev",
    time: new Date().toISOString(),
  });
});

// Ruta segura (con token) para health interno: /admin/health?token=XXXX
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";
app.get("/admin/health", (req, res) => {
  if (!ADMIN_TOKEN || req.query.token !== ADMIN_TOKEN) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }
  res.json({
    ok: true,
    env: process.env.NODE_ENV || "dev",
    time: new Date().toISOString(),
    pid: process.pid,
  });
});

// =========================
// Endpoint principal
// =========================
app.post(
  "/api/portabilidad",
  upload.fields([
    { name: "ineFrente", maxCount: 1 },
    { name: "ineReverso", maxCount: 1 },
    // alias opcionales por compatibilidad:
    { name: "frente", maxCount: 1 },
    { name: "reverso", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      // 1) data en JSON (campo "data" dentro del multipart)
      const rawData = req.body?.data || "{}";
      const data = JSON.parse(rawData);
      console.log("BODY data length:", rawData.length);

      // 2) archivos
      const fFrente =
        req.files?.ineFrente?.[0] || req.files?.frente?.[0] || null;
      const fReverso =
        req.files?.ineReverso?.[0] || req.files?.reverso?.[0] || null;

      console.log("FILES:", {
        frente: fFrente?.originalname,
        reverso: fReverso?.originalname,
      });

      if (!fFrente || !fReverso) {
        return res
          .status(400)
          .json({ ok: false, error: "INE frente y reverso son requeridos" });
      }

      // 3) carpeta destino en Storage
      const now = new Date().toISOString().replace(/[:.]/g, "-");
      const carpeta = `portas/${now}-${sanitize(
        data?.numeroPortar || "sin-numero"
      )}`;

      // 4) subidas
      const frentePath = `${carpeta}/ine-frente-${sanitize(
        fFrente.originalname
      )}`;
      const reversoPath = `${carpeta}/ine-reverso-${sanitize(
        fReverso.originalname
      )}`;

      const urlFrente = await uploadToStorage({
        buffer: fFrente.buffer,
        mimetype: fFrente.mimetype,
        destPath: frentePath,
      });

      const urlReverso = await uploadToStorage({
        buffer: fReverso.buffer,
        mimetype: fReverso.mimetype,
        destPath: reversoPath,
      });

      // 5) Guardar en BD (tabla: portabilidades) -> obtener folio (id)
      const { data: inserted, error } = await supabase
        .from("portabilidades")
        .insert([
          {
            nombre_completo: data.nombreCompleto,
            email: data.email,
            numero_portar: data.numeroPortar,
            nip: data.nip,
            numero_contacto: data.numeroContacto,
            plan_elegido: data.planElegido || "",
            calle: data.calle,
            numero_exterior: data.numeroExterior,
            codigo_postal: data.codigoPostal,
            descripcion_vivienda: data.descripcionVivienda || "",
            ine_frente_url: urlFrente,
            ine_reverso_url: urlReverso,
            storage_carpeta: carpeta,
            created_at: new Date().toISOString(),
          },
        ])
        .select("id")
        .single();

      if (error) {
        console.error("DB insert error:", error);
        return res
          .status(500)
          .json({ ok: false, error: "Error guardando en base de datos" });
      }

      // 6) Envío de correos
      const emailStatus = { mesa: null, cliente: null };
      const createdAt = new Date();
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

      // 6a) Mesa + CC
      try {
        const htmlOps = buildOpsEmailHtmlDynamic({
          data,
          folio: inserted.id,
          urls: { frente: urlFrente, reverso: urlReverso },
          createdAt,
          meta: { ip, userAgent: data.userAgent },
        });

        const rMesa = await sendBrevoEmail({
          to: [process.env.MESA_CONTROL],
          cc: [process.env.CC_OPERACIONES],
          subject: `Nueva solicitud de portabilidad – Folio ${inserted.id}`,
          html: htmlOps,
        });

        emailStatus.mesa = { ok: true, resp: rMesa };
        console.log("[BREVO] Enviado a Mesa de Control");
      } catch (e) {
        emailStatus.mesa = { ok: false, error: e.message };
        console.error("[BREVO] Falló envío a Mesa de Control:", e.message);
      }

      // 6b) Cliente
      try {
        const clienteEmail = String(data.email || "").trim();
        if (clienteEmail) {
          const htmlCliente = buildClientEmailHtml({
            data,
            folio: inserted.id,
            createdAt,
            brand: { color: "#00A9E0" },
          });

          const rCliente = await sendBrevoEmail({
            to: [clienteEmail],
            subject: "Hemos recibido tu solicitud de portabilidad",
            html: htmlCliente,
            replyTo: process.env.MESA_CONTROL,
          });

          emailStatus.cliente = { ok: true, resp: rCliente };
          console.log("[BREVO] Enviado al cliente");
        } else {
          emailStatus.cliente = { ok: false, error: "Email vacío" };
          console.warn(
            "[BREVO] Email de cliente vacío; no se envía confirmación"
          );
        }
      } catch (e) {
        emailStatus.cliente = { ok: false, error: e.message };
        console.error("[BREVO] Falló envío al cliente:", e.message);
      }

      // 7) Respuesta final
      return res.json({
        ok: true,
        folio: inserted.id,
        carpeta,
        files: { frente: frentePath, reverso: reversoPath },
        urls: { frente: urlFrente, reverso: urlReverso },
        emailStatus,
      });
    } catch (err) {
      console.error("[POST /api/portabilidad] ERROR:", err);
      return res
        .status(500)
        .json({ ok: false, error: err?.message || "Server error" });
    }
  }
);
// --- RUTAS ADMIN SEGURAS ---
// --- Ruta de verificación (protegida) ---
// --- Healthcheck seguro ---
app.get('/admin/health', (req, res) => {
  // Acepta token por query ?token=..., por header x-admin-token o Authorization: Bearer
  const token =
    req.query.token ||
    req.get('x-admin-token') ||
    ((req.get('authorization') || '').match(/^Bearer\s+(.+)$/i) || [])[1];

  if (!process.env.ADMIN_TOKEN) {
    return res.status(500).json({ ok: false, error: 'ADMIN_TOKEN not set' });
  }
  if (token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  res.json({
    ok: true,
    env: process.env.NODE_ENV,
    pid: process.pid,
    uptime: Math.round(process.uptime()),
    now: new Date().toISOString(),
  });
});



// =========================
// Start
// =========================
app.listen(PORT, HOST, () => {
  console.log(
    `[API] Ready on port ${PORT} (env: ${process.env.NODE_ENV || "dev"})`
  );
});
