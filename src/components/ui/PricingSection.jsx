import React, { useState } from 'react';

const PLANS = [
  { 
    id: "gratis", 
    name: "Gratis", 
    tagline: "Para armar tu primera galería.", 
    mensual: 0, 
    anual: 0,
    features: [
      ["100 MB de espacio", true],
      ["Fotos en calidad original", false],
      ["Sin videos", false, true],
      ["Hasta 15 MB por archivo", false],
      ["Árbol de los Recuerdos y galería 3D", false]
    ] 
  },
  { 
    id: "pololos", 
    name: "Pololos", 
    tagline: "Fotos y videos en alta calidad.", 
    mensual: 990, 
    anual: 5990, 
    trialDays: 7,
    features: [
      ["15 GB de espacio", true],
      ["Fotos y videos en alta calidad", false],
      ["Hasta 250 MB por archivo", false],
      ["Conservas todo lo que subiste en Gratis", false]
    ] 
  },
  { 
    id: "novios", 
    name: "Novios", 
    tagline: "Más espacio para más recuerdos.", 
    mensual: 1990, 
    anual: 14990, 
    featured: true, 
    badge: "Más popular",
    features: [
      ["50 GB de espacio", true],
      ["Todo lo de Pololos", false],
      ["Hasta 1 GB por archivo", false],
      ["Ideal para viajes y aniversarios", false]
    ] 
  },
  { 
    id: "matrimonio", 
    name: "Matrimonio", 
    tagline: "Todo tu gran día, sin recortes.", 
    mensual: 3290, 
    anual: 24990,
    features: [
      ["100 GB de espacio", true],
      ["Videos 4K", false],
      ["Hasta 5 GB por archivo", false],
      ["Descarga completa en ZIP", false]
    ] 
  }
];

