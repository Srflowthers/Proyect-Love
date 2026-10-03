import React, { useState } from 'react';
import { PLANS } from '@/services/userService';

const PricingModal = ({ onLogin, onClose }) => {
  const [selectedPlan, setSelectedPlan] = useState('pololos');
  const [isAnnual, setIsAnnual] = useState(false);

  const formatMB = (bytes) => {
    if (bytes >= 1024 * 1024 * 1024) {
      return (bytes / (1024 * 1024 * 1024)).toFixed(0) + ' GB';
    }
    return (bytes / (1024 * 1024)).toFixed(0) + ' MB';
  };

  const getPlanDetails = (planId) => {
    switch(planId) {
      case 'pololos':
        return [
          { included: true, text: 'Galería 3D Interactiva' },
          { included: true, text: 'Música de Fondo (Spotify)' },
          { included: true, text: 'Hasta 60 Fotos aprox.' },
          { included: false, text: 'Árbol de Recuerdos 3D' },
          { included: false, text: 'Avión de Papel (Modo Vuelo)' }
        ];
      case 'novios':
        return [
          { included: true, text: 'Todo lo del plan Básico' },
          { included: true, text: 'Hasta 500 Fotos aprox.' },
          { included: true, text: 'Árbol de Recuerdos 3D' },
          { included: false, text: 'Avión de Papel (Modo Vuelo)' },
          { included: false, text: 'Soporte Prioritario' }
        ];
      case 'matrimonio':
        return [
          { included: true, text: 'Todo lo del plan Novios' },
          { included: true, text: 'Hasta 1.500 Fotos aprox.' },
          { included: true, text: 'Avión de Papel (Modo Vuelo)' },
          { included: true, text: 'Ideal para eventos y bodas' },
          { included: false, text: 'Almacenamiento Masivo' }
        ];
      case 'familia':
        return [
          { included: true, text: 'Todos los beneficios Premium' },
          { included: true, text: 'Hasta 4.000 Fotos aprox.' },
          { included: true, text: 'Avión de Papel (Modo Vuelo)' },
          { included: true, text: 'Almacenamiento Masivo (15GB)' },
          { included: true, text: 'Soporte Prioritario 24/7' }
        ];
      default: return [];
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-pointer" 
        onClick={onClose}
      ></div>
      
      {/* Estilos de Fuego Realista y Orgánico */}
      <style>{`
        @keyframes flame-move {
          0% { background-position: 0% 50%; }
          30% { background-position: 100% 50%; }
          70% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
        @keyframes organic-flicker {
          0%   { opacity: 1; transform: scale(1) translateY(0); }
          20%  { opacity: 0.6; transform: scale(1.05) translateY(-1px); }
          40%  { opacity: 0.9; transform: scale(1.02) translateY(0); }
          60%  { opacity: 0.4; transform: scale(1.08) translateY(-2px); }
          80%  { opacity: 0.8; transform: scale(1.03) translateY(-1px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .flame-border {
          position: relative;
          background: linear-gradient(90deg, #ff0000 0%, #ff5a00 25%, #ff9a00 50%, #ff5a00 75%, #ff0000 100%);
          background-size: 300% auto;
          animation: flame-move 2.5s ease-in-out infinite alternate;
          padding: 2px;
          border-radius: 9999px;
          z-index: 10;
        }
        .flame-border::before {
          content: '';
          position: absolute;
          inset: -4px;
          background: inherit;
          background-size: inherit;
          animation: flame-move 2.5s ease-in-out infinite alternate, organic-flicker 1.8s ease-in-out infinite;
          filter: blur(8px);
          opacity: 0.8;
          z-index: -1;
          border-radius: inherit;
        }
      `}</style>

      {/* Modal */}
      <div className="relative w-full max-w-7xl bg-[#111] border border-pink-500/30 rounded-2xl shadow-[0_0_50px_rgba(236,72,153,0.15)] overflow-hidden flex flex-col max-h-[95vh]">
        <div className="p-3 text-center border-b border-gray-800 shrink-0 relative flex flex-col items-center justify-center">
          <h2 className="text-xl font-serif italic text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
            Elige tu Universo
          </h2>
          
          {/* Toggle Mensual/Anual */}
          <div className="flex items-center justify-center gap-3 mt-2">
            <span className={`text-xs font-semibold transition-colors ${!isAnnual ? 'text-white' : 'text-gray-500'}`}>Mensual</span>
            <button 
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative w-12 h-6 rounded-full bg-gray-800 border border-gray-600 transition-colors focus:outline-none"
            >
              <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-pink-500 transition-transform duration-300 ${isAnnual ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </button>
            <span className={`text-xs font-semibold transition-colors flex items-center gap-2 ${isAnnual ? 'text-white' : 'text-gray-500'}`}>
              Anual
              <span className="bg-pink-600 text-white text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider hidden sm:inline-block">
                Ahorra 4 Meses
              </span>
            </span>
          </div>
        </div>
        
        <div className="p-3 overflow-y-auto overflow-x-hidden flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.values(PLANS).map(plan => {
              const isSelected = selectedPlan === plan.id;
              const details = getPlanDetails(plan.id);
              
              return (
                <div 
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative flex flex-col p-3 rounded-xl cursor-pointer transition-all duration-300 border-2 ${
                    isSelected 
                      ? 'bg-pink-900/20 border-pink-500 scale-[1.02] shadow-[0_0_15px_rgba(236,72,153,0.3)] z-10' 
                      : 'bg-black border-gray-800 hover:border-gray-600'
                  }`}
                >
                  {/* Badge Popular/Recomendado */}
                  {plan.id === 'pololos' && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <div className="flame-border">
                        <div className="bg-[#111] text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500 text-[9px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider relative z-10">
                          Más Elegido
                        </div>
                      </div>
                    </div>
                  )}
                  {plan.id === 'novios' && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink-600 to-purple-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-lg shadow-pink-500/30">
                      Recomendado
                    </div>
                  )}

                  <h3 className={`text-sm font-bold text-center mb-1 flex items-center justify-center gap-1 ${isSelected ? 'text-pink-400' : 'text-gray-200'}`}>
                    <span className="text-lg">{plan.icon}</span> {plan.name}
                  </h3>
                  
                  {/* Precio Dinámico */}
                  <div className="text-center mb-1">
                    <span className="text-xl font-black text-white">${isAnnual ? plan.priceAnnual : plan.priceMonthly}</span>
                    <span className="text-gray-500 text-[10px]"> {isAnnual ? '/año' : '/mes'}</span>
                    {plan.id === 'pololos' && !isAnnual && (
                      <div className="text-green-400 text-[10px] font-bold mt-0.5 animate-pulse">¡1ra Semana Gratis!</div>
                    )}
                  </div>

                  <div className="text-center mb-2 border-b border-gray-800 pb-2">
                    <span className="text-[11px] text-pink-300 font-semibold">{formatMB(plan.maxBytes)} de Espacio</span>
                  </div>
                  
                  <ul className="flex-1 space-y-1.5">
                    {details.map((item, i) => (
                      <li key={i} className="flex items-center gap-1.5 text-[11px] leading-tight">
                        {item.included ? (
                          <svg className="w-3.5 h-3.5 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                        ) : (
                          <svg className="w-3.5 h-3.5 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        )}
                        <span className={item.included ? 'text-gray-300' : 'text-gray-600 line-through'}>{item.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="p-3 bg-[#1a1a1a] border-t border-gray-800 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-gray-400 text-[11px] text-center sm:text-left leading-tight">
            Empieza con el plan <strong className="text-pink-400">Pololos (Básico)</strong> y obtén <strong className="text-green-400">1 Semana Gratis</strong>.<br/>
            Podrás solicitar una mejora directamente desde tu panel de configuración.
          </p>
          <button 
            onClick={onLogin}
            className="w-full sm:w-auto px-6 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-full text-xs font-bold shadow-xl transition-all border border-pink-400 flex items-center justify-center gap-1.5 shrink-0"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff"/>
            </svg>
            Continuar con Google
          </button>
        </div>
      </div>
    </div>
  );
};

export default PricingModal;
