import ic5g from "../assets/5G.svg";
import icPhone from "../assets/phone.svg";
import icSms from "../assets/sms.svg";

export default function Coverage() {
  return (
    <section id="cobertura" className="max-w-7xl mx-auto px-4 py-12">
      <h2 className="text-center text-2xl font-semibold text-slate-800 mb-8">
        Todos tus planes incluyen también
      </h2>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Card 1: Cobertura */}
        <article className="rounded-3xl bg-white border shadow-sm p-6 flex items-center gap-5">
          {/* Icono como imagen */}
          <div className="flex-shrink-0 flex items-center justify-center rounded-2xl bg-slate-900/90 w-16 h-16">
            <img
              src={ic5g}
              alt="Cobertura 5G"
              className="w-9 h-9"
            />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Red 5G</h3>
            <a
              href="https://www.movistar.com.mx/cobertura"
              target="_blank"
              rel="noreferrer noopener"
              className="text-sky-600 underline underline-offset-2 hover:text-sky-700"
            >
              Conoce tu zona de cobertura
            </a>
          </div>
        </article>

        {/* Card 2: Llamadas */}
        <article className="rounded-3xl bg-white border shadow-sm p-6 flex items-center gap-5">
          <div className="flex-shrink-0 flex items-center justify-center rounded-2xl bg-sky-500/10 w-16 h-16">
            <img
              src={icPhone}
              alt="Llamadas ilimitadas"
              className="w-9 h-9"
            />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Llamadas ilimitadas</h3>
            <p className="text-sm text-slate-500">A México, EUA y Canadá</p>
          </div>
        </article>

        {/* Card 3: SMS */}
        <article className="rounded-3xl bg-white border shadow-sm p-6 flex items-center gap-5">
          <div className="flex-shrink-0 flex items-center justify-center rounded-2xl bg-sky-500/10 w-16 h-16">
            <img
              src={icSms}
              alt="Mensajes SMS"
              className="w-9 h-9"
            />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Mensajes de texto</h3>
            <p className="text-sm text-slate-500">Ilimitado</p>
          </div>
        </article>
      </div>
    </section>
  );
}