const clp = (n) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
const perMonth = (p) => Math.round(p.anual / 12 / 10) * 10;
const savePct = (p) => p.mensual ? Math.round((1 - p.anual / (p.mensual * 12)) * 100) : 0;

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
    <path d="M3 8.5l3.2 3L13 4.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const PricingSection = ({ onSelectPlan }) => {
  const [period, setPeriod] = useState("anual");
  const [selectedPlanId, setSelectedPlanId] = useState("novios");

  const getPriceBlock = (p) => {
    if (!p.mensual) return { amount: "$0", unit: "", note: "Sin costo, sin tarjeta" };
    if (period === "mensual") return { amount: clp(p.mensual), unit: "/mes", note: "Se cobra cada mes" };
    return { 
      amount: clp(perMonth(p)), 
      unit: "/mes", 
      note: `Se cobra ${clp(p.anual)} una vez al año · ahorras ${savePct(p)} %`
    };
  };

  const handleContinue = () => {
    const p = PLANS.find(x => x.id === selectedPlanId);
    if (onSelectPlan) {
      onSelectPlan(selectedPlanId, p.mensual ? period : null);
    }
  };

  const maxSave = Math.max(...PLANS.map(savePct));
  const selectedPlan = PLANS.find(x => x.id === selectedPlanId);
  const totalText = !selectedPlan.mensual 
    ? "sin costo" 
    : period === "anual" 
      ? `${clp(selectedPlan.anual)} al año` 
      : `${clp(selectedPlan.mensual)} al mes`;

  return (
    <div className="pricing-container">
      <main className="wrap">
        <header>
          <h1>Elige tu Universo</h1>
          <p>Empieza gratis y mejora cuando tu historia necesite más espacio. Puedes cambiar de plan cuando quieras desde tu panel.</p>
          <div className="period">
            <div className="seg" role="group" aria-label="Periodo de cobro">
              <button 
                type="button" 
                onClick={() => setPeriod('mensual')} 
                aria-pressed={period === 'mensual'}
              >
                Mensual
              </button>
              <button 
                type="button" 
                onClick={() => setPeriod('anual')} 
                aria-pressed={period === 'anual'}
              >
                Anual
              </button>
            </div>
            <span className="save" id="save-badge">Ahorra hasta {maxSave} % con el plan anual</span>
          </div>
        </header>

        <div className="grid" role="radiogroup" aria-label="Planes">
          {PLANS.map((p) => {
            const pr = getPriceBlock(p);
            return (
              <label key={p.id} className={`plan ${p.featured ? "featured" : ""}`}>
                <input 
                  type="radio" 
                  name="plan" 
                  value={p.id} 
                  checked={selectedPlanId === p.id}
                  onChange={() => setSelectedPlanId(p.id)}
                />
                <div className="body">
                  {p.badge && <span className="tag">{p.badge}</span>}
                  <h2>{p.name}</h2>
                  <p className="tagline">{p.tagline}</p>
                  <div className="price">
                    <span className="amount">{pr.amount}</span>
                    <span className="unit">{pr.unit}</span>
                  </div>
                  <p className="note">{pr.note}</p>
                  {p.trialDays && <span className="trial">{p.trialDays} días gratis al empezar</span>}
                  <div className="rule"></div>
                  <ul>
                    {p.features.map(([text, isStrong, isDim], idx) => (
                      <li key={idx} className={isDim ? "dim" : ""}>
                        <CheckIcon />
                        <span>{isStrong ? <strong>{text}</strong> : text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </label>
            );
          })}
        </div>
        <p className="legal" id="legal">
          Precios en pesos chilenos con IVA incluido. El plan anual se cobra una sola vez al año.
        </p>
      </main>

      <div className="bar">
        <div className="bar-in">
          <div className="sum" aria-live="polite">
            <small>Tu selección</small>
            <b>Plan {selectedPlan.name} {selectedPlan.mensual ? `· ${period} ` : ""}· {totalText}</b>
          </div>
          <div className="actions">
            <div id="turnstile-slot"></div>
            <button className="cta" id="cta" type="button" onClick={handleContinue}>
              <span className="g" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/>
                  <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"/>
                  <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/>
                </svg>
              </span>
              Continuar con Google
            </button>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .pricing-container {
          --bg:#0c0a10; --surface:#14111a; --surface-2:#1b1724;
          --line:rgba(255,255,255,.09); --line-strong:rgba(255,255,255,.18);
          --text:#f3eef7; --muted:#9d94ab; --rose:#ec4899; --rose-soft:rgba(236,72,153,.14); --violet:#a66bff;
          --ok:#5fd6a2;
          --serif:"Cormorant Garamond",Georgia,"Times New Roman",serif;
          --sans:"Jost",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
          
          font-family: var(--sans);
          color: var(--text);
          background: radial-gradient(900px 420px at 50% -10%, rgba(236,72,153,.16), transparent 70%), var(--bg);
          min-height: 100vh;
          line-height: 1.5;
          -webkit-font-smoothing: antialiased;
        }
        
        .pricing-container * {
          box-sizing: border-box;
          margin: 0;
        }

        .pricing-container .wrap {
          max-width: 1120px;
          margin: 0 auto;
          padding: 56px 20px 140px;
        }
        .pricing-container header {
          text-align: center;
          max-width: 560px;
          margin: 0 auto 36px;
        }
        .pricing-container h1 {
          font-family: var(--serif);
          font-style: italic;
          font-weight: 600;
          font-size: clamp(2.2rem, 5vw, 3.2rem);
          line-height: 1.1;
          letter-spacing: .2px;
        }
        .pricing-container header p {
          color: var(--muted);
          margin-top: 12px;
          font-size: 1.02rem;
        }

        /* Selector de periodo */
        .pricing-container .period {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 14px;
          margin-top: 28px;
          flex-wrap: wrap;
        }
        .pricing-container .seg {
          display: inline-flex;
          padding: 4px;
          border-radius: 999px;
          background: var(--surface);
          border: 1px solid var(--line);
        }
        .pricing-container .seg button {
          font: 500 .95rem var(--sans);
          color: var(--muted);
          background: none;
          border: 0;
          padding: 9px 22px;
          border-radius: 999px;
          cursor: pointer;
          transition: background .2s, color .2s;
        }
        .pricing-container .seg button[aria-pressed="true"] {
          background: var(--surface-2);
          color: var(--text);
          box-shadow: 0 0 0 1px var(--line-strong) inset;
        }
        .pricing-container .save {
          font-size: .85rem;
          color: var(--ok);
          background: rgba(95,214,162,.1);
          border: 1px solid rgba(95,214,162,.25);
          padding: 5px 12px;
          border-radius: 999px;
        }

        /* Tarjetas */
        .pricing-container .grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          align-items: stretch;
        }
        .pricing-container .plan {
          position: relative;
          display: block;
          cursor: pointer;
        }
        .pricing-container .plan input {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }
        .pricing-container .body {
          height: 100%;
          display: flex;
          flex-direction: column;
          padding: 26px 22px 24px;
          border-radius: 18px;
          background: var(--surface);
          border: 1px solid var(--line);
          transition: border-color .2s, transform .2s, background .2s;
        }
        .pricing-container .plan:hover .body {
          border-color: var(--line-strong);
        }
        .pricing-container .plan input:focus-visible + .body {
          outline: 2px solid var(--violet);
          outline-offset: 3px;
        }
        .pricing-container .plan input:checked + .body {
          border-color: var(--rose);
          background: linear-gradient(180deg, var(--rose-soft), var(--surface) 55%);
          box-shadow: 0 0 0 1px var(--rose) inset, 0 18px 50px -24px rgba(236,72,153,.55);
        }
        .pricing-container .plan.featured .body {
          border-color: rgba(236,72,153,.45);
        }
        .pricing-container .tag {
          position: absolute;
          top: -11px;
          left: 22px;
          font-size: .78rem;
          font-weight: 600;
          color: #fff;
          background: linear-gradient(90deg, var(--rose), var(--violet));
          padding: 4px 12px;
          border-radius: 999px;
        }
        .pricing-container .trial {
          display: inline-block;
          font-size: .8rem;
          color: var(--ok);
          margin-top: 8px;
        }
        .pricing-container h2 {
          font-family: var(--serif);
          font-style: italic;
          font-weight: 600;
          font-size: 1.7rem;
          line-height: 1.1;
        }
        .pricing-container .tagline {
          color: var(--muted);
          font-size: .92rem;
          margin-top: 4px;
          min-height: 2.6em;
        }
        .pricing-container .price {
          margin-top: 18px;
          display: flex;
          align-items: baseline;
          gap: 6px;
        }
        .pricing-container .amount {
          font-size: 2.3rem;
          font-weight: 600;
          letter-spacing: -.5px;
          font-variant-numeric: tabular-nums;
        }
        .pricing-container .unit {
          color: var(--muted);
          font-size: .95rem;
        }
        .pricing-container .note {
          color: var(--muted);
          font-size: .85rem;
          min-height: 1.4em;
          margin-top: 2px;
        }
        .pricing-container .rule {
          height: 1px;
          background: var(--line);
          margin: 18px 0;
        }
        .pricing-container ul {
          list-style: none;
          padding: 0;
          display: grid;
          gap: 10px;
          font-size: .93rem;
        }
        .pricing-container li {
          display: flex;
          gap: 10px;
          color: #d9d2e3;
        }
        .pricing-container li svg {
          flex: none;
          margin-top: 3px;
          color: var(--rose);
        }
        .pricing-container li.dim {
          color: var(--muted);
        }
        .pricing-container li.dim svg {
          color: var(--muted);
        }
        .pricing-container li strong {
          color: var(--text);
          font-weight: 600;
        }

        /* Barra de confirmación */
        .pricing-container .bar {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(12,10,16,.92);
          backdrop-filter: blur(12px);
          border-top: 1px solid var(--line);
          padding: 14px 20px calc(14px + env(safe-area-inset-bottom, 0px));
          z-index: 50;
        }
        .pricing-container .bar-in {
          max-width: 1120px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 20px;
          justify-content: space-between;
          flex-wrap: wrap;
        }
        .pricing-container .sum small {
          display: block;
          color: var(--muted);
          font-size: .82rem;
        }
        .pricing-container .sum b {
          font-weight: 600;
          font-size: 1.02rem;
        }
        .pricing-container .actions {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }
        .pricing-container #turnstile-slot {
          min-height: 0;
        }
        .pricing-container .cta {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font: 600 1rem var(--sans);
          color: #fff;
          border: 0;
          cursor: pointer;
          padding: 13px 26px;
          border-radius: 999px;
          background: linear-gradient(90deg, var(--rose), var(--violet));
          box-shadow: 0 10px 30px -12px rgba(236,72,153,.7);
          transition: transform .15s, filter .15s;
        }
        .pricing-container .cta:hover {
          filter: brightness(1.08);
        }
        .pricing-container .cta:active {
          transform: scale(.98);
        }
        .pricing-container .cta:focus-visible {
          outline: 2px solid #fff;
          outline-offset: 3px;
        }
        .pricing-container .cta .g {
          background: #fff;
          border-radius: 50%;
          width: 22px;
          height: 22px;
          display: grid;
          place-items: center;
        }
        .pricing-container .legal {
          max-width: 1120px;
          margin: 18px auto 0;
          text-align: center;
          color: var(--muted);
          font-size: .82rem;
        }

        @media (max-width: 980px) {
          .pricing-container .grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 560px) {
          .pricing-container .grid {
            grid-template-columns: 1fr;
          }
          .pricing-container .tagline {
            min-height: 0;
          }
          .pricing-container .bar-in {
            justify-content: center;
            text-align: center;
          }
          .pricing-container .cta {
            width: 100%;
            justify-content: center;
          }
          .pricing-container .actions {
            width: 100%;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .pricing-container * {
            transition: none !important;
          }
        }
      `}} />
    </div>
  );
};

export default PricingSection;
