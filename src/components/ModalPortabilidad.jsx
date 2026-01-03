import { useEffect, useMemo, useState } from "react";

export default function ModalPortabilidad({ isOpen, onClose, planName = "", onSubmit }) {
  // Estado base del formulario
  const base = useMemo(
    () => ({
      nombreCompleto: "",
      email: "",
      numeroPortar: "",
      nip: "",
      numeroContacto: "",
      planElegido: planName || "",
      calle: "",
      numeroExterior: "",
      codigoPostal: "",
      descripcionVivienda: "",
      aceptaTyC: false,
    }),
    [planName]
  );

  const [form, setForm] = useState(base);
  const [files, setFiles] = useState({ ineFrente: null, ineReverso: null });
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);

  // === Toast minimalista ===
  const [toast, setToast] = useState(null); // { msg, type: 'success'|'error' }
  function notify(msg, type = "success") {
    setToast({ msg, type });
    // auto-ocultar
    setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    if (isOpen) {
      setForm((s) => ({ ...base, planElegido: planName || "" }));
      setFiles({ ineFrente: null, ineReverso: null });
      setErrors({});
    }
  }, [isOpen, base, planName]);

  // Cerrar con ESC
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const update = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((s) => ({ ...s, [name]: type === "checkbox" ? checked : value }));
  };

  // Validaciones rápidas de UI
  const validate = () => {
    const errs = {};
    const MB = 1024 * 1024;
    const maxSize = 15 * MB;
    const okType = (t) => /image\/(png|jpeg|jpg|webp)/i.test(t);

    if (!form.nombreCompleto.trim()) errs.nombreCompleto = "Requerido";

    // Email: opcional. Si viene, validar formato
    if (form.email?.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Email inválido";
    }

    // Teléfonos: 10 dígitos
    if (!/^\d{10}$/.test(form.numeroPortar)) errs.numeroPortar = "10 dígitos";
    if (!/^\d{10}$/.test(form.numeroContacto)) errs.numeroContacto = "10 dígitos";

    // NIP: 4–8 dígitos
    if (!/^\d{4,8}$/.test(form.nip)) errs.nip = "4 a 8 dígitos";

    if (!form.planElegido.trim()) errs.planElegido = "Requerido";
    if (!form.calle.trim()) errs.calle = "Requerido";
    if (!form.numeroExterior.trim()) errs.numeroExterior = "Requerido";
    if (!/^\d{5}$/.test(form.codigoPostal)) errs.codigoPostal = "5 dígitos";

    // Archivos requeridos
    if (!files.ineFrente) errs.ineFrente = "Adjunta INE frontal";
    if (!files.ineReverso) errs.ineReverso = "Adjunta INE reverso";

    // Validar tipo y tamaño
    if (files.ineFrente) {
      if (!okType(files.ineFrente.type)) errs.ineFrente = "Formato inválido (usa PNG/JPG/WEBP)";
      else if (files.ineFrente.size > maxSize) errs.ineFrente = "Máx. 15MB";
    }
    if (files.ineReverso) {
      if (!okType(files.ineReverso.type)) errs.ineReverso = "Formato inválido (usa PNG/JPG/WEBP)";
      else if (files.ineReverso.size > maxSize) errs.ineReverso = "Máx. 15MB";
    }

    if (!form.aceptaTyC) errs.aceptaTyC = "Debes aceptar T&C";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Envío
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("🚀 [Modal] handleSubmit disparado");

    const ok = validate();
    console.log("🧪 [Modal] validate() ->", ok, "errores:", errors);
    if (!ok) {
      notify("Revisa los campos marcados e intenta nuevamente.", "error");
      return;
    }

    // Construcción del FormData
    const fd = new FormData();
    const dataPayload = {
      ...form,
      planElegido: form.planElegido || (planName ?? ""),
      origen: "landing-movistar",
      userAgent: navigator.userAgent,
    };

    fd.append("data", JSON.stringify(dataPayload));
    if (files?.ineFrente) fd.append("ineFrente", files.ineFrente);
    if (files?.ineReverso) fd.append("ineReverso", files.ineReverso);

    // Logs de verificación
    console.log("📦 [Modal] keys ->", [...fd.keys()]);
    try {
      console.log("📝 [Modal] data ->", JSON.parse(fd.get("data")));
    } catch {
      console.warn("⚠️ [Modal] 'data' no es JSON válido:", fd.get("data"));
    }
    console.log("📎 [Modal] ineFrente ->", fd.get("ineFrente"));
    console.log("📎 [Modal] ineReverso ->", fd.get("ineReverso"));

    if (typeof onSubmit !== "function") {
      console.error("❌ [Modal] onSubmit no es función");
      notify("Error interno. Intenta más tarde.", "error");
      return;
    }

    try {
  setSending(true);
  console.log("📤 [Modal] Llamando a onSubmit(fd)...");
  const json = await onSubmit(fd);
  console.log("📨 [Modal] respuesta API ->", json);

  if (!json?.ok) throw new Error(json?.error || "Error en envío");

  // ✅ Éxito: toast pequeño
  notify("Solicitud enviada correctamente", "success");

  // 🔒 evita doble envío por si el usuario hace click de más
  setSending(true);

  // ⏳ cerrar modal automáticamente tras mostrar el toast (~1.2s)
  setTimeout(() => {
    // Limpieza opcional para que al volver a abrir esté vacío
    setForm(base);
    setFiles({ ineFrente: null, ineReverso: null });
    onClose?.();
  }, 1200);
} catch (err) {
  console.error("💥 [Modal] Error en onSubmit:", err);
  notify("No se pudo enviar la solicitud. Intenta de nuevo.", "error");
} finally {
  // el sending queda true hasta que cierre; si prefieres, puedes volverlo false aquí
  // setSending(false);
}

  };

  // UI
  return (
    <div
      className="fixed inset-0 z-[999] bg-black/40 grid place-items-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="w-full max-w-xl h-[85vh] bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b bg-white sticky top-0 z-10 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-slate-800">Solicitud de portabilidad</h3>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 rounded-full w-8 h-8 grid place-items-center"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Contenido scrolleable */}
        <form
          id="portabilidadForm"
          onSubmit={handleSubmit}
          noValidate
          className="flex-1 overflow-y-auto px-5 py-4"
        >
          {/* Datos personales */}
          <Section title="Datos personales">
            <Field
              label="Nombre completo *"
              name="nombreCompleto"
              value={form.nombreCompleto}
              onChange={update}
              error={errors.nombreCompleto}
            />
            <Field
              label="Correo electrónico *"
              name="email"
              type="email"
              value={form.email}
              onChange={update}
              error={errors.email}
            />
            <Field
              label="Número a portar *"
              name="numeroPortar"
              inputMode="numeric"
              placeholder="10 dígitos"
              maxLength={10}
              value={form.numeroPortar}
              onChange={update}
              error={errors.numeroPortar}
            />
            <Field
              label="NIP (4–8 dígitos) *"
              name="nip"
              inputMode="numeric"
              value={form.nip}
              onChange={update}
              error={errors.nip}
            />
            <Field
              label="Plan a elegir *"
              name="planElegido"
              value={form.planElegido}
              onChange={update}
              readOnly
              error={errors.planElegido}
            />
            <Field
              label="Número de contacto *"
              name="numeroContacto"
              inputMode="numeric"
              placeholder="10 dígitos"
              maxLength={10}
              value={form.numeroContacto}
              onChange={update}
              error={errors.numeroContacto}
            />
          </Section>

          {/* Documentación */}
          <Section title="Documentación requerida">
            <FileField
              label="INE - Lado frontal *"
              error={errors.ineFrente}
              onChange={(file) => setFiles((s) => ({ ...s, ineFrente: file }))}
            />
            <FileField
              label="INE - Lado trasero *"
              error={errors.ineReverso}
              onChange={(file) => setFiles((s) => ({ ...s, ineReverso: file }))}
            />
          </Section>

          {/* Envío */}
          <Section title="Datos de envío">
            <Field label="Nombre de la calle *" name="calle" value={form.calle} onChange={update} error={errors.calle} />
            <Field
              label="Número exterior *"
              name="numeroExterior"
              value={form.numeroExterior}
              onChange={update}
              error={errors.numeroExterior}
            />
            <Field
              label="Código postal *"
              name="codigoPostal"
              inputMode="numeric"
              placeholder="5 dígitos"
              maxLength={5}
              value={form.codigoPostal}
              onChange={update}
              error={errors.codigoPostal}
            />
            <TextArea
              label="Descripción de la vivienda"
              name="descripcionVivienda"
              value={form.descripcionVivienda}
              onChange={update}
            />
          </Section>

          {/* TyC */}
          <div className="mt-4 flex items-start gap-3">
            <input
              id="aceptaTyC"
              name="aceptaTyC"
              type="checkbox"
              checked={form.aceptaTyC}
              onChange={update}
              className="mt-1 h-4 w-4"
            />
            <label htmlFor="aceptaTyC" className="text-sm text-slate-700">
              Acepto los{" "}
              <a href="/terminos" target="_blank" className="text-sky-600 underline">
                Términos y Condiciones
              </a>
              .
              {errors.aceptaTyC && <span className="block text-red-600 mt-1">{errors.aceptaTyC}</span>}
            </label>
          </div>

          {/* Relleno para que no tape el footer */}
          <div className="h-5" />
        </form>

        {/* Footer */}
        <div className="px-5 py-4 border-t bg-white sticky bottom-0 z-10 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="portabilidadForm" // dispara el form de arriba
            onClick={() => console.log("🖱️ [Modal] Click en botón Enviar")}
            disabled={sending}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-60"
          >
            {sending ? "Enviando..." : "Enviar solicitud"}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2 rounded-lg shadow-lg text-white text-sm
                      ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}
          role="status"
          aria-live="polite"
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

/* ——— Subcomponentes ——— */

function Section({ title, children }) {
  return (
    <fieldset className="mb-5">
      <legend className="text-sm font-extrabold text-slate-900 mb-3">{title}</legend>
      <div className="space-y-3">{children}</div>
    </fieldset>
  );
}

function Field({ label, error, ...rest }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1">{label}</span>
      <input
        className={`w-full h-11 rounded-xl border px-3 outline-none focus:ring-2 focus:ring-sky-300 ${
          error ? "border-red-500" : "border-slate-300"
        }`}
        {...rest}
      />
      {error && <span className="text-sm text-red-600">{error}</span>}
    </label>
  );
}

function TextArea({ label, error, ...rest }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1">{label}</span>
      <textarea
        className={`w-full min-h-[96px] rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-sky-300 ${
          error ? "border-red-500" : "border-slate-300"
        }`}
        {...rest}
      />
      {error && <span className="text-sm text-red-600">{error}</span>}
    </label>
  );
}

function FileField({ label, error, onChange }) {
  const [name, setName] = useState("");
  return (
    <div className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1">{label}</span>
      <input
        type="file"
        accept="image/*,.pdf"
        className={`w-full h-11 rounded-xl border bg-white px-3 py-[6px] file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 ${
          error ? "border-red-500" : "border-slate-300"
        }`}
        onChange={(e) => {
          const f = e.target.files?.[0] || null;
          setName(f ? f.name : "");
          onChange?.(f);
        }}
      />
      <div className="text-xs text-slate-500 mt-1">{name || "JPG, PNG o PDF (máx. 10MB)"}</div>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
